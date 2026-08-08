import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, pass } = body;

    const user = await (UserModel as any).findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials. Counselor ID not provisioned by Admin!' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials. Incorrect password!' }, { status: 401 });
    }

    return NextResponse.json({
      accessToken: 'mock_jwt_token_vercel_prod',
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error logging in' }, { status: 500 });
  }
}
