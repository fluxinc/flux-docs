# Interrogating the Logs

DICOM Capacitor logs are stored in the `\log` directory.  The main log file is
`capacitor_service.log`.  This file contains a detailed log of all operations performed by DICOM Capacitor.

We recommend using a log viewer such as [TailBlazer](https://github.com/RolandPheasant/TailBlazer) or [BareTail](https://baremetalsoft.com/baretail/) to view the logs in real-time.

Optionally, Capacitor can also maintain [per-file logs](#per-file-logging) for each DICOM instance that passes through the system, and [storage receipts](#storage-receipts) for each instance that has been successfully stored.

## Service Log Rotation

The main service log file (`capacitor_service.log`) automatically rotates when it reaches 100MB in size. The service maintains up to 5 backup files using sequential numbering.

When the active log reaches 100MB, it is renamed to `.log.1`, and all existing backups are shifted (`.log.1` becomes `.log.2`, etc.). The oldest backup (`.log.5`) is deleted to maintain the 5-file limit.

### Configuration

- **`suppressLogAeTitles`** (default: `['HEALTHCHECK']`) - Suppresses diagnostic logging for specific AE titles to prevent log flooding from health check probes and monitoring systems. Associations whose `CallingAE` matches an entry in this list will have their informational, warning, and error messages muted in the service log.

  ```yaml
  suppressLogAeTitles:
    - HEALTHCHECK
    - K8S_PROBE
    - DOCKER_HC
  ```

  This keeps recurring health probes from flooding the logs while preserving insights for real traffic.

## Audit Log Rotation

The audit log file (`capacitor_service_audit.log`) automatically rotates when it reaches 100MB in size. When rotation occurs:

1. **Rotation**: The current audit log is renamed with a sequential number (e.g., `capacitor_service_audit.log.1`, `capacitor_service_audit.log.2`, etc.)
2. **Compression**: A background service automatically compresses rotated audit log files every hour
3. **Archival**: Compressed files are moved to the `audit_archive` subdirectory within the log directory as `capacitor_service_audit.log.N.gz`

This automatic compression helps conserve disk space while maintaining a complete audit trail. The compression service:

- Only compresses backup files (never the current active log)
- Runs hourly to process any new rotated logs
- Preserves original file timestamps on compressed archives
- Logs compression statistics (number of files compressed and space saved)

> [!NOTE]
> The audit log uses unlimited backup retention, so rotated logs are never automatically deleted. Administrators should implement their own retention policies for the compressed archives in the `audit_archive` directory based on their compliance requirements.

## Per-File Logging

DICOM Capacitor can maintain individual log files for each DICOM instance that passes through the system.

### Configuration

- **`daysToKeepLogs`** (default: `0`) - Controls per-file logging retention.
  - `0` - Per-file logging is **disabled** (recommended for most deployments to conserve disk space)
  - `> 0` - Per-file logs are enabled and retained for the specified number of days

- **`logSuffix`** (default: `#{2,2}-#{8,50}-#{10,20}`) - Controls the format of instance identifiers displayed in the **main service log** (`capacitor_service.log`). The default displays SOPClass-AccessionNumber-StudyDescription. This suffix appears in log entries to help correlate events for specific DICOM instances across the main log.

  Format: `#{group,tag}-#{group,tag}-...` where group and tag are hexadecimal DICOM tag identifiers.

  **Example log entry**:
  ```
  2025-11-25 10:45:23 [INFO] [1.2.840.113619.2.55.3.12345][BT-ACC12345-Chest X-Ray] Processing complete
  ```

  > [!NOTE]
  > This setting only affects the main service log. Per-file logs (when enabled) use the SOP Instance UID as the filename and do not include this suffix in their entries.

### Log File Structure

When enabled, individual log files are organized in a hierarchical directory structure:

```
cache\logs\
  └── YYYY-MM-DD\              # Date the file was received
      └── DESTINATION_AE\       # Destination AE title
          └── SOURCE_AE\        # Source AE title
              └── SOPUID.log    # Individual instance log
```

**Example**:
```
cache\logs\2025-11-25\PACS\MODALITY\1.2.840.113619.2.55.3.12345.log
```

### Log File Contents

Each log file contains timestamped entries for that specific DICOM instance, including:

- Filter processing steps
- Routing decisions
- Mutations applied
- Transfer operations
- Any errors or warnings specific to that instance

Log entries are formatted as:
```
[timestamp] [LogLevel] message
```

### Log Rotation

A background job automatically deletes per-file log directories older than the `daysToKeepLogs` threshold. The job runs every 10 hours and:

- Deletes entire date directories that are older than the retention period
- Skips directories that contain files currently in use
- Logs the number of directories deleted

## Storage Receipts

Storage receipts are small YAML files that track which DICOM instances have been successfully stored by DICOM Capacitor. They serve as a persistent record of received images and enable several important features.

### Purpose

Storage receipts enable:

- **Storage Commitment**: Confirming to sending modalities that images were successfully stored. When a modality sends a storage commitment request (N-EVENT-REPORT), DICOM Capacitor checks for the existence of storage receipts for the requested SOP instances. If receipts exist, it responds with a success confirmation; if receipts are missing or disabled, it reports failure. This allows sending systems to verify that images were safely received and stored.
- **Worklist Filtering**: Excluding already-stored studies from worklist query results (when `worklistFilterStored` is enabled)
- **Audit Trail**: Maintaining a record of what was received, when, and from where

### Configuration

- **`storageReceiptExpiryHours`** (default: `8`) - Controls storage receipt retention.
  - `0` - Storage receipts are **disabled**. No receipt files are written, and existing receipts are automatically purged by a background service.
  - `> 0` - Receipts are enabled and retained for the specified number of hours

  > [!WARNING]
  > When receipts are disabled (`storageReceiptExpiryHours = 0`):
  > - Storage commitment confirmations will report failures because confirmation receipts are unavailable
  > - Worklist filtering (`worklistFilterStored`) will not work and will log warnings

### Storage Location

Receipts are stored in the cache directory:

```
cache\receipts\
  └── DESTINATION__SOURCE__SOPUID.yml
```

**Example**:
```
cache\receipts\PACS__MODALITY__1.2.840.113619.2.55.3.12345.yml
```

Each receipt file contains:
- `SOPClassUID` - DICOM SOP Class UID
- `SOPInstanceUID` - Unique instance identifier
- `StudyInstanceUID` - Study identifier
- `SourceAeTitle` - Source AE title
- `DestinationAeTitle` - Destination AE title
- `OriginalFilename` - Original filename
- `ReceiptTimeUTC` - Timestamp when the receipt was created