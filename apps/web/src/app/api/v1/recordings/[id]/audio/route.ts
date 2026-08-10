import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
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
    const region = process.env.AWS_REGION || 'ap-south-1';
    const bucket = process.env.S3_BUCKET_NAME || 'academically-recorderhub';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

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

    // 2. Try fetching from AWS S3 Bucket
    if (accessKeyId && secretAccessKey && bucket) {
      try {
        const s3Client = new S3Client({
          region,
          credentials: { accessKeyId, secretAccessKey },
        });

        // Key candidate list
        const possibleKeys = [
          s3KeyTarget,
          `recordings/${recordingId}.m4a`,
          `recordings/${recordingId}`,
          `${recordingId}.m4a`,
          `${recordingId}`
        ];

        for (const targetKey of possibleKeys) {
          try {
            const command = new GetObjectCommand({ Bucket: bucket, Key: targetKey });
            const s3Response = await s3Client.send(command);

            if (s3Response.Body) {
              const byteArray = await s3Response.Body.transformToByteArray();
              const buffer = Buffer.from(byteArray);
              return new Response(buffer as any, {
                status: 200,
                headers: {
                  'Content-Type': s3Response.ContentType || 'audio/mp4',
                  'Content-Length': buffer.length.toString(),
                  'Accept-Ranges': 'bytes',
                  'Cache-Control': 'public, max-age=3600',
                },
              });
            }
          } catch {
            // try next key
          }
        }

        // Search S3 Bucket objects under recordings/ if exact key failed
        try {
          const listCmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: 'recordings/' });
          const listRes = await s3Client.send(listCmd);
          if (listRes.Contents && listRes.Contents.length > 0) {
            // Pick most recent S3 recording object
            const latestObj = listRes.Contents.sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))[0];
            if (latestObj && latestObj.Key) {
              const getLatestCmd = new GetObjectCommand({ Bucket: bucket, Key: latestObj.Key });
              const latestRes = await s3Client.send(getLatestCmd);
              if (latestRes.Body) {
                const byteArray = await latestRes.Body.transformToByteArray();
                const buffer = Buffer.from(byteArray);
                return new Response(buffer as any, {
                  status: 200,
                  headers: {
                    'Content-Type': latestRes.ContentType || 'audio/mp4',
                    'Content-Length': buffer.length.toString(),
                    'Accept-Ranges': 'bytes',
                  },
                });
              }
            }
          }
        } catch (listErr) {
          console.warn('S3 list fallback error:', listErr);
        }

      } catch (s3Err) {
        console.warn(`S3 Object error for ${recordingId}:`, s3Err);
      }
    }

    // 3. Try fetching from Local Disk Storage
    const uploadsDir = getUploadsDir();
    const filePath = path.join(uploadsDir, `${recordingId}.m4a`);

    try {
      const buffer = await fs.readFile(filePath);
      return new Response(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mp4',
          'Content-Length': buffer.length.toString(),
          'Accept-Ranges': 'bytes',
        },
      });
    } catch {
      return NextResponse.json({ message: 'Audio recording file not found in S3 or local storage' }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error streaming audio' }, { status: 500 });
  }
}
