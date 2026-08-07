import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { UserRole, CallDirection, CallStatus, RecordingUploadStatus, CallChannel } from '@recordhub/shared';

dotenv.config({ path: '../../.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recordhub?replicaSet=rs0&directConnection=true';

async function seed() {
  console.log('🌱 Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection;
  await db.dropDatabase();
  console.log('🧹 Cleaned existing database.');

  // 1. Create Organization
  const orgResult = await db.collection('organizations').insertOne({
    name: 'Academically Global Healthcare Academy',
    slug: 'academically-global',
    country: 'IN',
    timezone: 'Asia/Kolkata',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const orgId = orgResult.insertedId;
  console.log('✅ Created Organization:', orgId.toString());

  // 2. Create Password Hash
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. Create Users
  const usersData = [
    {
      organizationId: orgId,
      email: 'admin@academically.com',
      passwordHash,
      firstName: 'Dr. Akram',
      lastName: 'Ahmad',
      role: UserRole.COMPANY_ADMIN,
      phoneNumber: '+919876543210',
      isActive: true,
      createdAt: new Date(),
    },
    {
      organizationId: orgId,
      email: 'manager@academically.com',
      passwordHash,
      firstName: 'Vikram',
      lastName: 'Singh',
      role: UserRole.SALES_MANAGER,
      phoneNumber: '+919876543211',
      isActive: true,
      createdAt: new Date(),
    },
    {
      organizationId: orgId,
      email: 'qa@academically.com',
      passwordHash,
      firstName: 'Meera',
      lastName: 'Deshmukh',
      role: UserRole.QA_TRAINER,
      phoneNumber: '+919876543212',
      isActive: true,
      createdAt: new Date(),
    },
    {
      organizationId: orgId,
      email: 'agent@academically.com',
      passwordHash,
      firstName: 'Ananya',
      lastName: 'Sharma',
      role: UserRole.SALES_AGENT,
      phoneNumber: '+919876543213',
      isActive: true,
      createdAt: new Date(),
    },
    {
      organizationId: orgId,
      email: 'rahul@academically.com',
      passwordHash,
      firstName: 'Rahul',
      lastName: 'Verma',
      role: UserRole.SALES_AGENT,
      phoneNumber: '+919876543214',
      isActive: true,
      createdAt: new Date(),
    },
    {
      organizationId: orgId,
      email: 'priya@academically.com',
      passwordHash,
      firstName: 'Priya',
      lastName: 'Nair',
      role: UserRole.SALES_AGENT,
      phoneNumber: '+919876543215',
      isActive: true,
      createdAt: new Date(),
    },
  ];

  const userDocs = await db.collection('users').insertMany(usersData);
  const agent1Id = userDocs.insertedIds[3];
  const agent2Id = userDocs.insertedIds[4];
  const agent3Id = userDocs.insertedIds[5];
  console.log('✅ Created 6 Users (Admin, Manager, QA, 3 Agents)');

  // 4. Create Devices
  await db.collection('devices').insertMany([
    {
      organizationId: orgId,
      userId: agent1Id,
      agentName: 'Ananya Sharma',
      deviceId: 'SAMSUNG-GALAXY-A54-8899',
      deviceModel: 'Samsung Galaxy A54 5G',
      androidVersion: 'Android 14 (One UI 6.1)',
      appVersion: 'v1.0.4-prod',
      batteryOptimizationDisabled: true,
      safDirectoryAuthorized: true,
      lastSyncTimestamp: new Date(),
      failedUploadCount: 0,
      pendingSyncCount: 1,
      status: 'HEALTHY',
    },
    {
      organizationId: orgId,
      userId: agent2Id,
      agentName: 'Rahul Verma',
      deviceId: 'XIAOMI-REDMI-NOTE-13-4422',
      deviceModel: 'Xiaomi Redmi Note 13 Pro',
      androidVersion: 'Android 13 (MIUI 14)',
      appVersion: 'v1.0.4-prod',
      batteryOptimizationDisabled: true,
      safDirectoryAuthorized: true,
      lastSyncTimestamp: new Date(),
      failedUploadCount: 1,
      pendingSyncCount: 2,
      status: 'HEALTHY',
    },
    {
      organizationId: orgId,
      userId: agent3Id,
      agentName: 'Priya Nair',
      deviceId: 'ONEPLUS-NORD-3-1100',
      deviceModel: 'OnePlus Nord 3 5G',
      androidVersion: 'Android 14 (OxygenOS 14)',
      appVersion: 'v1.0.4-prod',
      batteryOptimizationDisabled: false,
      safDirectoryAuthorized: true,
      lastSyncTimestamp: new Date(Date.now() - 3600000 * 5),
      failedUploadCount: 0,
      pendingSyncCount: 8,
      status: 'WARNING',
    },
  ]);
  console.log('✅ Created 3 Device Health Records');

  // 5. Create Calls & Recordings (SIM Calls & WhatsApp Calls)
  const sampleCalls = [
    {
      userId: agent1Id,
      agentName: 'Ananya Sharma',
      phone: '+919812345678',
      leadName: 'Dr. Rajesh Kumar',
      leadId: 'PH-LEAD-8841',
      direction: CallDirection.OUTGOING,
      status: CallStatus.ANSWERED,
      channel: CallChannel.CELLULAR,
      duration: 384,
      disposition: 'Enrolled in NCLEX-RN Prep',
      hasAudio: true,
    },
    {
      userId: agent1Id,
      agentName: 'Ananya Sharma',
      phone: '+971501234567',
      leadName: 'Nurse Sunita Patel (Dubai)',
      leadId: 'PH-LEAD-8842',
      direction: CallDirection.INCOMING,
      status: CallStatus.ANSWERED,
      channel: CallChannel.WHATSAPP,
      duration: 245,
      disposition: 'Document Verification Sent (WhatsApp Call)',
      hasAudio: true,
    },
    {
      userId: agent2Id,
      agentName: 'Rahul Verma',
      phone: '+966509876543',
      leadName: 'Dr. Amit Shah (Riyadh)',
      leadId: 'PH-LEAD-8843',
      direction: CallDirection.OUTGOING,
      status: CallStatus.ANSWERED,
      channel: CallChannel.WHATSAPP,
      duration: 512,
      disposition: 'Fee Structure Discussion (WhatsApp Call)',
      hasAudio: true,
    },
    {
      userId: agent2Id,
      agentName: 'Rahul Verma',
      phone: '+919899988877',
      leadName: 'Pharmacist Kavita Singh',
      leadId: 'PH-LEAD-8844',
      direction: CallDirection.OUTGOING,
      status: CallStatus.MISSED,
      channel: CallChannel.CELLULAR,
      duration: 0,
      disposition: 'Unanswered / Call Back Later',
      hasAudio: false,
    },
    {
      userId: agent3Id,
      agentName: 'Priya Nair',
      phone: '+919711122233',
      leadName: 'Dr. Meenakshi Sundaram',
      leadId: 'PH-LEAD-8845',
      direction: CallDirection.INCOMING,
      status: CallStatus.ANSWERED,
      channel: CallChannel.CELLULAR,
      duration: 410,
      disposition: 'Follow-up Call Scheduled',
      hasAudio: true,
    },
  ];

  for (let i = 0; i < sampleCalls.length; i++) {
    const c = sampleCalls[i];
    const phoneHash = crypto.createHash('sha256').update(c.phone).digest('hex');
    const masked = `${c.phone.slice(0, 4)} ****** ${c.phone.slice(-4)}`;

    const startTime = new Date(Date.now() - (i + 1) * 3600000 * 4);
    const endTime = new Date(startTime.getTime() + c.duration * 1000);
    const idempotencyKey = `DEVICE-EVT-2026-08-07-00${i + 1}`;

    const callDoc = await db.collection('calls').insertOne({
      organizationId: orgId,
      userId: c.userId,
      agentName: c.agentName,
      deviceId: 'DEVICE-SIM-SLOT-1',
      idempotencyKey,
      phoneNumberMasked: masked,
      phoneNumberHash: phoneHash,
      direction: c.direction,
      status: c.status,
      channel: c.channel,
      startTime,
      endTime,
      durationSeconds: c.duration,
      simSlot: c.channel === CallChannel.WHATSAPP ? 0 : 1,
      isPrivate: false,
      recordingStatus: c.hasAudio ? RecordingUploadStatus.UPLOADED : RecordingUploadStatus.NONE,
      disposition: c.disposition,
      leadId: c.leadId,
      leadName: c.leadName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const callId = callDoc.insertedId;

    if (c.hasAudio) {
      const s3Key = `organizations/${orgId.toString()}/recordings/2026/08/${callId.toString()}/recording.m4a`;
      const recDoc = await db.collection('recordings').insertOne({
        organizationId: orgId,
        callId,
        s3Bucket: 'recordhub-audio-recordings',
        s3Key,
        fileSizeBytes: 4200000,
        mimeType: 'audio/m4a',
        checksumSha256: crypto.createHash('sha256').update(`audio-${i}`).digest('hex'),
        durationSeconds: c.duration,
        uploadStatus: RecordingUploadStatus.UPLOADED,
        createdAt: new Date(),
      });

      await db.collection('calls').updateOne(
        { _id: callId },
        { $set: { recordingId: recDoc.insertedId } },
      );
    }
  }

  console.log('✅ Seeded 5 Realistic SIM & WhatsApp Calls with Audio Recordings');
  console.log('🚀 Seed process completed successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
