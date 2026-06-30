# Upgrading

Use the current installer to update an existing DICOM Printer 2 installation.
The installer preserves the runtime data directory, including `config.xml`, the
activation file, queues, and logs unless you explicitly remove data during an
uninstall.

## Before You Start

### Back Up Configuration

Back up the active configuration before running the installer:

```cmd
copy "%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml" "%USERPROFILE%\Desktop\config_backup.xml"
```

If the site uses environment files for endpoint names, ports, or site-profile
values, back those up too:

```cmd
copy "%ProgramData%\Flux Inc\DICOM Printer 2\.env" "%USERPROFILE%\Desktop\dp2_env_backup" 2>nul
copy "%ProgramData%\Flux Inc\DICOM Printer 2\config\.env.local" "%USERPROFILE%\Desktop\dp2_config_env_local_backup" 2>nul
```

### Back Up Activation

Activation is stored in a `.activation` file in the same directory as
`config.xml`. It is not stored inside `config.xml` and not in the Windows
registry. Back it up with the configuration:

```cmd
copy "%ProgramData%\Flux Inc\DICOM Printer 2\config\.activation" "%USERPROFILE%\Desktop\activation_backup"
```

You can view license status from **DICOM Printer Console → Manage → Activate**.

### Stop Active Work

Wait for active jobs to finish or intentionally hold the queue. Then stop the
main service:

```cmd
net stop DICOMPrinterService
```

You can also stop services from **DICOM Printer Console → Manage**.

## Run the Installer

1. Run the current DICOM Printer 2 installer as an administrator.
2. Keep the existing install path unless you are intentionally relocating the
   installation.
3. Let the installer replace the application binaries and service wrappers.
4. Leave the existing runtime data in place.

For silent deployments:

```cmd
DICOMPrinterSetup-<version>-Release.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
```

For site-profile deployments, include the selected site and optional profile
file:

```cmd
DICOMPrinterSetup-<version>-Release.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SITE=LOCAL-A
DICOMPrinterSetup-<version>-Release.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SITE=LOCAL-B /SITEPROFILES=\\fileserver\dp2\DICOMPrinterSiteProfiles.ini
```

## Verify The Upgrade

### Services

Confirm the services are installed and running:

```cmd
sc query DICOMPrinterService
sc query DICOMPrinterApiService
```

Both should report `RUNNING` after installation. If either service is stopped,
start it from the Console Manage pane or with `net start`.

### Console

Open **DICOM Printer Console** from the Start Menu. Verify that:

- the Console opens and connects to the local API service
- the Manage pane shows the expected service states
- configured Storage, Worklist, Study, and Patient endpoints appear
- the Config pane loads `config.xml`

### Configuration

Open the configuration in the Console and save it once to run validation. If the
configuration contains XML or DTD errors, the Console reports the line and
column. Fix validation errors before processing jobs.

Review the current reference pages when updating configuration:

- [Configuration Reference](config.md)
- [General Settings](general-settings.md)
- [Connection Parameters](connection-parameters.md)
- [Actions](actions/)
- [Workflow](workflow/)

### DICOM Connectivity

Use the Console Manage pane to test configured endpoints. Confirm:

- C-ECHO succeeds for storage and query peers
- Worklist, Study, or Patient test queries return expected sample results
- placeholder-backed environment values resolve to the intended host, port, and
  AE title

### Logs

Check the service log after the first restart:

```cmd
type "%ProgramData%\Flux Inc\DICOM Printer 2\log\dicom_printer_service.log"
```

Look for a successful configuration load, service startup, and DICOM endpoint
checks. Resolve errors before returning the system to production traffic.

### Workflow Smoke Test

Submit a representative print job or drop-folder file and verify the full
workflow:

- parsing or manual matching captures the expected patient/study values
- Query actions find the expected record
- Store or Print actions complete successfully
- generated DICOM instances have the expected patient, study, series, and
  instance values

## If Something Goes Wrong

1. Stop the services:

   ```cmd
   net stop DICOMPrinterService
   net stop DICOMPrinterApiService
   ```

2. Restore the backed-up configuration and activation file:

   ```cmd
   copy "%USERPROFILE%\Desktop\config_backup.xml" "%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml"
   copy "%USERPROFILE%\Desktop\activation_backup" "%ProgramData%\Flux Inc\DICOM Printer 2\config\.activation"
   ```

3. Start the services and re-check the log:

   ```cmd
   net start DICOMPrinterApiService
   net start DICOMPrinterService
   ```

If the problem is an installer or runtime failure rather than configuration,
contact Flux support with the installer log, service log, Windows Event Log
entries, and a description of the workflow being tested.
