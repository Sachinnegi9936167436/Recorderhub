import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    email: { type: String, required: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, default: '' },
    role: { type: String, default: 'COUNSELOR' },
    phoneNumber: { type: String, default: '' },
    organizationId: { type: String, default: '65c1f0000000000000000001' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CallSchema = new Schema(
  {
    organizationId: { type: String, default: '65c1f0000000000000000001' },
    userId: { type: String },
    agentName: { type: String, default: 'Counselor Agent' },
    deviceId: { type: String, default: 'ANDROID-XIAOMI-PROD' },
    idempotencyKey: { type: String, index: true },
    phoneNumber: { type: String },
    phoneNumberMasked: { type: String },
    phoneNumberHash: { type: String },
    direction: { type: String, default: 'INCOMING' },
    status: { type: String, default: 'ANSWERED' },
    channel: { type: String, default: 'CELLULAR' },
    startTime: { type: Date },
    endTime: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    simSlot: { type: Number, default: 0 },
    isPrivate: { type: Boolean, default: false },
    recordingStatus: { type: String, default: 'NONE' },
    disposition: { type: String, default: 'Imported Phone Call' },
    leadId: { type: String },
    leadName: { type: String },
  },
  { timestamps: true, strict: false },
);

const DeviceSchema = new Schema(
  {
    organizationId: { type: String, default: '65c1f0000000000000000001' },
    userId: { type: String },
    agentName: { type: String, default: 'Counselor Agent' },
    deviceId: { type: String, required: true },
    deviceModel: { type: String, default: 'Xiaomi Phone' },
    androidVersion: { type: String, default: 'Android 14' },
    appVersion: { type: String, default: 'v1.0.4' },
    batteryOptimizationDisabled: { type: Boolean, default: true },
    safDirectoryAuthorized: { type: Boolean, default: true },
    lastSyncTimestamp: { type: Date, default: Date.now },
    failedUploadCount: { type: Number, default: 0 },
    pendingSyncCount: { type: Number, default: 0 },
    status: { type: String, default: 'HEALTHY' },
  },
  { timestamps: true },
);

const TeamSchema = new Schema(
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
  { timestamps: true },
);

CallSchema.index({ startTime: -1, createdAt: -1 });
CallSchema.index({ phoneNumber: 1 });
CallSchema.index({ deviceId: 1, startTime: -1 });
CallSchema.index({ s3Key: 1 }, { sparse: true });
CallSchema.index({ audioUrl: 1 }, { sparse: true });
CallSchema.index({ counselorEmail: 1, startTime: -1 });
CallSchema.index({ recordingStatus: 1 });

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

DeviceSchema.index({ deviceId: 1 });
DeviceSchema.index({ lastSyncTimestamp: -1 });

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const CallModel = mongoose.models.Call || mongoose.model('Call', CallSchema);
export const DeviceModel = mongoose.models.Device || mongoose.model('Device', DeviceSchema);
export const TeamModel = mongoose.models.Team || mongoose.model('Team', TeamSchema);

