# RecordHub: REST API & OpenAPI Specification

## Base Specification
* **Base URL**: `https://calls.yourcompany.com/api/v1`
* **Authentication**: Bearer JWT (`Authorization: Bearer <access_token>`) + Refresh Token Rotation in HttpOnly Cookie.
* **Content Type**: `application/json`

---

## Endpoint Surface Map

### 1. Authentication & Session
- `POST /api/v1/auth/login`: Authenticate with email/password. Returns JWT access token & sets refresh cookie.
- `POST /api/v1/auth/refresh`: Rotate refresh token and issue new access token.
- `POST /api/v1/auth/logout`: Revoke active session tokens.

### 2. Android Device & Call Batch Ingestion
- `POST /api/v1/devices/register`: Register mobile hardware ID, SIM details, and app version.
- `POST /api/v1/devices/heartbeat`: Post device battery, storage, and permission status snapshot.
- `POST /api/v1/calls/batch-sync`: Idempotent batch upload of offline SIM call events from Room database.

### 3. Recording S3 Upload Direct Engine
- `POST /api/v1/recordings/upload-initiate`: Request presigned S3 multipart upload URLs.
- `POST /api/v1/recordings/upload-complete`: Finalize S3 upload, verify checksum ETag, queue BullMQ AI processing.
- `GET /api/v1/recordings/{id}/stream`: Fetch short-lived 5-minute signed S3 GET URL for browser player with byte-range support.

### 4. Calls Explorer & Manager Insights
- `GET /api/v1/calls`: Filter, search, paginate call records (supports mask/unmask PII guard).
- `GET /api/v1/calls/{id}`: Detailed call record, transcript, and AI scorecard.
- `PATCH /api/v1/calls/{id}/disposition`: Update call disposition, tags, and manager coaching notes.

### 5. Dashboard Aggregations & Analytics
- `GET /api/v1/analytics/kpis`: Executive overview (total calls, talk time, connection rate, unanswered missed calls).
- `GET /api/v1/analytics/time-series`: Daily/Hourly call volume & talk time chart series.
- `GET /api/v1/analytics/leaderboard`: Agent performance comparison table.

### 6. AI Conversation Intelligence & Override
- `POST /api/v1/ai/reprocess/{callId}`: Re-trigger speech-to-text and AI analysis.
- `POST /api/v1/ai/score-override/{callId}`: Manager override of QA rubric category scores with justification.

### 7. Pharmlly CRM Integration
- `POST /api/v1/crm/sync-manual/{callId}`: Manually re-trigger lead push to Pharmlly CRM.
- `GET /api/v1/crm/repair-queue`: View failed outbox events with retry/repair controls.
- `POST /api/v1/webhooks/pharmlly`: Inbound webhook endpoint for Pharmlly lead updates (HMAC SHA-256 verified).
