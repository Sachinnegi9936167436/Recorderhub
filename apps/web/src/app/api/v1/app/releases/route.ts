import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppReleaseModel } from '@/lib/models';
import { getS3Client } from '@/lib/aws';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const releases = await (AppReleaseModel as any)
      .find({})
      .sort({ versionCode: -1 })
      .lean()
      .exec();

    return NextResponse.json({ success: true, data: releases || [] });
  } catch (err: any) {
    console.error('Error fetching releases:', err);
    return NextResponse.json({ message: err.message || 'Error fetching releases' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const formData = await req.formData();

    const file = formData.get('file') as File | null;
    const versionName = formData.get('versionName') as string;
    const versionCodeStr = formData.get('versionCode') as string;
    const releaseNotes = (formData.get('releaseNotes') as string) || '';
    const isForced = formData.get('isForced') === 'true';
    const minSupportedVersionCodeStr = formData.get('minSupportedVersionCode') as string;
    const uploadedBy = (formData.get('uploadedBy') as string) || 'Admin';
    const customDownloadUrl = formData.get('downloadUrl') as string;

    if (!versionName || !versionCodeStr) {
      return NextResponse.json(
        { message: 'versionName and versionCode are required' },
        { status: 400 }
      );
    }

    const versionCode = parseInt(versionCodeStr, 10);
    const minSupportedVersionCode = minSupportedVersionCodeStr
      ? parseInt(minSupportedVersionCodeStr, 10)
      : 1;

    let downloadUrl = customDownloadUrl || '';
    let fileSizeBytes = 0;
    let s3Key = '';

    if (file && typeof file.arrayBuffer === 'function') {
      const buffer = Buffer.from(await file.arrayBuffer());
      fileSizeBytes = buffer.length;

      const s3Info = getS3Client();
      if (s3Info) {
        const cleanVer = versionName.replace(/[^a-zA-Z0-9._-]/g, '');
        s3Key = `releases/RecordHub-v${cleanVer}-${versionCode}.apk`;

        const command = new PutObjectCommand({
          Bucket: s3Info.bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: 'application/vnd.android.package-archive',
        });

        await s3Info.client.send(command);
        downloadUrl = `https://${s3Info.bucket}.s3.${s3Info.region}.amazonaws.com/${s3Key}`;
      } else {
        // If S3 is not configured, we provide local API download endpoint
        downloadUrl = `/api/v1/app/download?versionCode=${versionCode}`;
      }
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { message: 'Either an APK file or downloadUrl must be provided' },
        { status: 400 }
      );
    }

    // Upsert release by versionCode
    const release = await (AppReleaseModel as any).findOneAndUpdate(
      { versionCode },
      {
        $set: {
          versionName,
          versionCode,
          downloadUrl,
          fileSizeBytes: fileSizeBytes || undefined,
          releaseNotes,
          isForced,
          minSupportedVersionCode,
          isActive: true,
          uploadedBy,
          s3Key: s3Key || undefined,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: release });
  } catch (err: any) {
    console.error('Error creating app release:', err);
    return NextResponse.json(
      { message: err.message || 'Error creating release' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const versionCode = searchParams.get('versionCode');

    const filter: any = {};
    if (id) filter._id = id;
    else if (versionCode) filter.versionCode = parseInt(versionCode, 10);
    else {
      return NextResponse.json({ message: 'Release id or versionCode required' }, { status: 400 });
    }

    const release = await (AppReleaseModel as any).findOne(filter);
    if (release && release.s3Key) {
      const s3Info = getS3Client();
      if (s3Info) {
        await s3Info.client.send(
          new DeleteObjectCommand({
            Bucket: s3Info.bucket,
            Key: release.s3Key,
          })
        ).catch(() => {});
      }
    }

    await (AppReleaseModel as any).deleteOne(filter);

    return NextResponse.json({ success: true, message: 'Release deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting release:', err);
    return NextResponse.json({ message: err.message || 'Error deleting release' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, versionCode, isActive, isForced } = body;

    const filter: any = {};
    if (id) filter._id = id;
    else if (versionCode) filter.versionCode = parseInt(versionCode, 10);
    else {
      return NextResponse.json({ message: 'Release id or versionCode required' }, { status: 400 });
    }

    const update: any = {};
    if (typeof isActive === 'boolean') update.isActive = isActive;
    if (typeof isForced === 'boolean') update.isForced = isForced;

    const updated = await (AppReleaseModel as any).findOneAndUpdate(
      filter,
      { $set: update },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error updating release:', err);
    return NextResponse.json({ message: err.message || 'Error updating release' }, { status: 500 });
  }
}
