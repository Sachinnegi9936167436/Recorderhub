import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { recordingId, callId } = body;

    if (recordingId) {
      const query = callId
        ? { idempotencyKey: callId }
        : {
            $or: [
              { audioUrl: { $regex: recordingId } },
              { s3Key: { $regex: recordingId } }
            ]
          };

      const updated = await (CallModel as any).findOneAndUpdate(
        query,
        {
          $set: {
            recordingStatus: 'COMPLETED',
            audioUrl: `/api/v1/recordings/${recordingId}/audio`,
          },
        },
        { sort: { createdAt: -1 }, new: true }
      );

      if (updated) {
        console.log(`Upload complete confirmed for call ${updated.idempotencyKey || updated._id}`);
      } else {
        console.warn(`Upload complete requested for recording ${recordingId}, but no matching call was found.`);
      }
    }

    return NextResponse.json({ success: true, message: 'Recording upload completed successfully' });
  } catch (err: any) {
    console.error('Error completing upload:', err);
    return NextResponse.json({ message: err.message || 'Error completing upload' }, { status: 500 });
  }
}
