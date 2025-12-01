# Interrogating the Logs

DICOM Printer 2 generates detailed log files that record service activity, errors, and debugging information.

## Log File Location

**Main Service Log:**
```
%ProgramData%\Flux Inc\DICOM Printer 2\log\dicom_printer_service.log
```

**Full Path (Typical):**
```
C:\ProgramData\Flux Inc\DICOM Printer 2\log\dicom_printer_service.log
```

## Log File Structure

Log entries follow this format:
```
[TIMESTAMP] [LEVEL] Message
```

**Example:**
```
[2024-03-15 14:30:22.123] [INFO] Service started successfully
[2024-03-15 14:30:23.456] [DEBUG] Loading configuration from config.xml
[2024-03-15 14:30:24.789] [WARNING] No activation key found
[2024-03-15 14:30:25.012] [ERROR] Failed to connect to PACS at 192.168.1.100:104
```

## Log Levels

### SILENT

No logging output. Not recommended except for specific troubleshooting scenarios.

### MINIMAL

Only critical errors are logged.

**Use when:**
- Minimizing log file size
- Production with stable configuration
- Low disk space

**Logs:**
- Service start/stop
- Critical errors
- License issues

### STANDARD (Recommended)

Normal operational logging with errors.

**Use when:**
- Production operation
- Standard monitoring
- Balanced detail vs. size

**Logs:**
- Service lifecycle events
- Job processing summary
- Errors and warnings
- DICOM connection status
- Configuration loading

**Example:**
```xml
<General>
  <Verbosity>STANDARD</Verbosity>
</General>
```

### DETAILED

Verbose operational details.

**Use when:**
- Troubleshooting workflow issues
- Investigating job processing problems
- Understanding system behavior

**Logs:**
- All STANDARD level entries
- Workflow execution steps
- Action execution details
- Tag manipulation operations
- File I/O operations

### DEBUG

Full debugging information including DICOM protocol messages.

**Use when:**
- Diagnosing DICOM communication issues
- Investigating protocol errors
- Deep troubleshooting

**Logs:**
- All DETAILED level entries
- DICOM C-FIND requests/responses
- DICOM C-STORE negotiations
- DICOM tag values
- Network protocol details
- Internal state information

**Warning:** DEBUG level generates very large log files. Use only when necessary and return to STANDARD after troubleshooting.

**Example:**
```xml
<General>
  <Verbosity>DEBUG</Verbosity>
</General>
```

## Configuring Log Verbosity

Edit `config.xml`:

```xml
<DicomPrinter>
  <General>
    <Verbosity>STANDARD</Verbosity>
  </General>
</DicomPrinter>
```

**After changing verbosity:**
1. Stop the service
2. Edit configuration
3. Start the service

New verbosity level takes effect immediately upon service start.

## Log File Rotation

Log files are automatically rotated when they reach the maximum size.

### Rotation Settings

```xml
<General>
  <MaximumLogFileSize>10485760</MaximumLogFileSize>  <!-- 10 MB -->
  <MaximumLogFileCount>10</MaximumLogFileCount>
</General>
```

### How Rotation Works

1. Log file grows during operation
2. When size reaches `MaximumLogFileSize`:
   - Current log is renamed with sequential number
   - Existing rotated logs are incremented
   - New log file is created
   - Oldest log is deleted if count exceeds `MaximumLogFileCount`

**Example rotation:**
```
dicom_printer_service.log      (current)
dicom_printer_service.1.log    (most recent rotated)
dicom_printer_service.2.log    (older)
dicom_printer_service.3.log    (older)
...
dicom_printer_service.10.log   (oldest, deleted on next rotation)
```

### Minimum Configuration Values

**Minimum File Size:** 1 MB (1,048,576 bytes)

If you specify a `MaximumLogFileSize` smaller than 1 MB, the system will automatically use 1 MB and log a warning message.

**Source:** `src/DicomPrinter/EventReporter.cpp:22-23, 483-491`

**Minimum File Count:** 2 files

If you specify a `MaximumLogFileCount` less than 2, the system will automatically use 2 files and log a warning message. This ensures at least one backup log file is always available.

**Source:** `src/DicomPrinter/EventReporter.cpp:497-508`

**Example warning:**
```
[2024-03-15 14:30:00.000] [WARNING] Cannot set max file size to `524288', using minimum value `1048576' instead
[2024-03-15 14:30:00.100] [WARNING] Cannot set max file count to `1', using minimum value `2' instead
```

### Log Buffering System

To improve performance, log messages are buffered before being written to disk:

- **Buffer Size:** 10 messages
- **Flush Interval:** 250 milliseconds

**Behavior:**
- Messages are collected in memory until either:
  - 10 messages accumulate, OR
  - 250ms have elapsed since the last flush
- Then all buffered messages are written to disk at once

**Implication:** Log messages may not appear immediately in the log file. There can be up to a 250ms delay before messages are visible.

**Source:** `src/DicomPrinter/EventReporter.hpp:86, 90`

### Rotation Recommendations

**Production:**
```xml
<MaximumLogFileSize>10485760</MaximumLogFileSize>   <!-- 10 MB -->
<MaximumLogFileCount>10</MaximumLogFileCount>
```
Total: ~100 MB

**High Volume:**
```xml
<MaximumLogFileSize>52428800</MaximumLogFileSize>   <!-- 50 MB -->
<MaximumLogFileCount>20</MaximumLogFileCount>
```
Total: ~1 GB

**Debug/Troubleshooting:**
```xml
<MaximumLogFileSize>104857600</MaximumLogFileSize>  <!-- 100 MB -->
<MaximumLogFileCount>5</MaximumLogFileCount>
```
Total: ~500 MB

## Viewing Logs

### Using the Control Application

1. Launch Control Application
2. Navigate to Log Viewer tab
3. View real-time log updates

**Features:**
- Auto-scroll to follow new entries
- Search/filter
- Copy to clipboard
- Export selection

### Using Text Editor

Open in any text editor:
```
notepad "%ProgramData%\Flux Inc\DICOM Printer 2\log\dicom_printer_service.log"
```

### Using Command Line

**View entire log:**
```cmd
type "%ProgramData%\Flux Inc\DICOM Printer 2\log\dicom_printer_service.log"
```

**View last 50 lines:**
```cmd
powershell Get-Content "%ProgramData%\Flux Inc\DICOM Printer 2\log\dicom_printer_service.log" -Tail 50
```

**Follow log in real-time:**
```cmd
powershell Get-Content "%ProgramData%\Flux Inc\DICOM Printer 2\log\dicom_printer_service.log" -Wait -Tail 50
```

### Using Log Viewers

Recommended log viewing tools:
- **Notepad++** - Syntax highlighting, search
- **Baretail** - Real-time tail, filtering
- **Log Expert** - Advanced log analysis
- **VS Code** - Search, filtering, large file handling

## Common Log Patterns

### Service Startup

```
[2024-03-15 08:00:00.000] [INFO] DICOM Printer 2 Service starting
[2024-03-15 08:00:00.123] [INFO] Version: 2.0.0
[2024-03-15 08:00:00.456] [INFO] Loading configuration from config.xml
[2024-03-15 08:00:01.234] [INFO] Configuration loaded successfully
[2024-03-15 08:00:01.567] [INFO] License valid for 123 days
[2024-03-15 08:00:02.000] [INFO] Service started successfully
```

### Job Processing

```
[2024-03-15 09:15:30.000] [INFO] New job detected: 12345_Report.pdf
[2024-03-15 09:15:30.123] [INFO] Executing action: ParseFilename
[2024-03-15 09:15:30.456] [INFO] Extracted Patient ID: 12345
[2024-03-15 09:15:31.000] [INFO] Executing action: QueryWorklist
[2024-03-15 09:15:31.500] [INFO] Query found 1 matching record
[2024-03-15 09:15:32.000] [INFO] Executing action: SendToPACS
[2024-03-15 09:15:35.000] [INFO] C-STORE successful to PACS_SERVER
[2024-03-15 09:15:35.123] [INFO] Job completed successfully
```

### Query Execution

```
[2024-03-15 10:30:00.000] [DEBUG] Query: FindPatient
[2024-03-15 10:30:00.100] [DEBUG] Connecting to RIS at 192.168.1.200:104
[2024-03-15 10:30:00.200] [DEBUG] Association established
[2024-03-15 10:30:00.300] [DEBUG] Sending C-FIND request
[2024-03-15 10:30:00.500] [DEBUG] Received C-FIND response
[2024-03-15 10:30:00.600] [DEBUG] Patient found: Doe^John
[2024-03-15 10:30:00.700] [DEBUG] Association released
```

### Store Execution

```
[2024-03-15 11:00:00.000] [DEBUG] Store: SendToPACS
[2024-03-15 11:00:00.100] [DEBUG] Connecting to PACS at 192.168.1.100:104
[2024-03-15 11:00:00.200] [DEBUG] Association established
[2024-03-15 11:00:00.300] [DEBUG] Negotiating presentation context
[2024-03-15 11:00:00.400] [DEBUG] Transfer syntax: JPEG Lossless
[2024-03-15 11:00:00.500] [DEBUG] Sending C-STORE request
[2024-03-15 11:00:02.000] [DEBUG] C-STORE completed successfully
[2024-03-15 11:00:02.100] [DEBUG] Association released
```

### Errors

```
[2024-03-15 12:00:00.000] [ERROR] Failed to connect to PACS at 192.168.1.100:104
[2024-03-15 12:00:00.100] [ERROR] Network error: Connection refused
[2024-03-15 12:00:00.200] [WARNING] Job suspended for retry
```

## Troubleshooting with Logs

### Find Errors

Search for:
- `[ERROR]`
- `[WARNING]`
- `Failed`
- `Exception`

### Trace Job Processing

1. Find job start: Search for filename
2. Follow timestamps
3. Identify action execution
4. Locate success or failure

### Debug DICOM Communication

1. Set verbosity to DEBUG
2. Restart service
3. Trigger operation
4. Search for connection host/port
5. Review DICOM protocol messages

### Identify Performance Issues

Look for:
- Large time gaps between log entries
- Repeated retries
- Timeout messages
- Resource warnings

## Log Analysis Tips

1. **Use timestamps** - Correlate events with external systems
2. **Filter by level** - Focus on ERROR/WARNING for issues
3. **Search by job** - Track specific job through workflow
4. **Compare time periods** - Identify when issues started
5. **Examine patterns** - Recurring errors indicate systematic issues

## Log Cleanup

### Manual Cleanup

Delete old rotated logs:
```cmd
del "%ProgramData%\Flux Inc\DICOM Printer 2\log\dicom_printer_service.*.log"
```

Keep current log (`dicom_printer_service.log`) intact.

### Automated Cleanup

Use Windows Task Scheduler to run cleanup script periodically.

**Example PowerShell script:**
```powershell
$LogPath = "$env:ProgramData\Flux Inc\DICOM Printer 2\log"
$DaysToKeep = 30
$CutoffDate = (Get-Date).AddDays(-$DaysToKeep)

Get-ChildItem -Path $LogPath -Filter "dicom_printer_service.*.log" |
    Where-Object { $_.LastWriteTime -lt $CutoffDate } |
    Remove-Item
```

## Related Topics

- [Troubleshooting](troubleshooting.md)
- [Configuration](configuration.md)
- [Starting and Stopping the Service](starting-and-stopping.md)
- [Control Application](control-app.md)
