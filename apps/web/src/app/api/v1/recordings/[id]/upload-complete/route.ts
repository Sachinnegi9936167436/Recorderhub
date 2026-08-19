import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const recordingId = params.id;
    const body = await req.json().catch(() => ({}));
    const callId = body.callId;

    const audioUrl = `/api/v1/recordings/${recordingId}/audio`;

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

    // 2. Fallback matching by 10-digit phone number extracted from callId / recordingId
    if (!updated && (callId || recordingId)) {
      const targetStr = callId || recordingId;
      const digitsOnly = targetStr.replace(/\D/g, '');
      const cleanDigits = digitsOnly.slice(-10);

      if (cleanDigits.length === 10) {
        updated = await (CallModel as any).findOneAndUpdate(
          {
            phoneNumber: { $regex: new RegExp(`${cleanDigits}$`) },
            $or: [
              { recordingStatus: { $in: ['PENDING_UPLOAD', 'PENDING', 'NONE'] } },
              { audioUrl: { $exists: false } }
            ]
          },
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
