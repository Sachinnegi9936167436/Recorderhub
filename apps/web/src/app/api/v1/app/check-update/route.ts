import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppReleaseModel, DeviceModel } from '@/lib/models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const clientVersionCodeStr = searchParams.get('versionCode');
    const clientVersionName = searchParams.get('appVersion') || searchParams.get('versionName');
    const deviceId = searchParams.get('deviceId');
    const email = searchParams.get('email');
    const deviceModel = searchParams.get('deviceModel') || searchParams.get('model');
    const androidVersion = searchParams.get('androidVersion') || searchParams.get('osVersion');
    const agentName = searchParams.get('agentName');

    const clientVersionCode = clientVersionCodeStr ? parseInt(clientVersionCodeStr, 10) : 0;

    // If deviceId or email provided, update the device's last active version in DeviceModel
    if (deviceId || email) {
      const updateData: any = {
        lastSyncTimestamp: new Date(),
        status: 'HEALTHY',
      };
      if (clientVersionName) updateData.appVersion = clientVersionName;
      if (deviceId) updateData.deviceId = deviceId;
      if (email) updateData.counselorEmail = email.toLowerCase().trim();
      if (deviceModel) updateData.deviceModel = deviceModel;
      if (androidVersion) updateData.androidVersion = androidVersion;
      if (agentName) updateData.agentName = agentName;

      const filter: any = {};
      if (deviceId && email) {
        filter.$or = [{ deviceId }, { counselorEmail: email.toLowerCase().trim() }];
      } else if (deviceId) {
        filter.deviceId = deviceId;
      } else {
        filter.counselorEmail = email!.toLowerCase().trim();
      }

      await (DeviceModel as any).findOneAndUpdate(
        filter,
        { $set: updateData },
        { upsert: true, new: true }
      ).catch((err: any) => console.warn('Error updating device in check-update:', err));
    }

    // Find latest active release
    const latestRelease = await (AppReleaseModel as any)
      .findOne({ isActive: true })
      .sort({ versionCode: -1 })
      .lean()
      .exec();

    if (!latestRelease) {
      return NextResponse.json({
        updateAvailable: false,
        message: 'No active releases found',
      });
    }

    const isNewer = latestRelease.versionCode > clientVersionCode;
    const isForced = Boolean(
      latestRelease.isForced ||
      (latestRelease.minSupportedVersionCode && clientVersionCode < latestRelease.minSupportedVersionCode)
    );

    let finalDownloadUrl = latestRelease.downloadUrl || '';

    // If s3Key exists, dynamically generate presigned GET URL valid for 24 hours
    if (latestRelease.s3Key) {
      try {
        const { getS3Client } = await import('@/lib/aws');
        const s3Info = getS3Client();
        if (s3Info) {
          const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
          const { GetObjectCommand } = await import('@aws-sdk/client-s3');
          finalDownloadUrl = await getSignedUrl(
            s3Info.client,
            new GetObjectCommand({
              Bucket: s3Info.bucket,
              Key: latestRelease.s3Key,
            }),
            { expiresIn: 86400 }
          );
        }
      } catch (s3Err) {
        console.warn('Could not generate presigned download URL, using stored fallback:', s3Err);
      }
    }

    return NextResponse.json({
      updateAvailable: isNewer,
      latestVersionName: latestRelease.versionName,
      latestVersionCode: latestRelease.versionCode,
      isForced: isForced,
      downloadUrl: finalDownloadUrl,
      fileSizeBytes: latestRelease.fileSizeBytes || 0,
      releaseNotes: latestRelease.releaseNotes || 'General improvements and performance enhancements.',
      createdAt: latestRelease.createdAt,
    });
  } catch (err: any) {
    console.error('Error checking app update:', err);
    return NextResponse.json(
      { message: err.message || 'Error checking for updates' },
      { status: 500 }
    );
  }
}
