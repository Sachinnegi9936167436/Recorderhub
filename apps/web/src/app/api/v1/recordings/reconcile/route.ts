import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { getS3Client } from '@/lib/aws';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { cacheDel } from '@/lib/redis';

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

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    await connectToDatabase();
    const s3Info = getS3Client();
    if (!s3Info) {
      return NextResponse.json({ message: 'S3 client not configured' }, { status: 500 });
    }

    const command = new ListObjectsV2Command({
      Bucket: s3Info.bucket,
      Prefix: 'recordings/',
      MaxKeys: 1000,
    });

    const s3Res = await s3Info.client.send(command);
    const objects = s3Res.Contents || [];

    let reconciledCount = 0;
    const details: any[] = [];

    for (const obj of objects) {
      const s3Key = obj.Key;
      if (!s3Key || s3Key.endsWith('/')) continue;

      const fileName = s3Key.split('/').pop() || '';
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const targetDate = parseTimestamp(fileName);

      // Extract 10-digit phone number from filename
      const parts = baseName.split('_');
      let cleanPhone = '';
      for (const p of parts) {
        const d = p.replace(/\D/g, '');
        if (d.length === 10) {
          cleanPhone = d;
          break;
        }
      }

      if (!cleanPhone) {
        const allDigits = baseName.replace(/\D/g, '');
        if (allDigits.length >= 10) {
          cleanPhone = allDigits.slice(-10);
        }
      }

      if (!cleanPhone) continue;

      const phoneRegex = buildPhoneRegex(cleanPhone);
      const audioUrl = `/api/v1/recordings/${baseName}/audio`;

      const query: any = {
        phoneNumber: { $regex: phoneRegex },
      };

      if (targetDate) {
        query.startTime = {
          $gte: new Date(targetDate.getTime() - 300000), // ±5 minutes
          $lte: new Date(targetDate.getTime() + 300000),
        };
      }

      const matchingCall = await (CallModel as any).findOne(query).sort({ startTime: -1 }).exec();

      if (matchingCall) {
        const needsUpdate =
          matchingCall.recordingStatus !== 'COMPLETED' ||
          matchingCall.s3Key !== s3Key ||
          !matchingCall.audioUrl;

        if (needsUpdate) {
          await (CallModel as any).updateOne(
            { _id: matchingCall._id },
            {
              $set: {
                recordingStatus: 'COMPLETED',
                s3Key: s3Key,
                audioUrl: audioUrl,
              },
            }
          );
          reconciledCount++;
          details.push({
            phone: matchingCall.phoneNumber,
            callId: matchingCall.idempotencyKey || matchingCall._id,
            s3Key,
            audioUrl,
          });
        }
      }
    }

    if (reconciledCount > 0) {
      await cacheDel('cache:calls:latest').catch(() => {});
    }

    return NextResponse.json({
      success: true,
      scannedS3Objects: objects.length,
      reconciledCount,
      details,
    });
  } catch (err: any) {
    console.error('Error reconciling S3 recordings:', err);
    return NextResponse.json({ message: err.message || 'Error reconciling recordings' }, { status: 500 });
  }
}
