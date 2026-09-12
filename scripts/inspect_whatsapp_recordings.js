const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const waCalls = await db.collection('calls').find({
    $and: [
      {
        $or: [
          { channel: 'WHATSAPP' },
          { disposition: /whatsapp/i },
          { idempotencyKey: /^WA_/i }
        ]
      },
      {
        $or: [
          { audioUrl: { $exists: true, $nin: [null, ''] } },
          { s3Key: { $exists: true, $nin: [null, ''] } },
          { recordingStatus: { $in: ['COMPLETED', 'PENDING_UPLOAD', 'PENDING'] } }
        ]
      }
    ]
  }).sort({ startTime: -1 }).toArray();

  console.log(`TOTAL_WA_CALLS_WITH_REC: ${waCalls.length}`);
  for (const c of waCalls) {
    console.log(`- ${c.agentName} | ${c.phoneNumber} | ${c.startTime} | Status: ${c.recordingStatus} | Audio: ${c.audioUrl} | S3Key: ${c.s3Key} | Key: ${c.idempotencyKey}`);
  }

  await mongoose.disconnect();
}
check().catch(console.error);
