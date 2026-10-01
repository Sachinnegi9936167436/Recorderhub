const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function checkReleases() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const releases = await db.collection('appreleases').find({}).toArray();
  console.log('RELEASES IN DB:', JSON.stringify(releases, null, 2));

  // Also check devices to see what versions client devices are reporting
  const devices = await db.collection('devices').find({}).sort({ lastSyncTimestamp: -1 }).limit(10).toArray();
  console.log('RECENT ACTIVE DEVICES:', JSON.stringify(devices.map(d => ({
    deviceId: d.deviceId,
    agentName: d.agentName,
    counselorEmail: d.counselorEmail,
    appVersion: d.appVersion,
    lastSyncTimestamp: d.lastSyncTimestamp,
    deviceModel: d.deviceModel
  })), null, 2));

  await mongoose.disconnect();
}

checkReleases().catch(console.error);
