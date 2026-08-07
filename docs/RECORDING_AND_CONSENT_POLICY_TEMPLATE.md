# RecordHub: Recording & Employee Consent Policy Template

> **DISCLAIMER**: This document is a draft template provided for technical design reference. It must be reviewed and customized by qualified legal counsel prior to enterprise deployment.

---

## 1. Employee Notice & Consent Acknowledgment

### Policy Purpose
Academically Global Healthcare Academy ("Company") utilizes **RecordHub** to record and analyze work-related SIM calls conducted on company-provided or authorized mobile devices during designated working hours. This program aims to ensure healthcare course advising quality, facilitate agent training, and maintain compliance.

### Terms of Monitoring & Collection
1. **Scope of Data Collected**: Incoming and outgoing SIM call logs (phone number, time, duration, SIM slot), native call recordings saved to designated audio folders, and generated AI summaries.
2. **Private / Personal Call Handling**: Counselors may mark personal calls as "Private" in the RecordHub mobile application. Metadata for private calls is masked, and audio files are excluded from upload.
3. **Working Hours Limitation**: Automatic tracking operates solely during established office hours (e.g., 9:30 AM to 6:30 PM IST).
4. **Data Retention**: Call metadata and recordings are stored securely in AWS India Region (`ap-south-1`) for a standard retention period of 180 days before automated deletion.

### Employee Consent Sign-off Form
```
I, ________________________ [Employee Name], Employee ID: ____________, 
confirm that I have read, understood, and agreed to the RecordHub Call Monitoring Policy.
I consent to the collection and analysis of work call logs and recordings for quality assurance.

Signature: __________________________    Date: ____________________
```

---

## 2. Customer Call Disclosure Scripts

### Incoming Calls (IVR Automated Script)
*"Thank you for calling Academically Global Healthcare Academy. Please note that this call may be recorded for quality assurance, training, and compliance purposes."*

### Outbound Counselor Script (First 15 Seconds)
*"Hello [Prospect Name], this is [Counselor Name] calling from Academically Global Healthcare Academy regarding your NCLEX-RN / Healthcare Licensing inquiry. Before we begin, please note that our call is recorded for quality control. May I proceed?"*
