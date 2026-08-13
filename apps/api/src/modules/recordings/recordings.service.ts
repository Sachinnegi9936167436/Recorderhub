import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Recording, RecordingDocument } from '../../schemas/recording.schema';
import { Call, CallDocument } from '../../schemas/call.schema';
import { AuditLog, AuditLogDocument } from '../../schemas/audit-log.schema';
import { RecordingUploadStatus } from '@recordhub/shared';

@Injectable()
export class RecordingsService {
  constructor(
    @InjectModel(Recording.name) private recordingModel: Model<RecordingDocument>,
    @InjectModel(Call.name) private callModel: Model<CallDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async initiateUpload(organizationId: string, callId: string, payload: { fileSizeBytes: number; mimeType: string; checksumSha256: string; durationSeconds: number }) {
    const isObjectId = Types.ObjectId.isValid(callId);
    let call = await this.callModel.findOne({
      $or: [
        { idempotencyKey: callId },
        { _id: isObjectId ? new Types.ObjectId(callId) : null }
      ],
      organizationId: new Types.ObjectId(organizationId),
    });

    if (!call) {
      // Fallback matching by clean 10-digit phone number if call was deduplicated on batch sync
      const digitsOnly = callId.replace(/\D/g, '');
      const cleanDigits = digitsOnly.slice(-10);
      if (cleanDigits.length === 10) {
        const regexPattern = new RegExp(`${cleanDigits}$`);
        call = await this.callModel.findOne({
          phoneNumber: { $regex: regexPattern },
          organizationId: new Types.ObjectId(organizationId),
        }).sort({ startTime: -1 });
      }
    }

    if (!call) throw new NotFoundException('Call record not found');

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const s3Key = `organizations/${organizationId}/recordings/${year}/${month}/${callId}/recording.m4a`;

    let recording = await this.recordingModel.findOne({ callId: call._id });
    if (!recording) {
      recording = new this.recordingModel({
        organizationId: new Types.ObjectId(organizationId),
        callId: call._id,
        s3Bucket: process.env.S3_BUCKET_NAME || 'recordhub-audio-recordings',
        s3Key,
        fileSizeBytes: payload.fileSizeBytes,
        mimeType: payload.mimeType || 'audio/m4a',
        checksumSha256: payload.checksumSha256,
        durationSeconds: payload.durationSeconds,
        uploadStatus: RecordingUploadStatus.PENDING_UPLOAD,
      });
      await recording.save();
    }

    call.recordingStatus = RecordingUploadStatus.PENDING_UPLOAD;
    call.recordingId = recording._id as any;
    await call.save();

    // Mock S3 presigned PUT URL generator for local dev / testing
    const presignedPutUrl = `${process.env.S3_ENDPOINT || 'http://localhost:9000'}/${process.env.S3_BUCKET_NAME || 'recordhub-audio-recordings'}/${s3Key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900`;

    return {
      recordingId: recording._id.toString(),
      s3Key,
      presignedPutUrl,
    };
  }

  async completeUpload(organizationId: string, recordingId: string) {
    const recording = await this.recordingModel.findOne({
      _id: new Types.ObjectId(recordingId),
      organizationId: new Types.ObjectId(organizationId),
    });
    if (!recording) throw new NotFoundException('Recording not found');

    recording.uploadStatus = RecordingUploadStatus.UPLOADED;
    await recording.save();

    await this.callModel.updateOne(
      { _id: recording.callId },
      { $set: { recordingStatus: RecordingUploadStatus.UPLOADED } },
    );

    return { success: true, uploadStatus: RecordingUploadStatus.UPLOADED };
  }

  async getStreamUrl(organizationId: string, recordingId: string, actorUserId: string, actorName: string) {
    const recording = await this.recordingModel.findOne({
      _id: new Types.ObjectId(recordingId),
      organizationId: new Types.ObjectId(organizationId),
    });
    if (!recording) throw new NotFoundException('Recording not found');

    // Create audit log entry for playback
    await this.auditLogModel.create({
      organizationId: new Types.ObjectId(organizationId),
      actorUserId: new Types.ObjectId(actorUserId),
      actorName,
      action: 'RECORDING_PLAYED',
      targetResource: `Recording:${recordingId}`,
    });

    // Generate 5-minute GET signed URL
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const streamUrl = `${process.env.S3_ENDPOINT || 'http://localhost:9000'}/${process.env.S3_BUCKET_NAME || 'recordhub-audio-recordings'}/${recording.s3Key}?X-Amz-Expires=300`;

    return {
      streamUrl,
      expiresAt,
      durationSeconds: recording.durationSeconds,
    };
  }
}
