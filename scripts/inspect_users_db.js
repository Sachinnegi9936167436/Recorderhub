const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function checkUsers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  console.log('ALL USERS IN MONGO:');
  users.forEach(u => {
    console.log(`- ${u.firstName} ${u.lastName} | email: ${u.email} | active: ${u.isActive} | role: ${u.role}`);
  });

  const calls = await db.collection('calls').find({}).sort({ createdAt: -1 }).limit(5).toArray();
  console.log('\nLATEST 5 CALLS:');
  calls.forEach(c => {
    console.log(`- ${c.phoneNumber} | agent: ${c.agentName} | email: ${c.counselorEmail} | device: ${c.deviceId} | time: ${c.createdAt}`);
  });

  const devices = await db.collection('devices').find({}).toArray();
  console.log('\nALL DEVICES:');
  devices.forEach(d => {
    console.log(`- device: ${d.deviceId} | agent: ${d.agentName} | email: ${d.counselorEmail} | lastSync: ${d.lastSyncTimestamp}`);
  });

  await mongoose.disconnect();
}

checkUsers().catch(console.error);
