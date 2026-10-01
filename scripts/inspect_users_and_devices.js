const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log('--- USERS ---');
  users.forEach(u => console.log(`- Name: "${u.firstName} ${u.lastName||''}" | Email: "${u.email}" | Role: "${u.role}"`));

  const devices = await mongoose.connection.db.collection('devices').find({}).toArray();
  console.log('\n--- DEVICES ---');
  devices.forEach(d => console.log(`- DeviceID: "${d.deviceId}" | Agent: "${d.agentName}" | Email: "${d.counselorEmail||'none'}" | Model: "${d.deviceModel}" | AppVer: "${d.appVersion}" | LastSync: ${d.lastSyncTimestamp}`));

  await mongoose.disconnect();
}
check().catch(console.error);
