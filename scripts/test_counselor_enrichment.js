const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const users = await mongoose.connection.db.collection('users').find({ role: { $ne: 'SUPER_ADMIN' } }).toArray();
  const devices = await mongoose.connection.db.collection('devices').find({}).sort({ lastSyncTimestamp: -1 }).toArray();
  const latestRelease = await mongoose.connection.db.collection('appreleases').findOne({ isActive: true });

  const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const deviceByEmail = new Map();
  const deviceByName = new Map();

  devices.forEach((dev) => {
    if (dev.counselorEmail) deviceByEmail.set(dev.counselorEmail.toLowerCase().trim(), dev);
    if (dev.agentName) {
      const normName = normalize(dev.agentName);
      if (normName && !deviceByName.has(normName)) deviceByName.set(normName, dev);
    }
  });

  const enriched = users.map((c) => {
    const emailLower = (c.email || '').toLowerCase().trim();
    const fullNameNorm = normalize(`${c.firstName || ''} ${c.lastName || ''}`);
    const firstNameNorm = normalize(c.firstName || '');
    const emailPrefixNorm = normalize(emailLower.split('@')[0]);

    const device = deviceByEmail.get(emailLower) || deviceByName.get(fullNameNorm) || deviceByName.get(firstNameNorm) || deviceByName.get(emailPrefixNorm) || null;
    return {
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      email: c.email,
      appVersion: device?.appVersion || 'Not Installed',
      deviceModel: device?.deviceModel || 'none',
      isOutdated: device ? (device.appVersion !== latestRelease?.versionName) : null
    };
  });

  console.log('--- ENRICHED COUNSELORS (First 15) ---');
  console.log(enriched.slice(0, 15));
  await mongoose.disconnect();
}
test().catch(console.error);
