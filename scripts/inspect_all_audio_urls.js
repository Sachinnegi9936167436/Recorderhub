const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const totalWithS3 = await db.collection('calls').countDocuments({ s3Key: { $exists: true, $nin: [null, ''] } });
  const totalWithAudioUrl = await db.collection('calls').countDocuments({ audioUrl: { $exists: true, $nin: [null, ''] } });
  const s3NoAudioUrl = await db.collection('calls').countDocuments({
    s3Key: { $exists: true, $nin: [null, ''] },
    audioUrl: { $in: [null, ''] }
  });

  console.log('Total with s3Key:', totalWithS3);
  console.log('Total with audioUrl:', totalWithAudioUrl);
  console.log('s3Key with NO audioUrl:', s3NoAudioUrl);

  const sampleCalls = await db.collection('calls').find({
    agentName: /prakhar/i,
    recordingStatus: 'COMPLETED'
  }).limit(5).toArray();

  console.log('Sample COMPLETED Prakhar calls:');
  for (const c of sampleCalls) {
    console.log({
      id: c._id,
      agent: c.agentName,
      status: c.status,
      dur: c.durationSeconds,
      recDur: c.recordingDuration,
      audioUrl: c.audioUrl,
      s3Key: c.s3Key,
      recStatus: c.recordingStatus
    });
  }

  await mongoose.disconnect();
}

run().catch(console.error);
