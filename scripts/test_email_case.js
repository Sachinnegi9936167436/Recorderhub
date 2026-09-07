const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const res1 = await db.collection('users').find({ email: { $in: ['jobslly@academically.com'] } }).toArray();
  console.log('Exact lower match for jobslly:', res1.length);

  const res2 = await db.collection('users').find({ email: { $regex: new RegExp('^jobslly@academically\\.com$', 'i') } }).toArray();
  console.log('Case-insensitive match for jobslly:', res2.length);

  await mongoose.disconnect();
}
test().catch(console.error);
