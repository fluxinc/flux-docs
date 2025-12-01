# Control Application

The Control Application is a graphical user interface for managing the DICOM Printer 2 service.

## What is the Control Application?

The Control Application provides a user-friendly interface to:
- Start and stop the DICOM Printer 2 service
- View service status
- Monitor real-time log output
- Manage software activation
- View and edit configuration files
- Monitor processing queues

## Features

### Service Management

Control the DICOM Printer 2 service:
- **Start Service** - Start the background service
- **Stop Service** - Stop the background service
- **Restart Service** - Stop and restart the service
- **View Status** - See current service state (Running, Stopped)

### Log Viewer

View service logs in real-time:
- **Live Tail** - Automatically scrolls to show new log entries
- **Search/Filter** - Find specific log entries
- **Verbosity Control** - Adjust log detail level
- **Export** - Save log excerpts for analysis

### Activation Management

Manage software licensing:
- **View License Status** - See activation state and expiration
- **Generate Request Code** - Create activation request
- **Enter Activation Code** - Activate the software
- **View License Details** - See license validity period and features

### Configuration Management

Edit configuration:
- **View Config** - Display current configuration
- **Edit Config** - Modify settings (opens in default XML editor)
- **Validate Config** - Check configuration for errors
- **Reload Config** - Apply configuration changes (restarts service)

## Launching the Control Application

### From Start Menu

```
Start Menu → Flux Inc → DICOM Printer 2 → Control Application
```

### From Installation Directory

Default location:
```
C:\Program Files (x86)\Flux Inc\DICOM Printer 2\DicomPrinterControl.exe
```

### From Command Line

```cmd
"C:\Program Files (x86)\Flux Inc\DICOM Printer 2\DicomPrinterControl.exe"
```

## Using the Control Application

### Starting the Service

1. Launch the Control Application
2. Click **Start Service** button
3. Service status changes to "Running"
4. Log messages appear in the log viewer

### Stopping the Service

1. Click **Stop Service** button
2. Service begins graceful shutdown
3. Service status changes to "Stopped"
4. Currently processing jobs are completed before shutdown

### Viewing Logs

The log viewer displays:
- Timestamp
- Log level (INFO, WARNING, ERROR, DEBUG)
- Message text

**Features:**
- Auto-scroll to follow new entries
- Search/filter capabilities
- Copy log entries to clipboard
- Export to file

### Managing Activation

#### View Current License Status

1. Click **Licensing** tab
2. View:
   - License state (Active, Expired, Unlicensed)
   - Validity period
   - Days remaining
   - Registered to

#### Activate Software

1. Click **Licensing** tab
2. Click **Generate Request Code**
3. Copy request code
4. Visit activation URL or contact Flux Inc
5. Receive activation code
6. Click **Enter Activation Code**
7. Paste activation code
8. Click **Activate**

See [Licensing and Activation](licensing.md) for detailed instructions.

### Editing Configuration

1. Click **Configuration** tab
2. Click **Edit Configuration**
3. Configuration file opens in default XML editor
4. Make changes and save
5. Click **Reload Configuration**
6. Service restarts with new configuration

**Important:** Stop the service before editing configuration to prevent conflicts.

## Control Application Permissions

The Control Application requires:
- **Administrator privileges** for service management (start/stop)
- **Read access** to configuration and log directories
- **Write access** to configuration directory (for configuration edits)

Run as administrator if service controls are disabled.

## Troubleshooting

### "Access Denied" When Starting/Stopping Service

**Cause:** Insufficient permissions

**Solution:** Right-click Control Application and select "Run as administrator"

### Configuration Changes Not Applied

**Cause:** Service not restarted after configuration edit

**Solution:** Click "Reload Configuration" or manually restart the service

### Log Viewer Shows Old Data

**Cause:** Log file not refreshing

**Solution:**
- Click "Refresh" button
- Close and reopen Control Application
- Check if service is running

### Cannot Open Configuration File

**Cause:** No XML editor associated with .xml files

**Solution:**
- Associate .xml files with an editor (Notepad, VS Code, etc.)
- Manually open `%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml`

## Alternative Management Methods

While the Control Application provides a convenient GUI, you can also manage DICOM Printer 2 using:

- **Windows Services** (`services.msc`)
- **Command line** (`sc` and `net` commands)
- **PowerShell** (service management cmdlets)

See [Starting and Stopping the Service](starting-and-stopping.md) for command-line methods.

## Related Topics

- [Starting and Stopping the Service](starting-and-stopping.md)
- [Licensing and Activation](licensing.md)
- [Configuration](configuration.md)
- [Logging](logs.md)
- [Installation](installation.md)
