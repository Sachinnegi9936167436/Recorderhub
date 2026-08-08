import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const updated = await (UserModel as any).findByIdAndUpdate(params.id, { $set: body }, { new: true }).select('-passwordHash').exec();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error updating counselor' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    await (UserModel as any).findByIdAndDelete(params.id).exec();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error deleting counselor' }, { status: 500 });
  }
}
