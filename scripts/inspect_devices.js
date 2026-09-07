const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const targetIds = [
    'ANDROID-2411DRN47I-c5e1076d92d693c3',
    'ANDROID-2602BRNA4I-8e7de29248d94ea3',
    'ANDROID-2602BRNA4I-c9b6922ba238691a'
  ];

  const devices = await db.collection('devices').find({
    deviceId: { $in: targetIds }
  }).toArray();
  console.log('DEVICES:', JSON.stringify(devices, null, 2));

  const calls = await db.collection('calls').find({
    deviceId: { $in: targetIds }
  }).sort({ createdAt: -1 }).limit(10).toArray();
  console.log('CALLS:', JSON.stringify(calls.map(c => ({
    _id: c._id,
    agentName: c.agentName,
    counselorEmail: c.counselorEmail,
    deviceId: c.deviceId,
    phoneNumber: c.phoneNumber,
    s3Key: c.s3Key,
    createdAt: c.createdAt
  })), null, 2));

  await mongoose.disconnect();
}
check().catch(console.error);
