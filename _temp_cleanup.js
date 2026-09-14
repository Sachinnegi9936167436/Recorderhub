const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found in environment');
  
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  console.log('Connected!');
  
  const db = mongoose.connection.db;
  const accountCreatedAt = new Date('2026-08-10T12:19:01.699Z');

  const callsBefore = await db.collection('calls').countDocuments({
    agentName: { $regex: /shri/i },
    startTime: { $lt: accountCreatedAt }
  });
  console.log('Calls BEFORE account creation:', callsBefore);

  if (callsBefore > 0) {
    const result = await db.collection('calls').deleteMany({
      agentName: { $regex: /shri/i },
      startTime: { $lt: accountCreatedAt }
    });
    console.log('DELETED:', result.deletedCount);
  }

  const remaining = await db.collection('calls').countDocuments({
    agentName: { $regex: /shri/i }
  });
  console.log('Remaining Shristi calls:', remaining);

  await mongoose.disconnect();
}

run().catch(e => { console.error(e.message); process.exit(1); });
