import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel, DeviceModel } from '@/lib/models';

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

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const callEvents = Array.isArray(body) ? body : (body.callEvents || body.events || []);

    const syncedIds: string[] = [];
    const duplicates: string[] = [];

    for (const evt of callEvents) {
      if (!evt || !evt.idempotencyKey) continue;

      // Reject text/chat message notifications (only record actual voice/video calls)
      const fullTextStr = `${evt.phoneNumber || ''} ${evt.leadName || ''} ${evt.disposition || ''}`.toLowerCase();
      if (fullTextStr.includes('message') || fullTextStr.includes('messages') || fullTextStr.includes('chat') || fullTextStr.includes('unread')) {
        console.log(`Skipping text message notification in batch sync: ${evt.phoneNumber}`);
        syncedIds.push(evt.idempotencyKey);
        continue;
      }

      try {
        const rawPhone = evt.phoneNumber || '';
        const digitsOnly = rawPhone.replace(/\D/g, '');
        const cleanDigits = digitsOnly.slice(-10);
        const formattedPhone = cleanDigits.length === 10 ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}` : rawPhone;

        const evtStartTime = evt.startTime ? new Date(evt.startTime) : new Date();
        const minTime = new Date(evtStartTime.getTime() - 120000);
        const maxTime = new Date(evtStartTime.getTime() + 120000);

        const isWhatsApp = 
          (evt.channel || '').toUpperCase() === 'WHATSAPP' ||
          (evt.disposition || '').toLowerCase().includes('whatsapp') || 
          (evt.idempotencyKey || '').startsWith('WA_');

        const channelType = isWhatsApp ? 'WHATSAPP' : (evt.channel || 'CELLULAR');

        const cleanKey = evt.idempotencyKey || `SYNC_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const email = evt.counselorEmail || evt.email;
        const derivedName = email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : null;
        const resolvedAgentName = evt.agentName || derivedName || 'Counselor Agent';

        // Check 1: Exact idempotencyKey match
        const exactExisting = await (CallModel as any).findOne({ idempotencyKey: evt.idempotencyKey });
        if (exactExisting) {
          if (resolvedAgentName && resolvedAgentName !== 'Counselor Agent' && exactExisting.agentName !== resolvedAgentName) {
            await (CallModel as any).updateOne({ _id: exactExisting._id }, { $set: { agentName: resolvedAgentName, counselorEmail: email } }).catch(() => {});
          }
          duplicates.push(evt.idempotencyKey);
          continue;
        }

        // Check 2: Deduplicate within 120-second time window for same clean 10-digit number & channel
        let matchByTimeWindow = null;
        if (cleanDigits.length === 10) {
          const regexPattern = new RegExp(`${cleanDigits}$`);
          matchByTimeWindow = await (CallModel as any).findOne({
            phoneNumber: { $regex: regexPattern },
            startTime: { $gte: minTime, $lte: maxTime },
            channel: channelType,
          });
        }

        if (matchByTimeWindow) {
          console.log(`Deduplicated incoming batch call event ${evt.idempotencyKey} with existing call ${matchByTimeWindow.idempotencyKey}`);
          const newDuration = Math.max(matchByTimeWindow.durationSeconds || 0, evt.durationSeconds || 0);
          await (CallModel as any).updateOne(
            { _id: matchByTimeWindow._id },
            {
              $set: {
                idempotencyKey: evt.idempotencyKey || matchByTimeWindow.idempotencyKey,
                durationSeconds: newDuration,
                phoneNumber: formattedPhone,
                phoneNumberMasked: formattedPhone,
                leadName: evt.leadName || matchByTimeWindow.leadName || formattedPhone,
                agentName: resolvedAgentName,
                counselorEmail: email,
              }
            }
          );
          duplicates.push(evt.idempotencyKey);
          continue;
        }

        await (CallModel as any).create({
          organizationId: evt.organizationId || '65c1f0000000000000000001',
          deviceId: evt.deviceId || 'ANDROID-DEVICE-PROD',
          idempotencyKey: cleanKey,
          phoneNumber: formattedPhone,
          phoneNumberMasked: formattedPhone,
          direction: evt.direction || 'INCOMING',
          status: evt.status || 'ANSWERED',
          startTime: evtStartTime,
          endTime: evt.endTime ? new Date(evt.endTime) : new Date(evtStartTime.getTime() + ((evt.durationSeconds || 0) * 1000)),
          durationSeconds: evt.durationSeconds || 0,
          simSlot: evt.simSlot || 0,
          isPrivate: evt.isPrivate || false,
          disposition: evt.disposition || (isWhatsApp ? 'WhatsApp Call' : 'Imported Phone Call'),
          channel: channelType,
          agentName: resolvedAgentName,
          counselorEmail: email,
          leadName: evt.leadName || formattedPhone || 'Contact',
        });

        // Bulk update ALL past calls sharing this deviceId to reflect the current logged-in user name
        if (evt.deviceId && resolvedAgentName && resolvedAgentName !== 'Counselor Agent') {
          await (CallModel as any).updateMany(
            { deviceId: evt.deviceId },
            { $set: { agentName: resolvedAgentName, counselorEmail: email } }
          ).catch(() => {});

          await (DeviceModel as any).updateOne(
            { deviceId: evt.deviceId },
            { $set: { agentName: resolvedAgentName, counselorEmail: email, lastSyncTimestamp: new Date() } },
            { upsert: true }
          ).catch(() => {});
        }

        syncedIds.push(cleanKey);
      } catch (evtErr: any) {
        console.error(`Error saving individual call event ${evt.idempotencyKey}:`, evtErr);
        // Treat as duplicate/synced if unique constraint violated
        duplicates.push(evt.idempotencyKey);
      }
    }

    console.log(`Batch sync completed successfully: ${syncedIds.length} new, ${duplicates.length} duplicates.`);

    return NextResponse.json({
      syncedCount: syncedIds.length,
      duplicateCount: duplicates.length,
      syncedIds,
      duplicates,
    });
  } catch (err: any) {
    console.error('Critical error in batch-sync API route:', err);
    return NextResponse.json({ message: err.message || 'Error syncing calls', stack: err.stack }, { status: 500 });
  }
}
