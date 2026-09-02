import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_INITIAL_USERS = [
  { firstName: 'Finance', lastName: '', email: 'finance@academically.com', role: 'ADMIN', isActive: true },
  { firstName: 'Lekshmi', lastName: '', email: 'lekshmi.raj@academically.com', role: 'SALES', isActive: true },
  { firstName: 'Hira', lastName: 'Mirza', email: 'hira.mirza@academically.com', role: 'SALES', isActive: true },
  { firstName: 'Sameer', lastName: 'Ahmad', email: 'sameera@academically.com', role: 'SALES', isActive: true },
  { firstName: 'Syed', lastName: 'Zaigham', email: 'zaighamp@academically.com', role: 'SALES', isActive: true },
  { firstName: 'Aditi', lastName: '', email: 'aditir@academically.com', role: 'SALES', isActive: true },
  { firstName: 'Faiz', lastName: '', email: 'mohdf@academically.com', role: 'ADMIN', isActive: true },
  { firstName: 'Nasreen', lastName: 'Hussain', email: 'nasreen@academically.com', role: 'SALES', isActive: true },
  { firstName: 'Mayank', lastName: 'Mrinal', email: 'mayank@academically.com', role: 'SALES', isActive: false },
];

export async function GET() {
  try {
    await connectToDatabase();
    let counselors = await (UserModel as any).find().select('-passwordHash').exec();

    if (!counselors || counselors.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash('Academically@01', salt);
      const toInsert = DEFAULT_INITIAL_USERS.map((u) => ({
        ...u,
        passwordHash: defaultHash,
        organizationId: '65c1f0000000000000000001',
      }));
      await (UserModel as any).insertMany(toInsert);
      counselors = await (UserModel as any).find().select('-passwordHash').exec();
    }

    return NextResponse.json(counselors);
  } catch (err: any) {
    console.error('Error fetching counselors:', err);
    return NextResponse.json(DEFAULT_INITIAL_USERS);
  }
}

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || id === 'undefined') {
      return NextResponse.json({ message: 'Invalid counselor ID provided' }, { status: 400 });
    }

    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { email: id.toLowerCase() };
    await (UserModel as any).findOneAndDelete(filter).exec();

    return NextResponse.json({ success: true, message: `Deleted counselor ${id}` });
  } catch (err: any) {
    console.error('Error deleting counselor:', err);
    return NextResponse.json({ message: err.message || 'Error deleting counselor' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    if (!id || id === 'undefined') {
      return NextResponse.json({ message: 'Invalid counselor ID provided' }, { status: 400 });
    }

    const updateData: any = {};
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.email !== undefined) updateData.email = body.email.toLowerCase();
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const rawPass = body.password || body.pass || body.newPassword;
    if (rawPass && typeof rawPass === 'string' && rawPass.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(rawPass.trim(), salt);
    }

    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { email: id.toLowerCase() };
    const updated = await (UserModel as any).findOneAndUpdate(filter, { $set: updateData }, { new: true }).select('-passwordHash').exec();

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error updating counselor:', err);
    return NextResponse.json({ message: err.message || 'Error updating counselor' }, { status: 500 });
  }
}

