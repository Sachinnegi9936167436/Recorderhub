# RecordHub: Verification & Automated Test Plan

## 1. Test Strategy Overview
RecordHub enforces a multi-layered verification strategy covering unit, integration, RBAC isolation, mobile offline sync, and Playwright end-to-end (E2E) testing.

---

## 2. Automated Test Matrix

| Layer | Framework / Tools | Coverage Scope | Target Command |
| :--- | :--- | :--- | :--- |
| **Unit Tests** | Jest (Backend) / Vitest (Frontend) | DTO schemas, phone number E.164 normalization, scoring algorithms, presigned S3 key generators | `npm run test:unit` |
| **API Integration** | Supertest + Testcontainers (MongoDB) | Authentication, batch call sync idempotency, upload initiation, call query filtering | `npm run test:integration` |
| **Tenant Isolation** | Custom Jest Suite | Verification that Tenant A cannot access, query, or stream Tenant B call records | `npm run test:rbac` |
| **Android Mobile** | JUnit 5 + Room In-Memory + MockWebServer | Offline event queueing, idempotency keys, duplicate prevention, SAF file matching | `./gradlew test` (Android app) |
| **Dashboard E2E** | Playwright | Admin login, KPI card rendering, calls explorer filtering, recording player playback, score overrides | `npx playwright test` |

---

## 3. Manual Verification Protocols
1. Verify S3 presigned GET URL expires after exactly 5 minutes.
2. Confirm phone number masking is active for `SALES_AGENT` role and visible for `COMPANY_ADMIN`.
3. Test dual-SIM call logging with simulated SIM switch.
