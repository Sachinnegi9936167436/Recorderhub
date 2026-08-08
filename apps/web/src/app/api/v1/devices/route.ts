import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DeviceModel } from '@/lib/models';

export async function GET() {
  try {
    await connectToDatabase();
    const devices = await (DeviceModel as any).find().exec();
    return NextResponse.json(devices);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error fetching devices' }, { status: 500 });
  }
}
