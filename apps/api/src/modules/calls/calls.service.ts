import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Call, CallDocument } from '../../schemas/call.schema';
import { Recording, RecordingDocument } from '../../schemas/recording.schema';
import { AuditLog, AuditLogDocument } from '../../schemas/audit-log.schema';
import { normalizePhoneNumber, maskPhoneNumber, CallDirection, CallStatus, UserRole, CallChannel } from '@recordhub/shared';
import * as crypto from 'crypto';

@Injectable()
export class CallsService {
  constructor(
    @InjectModel(Call.name) private callModel: Model<CallDocument>,
    @InjectModel(Recording.name) private recordingModel: Model<RecordingDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async batchSync(userId: string, organizationId: string, agentName: string, callEvents: any[]) {
    const syncedIds: string[] = [];
    const duplicates: string[] = [];

    for (const event of callEvents) {
      try {
        const normalized = normalizePhoneNumber(event.phoneNumber);
        const phoneHash = crypto.createHash('sha256').update(normalized).digest('hex');
        const masked = maskPhoneNumber(normalized);

        const newCall = new this.callModel({
          organizationId: new Types.ObjectId(organizationId),
          userId: new Types.ObjectId(userId),
          agentName,
          deviceId: event.deviceId,
          idempotencyKey: event.idempotencyKey,
          phoneNumberMasked: masked,
          phoneNumberHash: phoneHash,
          direction: event.direction || CallDirection.OUTGOING,
          status: event.status || CallStatus.ANSWERED,
          channel: event.channel || CallChannel.CELLULAR,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          durationSeconds: event.durationSeconds,
          simSlot: event.simSlot || 0,
          isPrivate: event.isPrivate || false,
          disposition: event.disposition || 'New Contact',
          leadId: event.leadId,
          leadName: event.leadName,
        });

        await newCall.save();
        syncedIds.push(event.idempotencyKey);
      } catch (err: any) {
        if (err.code === 11000) {
          // Idempotency duplicate key hit - record as processed duplicate
          duplicates.push(event.idempotencyKey);
        } else {
          throw err;
        }
      }
    }

    return {
      syncedCount: syncedIds.length,
      duplicateCount: duplicates.length,
      syncedIds,
      duplicates,
    };
  }

  async findAll(organizationId: string, query: any, userRole: string, currentUserId: string) {
    const filter: any = { organizationId: new Types.ObjectId(organizationId) };

    if (query.agentId) {
      filter.userId = new Types.ObjectId(query.agentId);
    }
    if (query.direction) {
      filter.direction = query.direction;
    }
    if (query.channel) {
      filter.channel = query.channel;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (userRole === UserRole.SALES_AGENT) {
      filter.userId = new Types.ObjectId(currentUserId);
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.callModel.find(filter).sort({ startTime: -1 }).skip(skip).limit(limit).lean(),
      this.callModel.countDocuments(filter),
    ]);

    const formatted = items.map((call) => ({
      id: call._id.toString(),
      organizationId: call.organizationId.toString(),
      userId: call.userId.toString(),
      agentName: call.agentName,
      deviceId: call.deviceId,
      idempotencyKey: call.idempotencyKey,
      phoneNumberMasked: userRole === UserRole.COMPANY_ADMIN || userRole === UserRole.SALES_MANAGER ? call.phoneNumberMasked : maskPhoneNumber(call.phoneNumberMasked),
      direction: call.direction,
      status: call.status,
      channel: call.channel || CallChannel.CELLULAR,
      startTime: call.startTime.toISOString(),
      endTime: call.endTime.toISOString(),
      durationSeconds: call.durationSeconds,
      simSlot: call.simSlot,
      isPrivate: call.isPrivate,
      recordingStatus: call.recordingStatus,
      recordingId: call.recordingId ? call.recordingId.toString() : null,
      disposition: call.disposition,
      leadId: call.leadId,
      leadName: call.leadName,
      createdAt: (call as any).createdAt ? (call as any).createdAt.toISOString() : new Date().toISOString(),
    }));

    return {
      items: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(organizationId: string, callId: string, actorUserId: string, actorName: string) {
    const call = await this.callModel.findOne({
      _id: new Types.ObjectId(callId),
      organizationId: new Types.ObjectId(organizationId),
    }).lean();

    if (!call) {
      throw new NotFoundException('Call record not found');
    }

    const recording = await this.recordingModel.findOne({ callId: call._id }).lean();

    // Create immutable audit log
    await this.auditLogModel.create({
      organizationId: new Types.ObjectId(organizationId),
      actorUserId: new Types.ObjectId(actorUserId),
      actorName,
      action: 'CALL_VIEWED',
      targetResource: `Call:${callId}`,
    });

    return {
      call: {
        id: call._id.toString(),
        agentName: call.agentName,
        direction: call.direction,
        status: call.status,
        channel: call.channel || CallChannel.CELLULAR,
        startTime: call.startTime.toISOString(),
        durationSeconds: call.durationSeconds,
        phoneNumberMasked: call.phoneNumberMasked,
        disposition: call.disposition,
        leadId: call.leadId,
        leadName: call.leadName,
        recordingStatus: call.recordingStatus,
      },
      recording: recording ? {
        id: recording._id.toString(),
        durationSeconds: recording.durationSeconds,
        fileSizeBytes: recording.fileSizeBytes,
        mimeType: recording.mimeType,
        checksumSha256: recording.checksumSha256,
      } : null,
    };
  }

  async updateDisposition(organizationId: string, callId: string, disposition: string) {
    const updated = await this.callModel.findOneAndUpdate(
      { _id: new Types.ObjectId(callId), organizationId: new Types.ObjectId(organizationId) },
      { $set: { disposition } },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Call not found');
    return { success: true, disposition: updated.disposition };
  }
}
