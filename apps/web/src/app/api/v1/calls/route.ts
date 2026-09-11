import { NextResponse } from 'next/server';
import { getCallsWithCache, rebuildCallsCache, formatPhoneNumber, patchCallInCache, updateCallsCacheWithNewBatch, revalidateCallsCacheInBackground, CALLS_CACHE_KEY } from '@/lib/cache-service';
import { cacheDel } from '@/lib/redis';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { getS3Client } from '@/lib/aws';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (forceRefresh) {
      const calls = await rebuildCallsCache();
      const res = NextResponse.json(calls || []);
      res.headers.set('Access-Control-Allow-Origin', '*');
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.headers.set('Cache-Control', 'no-store');
      res.headers.set('X-Cache', 'REBUILT');
      return res;
    }

    const { calls, cacheHit } = await getCallsWithCache();

    const res = NextResponse.json(calls || []);
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    res.headers.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    return res;
  } catch (err: any) {
    console.error('Error in GET /api/v1/calls:', err);
    const errRes = NextResponse.json([], { status: 200 });
    errRes.headers.set('Access-Control-Allow-Origin', '*');
    return errRes;
  }
}

/**
 * POST /api/v1/calls - Manually add a call log (Super Admin)
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));

    const rawPhone = (body.phoneNumber || body.phone || body.phoneNumberMasked || '').trim();
    const formattedPhone = formatPhoneNumber(rawPhone) || rawPhone || '+91 99361 67436';
    const agentName = (body.agentName || body.counselorName || 'Counselor Agent').trim();
    const leadName = (body.leadName || body.name || formattedPhone).trim();
    const channel = (body.channel || 'CELLULAR').toUpperCase();
    const direction = (body.direction || 'OUTGOING').toUpperCase();
    const status = (body.status || 'ANSWERED').toUpperCase();
    const durationSeconds = status === 'ANSWERED' ? Math.max(0, Number(body.durationSeconds || 0)) : 0;
    const startTime = body.startTime ? new Date(body.startTime) : new Date();
    const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
    const disposition = body.disposition || body.notes || 'Manual Call Record';
    const idempotencyKey = `MANUAL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const newCallData = {
      organizationId: '65c1f0000000000000000001',
      idempotencyKey,
      phoneNumber: formattedPhone,
      phoneNumberMasked: formattedPhone,
      phoneNumberHash: '',
      agentName,
      leadName,
      channel,
      direction,
      status,
      durationSeconds,
      startTime,
      endTime,
      disposition,
      notes: body.notes || '',
      team: body.team || body.teamName || '',
      recordingStatus: 'NONE',
      deviceId: 'MANUAL-SUPERADMIN-ENTRY',
      isPrivate: false,
    };

    const createdCall = await (CallModel as any).create(newCallData);

    // Update Redis cache incrementally
    await updateCallsCacheWithNewBatch([createdCall.toObject ? createdCall.toObject() : createdCall]);

    const res = NextResponse.json({
      success: true,
      call: createdCall,
    });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (err: any) {
    console.error('Error creating manual call log:', err);
    return NextResponse.json({ message: err.message || 'Error creating call log' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/calls - Edit any call log & edit any phone number (Super Admin)
 */
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const paramId = searchParams.get('id');
    const body = await req.json().catch(() => ({}));
    const targetId = paramId || body.id || body._id || body.idempotencyKey;

    if (!targetId) {
      return NextResponse.json({ message: 'Call ID or idempotencyKey required for update' }, { status: 400 });
    }

    const updateFields: any = {};
    if (body.phoneNumber !== undefined || body.phone !== undefined) {
      const raw = (body.phoneNumber || body.phone || '').trim();
      const formatted = formatPhoneNumber(raw) || raw;
      updateFields.phoneNumber = formatted;
      updateFields.phoneNumberMasked = formatted;
    }
    if (body.leadName !== undefined || body.name !== undefined) {
      updateFields.leadName = (body.leadName || body.name || '').trim();
    }
    if (body.agentName !== undefined || body.counselorName !== undefined) {
      updateFields.agentName = (body.agentName || body.counselorName || '').trim();
    }
    if (body.channel !== undefined) {
      updateFields.channel = (body.channel || 'CELLULAR').toUpperCase();
    }
    if (body.direction !== undefined) {
      updateFields.direction = (body.direction || 'OUTGOING').toUpperCase();
    }
    if (body.status !== undefined) {
      updateFields.status = (body.status || 'ANSWERED').toUpperCase();
      if (updateFields.status !== 'ANSWERED') {
        updateFields.durationSeconds = 0;
      }
    }
    if (body.durationSeconds !== undefined) {
      updateFields.durationSeconds = Math.max(0, Number(body.durationSeconds || 0));
    }
    if (body.startTime !== undefined) {
      updateFields.startTime = new Date(body.startTime);
    }
    if (body.disposition !== undefined) {
      updateFields.disposition = body.disposition;
    }
    if (body.notes !== undefined) {
      updateFields.notes = body.notes;
    }
    if (body.team !== undefined || body.teamName !== undefined) {
      updateFields.team = body.team || body.teamName;
    }

    // Robust filter matching for ObjectId or idempotencyKey string
    const isHex24 = typeof targetId === 'string' && /^[0-9a-fA-F]{24}$/.test(targetId);
    const filter = isHex24
      ? { $or: [{ _id: new mongoose.Types.ObjectId(targetId) }, { idempotencyKey: targetId }] }
      : { idempotencyKey: targetId };

    const updatedCall = await (CallModel as any).findOneAndUpdate(
      filter,
      { $set: updateFields },
      { new: true }
    ).lean().exec();

    if (!updatedCall) {
      return NextResponse.json({ message: 'Call log not found' }, { status: 404 });
    }

    // Patch cache incrementally
    await patchCallInCache(targetId, updateFields).catch(() => {});

    const res = NextResponse.json({
      success: true,
      call: updatedCall,
    });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (err: any) {
    console.error('Error updating call log:', err);
    return NextResponse.json({ message: err.message || 'Error updating call log' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/calls - Delete any call log & associated S3 audio (Super Admin)
 */
export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const paramId = searchParams.get('id');
    const body = await req.json().catch(() => ({}));
    const targetId = paramId || body.id || body._id || body.idempotencyKey;

    if (!targetId) {
      return NextResponse.json({ message: 'Call ID or idempotencyKey required for deletion' }, { status: 400 });
    }

    // Robust filter matching for ObjectId or idempotencyKey string
    const isHex24 = typeof targetId === 'string' && /^[0-9a-fA-F]{24}$/.test(targetId);
    const filter = isHex24
      ? { $or: [{ _id: new mongoose.Types.ObjectId(targetId) }, { idempotencyKey: targetId }] }
      : { idempotencyKey: targetId };

    const callToDelete = await (CallModel as any).findOne(filter).lean().exec();

    if (!callToDelete) {
      return NextResponse.json({ message: 'Call log not found' }, { status: 404 });
    }

    // If call has S3 audio file, delete it from AWS S3
    if (callToDelete.s3Key) {
      const s3Info = getS3Client();
      if (s3Info) {
        try {
          const delCmd = new DeleteObjectCommand({
            Bucket: s3Info.bucket,
            Key: callToDelete.s3Key,
          });
          await s3Info.client.send(delCmd);
          console.log(`Deleted S3 recording for call ${targetId}: ${callToDelete.s3Key}`);
        } catch (s3Err) {
          console.warn(`Could not delete S3 audio for call ${targetId}:`, s3Err);
        }
      }
    }

    // Delete from MongoDB
    await (CallModel as any).deleteOne(filter).exec();

    // Invalidate Redis cache immediately
    await cacheDel(CALLS_CACHE_KEY).catch(() => {});
    revalidateCallsCacheInBackground();

    const res = NextResponse.json({
      success: true,
      deletedId: targetId,
      deletedCall: callToDelete,
    });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (err: any) {
    console.error('Error deleting call log:', err);
    return NextResponse.json({ message: err.message || 'Error deleting call log' }, { status: 500 });
  }
}
