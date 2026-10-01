const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const total = await db.collection('calls').countDocuments({ agentName: /prakhar/i });
  const answered = await db.collection('calls').countDocuments({ agentName: /prakhar/i, status: 'ANSWERED' });
  const unanswered = await db.collection('calls').countDocuments({ agentName: /prakhar/i, status: { $ne: 'ANSWERED' } });
  const withRec = await db.collection('calls').countDocuments({ agentName: /prakhar/i, recordingStatus: { $in: ['COMPLETED', 'PENDING_UPLOAD'] } });
  const withS3Key = await db.collection('calls').countDocuments({ agentName: /prakhar/i, s3Key: { $exists: true, $nin: [null, ''] } });
  const withAudioUrl = await db.collection('calls').countDocuments({ agentName: /prakhar/i, audioUrl: { $exists: true, $nin: [null, ''] } });
  const answeredWithoutRec = await db.collection('calls').countDocuments({
    agentName: /prakhar/i,
    status: 'ANSWERED',
    s3Key: { $in: [null, ''] },
    audioUrl: { $in: [null, ''] }
  });

  console.log('=== PRAKHAR CALLS STATS ===');
  console.log(`Total calls: ${total}`);
  console.log(`Answered calls: ${answered}`);
  console.log(`Unanswered calls: ${unanswered}`);
  console.log(`Calls with recordingStatus COMPLETED/PENDING_UPLOAD: ${withRec}`);
  console.log(`Calls with s3Key: ${withS3Key}`);
  console.log(`Calls with audioUrl: ${withAudioUrl}`);
  console.log(`Answered calls with NO recording (s3Key/audioUrl empty): ${answeredWithoutRec}`);

  // Check calls from today for Prakhar
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCalls = await db.collection('calls').find({
    agentName: /prakhar/i,
    startTime: { $gte: todayStart }
  }).sort({ startTime: -1 }).toArray();

  console.log(`\n=== TODAY PRAKHAR CALLS (${todayCalls.length} calls) ===`);
  for (const c of todayCalls) {
    console.log(`  ${c.startTime ? c.startTime.toISOString() : 'N/A'} | ${c.phoneNumber} | Status: ${c.status} | Dur: ${c.durationSeconds}s | recStatus: ${c.recordingStatus} | s3Key: ${c.s3Key || 'NONE'}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
