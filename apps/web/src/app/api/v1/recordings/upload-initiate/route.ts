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
    const digitsOnly = (callId || '').replace(/\D/g, '');
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : 'CALL';

    const parts = (callId || '').split('-');
    const timestampMs = parts.length >= 2 ? Number(parts[1]) : Date.now();
    const callDate = !isNaN(timestampMs) && timestampMs > 1000000000000 ? new Date(timestampMs) : new Date();

    // Format timestamp as YYYYMMDDHHmmss to mirror native phone recording naming
    const dateStr = callDate.toISOString().replace(/\D/g, '').slice(0, 14);
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);

    const recordingId = `${cleanPhone}_${dateStr}_${uniqueSuffix}`;
    const ext = mimeType?.includes('mpeg') || mimeType?.includes('mp3') ? 'mp3'
              : mimeType?.includes('wav') ? 'wav'
              : mimeType?.includes('3gpp') || mimeType?.includes('3gp') ? '3gp'
              : mimeType?.includes('amr') ? 'amr' : 'm4a';

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
          ContentType: mimeType || (ext === 'wav' ? 'audio/wav' : 'audio/m4a'),
        });

        // Generate 15-minute AWS S3 presigned URL for direct APK upload
        presignedPutUrl = await getSignedUrl(s3Info.client, command, { expiresIn: 900 });
        console.log(`Generated real AWS S3 Presigned URL for key: ${s3Key} in bucket: ${s3Info.bucket}`);
      } catch (s3Err) {
        console.error('Error generating S3 presigned URL, using fallback upload route:', s3Err);
        presignedPutUrl = fallbackUploadUrl;
      }
    }

    // Immediately link audioUrl and s3Key strictly to the specific Call document in MongoDB Atlas
    if (callId) {
      try {
        let updatedCall = await (CallModel as any).findOneAndUpdate(
          {
            $or: [
              { idempotencyKey: callId },
              { _id: callId.length === 24 ? callId : null }
            ]
          },
          {
            $set: {
              recordingStatus: 'PENDING_UPLOAD',
              audioUrl: audioUrl,
              s3Key: s3Key,
            },
          },
          { new: true }
        ).exec();

        if (!updatedCall) {
          const parts = callId.split('-');
          const timestampMs = parts.length >= 2 ? Number(parts[1]) : NaN;
          const digitsOnly = callId.replace(/\D/g, '');
          const cleanDigits = digitsOnly.slice(-10);

          if (cleanDigits.length === 10) {
            const regexPattern = new RegExp(`${cleanDigits}$`);
            const query: any = {
              phoneNumber: { $regex: regexPattern },
              $or: [
                { recordingStatus: { $in: ['PENDING', 'PENDING_UPLOAD', 'NONE'] } },
                { audioUrl: { $exists: false } }
              ]
            };

            // If idempotencyKey contains embedded timestamp, enforce strict 2-minute time window match
            if (!isNaN(timestampMs) && timestampMs > 1000000000000) {
              const callTime = new Date(timestampMs);
              query.startTime = {
                $gte: new Date(callTime.getTime() - 120000),
                $lte: new Date(callTime.getTime() + 120000)
              };
            }

            updatedCall = await (CallModel as any).findOneAndUpdate(
              query,
              {
                $set: {
                  recordingStatus: 'PENDING_UPLOAD',
                  audioUrl: audioUrl,
                  s3Key: s3Key,
                },
              },
              { sort: { startTime: -1, createdAt: -1 }, new: true }
            ).exec();
          }
        }
        if (updatedCall) {
          console.log(`Linked audioUrl ${audioUrl} strictly to call ${updatedCall.idempotencyKey || updatedCall._id}`);
        } else {
          console.warn(`Could not find matching call for audio upload: ${callId}`);
        }
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
