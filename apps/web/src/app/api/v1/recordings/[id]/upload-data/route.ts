import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { promises as fs } from 'fs';
import path from 'path';

import { getS3Client } from '@/lib/aws';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getUploadsDir() {
  const rootDir = process.cwd();
  if (rootDir.endsWith('apps/web') || rootDir.endsWith('apps\\web')) {
    return path.join(rootDir, 'uploads', 'recordings');
  }
  return path.join(rootDir, 'apps', 'web', 'uploads', 'recordings');
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const recordingId = params.id;

    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const reqContentType = req.headers.get('content-type') || '';
    const ext = reqContentType.includes('wav') ? 'wav'
              : reqContentType.includes('mpeg') || reqContentType.includes('mp3') ? 'mp3'
              : reqContentType.includes('3gp') ? '3gp'
              : reqContentType.includes('amr') ? 'amr' : 'm4a';

    const contentType = reqContentType || (ext === 'wav' ? 'audio/wav' : 'audio/m4a');
    let s3Key = `recordings/${recordingId}.${ext}`;
    let uploadedToS3 = false;

    // 1. Upload directly to AWS S3 Bucket
    const s3Info = getS3Client();
    if (s3Info) {
      try {
        const command = new PutObjectCommand({
          Bucket: s3Info.bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: contentType,
        });
        await s3Info.client.send(command);
        uploadedToS3 = true;
        console.log(`Uploaded audio recording ${recordingId} directly to AWS S3 bucket: ${s3Info.bucket}`);
      } catch (s3Err) {
        console.error(`AWS S3 PutObject error for ${recordingId}:`, s3Err);
      }
    }

    // 2. Also save to Local Disk Storage fallback
    const uploadsDir = getUploadsDir();
    await fs.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, `${recordingId}.${ext}`);
    await fs.writeFile(filePath, buffer);

    // Save fallback file with .m4a extension as well if ext is different to guarantee legacy URL compatibility
    if (ext !== 'm4a') {
      const fallbackM4aPath = path.join(uploadsDir, `${recordingId}.m4a`);
      await fs.writeFile(fallbackM4aPath, buffer).catch(() => {});
    }

    const audioUrl = `/api/v1/recordings/${recordingId}/audio`;

    // Attach recording to the specific target call record
    let updatedCall = await (CallModel as any).findOneAndUpdate(
      {
        $or: [
          { idempotencyKey: recordingId },
          { audioUrl: { $regex: recordingId } },
          { s3Key: { $regex: recordingId } },
          { _id: recordingId.length === 24 ? recordingId : null }
        ]
      },
      {
        $set: {
          recordingStatus: 'COMPLETED',
          audioUrl: audioUrl,
          s3Key: s3Key,
        },
      },
      { new: true }
    );

    if (!updatedCall) {
      // Extract devicePrefix and cleanPhone from recordingId if available (e.g. AGENT_9876543210_20260819...)
      const parts = recordingId.split('_');
      let extractedPhone = '';
      let extractedDevice = '';

      for (const part of parts) {
        const clean = part.replace(/\D/g, '');
        if (clean.length === 10) {
          extractedPhone = clean;
        } else if (part.startsWith('ANDROID-') || part.startsWith('DEV-')) {
          extractedDevice = part;
        }
      }

      if (extractedPhone.length === 10) {
        const query: any = {
          phoneNumber: { $regex: new RegExp(`${extractedPhone}$`) },
          $or: [
            { recordingStatus: { $in: ['PENDING_UPLOAD', 'PENDING', 'NONE'] } },
            { audioUrl: { $exists: false } }
          ]
        };

        if (extractedDevice) {
          query.deviceId = extractedDevice;
        }

        updatedCall = await (CallModel as any).findOneAndUpdate(
          query,
          {
            $set: {
              recordingStatus: 'COMPLETED',
              audioUrl: audioUrl,
              s3Key: s3Key,
            },
          },
          { sort: { startTime: -1, createdAt: -1 }, new: true }
        );
      }
    }

    if (updatedCall) {
      console.log(`Successfully attached uploaded audio recording to call ${updatedCall.idempotencyKey || updatedCall._id}`);
    } else {
      console.warn(`Recording upload completed for ${recordingId}, but no matching isolated call record was found.`);
    }

    console.log(`Successfully saved uploaded audio file: ${filePath} (${buffer.length} bytes)`);

    return NextResponse.json({
      success: true,
      message: 'Audio recording uploaded and attached to call log successfully',
      recordingId,
      audioUrl,
      fileSizeBytes: buffer.length,
    });
  } catch (err: any) {
    console.error('Error handling binary upload:', err);
    return NextResponse.json({ message: err.message || 'Error processing audio upload' }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: { id: string } }) {
  return PUT(req, context);
}
