const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });
const { Redis } = require('@upstash/redis');

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const total = await db.collection('calls').countDocuments();
  console.log('Total calls in MongoDB:', total);

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  const cached = await redis.get('cache:calls:latest');
  console.log('Total calls in Redis cache:', cached ? cached.length : 0);

  // Group by agent/counselor in MongoDB
  const byAgent = await db.collection('calls').aggregate([
    { $group: { _id: '$agentName', count: { $sum: 1 }, email: { $first: '$counselorEmail' } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\nCalls by Agent (MongoDB):');
  console.table(byAgent);

  // Check users/counselors
  const users = await db.collection('users').find({}).toArray();
  console.log('\nUsers in MongoDB:');
  users.forEach(u => console.log(`- ${u.email} | Role: ${u.role} | Name: ${u.firstName} ${u.lastName}`));

  // Check teams
  const teams = await db.collection('teams').find({}).toArray();
  console.log('\nTeams in MongoDB:');
  teams.forEach(t => console.log(`- Team: ${t.name} | Admin: ${t.admin} | Lead: ${t.teamLeadEmail} | Members: ${JSON.stringify(t.members)}`));

  // If cached calls exist, simulate dashboard filtering logic for different roles
  if (cached && cached.length > 0) {
    console.log('\nSimulating Dashboard validCalls for different roles:');
    
    // SuperAdmin / Manager (no filtering)
    console.log(`- Admin / Manager sees: ${cached.length} calls`);

    // Check for each user email
    for (const u of users) {
      const myEmailLower = (u.email || '').toLowerCase().trim();
      const myNamePrefix = myEmailLower ? myEmailLower.split('@')[0] : '';

      if (u.role === 'COUNSELOR') {
        const filtered = cached.filter(c => {
          const callEmail = (c.counselorEmail || c.email || '').toLowerCase();
          const agentName = (c.agentName || '').toLowerCase();
          return (callEmail && callEmail === myEmailLower) ||
                 (myNamePrefix && agentName.includes(myNamePrefix)) ||
                 (myNamePrefix && myNamePrefix.includes('shris') && agentName.includes('shristi'));
        });
        console.log(`- Counselor ${u.email} (${u.firstName} ${u.lastName}) sees: ${filtered.length} calls`);
      } else if (u.role === 'TEAM_LEAD') {
        // Find team
        const managedTeams = teams.filter(t => {
          const adminStr = (t.admin || '').toLowerCase().trim();
          const teamLeadEmailStr = (t.teamLeadEmail || '').toLowerCase().trim();
          const adminsArr = Array.isArray(t.admins) ? t.admins.map(a => (a || '').toLowerCase().trim()) : [];
          return (teamLeadEmailStr === myEmailLower) || (adminStr === myEmailLower) || adminsArr.includes(myEmailLower);
        });
        console.log(`- Team Lead ${u.email} manages: ${managedTeams.map(t => t.name).join(', ')}`);
      }
    }
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);
