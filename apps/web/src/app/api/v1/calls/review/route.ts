import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { patchCallInCache, revalidateCallsCacheInBackground } from '@/lib/cache-service';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { callId, rating, notes, isBookmarked } = body;
    if (!callId) {
      return NextResponse.json({ message: 'callId is required' }, { status: 400 });
    }
    const updateFields: any = {
      reviewedAt: new Date(),
    };

    if (rating !== undefined) updateFields.rating = rating;
    if (notes !== undefined) updateFields.notes = notes;
    if (isBookmarked !== undefined) updateFields.isBookmarked = isBookmarked;
    const updatedCall = await (CallModel as any).findOneAndUpdate(
      {
        $or: [
          { _id: callId.length === 24 ? callId : null },
          { idempotencyKey: callId }
        ]
      },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedCall) {
      return NextResponse.json({ message: 'Call not found' }, { status: 404 });
    }
    // Update Redis cache non-destructively
    await patchCallInCache(callId, updateFields).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Call review saved successfully',
      call: updatedCall,
    });
  } catch (err: any) {
    console.error('Error saving call review:', err);
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
