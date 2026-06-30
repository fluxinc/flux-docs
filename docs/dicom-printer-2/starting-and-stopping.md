# Starting and Stopping the Services

DICOM Printer 2 runs as two Windows services on a fully-installed system, plus an optional Drop Monitor service:

| Service name | Display name | Binary | Purpose |
|---|---|---|---|
| `DICOMPrinterService` | DICOM Printer 2 Service | `DicomPrinter.exe` | Workflow engine — picks up jobs from `queue/`, runs the configured workflow |
| `DICOMPrinterApiService` | DICOM Printer API Service | `DICOMPrinterApi.exe` (via WinSW) | Loopback HTTP service that backs the [DICOM Printer Console](control-app.md) on `http://localhost:5009` |
| `DicomDropMonitorService` | DICOM Printer 2 Drop Monitor | `DropMonitor.exe` | Optional — watches configured folders for incoming PDFs and images |

Both core services are set to **Automatic** startup by the installer and start with Windows.

## Using the DICOM Printer Console

The Console **Manage** pane is the easiest way to control the services. It auto-refreshes service status while open (no manual refresh button) and exposes start/stop/restart buttons for `DicomPrinterService` and `DICOMPrinterApiService`.

1. Launch the Console (Start Menu → Flux Inc → DICOM Printer Console) — this runs `OpenQueueDashboard.exe`.
2. Click the gear icon to open Manage.
3. Use the Service section to start, stop, or restart.

## Using `services.msc`

`Win + R` → `services.msc`. Right-click each service to **Start**, **Stop**, or **Restart**.

## Using `net` / `sc`

```cmd
net start DICOMPrinterService
net stop  DICOMPrinterService

net start DICOMPrinterApiService
net stop  DICOMPrinterApiService

sc query DICOMPrinterService
sc query DICOMPrinterApiService
```

Configure startup type (space after `=` is required):

```cmd
sc config DICOMPrinterService     start= auto
sc config DICOMPrinterApiService  start= auto
```

Values: `auto`, `demand` (manual), `disabled`.

## Using PowerShell

```powershell
Start-Service   -Name DICOMPrinterService
Stop-Service    -Name DICOMPrinterService
Restart-Service -Name DICOMPrinterService
Get-Service     -Name DICOMPrinterService

Set-Service     -Name DICOMPrinterService    -StartupType Automatic
Set-Service     -Name DICOMPrinterApiService -StartupType Automatic
```

## Graceful shutdown

When `DicomPrinterService` is stopped it:

1. Receives the SCM stop signal.
2. Stops accepting new jobs.
3. Completes the currently processing job.
4. Closes DICOM associations.
5. Writes final log entries and exits.

Windows enforces a 30-second shutdown timeout. If shutdown exceeds it the SCM may forcefully terminate the service.

`DICOMPrinterApiService` (WinSW-wrapped) has its own shutdown sequence; stopping it does not stop the main service, and stopping the main service does not stop the API.

## Common scenarios

### Applying configuration changes

If you edit `config.xml` from the Console **Manage → Config** pane, the API broadcasts a reload across services and `DicomPrinterService` picks up the new config without a bounce. If you edit `config.xml` by hand:

1. Click **Reload** in the Console Manage pane, OR
2. Restart `DicomPrinterService` with `net stop`/`net start`.

### After installing an update

The installer stops `DicomPrinterService`, `DICOMPrinterApiService`, and any running Console processes before replacing binaries, so DLL-in-use errors should not occur. If they do, stop the services manually and retry.

## Troubleshooting

| Symptom | Action |
|---|---|
| Console window opens but shows "service unreachable" | Confirm `DICOMPrinterApiService` is running (`sc query DICOMPrinterApiService`). Restart it if needed. |
| Console reports `DicomPrinterService` stopped | Start it via Manage or `net start DICOMPrinterService`. Check the main log for the reason it stopped. |
| Service won't start | Validate `config.xml` (DTD errors prevent startup), check the log under `%ProgramData%\Flux Inc\DICOM Printer 2\log\`, verify license activation, confirm port availability. |
| "Access Denied" from command line | Run the prompt as Administrator. |

## Service dependencies

Neither core service depends on other named Windows services, but each requires:

- TCP/IP stack (for DICOM and HTTP loopback)
- File-system access to `%ProgramData%\Flux Inc\DICOM Printer 2\`
- Windows event log

## Related Topics

- [DICOM Printer Console](control-app.md)
- [Installation](installation.md)
- [Configuration](configuration.md)
- [Interrogating the Logs](logs.md)
- [Troubleshooting](troubleshooting.md)
