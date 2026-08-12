import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, firstName, lastName, role, pass } = body;

    if (!email || !firstName) {
      return NextResponse.json({ message: 'Email and First Name are required' }, { status: 400 });
    }

    const rawPass = pass || 'Academically@01';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPass, salt);

    const existing = await (UserModel as any).findOne({ email: email.toLowerCase() });

    if (existing) {
      const updatedUser = await (UserModel as any).findByIdAndUpdate(
        existing._id,
        {
          $set: {
            firstName,
            lastName: lastName || '',
            role: role || 'COUNSELOR',
            passwordHash,
            isActive: true,
          },
        },
        { new: true },
      ).select('-passwordHash');

      return NextResponse.json(updatedUser);
    }

    const newUser = await (UserModel as any).create({
      email: email.toLowerCase(),
      firstName,
      lastName: lastName || '',
      role: role || 'COUNSELOR',
      passwordHash,
      phoneNumber: '',
    });

    return NextResponse.json(newUser);
  } catch (err: any) {
    console.error('Error registering counselor:', err);
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
