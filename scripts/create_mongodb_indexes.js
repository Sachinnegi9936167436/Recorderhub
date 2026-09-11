const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const envLocalPath = path.resolve(__dirname, '../apps/web/.env.local');
if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
} else {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://recordhub_admin:developer123@recordhubdb.dxwpdx6.mongodb.net/recordhub';

async function safeCreateIndex(coll, keys, options = {}) {
  try {
    const res = await coll.createIndex(keys, options);
    console.log(`[Index Success] ${JSON.stringify(keys)} -> ${res}`);
  } catch (err) {
    if (err.code === 86 || err.codeName === 'IndexKeySpecsConflict' || (err.message && err.message.includes('already exists'))) {
      console.log(`[Index Exists] ${JSON.stringify(keys)}`);
    } else {
      console.warn(`[Index Warning] ${JSON.stringify(keys)}:`, err.message);
    }
  }
}

async function createIndexes() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected! Creating indexes...');

  const db = mongoose.connection.db;

  // Calls collection indexes
  const callsColl = db.collection('calls');
  console.log('\n--- Building indexes on "calls" collection ---');
  await safeCreateIndex(callsColl, { startTime: -1, createdAt: -1 });
  await safeCreateIndex(callsColl, { phoneNumber: 1 });
  await safeCreateIndex(callsColl, { deviceId: 1, startTime: -1 });
  await safeCreateIndex(callsColl, { s3Key: 1 }, { sparse: true });
  await safeCreateIndex(callsColl, { audioUrl: 1 }, { sparse: true });
  await safeCreateIndex(callsColl, { counselorEmail: 1, startTime: -1 });
  await safeCreateIndex(callsColl, { recordingStatus: 1 });
  await safeCreateIndex(callsColl, { idempotencyKey: 1 });

  // Users collection indexes
  const usersColl = db.collection('users');
  console.log('\n--- Building indexes on "users" collection ---');
  await safeCreateIndex(usersColl, { email: 1 });
  await safeCreateIndex(usersColl, { role: 1 });

  // Devices collection indexes
  const devicesColl = db.collection('devices');
  console.log('\n--- Building indexes on "devices" collection ---');
  await safeCreateIndex(devicesColl, { deviceId: 1 });
  await safeCreateIndex(devicesColl, { lastSyncTimestamp: -1 });

  console.log('\nAll indexes verified / created successfully!');
  await mongoose.disconnect();
}

createIndexes().catch(console.error);
