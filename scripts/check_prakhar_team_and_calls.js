const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const teams = await db.collection('teams').find({}).toArray();
  console.log('=== ALL TEAMS ===');
  for (const t of teams) {
    console.log({
      id: t._id,
      name: t.name,
      admin: t.admin,
      admins: t.admins,
      teamLeadEmail: t.teamLeadEmail,
      teamLeadId: t.teamLeadId,
      members: t.members
    });
  }

  const prakharUser = await db.collection('users').findOne({ email: /prakhar/i });
  console.log('\n=== PRAKHAR USER IN DB ===', prakharUser);

  const callsSample = await db.collection('calls').find({ agentName: /prakhar/i }).limit(5).toArray();
  console.log('\n=== PRAKHAR CALLS SAMPLE ===');
  for (const c of callsSample) {
    console.log({
      id: c._id,
      agentName: c.agentName,
      counselorEmail: c.counselorEmail,
      team: c.team,
      status: c.status,
      durationSeconds: c.durationSeconds,
      recordingStatus: c.recordingStatus,
      audioUrl: c.audioUrl,
      s3Key: c.s3Key,
    });
  }

  await mongoose.disconnect();
}

check().catch(console.error);
