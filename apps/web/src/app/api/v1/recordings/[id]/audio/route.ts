import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getS3Client } from '@/lib/aws';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getUploadsDir() {
  const rootDir = process.cwd();
  if (rootDir.endsWith('apps/web') || rootDir.endsWith('apps\\web')) {
    return path.join(rootDir, 'uploads', 'recordings');
  }
  return path.join(rootDir, 'apps', 'web', 'uploads', 'recordings');
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    let recordingId = params.id;

    // 1. Resolve actual recordingId or s3Key from MongoDB Atlas if params.id is an idempotencyKey or _id
    let s3KeyTarget = `recordings/${recordingId}.m4a`;
    try {
      await connectToDatabase();
      const callDoc = await (CallModel as any).findOne({
        $or: [
          { idempotencyKey: params.id },
          { audioUrl: { $regex: params.id } },
          { _id: params.id.length === 24 ? params.id : null }
        ]
      }).exec();

      if (callDoc) {
        if (callDoc.s3Key) {
          s3KeyTarget = callDoc.s3Key;
        } else if (callDoc.audioUrl) {
          const match = callDoc.audioUrl.match(/REC-[A-Za-z0-9_-]+/);
          if (match) {
            recordingId = match[0];
            s3KeyTarget = `recordings/${recordingId}.m4a`;
          }
        }
      }
    } catch (dbErr) {
      console.warn('DB lookup for recording ID failed:', dbErr);
    }

    const createAudioResponse = (buffer: Buffer, mimeType: string = 'audio/mp4') => {
      const rangeHeader = req.headers.get('range');
      const totalSize = buffer.length;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const chunkSize = end - start + 1;
        const chunk = buffer.subarray(start, end + 1);

        return new Response(chunk as any, {
          status: 206,
          headers: {
            'Content-Type': mimeType,
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      return new Response(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': totalSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    };

    // 2. Try fetching from AWS S3 Bucket
    const s3Info = getS3Client();
    if (s3Info) {
      try {
        const possibleKeys = [
          s3KeyTarget,
          `recordings/${recordingId}.wav`,
          `recordings/${recordingId}.mp3`,
          `recordings/${recordingId}.m4a`,
          `recordings/${recordingId}`,
          `${recordingId}.wav`,
          `${recordingId}.mp3`,
          `${recordingId}.m4a`,
          `${recordingId}`
        ];

        for (const targetKey of possibleKeys) {
          try {
            const command = new GetObjectCommand({ Bucket: s3Info.bucket, Key: targetKey });
            const s3Response = await s3Info.client.send(command);

            if (s3Response.Body) {
              const byteArray = await s3Response.Body.transformToByteArray();
              const buffer = Buffer.from(byteArray);
              if (buffer.length > 0) {
                const isWav = targetKey.endsWith('.wav') || s3Response.ContentType?.includes('wav');
                const isMp3 = targetKey.endsWith('.mp3') || s3Response.ContentType?.includes('mpeg') || s3Response.ContentType?.includes('mp3');
                const contentType = isWav ? 'audio/wav' : isMp3 ? 'audio/mpeg' : 'audio/mp4';
                return createAudioResponse(buffer, contentType);
              }
            }
          } catch {
            // try next key
          }
        }
      } catch (s3Err) {
        console.warn(`S3 Object error for ${recordingId}:`, s3Err);
      }
    }

    // 3. Try fetching from Local Disk Storage
    const uploadsDir = getUploadsDir();
    const possibleLocalFiles = [
      path.join(uploadsDir, `${recordingId}.wav`),
      path.join(uploadsDir, `${recordingId}.mp3`),
      path.join(uploadsDir, `${recordingId}.m4a`),
      path.join(uploadsDir, `${recordingId}.3gp`),
      path.join(uploadsDir, `${recordingId}`)
    ];

    for (const filePath of possibleLocalFiles) {
      try {
        const buffer = await fs.readFile(filePath);
        if (buffer.length > 0) {
          const mime = filePath.endsWith('.wav') ? 'audio/wav'
                     : filePath.endsWith('.mp3') ? 'audio/mpeg'
                     : filePath.endsWith('.3gp') ? 'audio/3gpp'
                     : 'audio/mp4';
          return createAudioResponse(buffer, mime);
        }
      } catch {
        // try next local path
      }
    }

    return NextResponse.json({ message: 'Audio recording file not found in S3 or local storage' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error streaming audio' }, { status: 500 });
  }
}
