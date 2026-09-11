const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const envLocalPath = path.resolve(__dirname, '../apps/web/.env.local');
if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
} else {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const calls = await db.collection('calls').find({
    $or: [
      { phoneNumber: { $regex: '313' } },
      { leadName: { $regex: 'Sameer', $options: 'i' } }
    ]
  }).toArray();

  console.log('FOUND MATCHING CALLS:', JSON.stringify(calls, null, 2));

  // Update any matching records to +92 313 2323522
  for (const c of calls) {
    if (c.phoneNumber && (c.phoneNumber.includes('31323') || c.phoneNumber.includes('313 2323522'))) {
      const correctPhone = '+92 313 2323522';
      await db.collection('calls').updateOne(
        { _id: c._id },
        { $set: { phoneNumber: correctPhone, phoneNumberMasked: correctPhone, leadName: correctPhone } }
      );
      console.log(`Updated call ${c._id} to ${correctPhone}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
