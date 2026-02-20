# Installation and Deployment


### 8.1. Directory Structure

DP2 expects the following directory layout under its root path. By default the root path is `%ProgramData%\Flux Inc\DICOM Printer 2` on Windows (resolved via `SHGetKnownFolderPath` / `FOLDERID_ProgramData`). The root can be overridden with the `--path` command-line argument.

```
<root>/
  config/
    config.xml          — Main XML configuration file
    config.dtd          — DTD schema for config.xml validation
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

### 8.5. First-Run Checklist

1. **Verify directory structure.** Ensure the root directory and its subdirectories (`config/`, `log/`, `queue/`, `temp/`) exist. Create any missing directories manually or allow the installer to set them up.
2. **Place the configuration file.** Copy a valid `config.xml` and `config.dtd` into the `config/` directory. Review and customize the `<General>`, `<ActionsList>`, and `<Workflow>` sections as needed.
3. **Activate the license.** Run `DicomPrinter.exe --activate` from an interactive console to complete the activation wizard. This requires outbound HTTPS connectivity to the licensing server (`store.fluxinc.ca`). The activation state is cached locally in `config/.activation`.
4. **Verify network connectivity.** Ensure the host can reach any configured remote DICOM systems (printers, PACS, worklist servers) on the specified IP addresses and ports. If DP2 will perform license checks at runtime, confirm that outbound HTTPS access to `store.fluxinc.ca` is permitted.
5. **Test in console mode.** Before installing as a service, run `DicomPrinter.exe --console` to verify that the application starts without errors, parses the configuration file successfully, and begins monitoring the queue directory.
6. **Install as a service.** Once console-mode testing is complete, install and start the Windows service as described in section 8.4.
