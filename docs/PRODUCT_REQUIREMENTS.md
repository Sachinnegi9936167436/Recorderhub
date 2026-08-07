# RecordHub: Product Requirements Document (PRD)

## Product Name
**RecordHub** (Sales Call Intelligence & QA Monitoring Platform for Academically Global Healthcare Academy)

---

## 1. System Vision & Objective
RecordHub is an enterprise conversation intelligence platform built specifically for healthcare course sales counselors at **Academically Global Healthcare Academy**. It bridges sales activity monitoring, native Android call recording ingestion, automated AI conversation scoring (Hinglish/Hindi/English), and automated CRM synchronization into Pharmlly CRM.

---

## 2. User Roles & Permission Hierarchy (RBAC)

| Role | Scope | Key Capabilities |
| :--- | :--- | :--- |
| **Super Admin** | Platform Wide | System configuration, multi-tenant organization creation, security policy management. |
| **Company Admin** | Organization Wide | User management, team structure, global recording policies, integration configuration, full billing/audit access. |
| **Sales Manager** | Assigned Team(s) | View team live feed, review team KPIs, listen to recordings, edit call dispositions, trigger coaching workflows. |
| **QA / Trainer** | Organization Wide / Team | Evaluate calls against weighted rubrics, override AI scores, leave timestamped audio comments, create coaching tasks. |
| **Sales Agent / Counselor** | Self Only | Mobile app user. View own call timeline, private call exclusions, add call notes/follow-ups, check sync health. |
| **Auditor** | Read-Only | Inspect immutable system audit logs, compliance reports, legal hold data, and consent verification records. |

---

## 3. Core Functional Requirements

### 3.1 Mobile Event Capture & Sync (Android)
- **Call Metadata**: Ingest incoming, outgoing, missed, rejected, and answered call events containing phone number, duration, call type, start/end timestamps, SIM slot, and carrier name.
- **Offline Support**: Store events locally in Room SQLite database using stable UUIDs and idempotency tokens. Auto-sync via `WorkManager` when internet restores.
- **Private Calls**: Allow counselors to exclude personal calls according to company policy. Managers see aggregate private call counts only (zero metadata, zero audio).
- **Working Hours Restriction**: Call tracking automatically pauses outside configured office hours (e.g., 9:30 AM to 6:30 PM IST) and on weekly off days.

### 3.2 Recording Management & AWS S3 Infrastructure
- Presigned S3 direct multipart uploads (zero audio pass-through API server).
- Enforced AES-256 / SSE-KMS encryption.
- Short-lived GET signed URLs (5-minute expiration) for web playback.
- Byte-range request support for smooth waveform scrubbing.

### 3.3 AI Conversation Intelligence (Asynchronous Pipeline)
- Transcribe audio in English, Hindi, and Hinglish with speaker labels.
- Structured LLM analysis: summary, prospect intent, programs discussed, objection extraction with timestamps, compliance risks, talk/listen ratio, coaching advice, weighted quality scorecard.
- Manager override support for AI score adjustment.

### 3.4 Pharmlly CRM Integration
- E.164 phone number normalization.
- Bi-directional lead matching and call activity posting.
- Outbox pattern with exponential backoff retries and admin repair queue.

### 3.5 Compliance & Security
- Mandatory employee onboarding disclosure and policy consent sign-off.
- Tenant isolation enforced via MongoDB `organization_id` index scoping.
- Full immutable audit logging for call views, audio playback, downloads, and policy edits.
