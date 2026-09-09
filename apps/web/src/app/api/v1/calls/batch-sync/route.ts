import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel, DeviceModel, UserModel } from '@/lib/models';
import { cacheDel } from '@/lib/redis';
import { getS3Client } from '@/lib/aws';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
    const completedRecordingIds = Array.isArray(body.completedRecordingIds) ? body.completedRecordingIds : [];

    // Mark any finished uploads confirmed by batch payload
    if (completedRecordingIds.length > 0) {
      try {
        await (CallModel as any).updateMany(
          {
            $or: [
              { idempotencyKey: { $in: completedRecordingIds } },
              { s3Key: { $in: completedRecordingIds } }
            ]
          },
          { $set: { recordingStatus: 'COMPLETED' } }
        );
      } catch (markErr) {
        console.warn('Error marking completed recordings in batch-sync:', markErr);
      }
    }

    if (!callEvents || callEvents.length === 0) {
      return NextResponse.json({
        syncedCount: 0,
        duplicateCount: 0,
        syncedIds: [],
        duplicates: [],
        uploadUrls: [],
      });
    }

    const syncedIds: string[] = [];
    const duplicates: string[] = [];
    const uploadUrls: Array<{
      idempotencyKey: string;
      recordingId: string;
      s3Key: string;
      presignedPutUrl: string;
      fallbackUploadUrl?: string;
    }> = [];
    const deviceUpdates = new Map<string, { agentName: string; email: string }>();

    // 1. Pre-fetch existing keys and counselor account creation dates in bulk queries
    const incomingKeys = callEvents.map((e: any) => e.idempotencyKey).filter(Boolean);
    const existingCalls = await (CallModel as any).find(
      { idempotencyKey: { $in: incomingKeys } },
      { idempotencyKey: 1, _id: 1, agentName: 1, s3Key: 1, audioUrl: 1, recordingStatus: 1 }
    ).lean().exec();
    const existingKeyMap = new Map(existingCalls.map((c: any) => [c.idempotencyKey, c]));

    const counselorEmails = Array.from(new Set(callEvents.map((e: any) => (e.counselorEmail || e.email || '').trim().toLowerCase()).filter(Boolean)));
    const emailRegexList = counselorEmails.map((em: string) => new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
    const userAccounts = counselorEmails.length > 0
      ? await (UserModel as any).find(
          { email: { $in: emailRegexList } },
          { email: 1, createdAt: 1, isActive: 1 }
        ).lean().exec()
      : [];

    if (counselorEmails.length > 0 && (!userAccounts || userAccounts.length === 0)) {
      return NextResponse.json(
        { message: 'Counselor account has been deleted by administrator. Session revoked.', revoked: true },
        { status: 401 }
      );
    }

    const userCreatedAtMap = new Map<string, number>();
    for (const u of (userAccounts || [])) {
      if (u.email && u.createdAt) {
        userCreatedAtMap.set(u.email.toLowerCase(), new Date(u.createdAt).getTime());
      }
    }

    const s3Info = getS3Client();
    const host = req.headers.get('host') || 'localhost:3000';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('10.0.2.2');
    const protocol = isLocal ? 'http' : 'https';

    for (const evt of callEvents) {
      if (!evt || !evt.idempotencyKey) continue;

      // Reject text/chat message notifications
      const fullTextStr = `${evt.phoneNumber || ''} ${evt.leadName || ''} ${evt.disposition || ''}`.toLowerCase();
      if (fullTextStr.includes('message') || fullTextStr.includes('messages') || fullTextStr.includes('chat') || fullTextStr.includes('unread')) {
        syncedIds.push(evt.idempotencyKey);
        continue;
      }

      const email = evt.counselorEmail || evt.email;
      const derivedName = email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : null;
      const resolvedAgentName = evt.agentName || derivedName || 'Counselor Agent';
      const evtStartTime = evt.startTime ? new Date(evt.startTime) : new Date();

      // Enforce strict cutoff: Reject calls that occurred prior to counselor account creation date
      if (email && userCreatedAtMap.has(email.toLowerCase())) {
        const accountCreatedAtMs = userCreatedAtMap.get(email.toLowerCase())!;
        if (evtStartTime.getTime() < (accountCreatedAtMs - 60000)) {
          syncedIds.push(evt.idempotencyKey);
          continue;
        }
      }

      if (evt.deviceId && resolvedAgentName && resolvedAgentName !== 'Counselor Agent') {
        deviceUpdates.set(evt.deviceId, { agentName: resolvedAgentName, email: email || '' });
      }

      // Helper function to generate S3 Presigned URL for direct APK upload
      const generatePresignedUploadInfo = async (key: string, deviceIdVal: string, mimeTypeVal?: string) => {
        const rawDigits = (key || '').replace(/\D/g, '');
        const cleanP = rawDigits.length >= 10 ? rawDigits.slice(-10) : 'CALL';
        const dateString = evtStartTime.toISOString().replace(/\D/g, '').slice(0, 14);
        const uniqueSuffix = Math.random().toString(36).substring(2, 6);
        
        // Format folder name with the Counselor Name as seen on Web Dashboard
        const counselorFolder = (resolvedAgentName && resolvedAgentName !== 'Counselor Agent')
          ? resolvedAgentName.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
          : (email ? email.split('@')[0].replace(/[._]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') : (deviceIdVal ? deviceIdVal.replace(/[^a-zA-Z0-9_-]/g, '_') : 'AGENT'));

        const recId = `${counselorFolder}_${cleanP}_${dateString}_${uniqueSuffix}`;

        const mime = mimeTypeVal || 'audio/mp4';
        const ext = mime.includes('mpeg') || mime.includes('mp3') ? 'mp3'
                  : mime.includes('wav') ? 'wav'
                  : mime.includes('3gpp') || mime.includes('3gp') ? '3gp'
                  : mime.includes('amr') ? 'amr' : 'm4a';

        const s3KeyTarget = `recordings/${counselorFolder}/${recId}.${ext}`;
        const audioUrlTarget = `/api/v1/recordings/${recId}/audio`;
        const fallbackUrl = `${protocol}://${host}/api/v1/recordings/${recId}/upload-data`;

        let presignedUrl = fallbackUrl;
        if (s3Info) {
          try {
            const cmd = new PutObjectCommand({
              Bucket: s3Info.bucket,
              Key: s3KeyTarget,
              ContentType: mime,
            });
            presignedUrl = await getSignedUrl(s3Info.client, cmd, { expiresIn: 900 });
          } catch (e) {
            console.warn('S3 presign generation error in batch sync:', e);
            presignedUrl = fallbackUrl;
          }
        }

        return {
          recordingId: recId,
          s3Key: s3KeyTarget,
          audioUrl: audioUrlTarget,
          presignedPutUrl: presignedUrl,
          fallbackUploadUrl: fallbackUrl,
        };
      };

      // Check 1: Exact idempotencyKey already in DB
      if (existingKeyMap.has(evt.idempotencyKey)) {
        duplicates.push(evt.idempotencyKey);
        // If the mobile app requested an upload URL for this existing call, generate it
        if (evt.hasRecording) {
          const existingDoc = existingKeyMap.get(evt.idempotencyKey);
          const uploadInfo = await generatePresignedUploadInfo(evt.idempotencyKey, evt.deviceId || 'ANDROID-DEVICE-PROD', evt.mimeType);
          await (CallModel as any).updateOne(
            { idempotencyKey: evt.idempotencyKey },
            { $set: { recordingStatus: 'PENDING_UPLOAD', s3Key: uploadInfo.s3Key, audioUrl: uploadInfo.audioUrl } }
          ).catch(() => {});
          uploadUrls.push({
            idempotencyKey: evt.idempotencyKey,
            recordingId: uploadInfo.recordingId,
            s3Key: uploadInfo.s3Key,
            presignedPutUrl: uploadInfo.presignedPutUrl,
            fallbackUploadUrl: uploadInfo.fallbackUploadUrl,
          });
        }
        continue;
      }

      try {
        const rawPhone = evt.phoneNumber || '';
        const digitsOnly = rawPhone.replace(/\D/g, '');
        const cleanDigits = digitsOnly.slice(-10);
        const formattedPhone = cleanDigits.length === 10 ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}` : rawPhone;

        const minTime = new Date(evtStartTime.getTime() - 120000);
        const maxTime = new Date(evtStartTime.getTime() + 120000);

        const isWhatsApp = 
          (evt.channel || '').toUpperCase() === 'WHATSAPP' ||
          (evt.disposition || '').toLowerCase().includes('whatsapp') || 
          (evt.idempotencyKey || '').startsWith('WA_');

        const channelType = isWhatsApp ? 'WHATSAPP' : (evt.channel || 'CELLULAR');
        const cleanKey = evt.idempotencyKey || `SYNC_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const isAnswered = (evt.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
        const effectiveDuration = isAnswered ? (evt.durationSeconds || 0) : 0;

        let uploadInfo = null;
        if (evt.hasRecording) {
          uploadInfo = await generatePresignedUploadInfo(cleanKey, evt.deviceId || 'ANDROID-DEVICE-PROD', evt.mimeType);
          uploadUrls.push({
            idempotencyKey: cleanKey,
            recordingId: uploadInfo.recordingId,
            s3Key: uploadInfo.s3Key,
            presignedPutUrl: uploadInfo.presignedPutUrl,
            fallbackUploadUrl: uploadInfo.fallbackUploadUrl,
          });
        }

        // Check 2: Deduplicate within 120-second time window for same clean 10-digit number & channel (CELLULAR only - WhatsApp calls always create distinct records)
        let matchByTimeWindow = null;
        if (!isWhatsApp && cleanDigits.length === 10) {
          const regexPattern = new RegExp(cleanDigits.split('').join('\\s*') + '$');
          matchByTimeWindow = await (CallModel as any).findOne({
            phoneNumber: { $regex: regexPattern },
            startTime: { $gte: minTime, $lte: maxTime },
            channel: channelType,
          });
        }

        if (matchByTimeWindow) {
          const newDuration = isAnswered ? Math.max(matchByTimeWindow.durationSeconds || 0, effectiveDuration) : 0;
          const updateFields: any = {
            idempotencyKey: evt.idempotencyKey || matchByTimeWindow.idempotencyKey,
            status: isAnswered ? (matchByTimeWindow.status || 'ANSWERED') : 'UNANSWERED',
            durationSeconds: newDuration,
            phoneNumber: formattedPhone,
            phoneNumberMasked: formattedPhone,
            leadName: evt.leadName || matchByTimeWindow.leadName || formattedPhone,
            agentName: resolvedAgentName,
            counselorEmail: email,
          };
          if (uploadInfo) {
            updateFields.recordingStatus = 'PENDING_UPLOAD';
            updateFields.s3Key = uploadInfo.s3Key;
            updateFields.audioUrl = uploadInfo.audioUrl;
          }

          await (CallModel as any).updateOne(
            { _id: matchByTimeWindow._id },
            { $set: updateFields }
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
          endTime: evt.endTime ? new Date(evt.endTime) : new Date(evtStartTime.getTime() + (effectiveDuration * 1000)),
          durationSeconds: effectiveDuration,
          simSlot: evt.simSlot || 0,
          isPrivate: evt.isPrivate || false,
          disposition: evt.disposition || (isWhatsApp ? 'WhatsApp Call' : 'Imported Phone Call'),
          channel: channelType,
          agentName: resolvedAgentName,
          counselorEmail: email,
          leadName: evt.leadName || formattedPhone || 'Contact',
          recordingStatus: uploadInfo ? 'PENDING_UPLOAD' : 'NONE',
          s3Key: uploadInfo?.s3Key,
          audioUrl: uploadInfo?.audioUrl,
        });

        existingKeyMap.set(cleanKey, { idempotencyKey: cleanKey });
        syncedIds.push(cleanKey);
      } catch (evtErr: any) {
        console.error(`Error saving individual call event ${evt.idempotencyKey}:`, evtErr);
        duplicates.push(evt.idempotencyKey);
      }
    }

    // 2. Perform bulk device/agent update ONCE outside the loop
    if (deviceUpdates.size > 0) {
      for (const [deviceId, info] of Array.from(deviceUpdates.entries())) {
        try {
          await (CallModel as any).updateMany(
            { deviceId },
            { $set: { agentName: info.agentName, counselorEmail: info.email } }
          );
          await (DeviceModel as any).updateOne(
            { deviceId },
            { $set: { agentName: info.agentName, counselorEmail: info.email, lastSyncTimestamp: new Date() } },
            { upsert: true }
          );
        } catch (e) {
          console.warn('Error updating device agent mapping in batch sync:', e);
        }
      }
    }

    // Invalidate Redis cache so dashboard immediately gets latest calls
    await cacheDel('cache:calls:latest').catch(() => {});

    console.log(`Batch sync completed: ${syncedIds.length} synced, ${duplicates.length} dups, ${uploadUrls.length} S3 presigned URLs generated.`);

    return NextResponse.json({
      syncedCount: syncedIds.length,
      duplicateCount: duplicates.length,
      syncedIds,
      duplicates,
      uploadUrls,
    });
  } catch (err: any) {
    console.error('Critical error in batch-sync API route:', err);
    return NextResponse.json({ message: err.message || 'Error syncing calls', stack: err.stack }, { status: 500 });
  }
}
