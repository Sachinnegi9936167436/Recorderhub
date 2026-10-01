const mongoose = require('mongoose');
const uri = 'mongodb://recordhub_admin:developer123@ac-9zybovc-shard-00-00.dxwpdx6.mongodb.net:27017,ac-9zybovc-shard-00-01.dxwpdx6.mongodb.net:27017,ac-9zybovc-shard-00-02.dxwpdx6.mongodb.net:27017/recordhub?ssl=true&replicaSet=atlas-10srvq-shard-0&authSource=admin&retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(uri);
  const callsWithTeam = await mongoose.connection.db.collection('calls').countDocuments({ team: { $exists: true, $ne: '' } });
  console.log('Calls with direct team field:', callsWithTeam);
  
  const distinctTeams = await mongoose.connection.db.collection('calls').distinct('team');
  console.log('Distinct teams on call documents:', distinctTeams);

  const teamsCollection = await mongoose.connection.db.collection('teams').find({}).toArray();
  console.log('Teams collection:', teamsCollection.map(t => ({ name: t.name, members: t.members, teamLead: t.teamLeadEmail || t.admin })));

  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log('Users count:', users.length);
  console.log('Users sample:', users.map(u => ({ name: `${u.firstName} ${u.lastName}`, email: u.email, team: u.team, role: u.role })).slice(0, 10));

  await mongoose.disconnect();
}

run().catch(console.error);
