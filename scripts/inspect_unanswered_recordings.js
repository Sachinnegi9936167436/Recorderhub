const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const count = await db.collection('calls').countDocuments({
    $and: [
      {
        $or: [
          { status: 'UNANSWERED' },
          { durationSeconds: 0 }
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
  });

  console.log(`TOTAL_UNANSWERED_WITH_REC: ${count}`);
  await mongoose.disconnect();
}

inspect().catch(console.error);
