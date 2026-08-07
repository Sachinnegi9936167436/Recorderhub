import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { CallDirection, CallStatus, RecordingUploadStatus, CallChannel } from '@recordhub/shared';

export type CallDocument = Call & Document;

@Schema({ timestamps: true })
export class Call {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  agentName: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Team', index: true })
  teamId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  deviceId: string;

  @Prop({ required: true })
  idempotencyKey: string;

  @Prop({ required: true })
  phoneNumberMasked: string;

  @Prop({ required: true, index: true })
  phoneNumberHash: string;

  @Prop({ type: String, enum: CallDirection, required: true })
  direction: CallDirection;

  @Prop({ type: String, enum: CallStatus, required: true })
  status: CallStatus;

  @Prop({ type: String, enum: CallChannel, default: CallChannel.CELLULAR, index: true })
  channel: CallChannel;

  @Prop({ required: true, index: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ required: true })
  durationSeconds: number;

  @Prop({ default: 0 })
  simSlot: number;

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ type: String, enum: RecordingUploadStatus, default: RecordingUploadStatus.NONE })
  recordingStatus: RecordingUploadStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Recording' })
  recordingId: MongooseSchema.Types.ObjectId;

  @Prop()
  disposition: string;

  @Prop()
  leadId: string;

  @Prop()
  leadName: string;
}

export const CallSchema = SchemaFactory.createForClass(Call);
CallSchema.index({ organizationId: 1, idempotencyKey: 1 }, { unique: true });
CallSchema.index({ organizationId: 1, userId: 1, startTime: -1 });
