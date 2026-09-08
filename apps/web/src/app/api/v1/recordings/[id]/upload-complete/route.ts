import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { cacheDel } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseTimestamp(str: string): Date | null {
  if (!str) return null;
  // 1. Check 14-digit YYYYMMDDHHmmss format (e.g. 20260905053632)
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

  // 2. Check 13-digit epoch timestamp (e.g. 1757050592000)
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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const recordingId = params.id;
    const body = await req.json().catch(() => ({}));
    const callId = body.callId;

    const audioUrl = `/api/v1/recordings/${recordingId}/audio`;
    const targetDate = parseTimestamp(recordingId) || parseTimestamp(callId);

    // 1. Direct match by callId idempotencyKey or recordingId
    let updated = await (CallModel as any).findOneAndUpdate(
      {
        $or: [
          { idempotencyKey: callId },
          { idempotencyKey: recordingId },
          { audioUrl: { $regex: recordingId } },
          { s3Key: { $regex: recordingId } },
          { _id: callId && callId.length === 24 ? callId : null }
        ]
      },
      {
        $set: {
          recordingStatus: 'COMPLETED',
          audioUrl: audioUrl,
        },
      },
      { new: true }
    );

    // 2. Fallback matching by 10-digit phone number with strict timestamp window
    if (!updated && (callId || recordingId)) {
      const targetStr = recordingId || callId;
      const digitsOnly = targetStr.replace(/\D/g, '');
      const cleanDigits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : '';

      if (cleanDigits.length === 10) {
        const phoneRegex = buildPhoneRegex(cleanDigits);
        const isWaRecording = (callId && callId.startsWith('WA_')) || recordingId.startsWith('WA_');
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
          query.idempotencyKey = { $not: /^WA_/ };
        }

        if (targetDate) {
          query.startTime = {
            $gte: new Date(targetDate.getTime() - 180000),
            $lte: new Date(targetDate.getTime() + 180000)
          };
        }

        updated = await (CallModel as any).findOneAndUpdate(
          query,
          {
            $set: {
              recordingStatus: 'COMPLETED',
              audioUrl: audioUrl,
            },
          },
          { sort: { startTime: -1, createdAt: -1 }, new: true }
        );
      }
    }

    // Invalidate Redis calls cache so the dashboard immediately updates
    await cacheDel('cache:calls:latest').catch(() => {});

    if (updated) {
      console.log(`Upload complete confirmed for call ${updated.idempotencyKey || updated._id}`);
    } else {
      console.warn(`Upload complete requested for recording ${recordingId}, but no matching call was found.`);
    }

    return NextResponse.json({ success: true, message: 'Recording upload completed successfully', audioUrl });
  } catch (err: any) {
    console.error('Error completing upload:', err);
    return NextResponse.json({ message: err.message || 'Error completing upload' }, { status: 500 });
  }
}
