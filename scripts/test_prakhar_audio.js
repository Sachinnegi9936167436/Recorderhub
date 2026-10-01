const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const { S3Client, HeadObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function checkAudio() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
  const bucket = process.env.S3_BUCKET_NAME || 'academically-recorderhub';

  console.log(`Checking S3 bucket: ${bucket}`);

  // List S3 objects in recordings/Prakhar
  const listCmd = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'recordings/Prakhar',
    MaxKeys: 20,
  });
  try {
    const listRes = await s3.send(listCmd);
    console.log('=== S3 OBJECTS WITH Prefix "recordings/Prakhar" ===');
    console.log('Key count:', listRes.KeyCount);
    if (listRes.Contents) {
      for (const obj of listRes.Contents) {
        console.log(`  ${obj.Key} (Size: ${obj.Size} bytes)`);
      }
    }
  } catch (err) {
    console.error('Error listing S3 recordings/Prakhar:', err.message);
  }

  // Also search S3 for any keys containing prakhar (case insensitive list)
  const listAll = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'recordings/',
    MaxKeys: 100,
  });
  try {
    const allRes = await s3.send(listAll);
    const prakharKeys = (allRes.Contents || []).filter(o => o.Key.toLowerCase().includes('prakhar'));
    console.log('=== S3 OBJECTS containing "prakhar" in recordings/ ===', prakharKeys.length);
  } catch (err) {
    console.error('Error listing all recordings:', err.message);
  }

  // Check top 10 calls for Prakhar that have s3Key
  const prakharCallsWithRec = await db.collection('calls').find({
    agentName: /prakhar/i,
    s3Key: { $exists: true, $ne: '' }
  }).sort({ startTime: -1 }).limit(10).toArray();

  console.log(`=== FOUND ${prakharCallsWithRec.length} CALLS WITH S3KEY FOR PRAKHAR ===`);
  for (const c of prakharCallsWithRec) {
    console.log(`\nCall ID: ${c._id}, s3Key: ${c.s3Key}, audioUrl: ${c.audioUrl}, recStatus: ${c.recordingStatus}`);
    if (c.s3Key) {
      try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: c.s3Key }));
        console.log(`  -> S3 HEAD SUCCESS! Size: ${head.ContentLength}, Type: ${head.ContentType}`);
      } catch (headErr) {
        console.log(`  -> S3 HEAD FAILED: ${headErr.name} - ${headErr.message}`);
      }
    }
  }

  await mongoose.disconnect();
}

checkAudio().catch(console.error);
