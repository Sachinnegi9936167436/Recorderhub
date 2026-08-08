import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await connectToDatabase();
    const calls = await (CallModel as any).find().sort({ createdAt: -1 }).limit(100).exec();
    return NextResponse.json(calls);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error fetching calls' }, { status: 500 });
  }
}
