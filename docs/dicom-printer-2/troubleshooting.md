# Troubleshooting


This section covers common operational problems and their resolutions.

### 9.1. Store Failures

| Symptom | Likely Cause | Resolution |
|---|---|---|
| "Connection refused" in log | Remote DICOM system is unreachable or not listening | Verify the IP address, port, and AE title in the `<ConnectionParameters>` of the `<Store>` action. Confirm the remote system is running and accepting associations on the configured port. |
| "Wrong AE title" or association rejected | The Called AE Title does not match what the remote system expects | Check `CalledAeTitle` in `<ConnectionParameters>`. Many PACS require the calling AE title to be pre-registered; verify that the DP2 AE title is configured on the remote system as well. |
| Store timeout | Network latency or remote system under heavy load | Increase the association timeout. Check network routing between the DP2 host and the remote system. Verify that no firewall is blocking DICOM traffic on the configured port. |
| Store succeeds but image not visible in PACS | SOP Class or Transfer Syntax mismatch | Check the log for any warnings about unsupported transfer syntaxes. Verify that the PACS accepts the SOP Class UID being sent (e.g., Encapsulated PDF, Secondary Capture). |

### 9.2. Query Returns No Results

- **Filter too restrictive.** Review the `<DcmTag>` elements in the `<Query>` action. Negation filters (tags prefixed with `!`) run locally and can silently reject all results. Temporarily remove filters to isolate the problem.
- **SPS date range mismatch.** For worklist queries, the Scheduled Procedure Step Start Date defaults to a 15-day window ending today (today minus 14 through today, centered 7 days ago). DP2 enforces this constraint locally on returned candidates: items outside the window are rejected even if the SCP returns them. If your target procedures fall outside this range, set the SPS Start Date explicitly using `(0040,0100)/(0040,0002)` or the root `(0008,0020)` StudyDate alias. See [Worklist Date Constraints](actions/query.md#worklist-date-constraints).
- **Empty tag values causing rejection.** Blank `<DcmTag>` values previously caused all results to be rejected (fixed in v2.2.14). Ensure you are running a current version.
- **Increase verbosity to diagnose.** Set `<Verbosity>` to `20` (full debug) in the `<General>` section to see the complete query dataset sent to the SCP, the raw results returned, and the filter decisions applied to each result.

### 9.3. Print Job Stuck in Held State

A job enters the `Held` state when a `<Perform>` node has `onError="Hold"` and the referenced action fails. To resolve:

1. Check the log file for the error that triggered the hold. Search for `ERROR` entries immediately before the "held" message.
2. Verify that the target DICOM printer is online and accepting associations.
3. If the printer was temporarily unavailable, delete the held job files from the `queue/` directory and re-submit the job, or use `<Suspend>` with a retry interval instead of `Hold` to enable automatic recovery.

### 9.4. Activation Issues

| Symptom | Resolution |
|---|---|
| "Expired" watermark on printed output | The license has expired. Run `DicomPrinter.exe --activation-data` to inspect the current activation state. Contact the vendor to renew the license. |
| Activation wizard fails to connect | Verify outbound HTTPS connectivity to `store.fluxinc.ca`. Check proxy settings. The activation wizard requires an interactive console session (not Session 0). |
| Hardware request code changed | If hardware components changed (e.g., NIC replacement), the request code will differ from the original activation. A new activation code is required. |

### 9.5. Manual Queue and Queue Dashboard

#### Jobs stuck in queue/manual/

- Verify the Queue Dashboard is running and accessible
- Check that `config.xml` contains valid `<Query type="Worklist">` connection parameters (the dashboard uses these for worklist lookups)
- Confirm the DICOM worklist SCP is reachable from the DP2 host

#### .match file not being picked up

- Verify the DP2 service is running and actively polling the queue
- Check that the `.match` file format is correct: one `(GGGG,EEEE)=value` entry per line
- Review the DP2 log for errors loading the match file

#### maxRetries exhausted

Jobs that exhaust their `maxRetries` budget on a `<Suspend>` node fall through to the next workflow node (typically a `ManualQuery` action). Check the `.meta` companion file for the current retry count:
```json
{"retries": 5, "lastAttempt": "2026-03-15T14:30:00"}
```

### 9.6. Job Files Not Being Detected

- **Queue directory permissions.** The Windows service account (`DICOMPrinterService`) must have read/write access to the `queue/` directory. Verify NTFS permissions.
- **CheckingInterval too long.** The `<CheckingInterval>` value in the `<General>` section defines how frequently (in seconds) the application polls for new files. Lower values detect jobs faster but increase CPU usage.
- **File locking.** If another process holds a lock on the file in the queue directory, DP2 may skip it. Ensure that the process writing the file closes it before DP2 attempts to read it.
- **Incorrect root path.** If the service was started with `--path`, confirm that the path matches where job files are being deposited.
