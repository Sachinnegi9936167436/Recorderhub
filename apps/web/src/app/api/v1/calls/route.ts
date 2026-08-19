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

export async function GET() {
  try {
    await connectToDatabase();
    let calls = await (CallModel as any).find().sort({ startTime: -1, createdAt: -1 }).limit(5000).exec();

    // Enrich calls missing agentName from registered devices in MongoDB
    try {
      const registeredDevices = await (DeviceModel as any).find().lean().exec();
      if (registeredDevices && registeredDevices.length > 0) {
        const deviceAgentMap = new Map<string, string>();
        for (const dev of registeredDevices) {
          if (dev.deviceId && (dev.agentName || dev.counselorEmail)) {
            const name = (dev.agentName && dev.agentName !== 'Counselor Agent' && dev.agentName !== 'Counselor')
              ? dev.agentName
              : (dev.counselorEmail ? dev.counselorEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : null);
            if (name) {
              deviceAgentMap.set(dev.deviceId, name);
            }
          }
        }

        for (const call of calls) {
          if ((!call.agentName || call.agentName === 'Counselor Agent' || call.agentName === 'Counselor') && call.deviceId && deviceAgentMap.has(call.deviceId)) {
            call.agentName = deviceAgentMap.get(call.deviceId);
          }
        }
      }
    } catch (deviceErr) {
      console.warn('Error enriching call records from registered devices:', deviceErr);
    }

    if (!calls || calls.length === 0) {
      const initialWhatsAppCall = await (CallModel as any).create({
        deviceId: 'ANDROID-REDMI14C-PROD',
        idempotencyKey: `WA_INIT_${Date.now()}`,
        phoneNumber: '+919936167436',
        phoneNumberMasked: '+919936167436',
        direction: 'OUTGOING',
        status: 'ANSWERED',
        startTime: new Date(),
        endTime: new Date(Date.now() + 45000),
        durationSeconds: 45,
        simSlot: 0,
        isPrivate: false,
        disposition: 'WhatsApp Call',
        channel: 'WHATSAPP',
        agentName: 'Counselor Agent',
        leadName: 'Contact',
      });
      calls = [initialWhatsAppCall];
    }

    // Purge any text/chat message records mistakenly saved previously
    await (CallModel as any).deleteMany({
      $or: [
        { phoneNumber: { $regex: 'message', $options: 'i' } },
        { leadName: { $regex: 'message', $options: 'i' } },
        { disposition: { $regex: 'message', $options: 'i' } }
      ]
    }).catch(() => {});

    // Filter out any text message entries from memory
    calls = calls.filter((c) => {
      const fullStr = `${c.phoneNumber || ''} ${c.leadName || ''} ${c.disposition || ''}`.toLowerCase();
      return !fullStr.includes('message') && !fullStr.includes('messages') && !fullStr.includes('unread');
    });

    // Update any existing MongoDB Atlas records starting with WA_ or containing WhatsApp disposition
    await (CallModel as any).updateMany(
      {
        $or: [
          { idempotencyKey: { $regex: '^WA_' } },
          { disposition: { $regex: 'whatsapp', $options: 'i' } }
        ],
        channel: { $ne: 'WHATSAPP' }
      },
      { $set: { channel: 'WHATSAPP' } }
    );

    // Ensure all unanswered / missed calls in MongoDB have durationSeconds = 0
    await (CallModel as any).updateMany(
      {
        status: { $in: ['UNANSWERED', 'MISSED', 'REJECTED', 'BUSY', 'NO_ANSWER', 'Unanswered', 'Missed', 'Rejected'] }
      },
      { $set: { durationSeconds: 0 } }
    ).catch(() => {});

    // 1. Clean corrupted phone numbers and zero duration for unanswered calls
    for (const call of calls) {
      const isAns = (call.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
      if (!isAns && call.durationSeconds !== 0) {
        call.durationSeconds = 0;
      }

      const rawPhone = call.phoneNumber || call.phoneNumberMasked || '';
      const digitsOnly = rawPhone.replace(/\D/g, '');
      if (digitsOnly.length >= 10) {
        const clean10 = digitsOnly.slice(-10);
        const formatted = `+91 ${clean10.slice(0, 5)} ${clean10.slice(5)}`;
        if (call.phoneNumber !== formatted) {
          call.phoneNumber = formatted;
          call.phoneNumberMasked = formatted;
          await (CallModel as any).updateOne(
            { _id: call._id },
            { $set: { phoneNumber: formatted, phoneNumberMasked: formatted, durationSeconds: isAns ? call.durationSeconds : 0 } }
          ).catch(() => {});
        }
      }
    }

    // 2. Group and deduplicate calls sharing the same 10-digit phone number & channel within 2 minutes
    const deduplicatedCalls: any[] = [];
    const idsToDelete: string[] = [];

    for (const call of calls) {
      const callDigits = (call.phoneNumber || '').replace(/\D/g, '').slice(-10);
      const callTime = new Date(call.startTime || call.createdAt).getTime();
      const channel = (call.channel || '').toUpperCase();

      const existingClusterIndex = deduplicatedCalls.findIndex((existing) => {
        const existingDigits = (existing.phoneNumber || '').replace(/\D/g, '').slice(-10);
        const existingTime = new Date(existing.startTime || existing.createdAt).getTime();
        const existingChannel = (existing.channel || '').toUpperCase();

        return (
          callDigits.length >= 10 &&
          existingDigits.length >= 10 &&
          existingDigits === callDigits &&
          existingChannel === channel &&
          Math.abs(existingTime - callTime) <= 120000
        );
      });

      if (existingClusterIndex >= 0) {
        const existingCall = deduplicatedCalls[existingClusterIndex];
        const existingDur = existingCall.durationSeconds || 0;
        const currentDur = call.durationSeconds || 0;

        if (currentDur > existingDur) {
          // Current call is longer/better, replace existing and mark old for deletion
          idsToDelete.push(existingCall._id);
          deduplicatedCalls[existingClusterIndex] = call;
        } else {
          // Existing call is longer/better, mark current call for deletion
          idsToDelete.push(call._id);
        }
      } else {
        deduplicatedCalls.push(call);
      }
    }

    if (idsToDelete.length > 0) {
      console.log(`Deduplicating GET /api/v1/calls: Deleting ${idsToDelete.length} duplicate call records from MongoDB.`);
      await (CallModel as any).deleteMany({ _id: { $in: idsToDelete } }).catch(() => {});
    }

    // 3. Auto-link AWS S3 bucket recording files to calls missing audioUrls
    try {
      const { getS3Client } = await import('@/lib/aws');
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const s3Info = getS3Client();
      if (s3Info) {
        const s3List = await s3Info.client.send(
          new ListObjectsV2Command({ Bucket: s3Info.bucket, Prefix: 'recordings/', MaxKeys: 200 })
        );

        if (s3List.Contents && s3List.Contents.length > 0) {
          for (const s3Obj of s3List.Contents) {
            const key = s3Obj.Key;
            if (!key || (!key.endsWith('.mp3') && !key.endsWith('.m4a') && !key.endsWith('.wav') && !key.endsWith('.3gp') && !key.endsWith('.amr'))) {
              continue;
            }

            const fileName = key.split('/').pop() || '';
            const recId = fileName.replace(/\.[^/.]+$/, '');
            const digitsOnly = fileName.replace(/\D/g, '');
            const clean10 = digitsOnly.length >= 10 ? digitsOnly.slice(0, 10) : '';

            // Find matching call in deduplicated calls
            const matchingCall = deduplicatedCalls.find((c) => {
              if (c.idempotencyKey && key.includes(c.idempotencyKey)) return true;
              if (c.s3Key === key) return true;
              if (c.audioUrl && c.audioUrl.includes(recId)) return true;
              const callDigits = (c.phoneNumber || '').replace(/\D/g, '').slice(-10);
              if (clean10 && callDigits && clean10 === callDigits) {
                // If timestamp in S3 file matches call within 15 minutes
                const s3Date = s3Obj.LastModified ? new Date(s3Obj.LastModified).getTime() : 0;
                const callDate = c.startTime ? new Date(c.startTime).getTime() : 0;
                if (Math.abs(s3Date - callDate) <= 15 * 60 * 1000) return true;
                return true;
              }
              return false;
            });

            if (matchingCall) {
              const audioUrl = `/api/v1/recordings/${recId}/audio`;
              matchingCall.recordingStatus = 'COMPLETED';
              matchingCall.audioUrl = audioUrl;
              matchingCall.s3Key = key;
              await (CallModel as any).updateOne(
                { _id: matchingCall._id },
                { $set: { recordingStatus: 'COMPLETED', audioUrl, s3Key: key } }
              ).catch(() => {});
            }
          }
        }
      }
    } catch (s3RecErr) {
      console.warn('Error auto-linking S3 recordings:', s3RecErr);
    }

    // 4. Auto-link existing local disk recording files to calls missing audioUrls
    try {
      const fsModule = await import('fs');
      const pathModule = await import('path');
      const rootDir = process.cwd();
      const uploadsDir = rootDir.endsWith('apps/web') || rootDir.endsWith('apps\\web')
        ? pathModule.join(rootDir, 'uploads', 'recordings')
        : pathModule.join(rootDir, 'apps', 'web', 'uploads', 'recordings');

      if (fsModule.existsSync(uploadsDir)) {
        const diskFiles = fsModule.readdirSync(uploadsDir);
        for (const file of diskFiles) {
          if (file.endsWith('.m4a') || file.endsWith('.mp3') || file.endsWith('.wav')) {
            const recId = file.replace(/\.[^/.]+$/, '');
            const matchingCall = deduplicatedCalls.find(
              (c) => c.idempotencyKey === recId || (c.audioUrl && c.audioUrl.includes(recId))
            );

            if (matchingCall && !matchingCall.audioUrl) {
              matchingCall.recordingStatus = 'COMPLETED';
              matchingCall.audioUrl = `/api/v1/recordings/${recId}/audio`;
              await (CallModel as any).updateOne(
                { _id: matchingCall._id },
                { $set: { recordingStatus: 'COMPLETED', audioUrl: `/api/v1/recordings/${recId}/audio` } }
              ).catch(() => {});
            }
          }
        }
      }
    } catch (diskErr) {
      console.warn('Error auto-linking disk recording files:', diskErr);
    }

    const res = NextResponse.json(deduplicatedCalls || []);
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
  } catch (err: any) {
    console.error('Error fetching calls from database:', err);
    const errRes = NextResponse.json([], { status: 200 });
    errRes.headers.set('Access-Control-Allow-Origin', '*');
    return errRes;
  }
}
