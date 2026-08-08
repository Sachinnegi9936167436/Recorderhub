import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await connectToDatabase();
    const counselors = await (UserModel as any).find().select('-passwordHash').exec();
    return NextResponse.json(counselors);
  } catch (err: any) {
    console.error('Error fetching counselors:', err);
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
