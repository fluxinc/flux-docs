# Starting and Stopping the Service

DICOM Printer 2 runs as a Windows service that can be managed through various methods.

## Service Information

- **Service Name:** `DICOMPrinterService`
- **Display Name:** DICOM Printer 2 Service
- **Startup Type:** Automatic (starts with Windows)
- **Log On As:** Local System account (default)

## Using the Control Application

The easiest way to manage the service is through the Control Application.

### Starting the Service

1. Launch the Control Application
2. Click the **Start Service** button
3. Service status changes to "Running"

### Stopping the Service

1. Click the **Stop Service** button
2. Service begins graceful shutdown
3. Currently processing jobs complete before shutdown
4. Service status changes to "Stopped"

### Restarting the Service

1. Click **Stop Service**
2. Wait for service to stop completely
3. Click **Start Service**

OR use the **Restart Service** button if available.

## Using Windows Services

### Opening Services Management

**Method 1: Run Dialog**
1. Press `Win + R`
2. Type `services.msc`
3. Press Enter

**Method 2: Control Panel**
1. Open Control Panel
2. Administrative Tools → Services

**Method 3: Task Manager**
1. Open Task Manager (`Ctrl + Shift + Esc`)
2. Services tab
3. Click "Open Services" at bottom

### Starting the Service

1. Locate "DICOM Printer 2 Service" in the list
2. Right-click the service
3. Select **Start**

OR

1. Select the service
2. Click **Start** in the left panel or toolbar

### Stopping the Service

1. Right-click "DICOM Printer 2 Service"
2. Select **Stop**

OR

1. Select the service
2. Click **Stop** in the left panel

### Restarting the Service

1. Right-click "DICOM Printer 2 Service"
2. Select **Restart**

## Using Command Line

### Using net Command

#### Start Service
```cmd
net start DICOMPrinterService
```

#### Stop Service
```cmd
net stop DICOMPrinterService
```

#### Restart Service
```cmd
net stop DICOMPrinterService && net start DICOMPrinterService
```

### Using sc Command

#### Start Service
```cmd
sc start DICOMPrinterService
```

#### Stop Service
```cmd
sc stop DICOMPrinterService
```

#### Query Service Status
```cmd
sc query DICOMPrinterService
```

Output:
```
SERVICE_NAME: DICOMPrinterService
TYPE               : 10  WIN32_OWN_PROCESS
STATE              : 4  RUNNING
WIN32_EXIT_CODE    : 0  (0x0)
SERVICE_EXIT_CODE  : 0  (0x0)
CHECKPOINT         : 0x0
WAIT_HINT          : 0x0
```

#### Configure Startup Type
```cmd
sc config DICOMPrinterService start= auto
```

Options:
- `auto` - Automatic
- `demand` - Manual
- `disabled` - Disabled

**Note:** Space after `=` is required.

## Using PowerShell

### Start Service
```powershell
Start-Service -Name "DICOMPrinterService"
```

### Stop Service
```powershell
Stop-Service -Name "DICOMPrinterService"
```

### Restart Service
```powershell
Restart-Service -Name "DICOMPrinterService"
```

### Get Service Status
```powershell
Get-Service -Name "DICOMPrinterService"
```

Output:
```
Status   Name                  DisplayName
------   ----                  -----------
Running  DICOMPrinterService   DICOM Printer 2 Service
```

### Set Startup Type
```powershell
Set-Service -Name "DICOMPrinterService" -StartupType Automatic
```

Options:
- `Automatic` - Starts with Windows
- `Manual` - Starts only when requested
- `Disabled` - Cannot start

## Service Startup Types

### Automatic

Service starts automatically when Windows starts.

**Best for:**
- Production environments
- Always-on operation
- Unattended systems

### Manual

Service must be started manually.

**Best for:**
- Development/testing
- On-demand processing
- Resource conservation

### Disabled

Service cannot be started.

**Best for:**
- Temporarily decommissioning service
- Troubleshooting conflicts

## Graceful Shutdown

When stopping the service:

1. **Service receives stop signal**
2. **Stops accepting new jobs**
3. **Completes currently processing jobs**
4. **Closes connections to DICOM servers**
5. **Writes final log entries**
6. **Service stops**

**Timeout:** If shutdown exceeds 30 seconds, Windows may forcefully terminate the service.

## Checking Service Status

### Control Application

Service status is displayed prominently in the main window:
- **Running** - Green indicator
- **Stopped** - Red indicator
- **Starting** - Yellow indicator
- **Stopping** - Yellow indicator

### Windows Services

Status column shows:
- **Running**
- **Stopped**
- **Starting**
- **Stopping**

### Command Line

```cmd
sc query DICOMPrinterService
```

Look for `STATE` field:
- `4 RUNNING`
- `1 STOPPED`

### PowerShell

```powershell
Get-Service -Name "DICOMPrinterService" | Select-Object Status
```

## Common Scenarios

### Applying Configuration Changes

1. Stop the service
2. Edit `config.xml`
3. Start the service

Configuration is loaded at service startup.

### After Software Update

1. Stop the service
2. Run installer/updater
3. Start the service

Ensures files aren't locked during update.

### Troubleshooting Issues

1. Stop the service
2. Increase log verbosity in config.xml
3. Start the service
4. Reproduce issue
5. Check logs
6. Stop service
7. Restore normal verbosity
8. Start service

### Changing Service Account

1. Stop the service
2. Open Services → Properties → Log On tab
3. Select account
4. Enter credentials
5. Click OK
6. Start the service

Required if service needs specific permissions.

## Troubleshooting

### Service Won't Start

**Possible Causes:**
- Configuration errors
- Invalid license
- Port conflicts
- File permissions

**Solutions:**
1. Check service logs for errors
2. Verify configuration file is valid XML
3. Check license activation
4. Ensure no other service using same ports
5. Verify service account has necessary permissions

### Service Stops Unexpectedly

**Possible Causes:**
- Unhandled exceptions
- License expiration
- Resource exhaustion
- Configuration errors

**Solutions:**
1. Review service logs for errors immediately before stop
2. Check license validity
3. Monitor system resources (CPU, memory, disk)
4. Validate configuration

### Service Won't Stop

**Possible Causes:**
- Stuck processing job
- Network connection timeout
- Resource deadlock

**Solutions:**
1. Wait longer (up to 2 minutes)
2. Force stop using Task Manager (last resort)
3. Check logs for jobs in progress
4. Restart computer if necessary

### "Access Denied" Errors

**Cause:** Insufficient permissions

**Solutions:**
- Run command prompt as Administrator
- Use Control Application (Run as Administrator)
- Verify account permissions

## Service Dependencies

DICOM Printer 2 service has no dependencies on other services, but requires:
- TCP/IP stack (for DICOM communication)
- File system access
- Windows event log

If these are unavailable, service may fail to start or function incorrectly.

## Related Topics

- [Control Application](control-app.md)
- [Installation](installation.md)
- [Configuration](configuration.md)
- [Logging](logs.md)
- [Troubleshooting](troubleshooting.md)
