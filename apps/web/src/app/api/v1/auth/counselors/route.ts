import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models';
import { cacheGet, cacheSet, cacheDel } from '@/lib/redis';
import { COUNSELORS_CACHE_KEY, COUNSELORS_CACHE_TTL } from '@/lib/cache-service';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const cached = await cacheGet<any[]>(COUNSELORS_CACHE_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      // Ensure super admins are never in the returned cached payload
      const sanitized = cached.filter(
        (c) => c.role !== 'SUPER_ADMIN' && c.email !== 'superadmin@academically.com'
      );
      const res = NextResponse.json(sanitized);
      res.headers.set('X-Cache', 'HIT');
      return res;
    }

    await connectToDatabase();
    const counselors = await (UserModel as any)
      .find({
        role: { $ne: 'SUPER_ADMIN' },
        email: { $ne: 'superadmin@academically.com' },
      })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    
    if (counselors && counselors.length > 0) {
      await cacheSet(COUNSELORS_CACHE_KEY, counselors, COUNSELORS_CACHE_TTL);
    }

    const res = NextResponse.json(counselors || []);
    res.headers.set('X-Cache', 'MISS');
    return res;
  } catch (err: any) {
    console.error('Error fetching counselors:', err);
    return NextResponse.json({ message: err.message || 'Error fetching counselors' }, { status: 500 });
  }
}

import { deleteCounselorCascade } from '@/lib/counselor-actions';

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || id === 'undefined') {
      return NextResponse.json({ message: 'Invalid counselor ID provided' }, { status: 400 });
    }

    // Protect super admin account from deletion
    if (id.toLowerCase() === 'superadmin@academically.com') {
      return NextResponse.json({ message: 'Super Admin account cannot be deleted' }, { status: 403 });
    }

    const result = await deleteCounselorCascade(id);
    await cacheDel(COUNSELORS_CACHE_KEY).catch(() => {});
    return NextResponse.json(result);
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

    await cacheDel(COUNSELORS_CACHE_KEY).catch(() => {});

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error updating counselor:', err);
    return NextResponse.json({ message: err.message || 'Error updating counselor' }, { status: 500 });
  }
}

