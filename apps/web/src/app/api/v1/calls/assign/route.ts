import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel, DeviceModel } from '@/lib/models';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { deviceId, agentName, counselorEmail } = body;

    if (!deviceId || !agentName) {
      return NextResponse.json({ message: 'deviceId and agentName are required' }, { status: 400 });
    }

    const email = counselorEmail || '';

    // Bulk update all calls for this deviceId
    const updateResult = await (CallModel as any).updateMany(
      { deviceId },
      { $set: { agentName, counselorEmail: email } }
    );

    // Upsert device record
    await (DeviceModel as any).updateOne(
      { deviceId },
      { $set: { deviceId, agentName, counselorEmail: email, lastSyncTimestamp: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: `Updated ${updateResult.modifiedCount || updateResult.nModified || 0} call records to counselor "${agentName}"`,
      agentName,
      deviceId,
    });
  } catch (err: any) {
    console.error('Error assigning counselor to device calls:', err);
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
