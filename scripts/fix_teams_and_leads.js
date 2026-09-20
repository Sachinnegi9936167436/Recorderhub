const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function fixTeamsAndLeads() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Find users Zaid Khan and Surya
  const zaidUser = await db.collection('users').findOne({
    $or: [
      { email: 'zaidk@academically.com' },
      { firstName: /zaid/i }
    ]
  });

  const suryaUser = await db.collection('users').findOne({
    $or: [
      { email: 'suryas@academically.com' },
      { firstName: /surya/i }
    ]
  });

  const rajdeepUser = await db.collection('users').findOne({
    $or: [
      { email: 'rajdeepa@academically.com' },
      { firstName: /rajdeep/i }
    ]
  });

  console.log('Zaid User:', zaidUser ? { id: zaidUser._id, name: zaidUser.firstName + ' ' + (zaidUser.lastName || ''), email: zaidUser.email, role: zaidUser.role } : 'Not found');
  console.log('Surya User:', suryaUser ? { id: suryaUser._id, name: suryaUser.firstName + ' ' + (suryaUser.lastName || ''), email: suryaUser.email, role: suryaUser.role } : 'Not found');
  console.log('Rajdeep User:', rajdeepUser ? { id: rajdeepUser._id, name: rajdeepUser.firstName + ' ' + (rajdeepUser.lastName || ''), email: rajdeepUser.email, role: rajdeepUser.role } : 'Not found');

  // 2. Ensure roles are TEAM_LEAD
  if (zaidUser) {
    await db.collection('users').updateOne(
      { _id: zaidUser._id },
      { $set: { role: 'TEAM_LEAD' } }
    );
    console.log('Updated Zaid Khan role to TEAM_LEAD');
  }

  if (suryaUser) {
    await db.collection('users').updateOne(
      { _id: suryaUser._id },
      { $set: { role: 'TEAM_LEAD' } }
    );
    console.log('Updated Surya role to TEAM_LEAD');
  }

  // 3. Fix Pharmacy Team
  const pharmacyUpdate = await db.collection('teams').updateMany(
    { name: /pharmacy/i },
    {
      $set: {
        admin: 'Zaid Khan',
        admins: ['Zaid Khan'],
        teamLeadEmail: zaidUser ? zaidUser.email : 'zaidk@academically.com',
        teamLeadId: zaidUser ? zaidUser._id.toString() : '6aa3d4ae32fb049d59fdf918',
        updatedAt: new Date(),
      }
    }
  );
  console.log(`Updated Pharmacy team(s): ${pharmacyUpdate.modifiedCount} modified.`);

  // 4. Fix Physiotherapy Team
  const physioUpdate = await db.collection('teams').updateMany(
    { name: /physio/i },
    {
      $set: {
        admin: 'Surya',
        admins: ['Surya'],
        teamLeadEmail: suryaUser ? suryaUser.email : 'suryas@academically.com',
        teamLeadId: suryaUser ? suryaUser._id.toString() : '6aa3de31492bbcc64648e86c',
        updatedAt: new Date(),
      }
    }
  );
  console.log(`Updated Physiotherapy team(s): ${physioUpdate.modifiedCount} modified.`);

  // 5. Inspect final teams in DB
  const finalTeams = await db.collection('teams').find({}).toArray();
  console.log('\n=== FINAL TEAMS IN DB ===');
  finalTeams.forEach(t => {
    console.log(`- Team: "${t.name}" | Admin: "${t.admin}" | TeamLeadEmail: "${t.teamLeadEmail}" | TeamLeadId: "${t.teamLeadId}" | Members: [${(t.members || []).join(', ')}]`);
  await mongoose.disconnect();
  console.log('\nAll done!');
}

fixTeamsAndLeads().catch(console.error);
