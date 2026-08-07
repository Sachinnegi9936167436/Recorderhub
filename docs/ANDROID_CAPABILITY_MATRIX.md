# RecordHub: Android Hardware & OEM Compatibility Matrix

## Overview
This document specifies OEM-level technical behaviors, system paths, battery management quirks, and dual-SIM handling across popular Android smartphones in India.

---

## 1. OEM System Breakdown & Default Native Recording Directories

| OEM | Android OS Versions | Default Call Recording Directory | System Settings Path to Enable Native Recording |
| :--- | :--- | :--- | :--- |
| **Samsung** | One UI 3.0 - 6.1 (Android 11-14) | `/Internal Storage/Call` or `/Internal Storage/Recordings/Call` | Phone App -> Settings -> Record calls -> Auto record calls [ON] |
| **Xiaomi / Redmi / Poco** | MIUI 12 - 14 / HyperOS (Android 10-14) | `/Internal Storage/MIUI/sound_recorder/call_rec` | Dialer -> Settings -> Call Recording -> Record calls automatically [ON] |
| **OnePlus** | OxygenOS 11 - 14 (Android 11-14) | `/Internal Storage/Record/Call` | Phone -> Settings -> Call Recording -> Auto-record calls [ON] |
| **Realme / Oppo** | Realme UI / ColorOS 11 - 14 | `/Internal Storage/Music/Recordings` or `/Record/Call` | Contacts/Phone -> Settings -> Call Recording [ON] |
| **Vivo / iQOO** | Funtouch OS 11 - 14 | `/Internal Storage/Record/Call` | Phone -> Settings -> Call Recording -> Record all calls automatically [ON] |
| **Motorola** | My UX (Android 11-14) | `/Internal Storage/Recordings` (or Google Dialer internal) | Phone App -> Settings -> Call recording [ON] |
| **Google Pixel** | Stock Android 11-15 | `/Internal Storage/Sounds` (User shared via document picker) | Phone App -> Settings -> Call recording (Region dependent) |

---

## 2. Battery Saver & Background Execution Optimization Workarounds

To ensure `WorkManager` call event synchronization and `ForegroundService` event listeners are not killed by aggressive OEM power managers (e.g., "DontKillMyApp" ratings):

### Samsung One UI
1. **Settings** -> **Apps** -> **RecordHub** -> **Battery** -> Select **Unrestricted**.
2. Disable **Put unused apps to sleep** under Device Care.

### Xiaomi MIUI / HyperOS
1. **Settings** -> **Apps** -> **Manage Apps** -> **RecordHub** -> Enable **Autostart**.
2. **Battery Saver** -> Select **No restrictions**.

### OnePlus / Oppo / Realme
1. **Settings** -> **Battery** -> **More Settings** -> **Optimize battery use** -> **RecordHub** -> **Don't optimize**.
2. Enable **Allow background activity** and **Allow auto-launch**.

### Vivo Funtouch OS
1. **Settings** -> **Battery** -> **Background power consumption management** -> **RecordHub** -> Select **High background power consumption**.

---

## 3. Dual-SIM Detection & Subscription Management

RecordHub handles Dual-SIM devices using Android's `SubscriptionManager` API:

```kotlin
val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
val activeSubscriptionInfoList = subscriptionManager.activeSubscriptionInfoList

for (info in activeSubscriptionInfoList) {
    val simSlotIndex = info.simSlotIndex // 0 for SIM 1, 1 for SIM 2
    val subscriptionId = info.subscriptionId
    val carrierName = info.carrierName
    val phoneNumber = info.number // Note: May be null on some Indian carriers (Jio/Airtel)
}
```

* **Handling Missing Number**: When `info.number` returns empty/null, RecordHub maps call logs using `SubscriptionId` and prompts the counselor during initial setup to designate SIM 1 or SIM 2 as the official business line.

---

## 4. Call-to-Recording Matching Logic

When a new call event completes, RecordHub runs a multi-criteria fuzzy matching algorithm to associate audio files with call log metadata:

```
[Call Event Ended] ---> Fetch Recent Audio Files in Authorized Directory
                               |
              +----------------+----------------+
              | Matches Criteria?               |
              | 1. Timestamp tolerance (+/- 30s)|
              | 2. Duration tolerance (+/- 5s) |
              | 3. Number in filename string   |
              +----------------+----------------+
                               |
                        [Match Confirmed]
                               |
                   Generate SHA-256 Checksum
                               |
                   Queue for S3 Multipart Upload
```
