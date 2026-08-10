import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { callId, fileSizeBytes, mimeType, checksumSha256, durationSeconds } = body;

    const recordingId = `REC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const s3Key = `recordings/${recordingId}.m4a`;
    const audioUrl = `/api/v1/recordings/${recordingId}/audio`;

    const region = process.env.AWS_REGION || 'ap-south-1';
    const bucket = process.env.S3_BUCKET_NAME || 'academically-recorderhub';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

    const host = req.headers.get('host') || 'localhost:3000';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('10.0.2.2');
    const protocol = isLocal ? 'http' : 'https';
    const fallbackUploadUrl = `${protocol}://${host}/api/v1/recordings/${recordingId}/upload-data`;

    let presignedPutUrl: string = fallbackUploadUrl;

    if (accessKeyId && secretAccessKey && bucket) {
      try {
        const s3Client = new S3Client({
          region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });

        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          ContentType: mimeType || 'audio/m4a',
        });

        // Generate 15-minute AWS S3 presigned URL for direct APK upload
        presignedPutUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        console.log(`Generated real AWS S3 Presigned URL for key: ${s3Key} in bucket: ${bucket}`);
      } catch (s3Err) {
        console.error('Error generating S3 presigned URL, using fallback upload route:', s3Err);
        presignedPutUrl = fallbackUploadUrl;
      }
    }

    // Immediately link audioUrl and s3Key to the Call document in MongoDB Atlas
    if (callId) {
      try {
        await (CallModel as any).findOneAndUpdate(
          { idempotencyKey: callId },
          {
            $set: {
              recordingStatus: 'PENDING_UPLOAD',
              audioUrl: audioUrl,
              s3Key: s3Key,
            },
          },
          { new: true }
        ).exec();
        console.log(`Linked audioUrl ${audioUrl} to call idempotencyKey ${callId}`);
      } catch (linkErr) {
        console.error(`Error linking audioUrl to call ${callId}:`, linkErr);
      }
    }

    return NextResponse.json({
      recordingId,
      s3Key,
      bucket,
      presignedPutUrl,
      fallbackUploadUrl,
    });
  } catch (err: any) {
    console.error('Error initiating upload:', err);
    return NextResponse.json({ message: err.message || 'Error initiating upload' }, { status: 500 });
  }
}
