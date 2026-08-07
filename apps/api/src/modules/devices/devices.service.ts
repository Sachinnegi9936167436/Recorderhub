import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Device, DeviceDocument } from '../../schemas/device.schema';

@Injectable()
export class DevicesService {
  constructor(
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
  ) {}

  async registerDevice(userId: string, organizationId: string, agentName: string, payload: any) {
    const orgObjectId = new Types.ObjectId(organizationId);
    const userObjectId = new Types.ObjectId(userId);

    const device = await this.deviceModel.findOneAndUpdate(
      { deviceId: payload.deviceId },
      {
        $set: {
          organizationId: orgObjectId,
          userId: userObjectId,
          agentName,
          deviceModel: payload.deviceModel || 'Samsung Galaxy A54 5G',
          androidVersion: payload.androidVersion || 'Android 14 (API 34)',
          appVersion: payload.appVersion || 'v1.0.4-prod',
          batteryOptimizationDisabled: payload.batteryOptimizationDisabled ?? true,
          safDirectoryAuthorized: payload.safDirectoryAuthorized ?? true,
          lastSyncTimestamp: new Date(),
          status: 'HEALTHY',
        },
      },
      { upsert: true, new: true },
    );

    return device;
  }

  async heartbeat(deviceId: string, payload: any) {
    const updated = await this.deviceModel.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          lastSyncTimestamp: new Date(),
          batteryOptimizationDisabled: payload.batteryOptimizationDisabled,
          safDirectoryAuthorized: payload.safDirectoryAuthorized,
          failedUploadCount: payload.failedUploadCount || 0,
          pendingSyncCount: payload.pendingSyncCount || 0,
          status: payload.failedUploadCount > 3 ? 'CRITICAL' : payload.pendingSyncCount > 10 ? 'WARNING' : 'HEALTHY',
        },
      },
      { new: true },
    );
    return updated;
  }

  async getHealthList(organizationId: string) {
    return this.deviceModel.find({ organizationId: new Types.ObjectId(organizationId) }).sort({ lastSyncTimestamp: -1 }).lean();
  }
}
