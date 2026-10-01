const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { S3Client, GetBucketCorsCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function checkCors() {
  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
  const bucket = process.env.S3_BUCKET_NAME || 'academically-recorderhub';

  try {
    const cors = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
    console.log('=== S3 BUCKET CORS CONFIG ===');
    console.log(JSON.stringify(cors.CORSRules, null, 2));
  } catch (err) {
    console.log('=== S3 BUCKET CORS ERROR ===');
    console.log(err.name, err.message);
  }
}

checkCors().catch(console.error);
