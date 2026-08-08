import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const callEvents = body.callEvents || [];

    const syncedIds: string[] = [];
    const duplicates: string[] = [];

    for (const evt of callEvents) {
      const existing = await (CallModel as any).findOne({ idempotencyKey: evt.idempotencyKey });
      if (existing) {
        duplicates.push(evt.idempotencyKey);
      } else {
        await (CallModel as any).create({
          deviceId: evt.deviceId || 'ANDROID-XIAOMI-PROD',
          idempotencyKey: evt.idempotencyKey,
          phoneNumberMasked: evt.phoneNumber,
          direction: evt.direction || 'INCOMING',
          status: evt.status || 'ANSWERED',
          startTime: evt.startTime ? new Date(evt.startTime) : new Date(),
          endTime: evt.endTime ? new Date(evt.endTime) : new Date(),
          durationSeconds: evt.durationSeconds || 0,
          simSlot: evt.simSlot || 0,
          isPrivate: evt.isPrivate || false,
          disposition: evt.disposition || 'Imported Phone Call',
        });
        syncedIds.push(evt.idempotencyKey);
      }
    }

    return NextResponse.json({
      syncedCount: syncedIds.length,
      duplicateCount: duplicates.length,
      syncedIds,
      duplicates,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error syncing calls' }, { status: 500 });
  }
}
