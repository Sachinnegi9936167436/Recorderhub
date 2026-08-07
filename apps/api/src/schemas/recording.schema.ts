import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { RecordingUploadStatus } from '@recordhub/shared';

export type RecordingDocument = Recording & Document;

@Schema({ timestamps: true })
export class Recording {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Call', required: true, unique: true })
  callId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  s3Bucket: string;

  @Prop({ required: true })
  s3Key: string;

  @Prop({ required: true })
  fileSizeBytes: number;

  @Prop({ default: 'audio/m4a' })
  mimeType: string;

  @Prop({ required: true })
  checksumSha256: string;

  @Prop({ required: true })
  durationSeconds: number;

  @Prop()
  kmsKeyArn: string;

  @Prop({ type: String, enum: RecordingUploadStatus, default: RecordingUploadStatus.PENDING_UPLOAD })
  uploadStatus: RecordingUploadStatus;
}

export const RecordingSchema = SchemaFactory.createForClass(Recording);
RecordingSchema.index({ organizationId: 1, s3Key: 1 }, { unique: true });
