const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function testBatchSync() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const counselorEmails = ['jobslly@academically.com'];
  const emailRegexList = counselorEmails.map(em => new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
  const userAccounts = await db.collection('users').find(
    { email: { $in: emailRegexList } },
    { projection: { email: 1, createdAt: 1, isActive: 1 } }
  ).toArray();

  console.log('Found user accounts for Jobslly:', userAccounts);
  await mongoose.disconnect();
}

testBatchSync().catch(console.error);
