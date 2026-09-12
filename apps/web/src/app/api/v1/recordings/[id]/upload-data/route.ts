import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { promises as fs } from 'fs';
import path from 'path';
import { getS3Client } from '@/lib/aws';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { patchCallInCache, revalidateCallsCacheInBackground } from '@/lib/cache-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseTimestamp(str: string): Date | null {
  if (!str) return null;
  const match14 = str.match(/\b(20\d{12})\b/);
  if (match14) {
    const s = match14[1];
    const year = parseInt(s.slice(0, 4), 10);
    const month = parseInt(s.slice(4, 6), 10) - 1;
    const day = parseInt(s.slice(6, 8), 10);
    const hour = parseInt(s.slice(8, 10), 10);
    const min = parseInt(s.slice(10, 12), 10);
    const sec = parseInt(s.slice(12, 14), 10);
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }

  const matchEpoch = str.match(/\b(1[67]\d{11})\b/);
  if (matchEpoch) {
    const ms = Number(matchEpoch[1]);
    if (!isNaN(ms) && ms > 1000000000000) {
      return new Date(ms);
    }
  }

  return null;
}

function buildPhoneRegex(digits: string): RegExp {
  const clean = digits.replace(/\D/g, '').slice(-10);
  const pattern = clean.split('').join('\\s*') + '$';
  return new RegExp(pattern);
}

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

    const contentType = reqContentType || (ext === 'wav' ? 'audio/wav' : ext === 'mp3' ? 'audio/mpeg' : 'audio/m4a');
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

    // 2. Save to local disk only in local development (skip on Vercel to save CPU and I/O)
    const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    let filePath = 's3-direct';
    if (!isVercel && !uploadedToS3) {
      try {
        const uploadsDir = getUploadsDir();
        await fs.mkdir(uploadsDir, { recursive: true });
        filePath = path.join(uploadsDir, `${recordingId}.${ext}`);
        await fs.writeFile(filePath, buffer);
      } catch (fsErr) {
        console.warn('Local disk write skipped:', fsErr);
      }
    }

    const audioUrl = `/api/v1/recordings/${recordingId}/audio`;
    const targetDate = parseTimestamp(recordingId);

    // Attach recording to the specific target call record (Fast indexed lookup)
    const isHex24 = recordingId.length === 24 && /^[0-9a-fA-F]{24}$/.test(recordingId);
    const isWaRecording = recordingId.startsWith('WA_');
    const directQuery: any = {
      $or: [
        { idempotencyKey: recordingId },
        { s3Key: s3Key },
        { _id: isHex24 ? recordingId : null }
      ].filter((c) => c._id !== null)
    };

    if (!isWaRecording) {
      directQuery.channel = { $ne: 'WHATSAPP' };
      directQuery.disposition = { $not: /whatsapp/i };
      directQuery.idempotencyKey = { $not: /^WA_/i };
    }

    let updatedCall = await (CallModel as any).findOneAndUpdate(
      directQuery,
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
        const phoneRegex = buildPhoneRegex(extractedPhone);
        const query: any = {
          phoneNumber: { $regex: phoneRegex },
          $or: [
            { recordingStatus: { $in: ['PENDING_UPLOAD', 'PENDING', 'NONE'] } },
            { audioUrl: { $exists: false } }
          ]
        };

        if (isWaRecording) {
          query.channel = 'WHATSAPP';
        } else {
          query.channel = { $ne: 'WHATSAPP' };
          query.disposition = { $not: /whatsapp/i };
          query.idempotencyKey = { $not: /^WA_/i };
        }

        if (extractedDevice) {
          query.deviceId = extractedDevice;
        }

        if (targetDate) {
          query.startTime = {
            $gte: new Date(targetDate.getTime() - 180000),
            $lte: new Date(targetDate.getTime() + 180000)
          };
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

    // Update Redis calls cache non-destructively (Incremental update without full DB scan)
    if (updatedCall) {
      await patchCallInCache(updatedCall._id?.toString() || updatedCall.idempotencyKey, {
        recordingStatus: 'COMPLETED',
        audioUrl: audioUrl,
        s3Key: s3Key,
      }).catch(() => {});
      console.log(`Successfully attached uploaded audio recording to call ${updatedCall.idempotencyKey || updatedCall._id}`);
    } else {
      console.warn(`Recording upload completed for ${recordingId}, but no matching isolated call record was found.`);
    }

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
