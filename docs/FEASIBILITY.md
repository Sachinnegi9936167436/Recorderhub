# RecordHub: Feasibility Study & Android Technical Capability Report

## Executive Summary
**RecordHub** is an enterprise sales call monitoring, recording ingestion, and conversation-intelligence platform engineered for **Academically Global Healthcare Academy**. This report analyzes the technical feasibility, regulatory compliance, hardware capability variations, and platform architecture required to deploy a production-ready sales monitoring system in India.

---

## 1. Android OEM & Device Capability Matrix (India Market)

Android OEM customizations heavily impact call log access, background execution survival, and call recording access. The matrix below outlines behavior across primary OEM device families in India (Android 10 to Android 15):

| OEM / System UI | Call Log Metadata API (`READ_CALL_LOG`) | Native Call Recording Folder Location | SAF Auto-Scan Viability | Background Service & Battery Survival | Dual-SIM Detection Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Samsung (One UI 2.0 - 6.1)** | Fully Compliant | `/Call` or `/Recordings/Call` | High (Folder persistent via SAF) | Excellent with Knox / Battery whitelist | High (`SubscriptionManager`) |
| **Xiaomi / Redmi (MIUI / HyperOS)** | Fully Compliant | `/MIUI/sound_recorder/call_rec` | High | Moderate (Requires Autostart + Battery Saver disabled) | High |
| **OnePlus / Oppo / Realme (OxygenOS / ColorOS)** | Fully Compliant | `/Record/Call` or `/Music/Recordings` | High | High (Needs "Don't Optimize" setting) | High |
| **Vivo / iQOO (Funtouch OS / OriginOS)** | Fully Compliant | `/Record/Call` | High | Moderate (Requires High Background Power consumption flag) | High |
| **Motorola (My UX / Clean Android)** | Fully Compliant | Google Dialer Native Record (Restricted Scoped Storage) | Medium (Requires explicit user document picker authorization) | Excellent | High |
| **Google Pixel (Stock Android 10-15)** | Fully Compliant | Restricted Scoped Storage (`/Sounds` or Internal app storage) | Low/Manual (Requires manual file selection per recording) | Excellent | High |

---

## 2. Supported Android Versions & Permission Rationale

| Permission Name | API Levels | Protection Level | Technical Rationale & User Disclosure |
| :--- | :--- | :--- | :--- |
| `READ_CALL_LOG` | 16+ | Dangerous / Restricted | Captures start time, end time, duration, phone number, and direction (incoming/outgoing/missed/rejected). |
| `READ_PHONE_STATE` | 1+ | Dangerous | Identifies active SIM slot (`SubscriptionId`), network carrier, and call state transitions (IDLE, RINGING, OFFHOOK). |
| `POST_NOTIFICATIONS` | 33+ (Android 13+) | Dangerous | Required to present ongoing persistent notification while background call tracking service runs. |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_PHONE_CALL` | 28+ / 34+ | Normal / System | Guarantees call event tracking and offline WorkManager sync survive OS process death. |
| `RECEIVE_BOOT_COMPLETED` | 1+ | Normal | Re-registers call event listeners and sync workers automatically after phone restart. |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | 23+ | Normal / Intent | Prompts user to exclude RecordHub from aggressive OEM doze modes to prevent missing call events. |
| `ACTION_OPEN_DOCUMENT_TREE` (SAF) | 21+ | Storage Access Framework | Authorizes RecordHub to read media files from designated native call recording directory without requesting broad external storage permissions. |

---

## 3. Three Compliant Implementation Paths for Call Recording

Because Android 9+ prohibited non-system apps from capturing line-in audio during SIM calls, we establish **three tier-compliant architectures**:

```
+-----------------------------------------------------------------------------------+
|                            RecordHub Recording Architecture                         |
+-----------------------------------------------------------------------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
  [Path 1: Native SAF]        [Path 2: Enterprise OEM]      [Path 3: Enterprise VoIP]
  - Consumes OEM recorder     - Uses Samsung Knox / OEM     - Built-in WebRTC / SIP
  - Policy Compliant          - Device Admin Rights         - Universal 2-sided Audio
  - User grants directory     - Dedicated corporate devices - Independent of OEM limitations
```

### Path 1: Storage Access Framework (SAF) Native Recorder Ingestion (Primary MVP Target)
* **Mechanism**: Devices with active OEM call recording enabled save `.m4a` / `.mp3` / `.amr` files to known directories. The agent authorizes directory access once via SAF (`ACTION_OPEN_DOCUMENT_TREE`). RecordHub monitors directory updates using `ContentObserver` / `WorkManager` file polling.
* **Pros**: 100% compliant with Google Play Store policies; requires zero root or accessibility workarounds.
* **Cons**: Depends on OEM native recorder existence and user enabling native call recording in system settings.

### Path 2: Enterprise OEM / Knox Managed Integration (Corporate Fleet Path)
* **Mechanism**: On company-owned Samsung or Knox-managed devices, MDM (Knox Service Plugin / Enterprise SDK) configures native recording to always-on and exposes direct audio file paths to enterprise-signed applications.
* **Pros**: Automatic, non-bypassable, 100% reliable 2-sided recording.
* **Cons**: Limited to supported enterprise Android hardware (Samsung Knox Enterprise Edition).

### Path 3: Company-Controlled VoIP / Cloud Dialer Architecture (Guaranteed Fallback)
* **Mechanism**: RecordHub embeds a SIP/WebRTC softphone dialer (using WebRTC / PJSIP). Calls are routed through Twilio / Plivo / Asterisk media servers where 2-sided audio is recorded at the cloud gateway.
* **Pros**: 100% device-independent, guaranteed crystal-clear stereo dual-channel recording, compatible with iOS & Android.
* **Cons**: Incurs PSTN per-minute trunking costs; requires Internet data connectivity for calls.

---

## 4. Google Play Store Distribution & Policy Limitations

1. **Call Log Permission Restrictions**: Google Play strictly limits `READ_CALL_LOG` to apps designated as default dialers or default SMS handlers. 
2. **Accessibility API Prohibition**: Using Accessibility Services (`AccessibilityService`) to record call audio violates Google Play Developer Program Policies (User Data & Software Safeguards Policy) and will trigger instant app suspension and developer account termination.
3. **Storage Access**: Broad `MANAGE_EXTERNAL_STORAGE` permission is denied for call log utilities. RecordHub uses targeted **Storage Access Framework (SAF)** to request explicit single-folder access (`ACTION_OPEN_DOCUMENT_TREE`).
4. **Distribution Recommendation**:
   * **Primary Recommendation**: **Managed Google Play (Private Enterprise App)** or **Direct Enterprise APK distribution** via MDM (e.g., Knox / ManageEngine / Hexnode) for company-owned devices.
   * **Alternative**: Standard APK sideload with corporate device enrollment for internal sales teams.

---

## 5. Feature Viability Classification Matrix

| Feature | Viability Status | Notes & Caveats |
| :--- | :--- | :--- |
| **SIM Call Metadata Logging** | **Reliable** | Supported on 100% of Android 10-15 devices via standard Android Telephony & CallLog APIs. |
| **Offline Event Caching & Sync** | **Reliable** | Standard Android Room DB + WorkManager pattern ensures zero call event loss. |
| **OEM Native Recording Upload** | **Device-Dependent** | Works on Samsung, Xiaomi, OnePlus, Vivo, Oppo when native call recording is active. |
| **WebRTC Softphone Recording** | **Reliable** | Fully functional enterprise VoIP path. |
| **Automatic 2-Sided SIM Audio** | **Unsupported (SIM)** | Android framework blocks direct SIM audio tapping for third-party non-system apps. |
| **WhatsApp Call Audio Recording** | **Experimental / Disabled**| Flagged disabled. Requires Accessibility workarounds which violate Play Store & OS security models. |

---

## 6. Legal & Privacy Checkpoints (India & International)

1. **India Digital Personal Data Protection Act (DPDPA 2023)**:
   * **Employer-Employee Notice**: Clear written disclosure and consent acknowledgement signed by counselors during app onboarding.
   * **Purpose Limitation**: Call monitoring restricted exclusively to official work hours and business contacts.
   * **Data Minimization**: Option for counselors to flag personal calls as Private (metadata masked, zero audio captured).
2. **Telecom Regulations & Call Recording Disclosure**:
   * For incoming calls, an IVR/Counselor verbal notification ("This call may be recorded for quality assurance and training purposes") must be provided where mandated.
3. **Data Retention & Sovereignty**:
   * All audio recordings and databases must reside within AWS India Region (`ap-south-1` Mumbai) to comply with healthcare/education data residency mandates.
