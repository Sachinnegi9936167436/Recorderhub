const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: 'apps/web/.env.local' });

function buildPhoneRegex(digits) {
  const clean = digits.replace(/\D/g, '').slice(-10);
  const pattern = clean.split('').join('\\s*') + '$';
  return new RegExp(pattern);
}

function parseTimestamp(str) {
  if (!str) return null;
  const match14 = str.match(/\b(20\d{12})\b/);
  if (match14) {
    const s = match14[1];
    const year = parseInt(s.slice(0, 4), 10);
    const month = parseInt(s.slice(4, 6), 10) - 1;
    const day = parseInt(s.slice(6, 8), 10);
    const hour = parseInt(s.slice(8, 10), 10);
    const min = parseInt(s.slice(10, 12), 10);
    const sec = parseInt(s.slice(12, 14), 10);
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }
  return null;
}

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const unansweredFilter = {
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
  };

  const calls = await db.collection('calls').find(unansweredFilter).toArray();
  console.log(`Found ${calls.length} unanswered calls with recordings attached.`);

  let reassignedCount = 0;
  let cleanedCount = 0;

  for (const c of calls) {
    const rawPhone = c.phoneNumber || '';
    const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10);
    const recS3 = c.s3Key;
    const recAudio = c.audioUrl;
    const recDate = parseTimestamp(recS3 || recAudio || '');

    let targetAnsweredCall = null;
    if (cleanDigits.length === 10) {
      const phoneRegex = buildPhoneRegex(cleanDigits);
      const query = {
        phoneNumber: { $regex: phoneRegex },
        status: 'ANSWERED',
        durationSeconds: { $gt: 0 },
        $or: [
          { audioUrl: { $exists: false } },
          { audioUrl: '' },
          { audioUrl: null }
        ]
      };

      if (recDate) {
        query.startTime = {
          $gte: new Date(recDate.getTime() - 24 * 60 * 60 * 1000),
          $lte: new Date(recDate.getTime() + 24 * 60 * 60 * 1000)
        };
      }

      targetAnsweredCall = await db.collection('calls').findOne(query, { sort: { startTime: -1 } });
    }

    // If an answered call for this recording exists, transfer the recording to it
    if (targetAnsweredCall) {
      await db.collection('calls').updateOne(
        { _id: targetAnsweredCall._id },
        {
          $set: {
            recordingStatus: 'COMPLETED',
            audioUrl: recAudio,
            s3Key: recS3
          }
        }
      );
      reassignedCount++;
      console.log(`Reassigned recording ${recS3} from unanswered call (${c._id}) to answered call (${targetAnsweredCall._id}) for ${cleanDigits}`);
    }

    // Clean the unanswered call
    await db.collection('calls').updateOne(
      { _id: c._id },
      {
        $set: { recordingStatus: 'NONE' },
        $unset: { audioUrl: '', s3Key: '' }
      }
    );
    cleanedCount++;
  }

  console.log(`Summary: Reassigned ${reassignedCount} recordings to answered calls, cleaned ${cleanedCount} unanswered calls.`);

  // Flush Redis Cache
  console.log('Flushing Redis cache...');
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  await redis.del('cache:calls:latest');
  console.log('Redis cache cleared successfully!');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error during reassign:', err);
  process.exit(1);
});
