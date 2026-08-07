# RecordHub: Security, Compliance & Data Privacy Architecture

## 1. Compliance Framework Overview
RecordHub complies with India’s **Digital Personal Data Protection Act (DPDPA 2023)**, ISO/IEC 27001 data governance practices, and AWS Security Best Practices for healthcare & educational enterprises.

---

## 2. Multi-Tenant Isolation (Organization Scoping)
- Every MongoDB document contains `organization_id`.
- NestJS API guards execute an explicit `OrganizationTenantGuard` on every incoming HTTP request.
- Database queries bind `organization_id` to MongoDB compound indexes, ensuring cross-tenant data leak is physically impossible.

---

## 3. Data Protection at Rest & In Transit

### Data in Transit
- All external HTTP communication enforces **TLS 1.3** with modern cipher suites.
- Internal microservice/redis traffic within VPC runs over TLS.

### Data at Rest
- AWS S3 recordings encrypted using **SSE-KMS** with Customer Managed Keys (CMK).
- MongoDB disk volumes encrypted via AWS EBS Volume Encryption (AES-256).

---

## 4. Phone Number Masking & PII Redaction
- Phone numbers masked by default (`+91 ****** 9876`) for non-privileged roles.
- `phone_number_hash` (HMAC SHA-256) enables instant database indexing & search without cleartext PII exposure.
- Speech-to-Text pipeline redacts credit card numbers, Aadhaar/PAN numbers, and sensitive health identifiers prior to LLM analysis.

---

## 5. AWS S3 Presigned URL & Access Security
- S3 Bucket has **Block Public Access** enabled at both account and bucket level.
- Audio files are served exclusively through short-lived presigned GET URLs with a strict **5-minute expiration window**.
- Direct downloads are restricted to authorized `COMPANY_ADMIN` or `QA_TRAINER` roles and logged instantly in `audit_logs`.

---

## 6. Immutable Audit Logging
The `audit_logs` collection tracks every sensitive action with `timestamp`, `actor_user_id`, `action`, `target_resource`, and `ip_address`:
- Audio file playback & download
- PII unmasking requests
- Role modification or user invitation
- Call score override
- Retention policy modification
