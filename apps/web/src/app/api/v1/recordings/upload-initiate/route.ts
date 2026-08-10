import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { getS3Client } from '@/lib/aws';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { callId, fileSizeBytes, mimeType, checksumSha256, durationSeconds } = body;

    const recordingId = `REC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const ext = mimeType?.includes('mpeg') || mimeType?.includes('mp3') ? 'mp3' : 'm4a';
    const s3Key = `recordings/${recordingId}.${ext}`;
    const audioUrl = `/api/v1/recordings/${recordingId}/audio`;

    const host = req.headers.get('host') || 'localhost:3000';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('10.0.2.2');
    const protocol = isLocal ? 'http' : 'https';
    const fallbackUploadUrl = `${protocol}://${host}/api/v1/recordings/${recordingId}/upload-data`;

    let presignedPutUrl: string = fallbackUploadUrl;

    const s3Info = getS3Client();
    if (s3Info) {
      try {
        const command = new PutObjectCommand({
          Bucket: s3Info.bucket,
          Key: s3Key,
          ContentType: mimeType || 'audio/m4a',
        });

        // Generate 15-minute AWS S3 presigned URL for direct APK upload
        presignedPutUrl = await getSignedUrl(s3Info.client, command, { expiresIn: 900 });
        console.log(`Generated real AWS S3 Presigned URL for key: ${s3Key} in bucket: ${s3Info.bucket}`);
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
      bucket: s3Info?.bucket || 'academically-recorderhub',
      presignedPutUrl,
      fallbackUploadUrl,
    });
  } catch (err: any) {
    console.error('Error initiating upload:', err);
    return NextResponse.json({ message: err.message || 'Error initiating upload' }, { status: 500 });
  }
}
