# Uninstallation

This guide describes how to completely remove DICOM Printer 2 from your system.

## Before Uninstalling

1. **Backup Configuration**
   ```
   Copy: %ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml
   To: Safe location
   ```

2. **Save Activation Code**
   - Record your activation code from config.xml or Control Application
   - Keep for potential reinstallation

3. **Export Logs** (if needed for troubleshooting or records)
   ```
   Copy: %ProgramData%\Flux Inc\DICOM Printer 2\log\
   To: Archive location
   ```

4. **Complete or Archive Pending Jobs**
   - Check queue directory for pending jobs
   - Allow jobs to complete or manually archive

## Uninstallation Methods

### Method 1: Using Windows Settings (Windows 10/11)

1. Open **Settings** → **Apps** → **Apps & features**
2. Search for "DICOM Printer 2"
3. Click on DICOM Printer 2
4. Click **Uninstall**
5. Click **Uninstall** again to confirm
6. Follow uninstaller prompts

### Method 2: Using Control Panel (All Windows Versions)

1. Open **Control Panel**
2. Navigate to **Programs** → **Programs and Features**
3. Locate "DICOM Printer 2" in the list
4. Right-click and select **Uninstall**
5. Follow uninstaller prompts

### Method 3: Using Uninstaller Directly

1. Navigate to installation directory:
   ```
   C:\Program Files (x86)\Flux Inc\DICOM Printer 2\
   ```
2. Run `unins000.exe`
3. Follow uninstaller prompts

## Uninstaller Options

The uninstaller will prompt you about data removal:

**Remove Configuration and Data:**
- **Yes** - Removes all configuration, logs, and queued jobs
- **No** - Keeps data files for potential reinstallation

If you plan to reinstall, select **No** to preserve your configuration and activation.

## Manual Cleanup

After uninstallation, some files may remain. To completely remove all traces:

### Remove Program Files

Check and remove if exists:
```
C:\Program Files (x86)\Flux Inc\DICOM Printer 2\
```

### Remove Data Files

```
%ProgramData%\Flux Inc\DICOM Printer 2\
```

Full path typically:
```
C:\ProgramData\Flux Inc\DICOM Printer 2\
```

Contains:
- config/ - Configuration files
- drop/ - Drop monitor directories
- log/ - Log files
- queue/ - Print job queue
- staging/ - Temporary files
- store/ - Local storage
- temp/ - Temporary files

### Remove User Settings (if any)

```
%APPDATA%\Flux Inc\DICOM Printer 2\
```

## Verify Complete Removal

### Check Services

1. Open Services (`services.msc`)
2. Verify "DICOM Printer 2 Service" is not listed
3. Verify "DICOM Printer 2 Drop Monitor" is not listed (if was installed)

### Check Printer Devices

1. Open **Devices and Printers**
2. Verify "DICOM Printer 2" virtual printer is removed
3. If still present, right-click and **Remove device**

### Check Registry (Advanced)

Registry entries are typically removed by uninstaller. If needed, check:

```
HKEY_LOCAL_MACHINE\SOFTWARE\Flux Inc\DICOM Printer 2
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\DicomPrinter2Service
```

**Warning:** Only modify registry if you're comfortable with Registry Editor.

## Troubleshooting Uninstallation

### Uninstaller Not Found

**Solutions:**
1. Reinstall DICOM Printer 2, then uninstall properly
2. Manually remove files and registry entries (advanced)
3. Use third-party uninstaller tool

### Service Won't Stop

**Solutions:**
1. Use Task Manager to end DicomPrinterService.exe process
2. Restart computer
3. Retry uninstallation

### Files in Use

**Solutions:**
1. Close Control Application
2. Stop DICOM Printer 2 service
3. Close any applications accessing DICOM Printer 2 directories
4. Restart computer and retry uninstallation

### Permission Denied

**Solutions:**
1. Run uninstaller as Administrator:
   - Right-click `unins000.exe`
   - Select "Run as administrator"
2. Ensure you have administrative privileges

## Reinstallation

If you plan to reinstall:

1. **With Configuration Preserved:**
   - Don't delete data directory during uninstall
   - Reinstall DICOM Printer 2
   - Existing configuration will be detected and used

2. **Fresh Installation:**
   - Delete data directory during uninstall
   - Or manually delete `%ProgramData%\Flux Inc\DICOM Printer 2\`
   - Reinstall DICOM Printer 2
   - Reconfigure from scratch

## Related Topics

- [Installation](installation.md)
- [Upgrading](upgrading.md)
- [Configuration](configuration.md)
- [Support](support.md)
