import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DeviceModel, CallModel } from '@/lib/models';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { deviceId, agentName, counselorEmail, deviceModel, androidVersion, appVersion } = body;

    if (!deviceId) {
      return NextResponse.json({ message: 'deviceId is required' }, { status: 400 });
    }

    const email = counselorEmail || body.email;
    const derivedName = email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : null;
    const resolvedName = agentName || derivedName || 'Counselor Agent';

    const updatedDevice = await (DeviceModel as any).findOneAndUpdate(
      { deviceId },
      {
        $set: {
          deviceId,
          agentName: resolvedName,
          counselorEmail: email,
          deviceModel: deviceModel || 'Android Phone',
          androidVersion: androidVersion || 'Android 14',
          appVersion: appVersion || 'v1.0.4',
          lastSyncTimestamp: new Date(),
          status: 'HEALTHY',
        },
      },
      { upsert: true, new: true }
    );

    if (resolvedName && resolvedName !== 'Counselor Agent') {
      await (CallModel as any).updateMany(
        { deviceId },
        { $set: { agentName: resolvedName, counselorEmail: email } }
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, data: updatedDevice });
  } catch (err: any) {
    console.error('Error registering device:', err);
    return NextResponse.json({ message: err.message || 'Error registering device' }, { status: 500 });
  }
}
