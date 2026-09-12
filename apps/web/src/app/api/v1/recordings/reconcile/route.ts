import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { getS3Client } from '@/lib/aws';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { cacheGet, cacheSet } from '@/lib/redis';
import { patchCallInCache } from '@/lib/cache-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RECONCILE_LOCK_KEY = 'lock:recordings:reconcile';
const RECONCILE_LOCK_TTL = 1800; // 30 minutes throttle

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

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isForced = searchParams.get('force') === 'true';

    // 1. Throttle reconciliation checks to avoid burning serverless CPU
    if (!isForced) {
      const isLocked = await cacheGet<boolean>(RECONCILE_LOCK_KEY);
      if (isLocked) {
        return NextResponse.json({
          success: true,
          message: 'Reconciliation throttled (ran recently). Use ?force=true to force run.',
          reconciledCount: 0,
        });
      }
    }

    await connectToDatabase();

    // 2. First check if any calls actually need reconciliation (Fast indexed query)
    const pendingCalls = await (CallModel as any)
      .find({
        $or: [
          { recordingStatus: { $in: ['PENDING_UPLOAD', 'PENDING', 'NONE'] } },
          { audioUrl: { $exists: false } },
          { s3Key: { $exists: false } },
          { audioUrl: '' }
        ]
      })
      .sort({ startTime: -1 })
      .limit(300)
      .lean()
      .exec();

    if (!pendingCalls || pendingCalls.length === 0) {
      await cacheSet(RECONCILE_LOCK_KEY, true, RECONCILE_LOCK_TTL);
      return NextResponse.json({
        success: true,
        message: 'All calls already have audio recordings linked.',
        reconciledCount: 0,
      });
    }

    const s3Info = getS3Client();
    if (!s3Info) {
      return NextResponse.json({ message: 'S3 client not configured' }, { status: 500 });
    }

    const command = new ListObjectsV2Command({
      Bucket: s3Info.bucket,
      Prefix: 'recordings/',
      MaxKeys: 500,
    });

    const s3Res = await s3Info.client.send(command);
    const objects = s3Res.Contents || [];

    let reconciledCount = 0;
    const details: any[] = [];

    // 3. Match S3 objects against pending calls in memory O(M * N) where M <= 500, N <= 300
    for (const obj of objects) {
      const s3Key = obj.Key;
      if (!s3Key || s3Key.endsWith('/')) continue;

      const fileName = s3Key.split('/').pop() || '';
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const targetDate = parseTimestamp(fileName);

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

      const audioUrl = `/api/v1/recordings/${baseName}/audio`;
      const isWaRecording = baseName.startsWith('WA_') || s3Key.includes('/WA_');

      // Find matching call from pending calls in-memory
      const matchingCall = pendingCalls.find((c: any) => {
        const callPhone = (c.phoneNumber || '').replace(/\D/g, '');
        if (!callPhone.endsWith(cleanPhone)) return false;

        const callIsWa = (c.channel || '').toUpperCase() === 'WHATSAPP' || 
                         (c.disposition || '').toLowerCase().includes('whatsapp') || 
                         (c.idempotencyKey || '').startsWith('WA_');
        if (isWaRecording !== callIsWa) return false;

        if (targetDate && c.startTime) {
          const callTime = new Date(c.startTime).getTime();
          const diffMs = Math.abs(callTime - targetDate.getTime());
          if (diffMs > 300000) return false; // ±5 minutes
        }

        return true;
      });

      if (matchingCall) {
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

        await patchCallInCache(matchingCall._id.toString(), {
          recordingStatus: 'COMPLETED',
          s3Key: s3Key,
          audioUrl: audioUrl,
        }).catch(() => {});

        reconciledCount++;
        details.push({
          phone: matchingCall.phoneNumber,
          callId: matchingCall.idempotencyKey || matchingCall._id,
          s3Key,
          audioUrl,
        });
      }
    }

    // Set throttle lock
    await cacheSet(RECONCILE_LOCK_KEY, true, RECONCILE_LOCK_TTL);

    return NextResponse.json({
      success: true,
      scannedS3Objects: objects.length,
      pendingCallsChecked: pendingCalls.length,
      reconciledCount,
      details,
    });
  } catch (err: any) {
    console.error('Error reconciling S3 recordings:', err);
    return NextResponse.json({ message: err.message || 'Error reconciling recordings' }, { status: 500 });
  }
}
