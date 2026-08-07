# RecordHub: Pharmlly CRM Integration Specification

## 1. Adapter Architecture & Scope
RecordHub integrates with **Pharmlly CRM** to sync call logs, audio playback links, transcripts, call dispositions, follow-up dates, and AI coaching summaries against lead records.

```
[RecordHub Call Processed] ---> Queue Outbox Event ---> Pharmlly Adapter
                                                            |
                                        +-------------------+-------------------+
                                        |                                       |
                            [Normalize E.164 Phone]                 [Lookup Pharmlly Lead ID]
                                        |                                       |
                                        +-------------------+-------------------+
                                                            |
                                               POST /api/v1/leads/{id}/activity
```

---

## 2. Phone Number E.164 Normalization Standard
All incoming phone numbers are cleansed and formatted according to Google's `libphonenumber` E.164 standard prior to lookup:
- Raw input: `09876543210` or `9876543210` -> Formatted: `+919876543210`
- Country ISO Default: `IN` (+91)

---

## 3. Outbox Pattern & Reliability Guarantees
- Call sync events are written transactionally to `integration_outboxes` collection with status `PENDING`.
- A dedicated BullMQ job consumes outbox entries and calls the Pharmlly REST API using exponential backoff (retries at 1m, 5m, 15m, 1h, 6h).
- Permanent failures (e.g., Lead Not Found) move to the **CRM Repair Queue UI** for manager intervention.

---

## 4. Inbound Pharmlly Webhook Interface
- Endpoint: `POST /api/v1/webhooks/pharmlly`
- Header Verification: `X-Pharmlly-Signature` (HMAC SHA-256 using configured webhook secret).
- Events processed: `lead.created`, `lead.owner_changed`, `lead.stage_updated`.
