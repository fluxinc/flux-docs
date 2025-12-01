# Installation

## Prerequisites

Before installing DICOM Printer 2, ensure your system meets the following requirements:

- **Operating System**: Windows 7 or later (32-bit or 64-bit)
- **.NET Framework**: .NET Framework 4.5 or later
- **Disk Space**: Minimum 100 MB for installation, additional space for queued jobs and logs
- **Permissions**: Administrator privileges for installation and service management
- **Network**: TCP/IP network connectivity for DICOM communication

## Installation

DICOM Printer 2 is distributed as an Inno Setup installer package.

1. **Run the Installer**: Double-click the `DICOM_Printer_2_Setup.exe` file
2. **Accept License Agreement**: Review and accept the software license terms
3. **Select Installation Directory**: Choose the installation location (default: `C:\Program Files (x86)\Flux Inc\DICOM Printer 2\`)
4. **Select Components**: Choose which components to install:
   - Main Service (required)
   - Control Application (recommended)
   - Drop Monitor Service (optional)
5. **Complete Installation**: Click Install to begin the installation process
6. **Printer Installation**: The virtual printer driver will be installed automatically

The installer will:
- Install the DICOM Printer 2 service
- Create the Windows printer device
- Set up the default directory structure
- Install the Control Application (if selected)
- Configure the Windows service to start automatically

## Directory Structure

DICOM Printer 2 uses the following default directory structure under `%ProgramData%\Flux Inc\DICOM Printer 2\`:

```
%ProgramData%\Flux Inc\DICOM Printer 2\
├── config/           # Configuration files
│   └── config.xml    # Main configuration file
├── drop/             # Drop monitor watch directories
├── log/              # Service log files
│   └── dicom_printer_service.log
├── queue/            # Queued print jobs
├── staging/          # Temporary processing area
├── store/            # Local DICOM storage
└── temp/             # Temporary files
```

## Configuration

The main configuration file is located at `%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml`.

A default configuration is created during installation. You must customize this file to:
- Configure DICOM connection parameters
- Define workflow actions
- Set up patient matching queries
- Configure output destinations

See [Configuration](configuration.md) for detailed configuration instructions.

## Service Management

The DICOM Printer 2 service is installed as a Windows service named "DICOM Printer 2 Service".

### Service Configuration

- **Service Name**: `DicomPrinter2Service`
- **Display Name**: DICOM Printer 2 Service
- **Startup Type**: Automatic
- **Log On As**: Local System account

### Managing the Service

You can manage the service using:

- **Control Application**: The graphical Control Application provides start/stop controls
- **Windows Services**: Use `services.msc` to manage the service
- **Command Line**: Use `sc` or `net` commands

See [Starting and Stopping the Service](starting-and-stopping.md) for detailed instructions.

## Logging

The service writes detailed logs to `%ProgramData%\Flux Inc\DICOM Printer 2\log\dicom_printer_service.log`.

Default logging configuration:
- **Verbosity**: STANDARD (logs normal operations and errors)
- **Maximum File Size**: 10 MB
- **Maximum File Count**: 10 (older logs are rotated)

See [Interrogating the Logs](logs.md) for more information about log management.

## Next Steps

After installation:

1. [Configure the system](configuration.md) for your DICOM environment
2. [Set up licensing and activation](licensing.md) to enable full functionality
3. [Configure the Drop Monitor](drop-monitor.md) if processing files from directories
4. [Test the configuration](troubleshooting.md) by printing a test document
