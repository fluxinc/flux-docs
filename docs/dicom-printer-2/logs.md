# Log Interpretation


### 11.1. Event Types

Each log line is prefixed with a timestamp and an event type label. The following event types are used:

| Label | Meaning |
|---|---|
| `FATAL` | A critical error that may cause the application to terminate. |
| `ERROR` | An operation failed. The job may be held or an alternative workflow path taken. |
| `WARN` | A non-critical issue that may indicate a configuration problem or degraded operation. |
| `SUCCESS` | An operation completed successfully (e.g., a Store or Print action). |
| `INFO` | General informational messages about the application's progress. |
| `DEBUG` | Diagnostic messages emitted only in debug builds. Not present in production releases. |

### 11.2. Log Line Format

Each log line follows this format:

```
yyyy-MM-dd HH:mm:ss,zzz [TYPE   ] <indentation> message text
```

For example:

```
2025-01-15 10:23:45,123 [INFO   ] Parsing job file `job_001.txt'
2025-01-15 10:23:45,130 [INFO   ]   Executing action `QueryWorklist'
2025-01-15 10:23:45,250 [SUCCESS]   Executing action `QueryWorklist' finished
```

### 11.3. Verbosity Levels

The `<Verbosity>` setting in the `<General>` section controls how deeply nested log messages are recorded. The value corresponds to the maximum nesting depth of logged events:

- **Level 2** (recommended for production): Logs top-level actions and their immediate results. Sufficient for monitoring normal operation and diagnosing most problems.
- **Level 20** (full debug): Logs all nested operations, including detailed DICOM tag manipulation, query dataset contents, filter decisions, and network association details. Use this level when diagnosing complex issues. Note that this produces significantly more log output.
- **Default level**: `35` (as defined in the source code). This is the default if `<Verbosity>` is not specified, and logs nearly all available detail.

### 11.4. EventGuard Blocks (Indented Log Sections)

DP2 uses an `EventGuard` pattern to group related log messages. When an operation begins, an `INFO` message is logged and subsequent messages are indented by two spaces per nesting level. When the operation completes, a `SUCCESS` or `ERROR` message is logged at the original indentation level, marking the end of the block.

Example of a nested EventGuard block:

```
[INFO   ] Processing job `12345'
[INFO   ]   Executing action `QueryWorklist'
[INFO   ]     Preparing query dataset
[INFO   ]     Sending C-FIND request
[SUCCESS]   Executing action `QueryWorklist' succeeded
[INFO   ]   Executing action `StoreToPACS'
[ERROR  ]   Executing action `StoreToPACS' failed
[ERROR  ] Processing job `12345' failed
```

If an exception occurs during a guarded block, the EventGuard automatically logs an error and restores the indentation level, preventing log corruption. The original nesting level is always restored when a guard is destroyed, even in error cases.

### 11.5. Log Rotation

DP2 uses size-based log rotation to prevent unbounded log growth. The behavior is controlled by two settings in the `<General>` section:

| Setting | Default | Description |
|---|---|---|
| `MaximumLogFileSize` | 50 MB | Maximum size of the active log file before rotation occurs. Accepts values with `KB`, `MB`, or `GB` suffixes. Minimum enforced size is 1 MB. |
| `MaximumLogFileCount` | `10` | Maximum number of rotated log files to keep. Minimum is 2. Older files beyond this count are deleted. |

Log files are named `dicom_printer_service.log` (active), `dicom_printer_service.1.log` (previous), `dicom_printer_service.2.log`, and so on up to the configured maximum count. When rotation occurs, the active file is copied to `.1.log`, existing numbered files are shifted up by one, and files exceeding the maximum count are deleted. The active log file is then truncated and reused.

Log files are stored in the `log/` subdirectory under the application root path. The `log/old/` and `log/plugins/` subdirectories are created automatically.

### 11.6. Practical Tips for Log Analysis

- **Find errors quickly.** Search for `[ERROR` or `[FATAL` in the log file to locate failures.
- **Trace a specific job.** In debug builds, log lines include the job ID in brackets (e.g., `[job_001]`). Use this to filter messages for a single job.
- **Correlate with EventGuard blocks.** When investigating an error, scroll up from the error line to find the corresponding `INFO` entry at the same indentation level. This identifies the operation that failed.
- **Check rotation.** If the log file appears truncated or starts mid-operation, rotation may have occurred. Check the numbered log files (`dicom_printer_service.1.log`, etc.) for the preceding entries.
