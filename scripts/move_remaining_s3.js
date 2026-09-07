const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { S3Client, CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const bucket = process.env.AWS_S3_BUCKET || 'academically-recorderhub';

const deviceToCounselorMap = {
  'ANDROID-2411DRN47I-c5e1076d92d693c3': 'Himanshu',
  'ANDROID-2602BRNA4I-8e7de29248d94ea3': 'Sayan',
  'ANDROID-2602BRNA4I-c9b6922ba238691a': 'Sameer'
};

async function moveRemaining() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  for (const [deviceId, counselor] of Object.entries(deviceToCounselorMap)) {
    const prefix = `recordings/${deviceId}/`;
    const listRes = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    if (!listRes.Contents || listRes.Contents.length === 0) {
      console.log(`No objects found for ${prefix}`);
      continue;
    }

    for (const item of listRes.Contents) {
      const oldKey = item.Key;
      const fileName = oldKey.split('/').pop();
      const newKey = `recordings/${counselor}/${fileName}`;

      console.log(`Copying ${oldKey} -> ${newKey}...`);
      await s3.send(new CopyObjectCommand({
        Bucket: bucket,
        CopySource: encodeURIComponent(`${bucket}/${oldKey}`),
        Key: newKey
      }));

      console.log(`Deleting old key ${oldKey}...`);
      await s3.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: oldKey
      }));

      // Update MongoDB call record
      const updateRes = await db.collection('calls').updateMany(
        { s3Key: oldKey },
        { $set: { s3Key: newKey, audioUrl: `/api/v1/recordings/${fileName.replace(/\.[^/.]+$/, '')}/audio` } }
      );
      console.log(`Updated ${updateRes.matchedCount} call records in MongoDB for ${oldKey} -> ${newKey}`);
    }
  }

  console.log('Finished moving remaining recordings.');
  await mongoose.disconnect();
}

moveRemaining().catch(console.error);
