const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: 'apps/web/.env.local' });
require('dotenv').config();

const mongoose = require('mongoose');

async function seedTeam() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const TeamSchema = new mongoose.Schema(
    {
      organizationId: { type: String, default: '65c1f0000000000000000001' },
      name: { type: String, required: true, trim: true },
      admin: { type: String, default: 'Rajdeep' },
      admins: [{ type: String }],
      teamLeadId: { type: String },
      teamLeadEmail: { type: String },
      members: [{ type: String }],
      installedRatio: { type: String, default: '0 / 0' },
    },
    { timestamps: true }
  );

  const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const rajdeepUser = await User.findOne({ email: /rajdeep/i }).lean();
  console.log('Rajdeep user found:', rajdeepUser);

  const counselors = await User.find({ role: { $in: ['COUNSELOR', 'AGENT', 'SALES'] } }).lean();
  const counselorNames = counselors.map(c => `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email).filter(Boolean);
  console.log(`Found ${counselorNames.length} counselors:`, counselorNames);

  const teamDoc = await Team.findOneAndUpdate(
    { name: 'upskill' },
    {
      $set: {
        name: 'upskill',
        admin: 'Rajdeep',
        admins: ['Rajdeep', 'rajdeepa@academically.com', 'Rajdeep '],
        teamLeadEmail: rajdeepUser ? rajdeepUser.email : 'rajdeepa@academically.com',
        teamLeadId: rajdeepUser ? rajdeepUser._id.toString() : undefined,
        members: counselorNames,
        installedRatio: `${counselorNames.length} / ${counselorNames.length}`,
      }
    },
    { upsert: true, new: true }
  );

  console.log('Successfully seeded upskill team in MongoDB:', teamDoc);

  const allTeams = await Team.find({}).lean();
  console.log('All Teams in MongoDB:', allTeams);

  await mongoose.disconnect();
}

seedTeam().catch(console.error);
