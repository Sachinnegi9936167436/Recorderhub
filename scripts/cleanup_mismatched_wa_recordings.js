const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function cleanup() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const waFilter = {
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
  };

  const targetCalls = await db.collection('calls').find(waFilter).toArray();
  console.log(`Found ${targetCalls.length} WhatsApp calls with attached recordings to clean.`);

  for (const c of targetCalls) {
    console.log(`Cleaning call: ${c._id} | Agent: ${c.agentName} | Phone: ${c.phoneNumber} | Time: ${c.startTime} | Prev S3: ${c.s3Key}`);
  }

  const result = await db.collection('calls').updateMany(
    waFilter,
    {
      $set: {
        recordingStatus: 'NONE'
      },
      $unset: {
        audioUrl: '',
        s3Key: ''
      }
    }
  );

  console.log(`Updated ${result.modifiedCount} WhatsApp calls (reset recordingStatus to 'NONE' and removed audioUrl / s3Key).`);

  // Clear Redis Cache
  console.log('Flushing Redis cache...');
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  await redis.del('cache:calls:latest');
  console.log('Redis cache:calls:latest cleared successfully!');

  await mongoose.disconnect();
  console.log('Cleanup completed successfully!');
}

cleanup().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
