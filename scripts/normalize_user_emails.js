const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function normalizeEmails() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  for (const u of users) {
    if (u.email && u.email !== u.email.toLowerCase()) {
      console.log(`Normalizing email: ${u.email} -> ${u.email.toLowerCase()}`);
      await db.collection('users').updateOne(
        { _id: u._id },
        { $set: { email: u.email.toLowerCase() } }
      );
    }
  }

  console.log('Finished normalizing MongoDB users emails.');
  await mongoose.disconnect();
}

normalizeEmails().catch(console.error);
