import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const id = params.id;
    if (!id || id === 'undefined') {
      return NextResponse.json({ message: 'Invalid counselor ID provided' }, { status: 400 });
    }
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { email: id.toLowerCase() };
    const updated = await (UserModel as any).findOneAndUpdate(filter, { $set: body }, { new: true }).select('-passwordHash').exec();
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Error updating counselor:', err);
    return NextResponse.json({ message: err.message || 'Error updating counselor' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const id = params.id;
    if (!id || id === 'undefined') {
      return NextResponse.json({ message: 'Invalid counselor ID provided' }, { status: 400 });
    }
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { email: id.toLowerCase() };
    await (UserModel as any).findOneAndDelete(filter).exec();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting counselor:', err);
    return NextResponse.json({ message: err.message || 'Error deleting counselor' }, { status: 500 });
  }
}
