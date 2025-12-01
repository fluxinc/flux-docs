# Upgrading

This guide covers upgrading DICOM Printer 2 to a newer version.

## Before Upgrading

### 1. Backup Configuration

**Critical:** Always backup your configuration before upgrading.

```cmd
copy "%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml" "%USERPROFILE%\Desktop\config_backup.xml"
```

### 2. Record Activation Code

Save your activation code:
- Open Control Application → Licensing tab
- Copy activation code
- OR extract from config.xml `<RegistrationKey>` element

### 3. Note Current Version

Check current version:
- Control Application → About
- OR command line: `DicomPrinterService.exe --version`

### 4. Review Release Notes

Before upgrading, review release notes for:
- New features
- Breaking changes
- Configuration migration requirements
- Known issues

### 5. Stop the Service

```cmd
net stop DicomPrinter2Service
```

OR use Control Application to stop service.

## Upgrade Process

### Standard Upgrade

1. **Download New Version**
   - Obtain latest installer from Flux Inc
   - Verify installer version number

2. **Run Installer**
   - Double-click installer executable
   - Installer detects existing installation
   - Select "Upgrade" or "Update" option

3. **Installation Wizard**
   - Follow installation wizard
   - Existing configuration is typically preserved
   - Installation completes

4. **Verify Service**
   - Service should start automatically
   - If not, start manually

5. **Check Logs**
   - Review log file for any errors
   - Verify service started successfully

6. **Test Configuration**
   - Verify workflows function correctly
   - Test DICOM connections
   - Process test job

## Configuration Migration

### Automatic Migration

Most upgrades preserve your configuration automatically. The installer:
- Detects existing config.xml
- Preserves settings during upgrade
- Updates only necessary elements

### Manual Migration

If configuration requires manual updates:

1. **Review Migration Guide**
   - Check release notes for migration instructions
   - Identify configuration changes required

2. **Update Configuration**
   - Edit config.xml with required changes
   - Validate XML syntax
   - Ensure DTD compliance

3. **Test Configuration**
   - Restart service
   - Check logs for errors
   - Process test job

### Configuration Backup and Restore

If automatic migration fails:

1. **Restore Backup**
   ```cmd
   copy "%USERPROFILE%\Desktop\config_backup.xml" "%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml"
   ```

2. **Manually Apply Updates**
   - Reference new config.dtd
   - Add new elements if required
   - Update deprecated elements

## Version Compatibility

### Major Version Upgrades (e.g., 1.x to 2.x)

May include:
- Breaking configuration changes
- New required elements
- Deprecated features removed
- Migration tool may be provided

**Recommended:**
- Test in non-production environment first
- Review all migration documentation
- Plan for configuration updates

### Minor Version Upgrades (e.g., 2.0 to 2.1)

Typically:
- Backward compatible
- No configuration changes required
- New optional features
- Safe to upgrade in-place

### Patch Version Upgrades (e.g., 2.0.0 to 2.0.1)

Generally:
- Bug fixes only
- No configuration changes
- Full backward compatibility
- Lowest risk

## Post-Upgrade Verification

### 1. Check Service Status

```cmd
sc query DicomPrinter2Service
```

Should show `STATE: 4 RUNNING`

### 2. Review Logs

Check for errors or warnings:
```
%ProgramData%\Flux Inc\DICOM Printer 2\log\dicom_printer_service.log
```

Look for:
- Successful service start
- Configuration loaded
- License validation
- No critical errors

### 3. Verify License

- Check license status in Control Application
- Verify activation is still valid
- Reactivate if necessary (same activation code works)

### 4. Test Workflows

Test critical workflows:
- Print test document
- Verify PACS connectivity
- Test worklist queries
- Check file processing

### 5. Monitor Performance

After upgrade, monitor:
- Job processing times
- Resource usage
- Error rates
- DICOM operation success rates

## Rollback Procedure

If upgrade causes issues:

### 1. Stop Service

```cmd
net stop DicomPrinter2Service
```

### 2. Uninstall New Version

- Control Panel → Programs and Features
- Uninstall DICOM Printer 2
- **Important:** Select "No" when asked to remove data

### 3. Reinstall Previous Version

- Run previous version installer
- Install to same location
- Configuration should be preserved

### 4. Restore Configuration Backup

If configuration was modified:
```cmd
copy "%USERPROFILE%\Desktop\config_backup.xml" "%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml"
```

### 5. Restart Service

```cmd
net start DicomPrinter2Service
```

### 6. Verify Operation

- Check service runs correctly
- Test workflows
- Review logs

## Best Practices

1. **Always Backup** - Never upgrade without configuration backup
2. **Test First** - Test upgrade in non-production environment when possible
3. **Plan Downtime** - Schedule upgrade during maintenance window
4. **Read Release Notes** - Understand changes before upgrading
5. **Verify Compatibility** - Ensure PACS/RIS compatibility with new version
6. **Monitor After Upgrade** - Watch logs and performance closely post-upgrade
7. **Keep Installers** - Archive previous version installer for rollback

## Upgrade Support

For upgrade assistance:

**Email:** support@fluxinc.ca

**Include:**
- Current version
- Target version
- Any errors encountered
- Configuration backup (sanitized)

## Related Topics

- [Installation](installation.md)
- [Configuration](configuration.md)
- [Uninstallation](uninstallation.md)
- [Support](support.md)
