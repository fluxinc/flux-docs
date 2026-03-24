# Installing DICOM Capacitor

## Prerequisites

- Windows 10 or later, Windows Server 2016 or later, Linux, or macOS (x64 or arm64)
- 2 GB of RAM
- 1 GB of free disk space
- 2 GHz or faster processor

DICOM Capacitor is distributed as a self-contained binary — no separate .NET runtime installation is required.

## Windows

1. Download the latest installer from the [Flux Website](https://store.fluxinc.ca/files)
2. Run the installer (`DICOMCapacitorSetup-x64-*.exe`)
3. The installer registers `DICOMCapacitorService` as a Windows service

Default directories:

| Purpose | Path |
|---------|------|
| Configuration & logs | `%ProgramData%\Flux Inc\DICOM Capacitor\` |
| Binary | `%ProgramFiles%\Flux Inc\DICOM Capacitor\` |

## macOS

DICOM Capacitor runs as a LaunchDaemon on macOS. Installation is typically performed via the deploy script, which:

1. Creates a dedicated service user (`_dicomcapacitor`)
2. Copies binaries to `/opt/dicom-capacitor/bin/`
3. Creates the data directory at `/var/lib/dicom-capacitor/data/`
4. Installs a LaunchDaemon plist at `/Library/LaunchDaemons/co.fluxinc.dicom-capacitor.plist`
5. Installs `brotli` via Homebrew (required for compression)

Default directories:

| Purpose | Path |
|---------|------|
| Binary | `/opt/dicom-capacitor/bin/` |
| Configuration & logs | `/var/lib/dicom-capacitor/data/` |
| Cache | `/var/lib/dicom-capacitor/data/cache/` |
| Logs | `/var/lib/dicom-capacitor/data/log/` |

A desktop shortcut to the data directory is created at `~/Desktop/DICOM Capacitor Data`.

## Linux

DICOM Capacitor runs as a systemd service on Linux. Installation is typically performed via the deploy script, which:

1. Creates a dedicated service user (`dicom-capacitor`)
2. Copies binaries to `/opt/dicom-capacitor/bin/`
3. Creates the data directory at `/var/lib/dicom-capacitor/data/`
4. Installs a systemd unit at `/etc/systemd/system/dicom-capacitor.service`

Default directories:

| Purpose | Path |
|---------|------|
| Binary | `/opt/dicom-capacitor/bin/` |
| Configuration & logs | `/var/lib/dicom-capacitor/data/` |
| Cache | `/var/lib/dicom-capacitor/data/cache/` |
| Logs | `/var/lib/dicom-capacitor/data/log/` |

The systemd unit includes security hardening: `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome=true`, and `PrivateTmp=true`.

## Docker

See the dedicated [Docker Operations](/dicom-capacitor/docker) page.

## Data Directory Layout

On first run, Capacitor creates default configuration files in the data directory:

```
<data-dir>/
  config.yml        # Service settings
  nodes.yml         # Destination PACS/servers
  cache/            # DICOM file cache
  log/              # Log files
    capacitor_service.log        # Main service log
    capacitor_service_audit.log  # Audit log
```

SOP class queue priority rules are configured per storage destination inside `nodes.yml` using `SopClassPriorities`; no separate priority file is generated on first run.

You can override the data directory path on any platform:

```bash
DICOMCapacitorService --path /custom/path
```

## First Run & Activation

On first startup, Capacitor generates an activation URL in the logs. Visit this URL to register your instance at [store.fluxinc.ca](https://store.fluxinc.ca). Without activation, Capacitor runs in trial mode.

You can also activate via the command line:

```bash
DICOMCapacitorService --activation-code "XXXX-XXXX-XXXX" --save-config --quit
```

## Next Steps

1. **Configure the Service**: Edit `config.yml` to set your AE Title, ports, and other [settings](config.md).
2. **Define Nodes**: Edit `nodes.yml` to configure the DICOM [nodes](nodes.md) you want to communicate with.
3. **Start the Service**: Learn how to [start and stop](starting-and-stopping) the service.
4. **Verify Operation**: Check the [logs](logs) to ensure the service is running correctly.
