const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({
    $or: [
      { firstName: /prakhar/i },
      { lastName: /prakhar/i },
      { email: /prakhar/i },
      { name: /prakhar/i }
    ]
  }).toArray();
  console.log('=== USERS MATCHING PRAKHAR ===');
  console.log(users.map(u => ({ id: u._id, email: u.email, name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), role: u.role, deviceId: u.deviceId })));

  const allUsers = await db.collection('users').find({}).toArray();
  console.log('=== ALL USERS COUNT ===', allUsers.length);
  console.log('User names/emails:', allUsers.map(u => `${u.firstName || ''} ${u.lastName || ''} (${u.email}) [role: ${u.role}]`));

  const countCalls = await db.collection('calls').countDocuments({
    $or: [{ agentName: /prakhar/i }, { counselorEmail: /prakhar/i }]
  });
  console.log('=== CALLS COUNT FOR PRAKHAR ===', countCalls);

  const calls = await db.collection('calls').find({
    $or: [{ agentName: /prakhar/i }, { counselorEmail: /prakhar/i }]
  }).sort({ startTime: -1 }).limit(20).toArray();

  console.log('=== SAMPLE CALLS FOR PRAKHAR ===');
  for (const c of calls) {
    console.log({
      id: c._id,
      agent: c.agentName,
      email: c.counselorEmail,
      phone: c.phoneNumber,
      lead: c.leadName,
      time: c.startTime,
      dur: c.durationSeconds,
      status: c.status,
      recStatus: c.recordingStatus,
      s3Key: c.s3Key,
      audioUrl: c.audioUrl,
      deviceId: c.deviceId
    });
  }

  // Also check if any recordings in S3 or local or calls in general have deviceId or anything related to Prakhar
  const devices = await db.collection('devices').find({}).toArray();
  console.log('=== DEVICES ===');
  console.log(devices.map(d => ({ deviceId: d.deviceId, assignedUser: d.assignedUser, agentName: d.agentName, counselorEmail: d.counselorEmail, model: d.model, lastSeen: d.lastSeen })));

  await mongoose.disconnect();
}

run().catch(console.error);
