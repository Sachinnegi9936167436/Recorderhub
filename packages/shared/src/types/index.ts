export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  SALES_MANAGER = 'SALES_MANAGER',
  QA_TRAINER = 'QA_TRAINER',
  SALES_AGENT = 'SALES_AGENT',
  AUDITOR = 'AUDITOR',
}

export enum CallDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

export enum CallStatus {
  ANSWERED = 'ANSWERED',
  MISSED = 'MISSED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export enum RecordingUploadStatus {
  NONE = 'NONE',
  PENDING_UPLOAD = 'PENDING_UPLOAD',
  UPLOADED = 'UPLOADED',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export enum CustomerInterestLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NOT_INTERESTED = 'NOT_INTERESTED',
}

export enum CallChannel {
  CELLULAR = 'CELLULAR',
  WHATSAPP = 'WHATSAPP',
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber: string;
  teamId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Call {
  id: string;
  organizationId: string;
  userId: string;
  agentName: string;
  teamId?: string;
  deviceId: string;
  idempotencyKey: string;
  phoneNumberMasked: string;
  phoneNumberHash: string;
  direction: CallDirection;
  status: CallStatus;
  channel: CallChannel;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  simSlot: number;
  isPrivate: boolean;
  recordingStatus: RecordingUploadStatus;
  recordingId?: string;
  disposition?: string;
  leadId?: string;
  leadName?: string;
  createdAt: string;
}

export interface Recording {
  id: string;
  organizationId: string;
  callId: string;
  s3Bucket: string;
  s3Key: string;
  fileSizeBytes: number;
  mimeType: string;
  checksumSha256: string;
  durationSeconds: number;
  kmsKeyArn?: string;
  uploadStatus: RecordingUploadStatus;
  streamUrl?: string;
  createdAt: string;
}

export interface ObjectionItem {
  timestampStart: number;
  objectionType: string;
  transcriptExcerpt: string;
  agentResponse: string;
}

export interface RubricCategoryScore {
  category: string;
  score: number;
  maxScore: number;
  justification: string;
}

export interface AIAnalysis {
  id: string;
  organizationId: string;
  callId: string;
  summaryShort: string;
  summaryDetailed: string;
  customerIntent: string;
  interestLevel: CustomerInterestLevel;
  programsDiscussed: string[];
  objections: ObjectionItem[];
  overallScore: number;
  rubricBreakdown: RubricCategoryScore[];
  coachingTips: string[];
  needsHumanReview: boolean;
  managerScoreOverride?: number;
  overrideReason?: string;
  createdAt: string;
}

export interface DeviceHealth {
  id: string;
  organizationId: string;
  userId: string;
  agentName: string;
  deviceId: string;
  deviceModel: string;
  androidVersion: string;
  appVersion: string;
  batteryOptimizationDisabled: boolean;
  safDirectoryAuthorized: boolean;
  lastSyncTimestamp: string;
  failedUploadCount: number;
  pendingSyncCount: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface ExecutiveKPIs {
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  answeredCalls: number;
  missedCalls: number;
  rejectedCalls: number;
  connectedRate: number;
  totalTalkTimeSeconds: number;
  avgTalkTimeSeconds: number;
  totalRecordings: number;
  recordingSuccessRate: number;
  pendingAnalysisCount: number;
  uniqueLeadsContacted: number;
  overdueFollowups: number;
  activeAgentCount: number;
}
