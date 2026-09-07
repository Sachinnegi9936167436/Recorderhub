const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function deleteJobslly() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  const bucket = process.env.AWS_S3_BUCKET || 'academically-recorderhub';

  console.log('Finding Jobslly user...');
  const user = await db.collection('users').findOne({ email: /jobslly/i });
  console.log('Jobslly user doc:', user);

  if (!user) {
    console.log('Jobslly user does not exist in DB.');
    await mongoose.disconnect();
    return;
  }

  // 1. Delete calls
  const callsRes = await db.collection('calls').deleteMany({
    $or: [
      { counselorEmail: /jobslly/i },
      { agentName: /jobslly/i },
      { userId: user._id.toString() }
    ]
  });
  console.log(`Deleted ${callsRes.deletedCount} calls for Jobslly.`);

  // 2. Delete devices
  const devRes = await db.collection('devices').deleteMany({
    $or: [
      { counselorEmail: /jobslly/i },
      { agentName: /jobslly/i },
      { userId: user._id.toString() }
    ]
  });
  console.log(`Deleted ${devRes.deletedCount} devices for Jobslly.`);

  // 3. Delete S3 folder recordings/Jobslly/
  const listRes = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'recordings/Jobslly/' }));
  if (listRes.Contents && listRes.Contents.length > 0) {
    const keys = listRes.Contents.map(c => ({ Key: c.Key }));
    console.log(`Deleting ${keys.length} S3 recordings in recordings/Jobslly/...`);
    await s3.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys, Quiet: true }
    }));
  } else {
    console.log('No S3 objects found in recordings/Jobslly/.');
  }

  // 4. Delete user
  const userRes = await db.collection('users').deleteOne({ _id: user._id });
  console.log(`Deleted user Jobslly from DB: ${userRes.deletedCount}`);

  await mongoose.disconnect();
  console.log('Jobslly cascade deletion test finished successfully!');
}

deleteJobslly().catch(console.error);
