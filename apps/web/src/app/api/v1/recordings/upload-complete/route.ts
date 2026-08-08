import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { recordingId } = body;

    if (recordingId) {
      await (CallModel as any).findOneAndUpdate(
        { recordingStatus: 'PENDING' },
        {
          $set: {
            recordingStatus: 'COMPLETED',
            audioUrl: `https://recorderhub-gold.vercel.app/api/v1/recordings/${recordingId}/audio`,
          },
        },
        { sort: { createdAt: -1 } },
      );
    }

    return NextResponse.json({ success: true, message: 'Recording upload completed successfully' });
  } catch (err: any) {
    console.error('Error completing upload:', err);
    return NextResponse.json({ message: err.message || 'Error completing upload' }, { status: 500 });
  }
}
