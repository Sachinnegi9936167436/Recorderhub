import { NextResponse } from 'next/server';
import { getS3Client } from '@/lib/aws';
import { 
  GetBucketLifecycleConfigurationCommand, 
  PutBucketLifecycleConfigurationCommand 
} from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const s3Info = getS3Client();
    if (!s3Info) {
      return NextResponse.json({ retentionDays: 180, source: 'default' });
    }

    try {
      const command = new GetBucketLifecycleConfigurationCommand({ Bucket: s3Info.bucket });
      const res = await s3Info.client.send(command);
      const rule = res.Rules?.find(r => r.ID === 'AutoDeleteAudioRecordingsAfter6Months' || r.Expiration?.Days);
      const days = rule?.Expiration?.Days || 180;
      return NextResponse.json({ retentionDays: days, rules: res.Rules, source: 's3' });
    } catch (err: any) {
      if (err.name === 'NoSuchLifecycleConfiguration') {
        return NextResponse.json({ retentionDays: 180, source: 'default_no_rule' });
      }
      return NextResponse.json({ retentionDays: 180, error: err.message });
    }
  } catch (err: any) {
    return NextResponse.json({ retentionDays: 180, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const s3Info = getS3Client();
    if (!s3Info) {
      return NextResponse.json({ error: 'AWS S3 is not configured.' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const retentionDays = Number(body.retentionDays) || 180;

    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: s3Info.bucket,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: 'AutoDeleteAudioRecordingsAfter6Months',
            Status: 'Enabled',
            Filter: {
              Prefix: '',
            },
            Expiration: {
              Days: retentionDays,
            },
            NoncurrentVersionExpiration: {
              NoncurrentDays: retentionDays,
            },
            AbortIncompleteMultipartUpload: {
              DaysAfterInitiation: 7,
            },
          },
        ],
      },
    });

    await s3Info.client.send(command);

    return NextResponse.json({ 
      success: true, 
      retentionDays, 
      message: `Successfully updated AWS S3 retention policy to ${retentionDays} days (${Math.round(retentionDays / 30)} months).` 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update S3 lifecycle policy' }, { status: 500 });
  }
}
