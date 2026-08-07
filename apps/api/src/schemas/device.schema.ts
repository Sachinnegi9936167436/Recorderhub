import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DeviceDocument = Device & Document;

@Schema({ timestamps: true })
export class Device {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  agentName: string;

  @Prop({ required: true, unique: true })
  deviceId: string;

  @Prop({ required: true })
  deviceModel: string;

  @Prop({ required: true })
  androidVersion: string;

  @Prop({ required: true })
  appVersion: string;

  @Prop({ default: true })
  batteryOptimizationDisabled: boolean;

  @Prop({ default: true })
  safDirectoryAuthorized: boolean;

  @Prop({ default: Date.now })
  lastSyncTimestamp: Date;

  @Prop({ default: 0 })
  failedUploadCount: number;

  @Prop({ default: 0 })
  pendingSyncCount: number;

  @Prop({ default: 'HEALTHY' })
  status: string;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
