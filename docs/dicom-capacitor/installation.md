# Installing DICOM Capacitor

## Prerequisites

- Windows 10 or later, Windows Server 2016 or later, Linux or MacOS (x64 or arm64)
- .NET Core 8 or later
- 2 GB of RAM
- 1 GB of free disk space
- 2 GHz or faster, x64 or arm64, processor

## Installation

1. Download the latest version of DICOM Capacitor from the [Flux Website](https://store.fluxinc.ca/files)
2. Run the installer
3. Open your Services MMC and start and stop the DICOM Capacitor service
4. Open the DICOM Capacitor directory. By default this is at:
   - **Windows**: `%ProgramData%\Flux Inc\DICOM Capacitor\`
   - **macOS/Linux**: `/var/lib/dicom-capacitor/data/`
   
   This folder contains the following files:
    - `cache/` - Contains the cache of DICOM data
    - `log/` - Contains the logs for DICOM Capacitor
        - `capacitor_service.log` - Contains the main log for DICOM Capacitor
    - `nodes.yml` - Specifies the nodes that DICOM Capacitor will use to send and receive DICOM data
    - `config.yml` - Specifies the settings for DICOM Capacitor

You can override the default location using the path option:
```bash
DICOMCapacitorService --path /custom/path
```

## Configuration
The service configuration is stored in the `config.yml` file.

## Service Management

### Service Components
During startup, the service initializes:
- Storage SCP (DICOM storage provider)
- Worklist SCP (DICOM worklist provider)
- Query/Retrieve SCP
- Storage Commitment SCP

### Service Configuration
Configure core service behavior from the command line:
```bash
# Disable Storage SCU
DICOMCapacitorService.exe --no-storage-scu

# Disable Worklist SCU
DICOMCapacitorService.exe --no-worklist-scu

# Disable file preparation
DICOMCapacitorService.exe --no-prepare
```

## Logging
- Service logs: `[LogPath]/capacitor_service.log`
- Audit logs: `[LogPath]/capacitor_service_audit.log`

## Service Status Monitoring
Monitor service health through:
- Windows Event Viewer
- Service status in Windows Services
- Log files in configured log directory

## Docker Installation

Refer to the [Docker Operations](/dicom-capacitor/docker) page for instructions on how to run DICOM Capacitor in a Docker container.
