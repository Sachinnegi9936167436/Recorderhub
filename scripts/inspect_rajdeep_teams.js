const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: 'apps/web/.env.local' });
require('dotenv').config();

const mongoose = require('mongoose');

async function inspectDb() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in DB:', collections.map(c => c.name));

  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log('All Users:');
  users.forEach(u => {
    console.log(`- ID: ${u._id}, Email: ${u.email}, Name: ${u.firstName} ${u.lastName || ''}, Role: ${u.role}, Team: ${u.team || u.teamName || 'none'}`);
  });

  if (collections.some(c => c.name === 'teams')) {
    const teams = await mongoose.connection.db.collection('teams').find({}).toArray();
    console.log('Teams Collection in DB:', JSON.stringify(teams, null, 2));
  } else {
    console.log('No "teams" collection exists in MongoDB.');
  }

  await mongoose.disconnect();
}

inspectDb().catch(console.error);
