const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const digitsList = [
    '7993663007',
    '7558134599',
    '7875183553',
    '9711070273',
    '9665538938',
    '7876030197',
    '8052271958',
    '8979621774',
    '9175380929'
  ];

  for (const d of digitsList) {
    const pattern = d.split('').join('\\s*');
    const calls = await db.collection('calls').find({
      phoneNumber: { $regex: new RegExp(pattern) }
    }).toArray();

    console.log(`=== Matches for ${d}: ${calls.length} ===`);
    for (const c of calls) {
      console.log(JSON.stringify({
        _id: c._id,
        agentName: c.agentName,
        phoneNumber: c.phoneNumber,
        status: c.status,
        direction: c.direction,
        startTime: c.startTime,
        durationSeconds: c.durationSeconds,
        recordingStatus: c.recordingStatus,
        audioUrl: c.audioUrl,
        s3Key: c.s3Key,
        audioDuration: c.audioDuration,
        disposition: c.disposition,
        idempotencyKey: c.idempotencyKey
      }, null, 2));
    }
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);
