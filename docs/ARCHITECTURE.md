# RecordHub: System Architecture & Design Specification

## System Architecture Overview

RecordHub is structured as a modern monorepo separating frontend, API, background worker, mobile app, shared libraries, and infrastructure configurations.

```
recordhub/
├── apps/
│   ├── web/          # Next.js 14+ Admin & Manager Dashboard (React 18, Tailwind, shadcn/ui, TanStack Query)
│   ├── api/          # NestJS REST API Gateway & Business Logic Services (Mongoose, Passport, OpenAPI 3.1)
│   ├── android/      # Native Kotlin Jetpack Compose Sales Agent Mobile App (Room, WorkManager, Retrofit)
│   └── worker/       # BullMQ Background Worker Node for Audio Normalization, Speech-to-Text & LLM AI Scoring
├── packages/
│   ├── shared/       # Shared TypeScript DTOs, Zod Validation Schemas, Enums & Interfaces
│   ├── ui/           # Shared React UI Component Library
│   └── config/       # Shared ESLint, Prettier, TypeScript & Environment Schemas
├── infra/
│   ├── docker/       # Docker Compose manifests for local dev (MongoDB replica set, Redis, MinIO/LocalStack)
│   └── terraform/    # AWS Provisioning scripts (S3, KMS, ECS, ElastiCache, CloudFront)
└── docs/             # Technical specifications & policy documentation
```

---

## Architecture Diagrams

### 1. Overall System Architecture

```mermaid
flowchart TB
    subgraph MobileApp ["Android Mobile Application"]
        AgentUI["Jetpack Compose UI"]
        RoomDB[("Room SQLite Local DB")]
        CallObserver["Call Log & SAF Observer"]
        WorkMgr["WorkManager Offline Sync"]
        AgentUI --> RoomDB
        CallObserver --> RoomDB
        RoomDB --> WorkMgr
    end

    subgraph BackendInfrastructure ["Backend Infrastructure"]
        APIGateway["NestJS API Server Gateway"]
        AuthModule["JWT & Organization RBAC"]
        MongoReplica[("MongoDB Replica Set (Primary DB)")]
        RedisQueue[("Redis BullMQ Queues")]
        APIGateway --> AuthModule
        APIGateway --> MongoReplica
        APIGateway --> RedisQueue
    end

    subgraph BackgroundWorker ["Worker Nodes & AI Pipeline"]
        WorkerNode["BullMQ Worker Node"]
        FFmpegProc["FFmpeg Audio Normalizer"]
        WhisperSTT["Whisper Speech-to-Text (Hindi/Hinglish)"]
        LLMEngine["Claude / OpenAI Analysis Engine"]
        WorkerNode --> FFmpegProc
        FFmpegProc --> WhisperSTT
        WhisperSTT --> LLMEngine
        LLMEngine --> MongoReplica
    end

    subgraph StorageAndCRM ["Cloud Services & Integrations"]
        AWSS3[("AWS S3 Bucket (SSE-KMS Encrypted)")]
        PharmllyCRM["Pharmlly CRM REST API"]
    end

    WorkMgr -- "1. Idempotent Ingest & Presign Req" --> APIGateway
    WorkMgr -- "2. Direct Multipart S3 Upload" --> AWSS3
    RedisQueue --> WorkerNode
    WorkerNode -- "Fetch Audio Stream" --> AWSS3
    WorkerNode -- "Push Lead Call Log & Notes" --> PharmllyCRM
```

---

### 2. Android Call Event Ingestion & Offline Sync Flow

```mermaid
sequenceDiagram
    autonumber
    participant Telephony as Phone Telephony / CallLog
    participant AppObserver as RecordHub CallObserver
    participant Room as Local Room DB
    participant WM as WorkManager Sync Engine
    participant API as NestJS API Gateway
    participant DB as MongoDB Replica Set

    Telephony->>AppObserver: Call State Ended (RINGING -> OFFHOOK -> IDLE)
    AppObserver->>Room: Insert CallEvent (Status: PENDING, DeviceId, IdempotencyKey)
    Note over Room: Saved locally even if device is offline

    WM->>Room: Fetch PENDING CallEvents
    WM->>API: POST /api/v1/calls/batch-sync (Header: X-Idempotency-Key)
    API->>API: Validate Tenant Scope & Deduplicate Key
    API->>DB: Upsert Call Record (organization_id, user_id)
    API-->>WM: 200 OK (synced_ids)
    WM->>Room: Mark CallEvents as SYNCED
```

---

### 3. Presigned AWS S3 Upload & Async AI Pipeline Flow

```mermaid
sequenceDiagram
    autonumber
    participant App as Android Client App
    participant API as NestJS API
    participant S3 as AWS S3 Private Bucket
    participant Queue as Redis BullMQ
    participant Worker as Audio AI Worker Engine
    participant STT as Speech-to-Text Provider
    participant LLM as LLM Analysis Engine
    participant DB as MongoDB

    App->>API: POST /api/v1/recordings/upload-initiate (callId, checksum, size)
    API->>API: Verify Agent Ownership & Call Existence
    API-->>App: Return Presigned Multipart Upload URLs
    App->>S3: PUT Audio Chunks directly to S3
    App->>API: POST /api/v1/recordings/upload-complete (uploadId, parts, etags)
    API->>S3: Validate ETag & Object Size
    API->>DB: Create Recording Document (status: UPLOADED, s3Key)
    API->>Queue: Push 'process-recording' Job to BullMQ
    API-->>App: 200 OK (Recording Received)

    Queue->>Worker: Consume 'process-recording' Job
    Worker->>S3: Download Audio Buffer (or stream)
    Worker->>STT: Transcribe (Detect Hinglish/Hindi/English)
    STT-->>Worker: Return Transcript & Timestamps
    Worker->>LLM: Pass Transcript & Weighted QA Rubric Schema
    LLM-->>Worker: Return Structured Summary, Objections & QA Score
    Worker->>DB: Save Transcript & AIAnalysis Documents
```

---

### 4. Pharmlly CRM Integration & Outbox Flow

```mermaid
sequenceDiagram
    autonumber
    participant DB as MongoDB
    participant Worker as Outbox Worker
    participant CRM as Pharmlly CRM API Gateway
    participant Admin as Manager Repair Queue

    DB->>Worker: Poll IntegrationOutbox (status: PENDING)
    Worker->>Worker: Normalize Phone to E.164 (+91...)
    Worker->>CRM: POST /api/v1/leads/activity (Phone, CallType, Duration, RecordingUrl, Notes)
    alt CRM Success (200/201)
        CRM-->>Worker: Success Response
        Worker->>DB: Update Outbox Status: COMPLETED
    else CRM Transient Error (500/503/429)
        CRM-->>Worker: Error Response
        Worker->>DB: Increment Retry Count, Schedule Exponential Backoff
    else CRM Permanent Failure / Invalid Lead (400/404)
        CRM-->>Worker: Error Response
        Worker->>DB: Update Outbox Status: FAILED
        Worker->>Admin: Alert Manager via CRM Repair Queue UI
    end
```
