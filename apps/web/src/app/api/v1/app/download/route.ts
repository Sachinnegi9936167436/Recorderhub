import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppReleaseModel } from '@/lib/models';
import { getS3Client } from '@/lib/aws';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const versionCode = searchParams.get('versionCode');

    let release;
    if (versionCode) {
      release = await (AppReleaseModel as any).findOne({ versionCode: parseInt(versionCode, 10) }).lean();
    } else {
      release = await (AppReleaseModel as any).findOne({ isActive: true }).sort({ versionCode: -1 }).lean();
    }

    if (!release) {
      return NextResponse.json({ message: 'No APK release found' }, { status: 404 });
    }

    // If s3Key exists, redirect to freshly generated presigned S3 URL
    if (release.s3Key) {
      const s3Info = getS3Client();
      if (s3Info) {
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const presignedUrl = await getSignedUrl(
          s3Info.client,
          new GetObjectCommand({
            Bucket: s3Info.bucket,
            Key: release.s3Key,
          }),
          { expiresIn: 86400 }
        );
        return NextResponse.redirect(presignedUrl);
      }
    }

    // If direct downloadUrl exists and not private S3 URL, redirect
    if (release.downloadUrl && (release.downloadUrl.startsWith('http://') || release.downloadUrl.startsWith('https://'))) {
      return NextResponse.redirect(release.downloadUrl);
    }

    return NextResponse.json({ message: 'APK download file is not accessible' }, { status: 404 });
  } catch (err: any) {
    console.error('Error downloading APK:', err);
    return NextResponse.json({ message: err.message || 'Error processing download' }, { status: 500 });
  }
}
