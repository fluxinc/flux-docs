# Installation and Deployment


### 8.1. Directory Structure

DP2 expects the following directory layout under its root path. By default the root path is `%ProgramData%\Flux Inc\DICOM Printer 2` on Windows (resolved via `SHGetKnownFolderPath` / `FOLDERID_ProgramData`). The root can be overridden with the `--path` command-line argument.

```
<root>/
  .env                 — Site or machine environment values (optional)
  .env.local           — Local overrides (optional)
  config/
    config.xml          — Main XML configuration file
    config.dtd          — DTD schema for config.xml validation
    .env                — Config-specific environment values (optional)
    .env.local          — Config-specific local overrides (optional)
    .activation         — Cached activation code (created automatically)
  log/                  — Log files (created automatically)
  queue/                — Spooler directory, monitored for incoming job files
  temp/                 — Temporary processing directory (cleaned on startup)
  device/               — Virtual printer driver files
```

All of these subdirectories are resolved relative to the root path. DP2 will create `temp/` on startup if it does not exist, and will clean any residual files from it. The `queue/` directory must exist before the application starts; if it cannot be set as the spooler directory, the application will exit with an error.

### 8.2. Required Files

- **config.xml** — The main configuration file that defines general settings, the actions library, and the workflow. DP2 will not start without a valid configuration file. See the [Configuration File Tags Specification](/dicom-printer-2/config) for the full tag reference.
- **config.dtd** — The DTD schema referenced by `config.xml`. Bundled with the application and included in the project as a build artifact.

### 8.3. Runtime Dependencies

DP2 requires the following runtime components:

- **Qt runtime libraries** — The application is built against the Qt framework (QtCore, QtGui, QtXml, QtNetwork, and related modules). The required Qt DLLs must be accessible on the system PATH or co-located with the executable.
- **OpenSSL runtime DLLs** — `libssl-1_1.dll` and `libcrypto-1_1.dll` are required for TLS communication (e.g., license activation checks against the remote API). These are bundled by the installer.
- **DCMTK libraries** — The DICOM toolkit libraries used for DICOM dataset handling, network associations, and print SCU operations.
- **Virtual printer driver** — The `device/` directory contains the virtual printer driver and its configuration tool (`zvprtcfg.exe`), installed under `%ProgramW6432%\Flux Inc\DICOM Printer 2\device\`.

### 8.4. Windows Service Installation

DP2 can be installed as a Windows service for unattended, continuous operation. The service name used internally is `DICOMPrinterService`.

**Using the included Service Controller tool:**

The `controller.exe` utility (built as the `ServiceController` project) provides service lifecycle management:

```
controller.exe -i "C:\Path\To\DicomPrinter.exe"    — Install the service
controller.exe DICOMPrinterService -s                — Start the service
controller.exe DICOMPrinterService -t                — Stop the service
controller.exe DICOMPrinterService -u                — Uninstall the service
controller.exe DICOMPrinterService -v                — Show service status
controller.exe DICOMPrinterService --restart         — Restart the service
```

The install command (`-i`) accepts optional account and password arguments for specifying the service logon account. Use the `-w` / `--wait` flag to wait for a keypress before closing the console window.

**Using the Windows `sc` command:**

Alternatively, the service can be registered manually:

```
sc create DICOMPrinterService binPath= "C:\Path\To\DicomPrinter.exe"
sc start DICOMPrinterService
```

When running as a service, the application operates in Session 0 and has no console output. All activity is recorded in the log files under the `log/` directory.

### 8.5. DICOM Printer Console and API service

The Inno Setup installer also deploys the **DICOM Printer Console** — a WebView2 desktop UI (`DICOMPrinterConsole.exe`) backed by a local ASP.NET Core HTTP service (`DICOMPrinterApi.exe`, Windows service `DICOMPrinterApiService`). The API service is installed and started automatically; the Console is launched on demand via a Start Menu shortcut that runs `OpenQueueDashboard.exe`.

The Console + API stack is published framework-dependent for `win-x86` on .NET 10. The installer bundles the ASP.NET Core 10 `x86` runtime and an offline WebView2 runtime so no internet access is required at install time.

| Component | Path under `{app}` |
|---|---|
| API service host | `dicom-printer-2-queue\DICOMPrinterApi.exe` |
| WinSW service wrapper | `dicom-printer-2-queue\DICOMPrinterApi.WinSW.xml` |
| Console desktop window | `dicom-printer-2-queue\DICOMPrinterConsole.exe` |
| Launcher / activator | `dicom-printer-2-queue\OpenQueueDashboard.exe` |

> The `dicom-printer-2-queue\` directory and `OpenQueueDashboard.exe` name are compatibility aliases inherited from the prior Queue Dashboard lineage; the binaries inside are the new Console + API stack introduced in 2.4.0.

To launch manually (or focus an existing window):
```
"C:\Program Files (x86)\Flux Inc\DICOM Printer 2\dicom-printer-2-queue\OpenQueueDashboard.exe"
```

The default API listener is `http://localhost:5009` (loopback only). See [DICOM Printer Console](/dicom-printer-2/control-app) for the UI walkthrough and [Manual Matching](/dicom-printer-2/queue-dashboard) for the queue/match-file contract.

### 8.6. Offline installation

The installer is offline-capable: build-time prerequisite preparation (`scripts/prepare_installer_prereqs.ps1`) packages the WebView2 standalone runtime alongside the ASP.NET Core `x86` runtime, removing the runtime download that earlier installers performed at install time. A repeatable VM install harness (`scripts/installer_vm_test.ps1`) and one-time elevated broker prep script (`scripts/prepare_installer_vm_test_broker.ps1`) cover end-to-end offline install verification.

### 8.7. Site-profile installation

Managed deployments can use one customer-neutral installer with external
site-profile companion files. Place these files next to
`DICOMPrinterSetup-*.exe`, or pass the profile catalog path with
`/SITEPROFILES=...`:

- `DICOMPrinterSiteProfiles.ini` — maps site aliases to environment values.
- `DICOMPrinterSiteConfig.xml` — optional companion config template, or the
  template named by `[Manifest] ConfigTemplate=...` in the catalog.

Silent examples:

```cmd
DICOMPrinterSetup-2.4.7.0-Release.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SITE=LOCAL-A
DICOMPrinterSetup-2.4.7.0-Release.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SITE=LOCAL-B /SITEPROFILES=\\fileserver\dp2\DICOMPrinterSiteProfiles.ini
```

Use `/REQUIRE_SITE=1` when a silent deployment must fail closed if no valid
site profile is selected. Interactive installs show a Site Configuration page
when a companion catalog is present, with options for a generic install,
profile selection, or manual entry.

When a profile is selected, the installer writes the selected values to
`%ProgramData%\Flux Inc\DICOM Printer 2\.env`, installs the companion template
as `config\config.xml`, keeps `config.default.xml` as the product default, and
writes an audit record under `config\site-profiles\`. The main service,
Console/API, and Drop Monitor all resolve these values through the same
environment substitution path.

### 8.8. First-Run Checklist

1. **Verify directory structure.** Ensure the root directory and its subdirectories (`config/`, `log/`, `queue/`, `temp/`) exist. Create any missing directories manually or allow the installer to set them up.
2. **Place the configuration file.** Copy a valid `config.xml` and `config.dtd` into the `config/` directory. Review and customize the `<General>`, `<ActionsList>`, and `<Workflow>` sections as needed.
3. **Activate the license.** Run `DicomPrinter.exe --activate` from an interactive console to complete the activation wizard. This requires outbound HTTPS connectivity to the licensing server (`store.fluxinc.ca`). The activation state is cached locally in `config/.activation`.
4. **Verify network connectivity.** Ensure the host can reach any configured remote DICOM systems (printers, PACS, worklist servers) on the specified IP addresses and ports. If DP2 will perform license checks at runtime, confirm that outbound HTTPS access to `store.fluxinc.ca` is permitted.
5. **Test in console mode.** Before installing as a service, run `DicomPrinter.exe --console` to verify that the application starts without errors, parses the configuration file successfully, and begins monitoring the queue directory.
6. **Install as a service.** Once console-mode testing is complete, install and start the Windows service as described in section 8.4.
