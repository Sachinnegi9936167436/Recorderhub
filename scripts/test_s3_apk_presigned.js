const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function testPresigned() {
  const client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });

  const bucket = process.env.S3_BUCKET_NAME || 'academically-recorderhub';
  const key = 'releases/RecordHub-v1.0.8-108.apk';

  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    console.log('S3 APK FOUND! Size:', head.ContentLength, 'bytes, ContentType:', head.ContentType);

    const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
    console.log('PRESIGNED URL GENERATED:', url);

    const res = await fetch(url);
    console.log('PRESIGNED DOWNLOAD TEST STATUS:', res.status, 'Content-Length:', res.headers.get('content-length'));
  } catch (err) {
    console.error('Error testing S3 presigned:', err);
  }
}

testPresigned();
