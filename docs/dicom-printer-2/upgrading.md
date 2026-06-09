# Upgrading

This guide covers upgrading DICOM Printer 2 to a newer version.

## Upgrading to 2.4.7

Version 2.4.7 is backward-compatible for existing configs, but it changes a few
runtime behaviors that operators may notice during validation.

### Environment substitution parity

The main service, DICOM Printer Console/API, and Drop Monitor now load and
resolve the same environment sources:

1. `%ProgramData%\Flux Inc\DICOM Printer 2\.env`
2. `%ProgramData%\Flux Inc\DICOM Printer 2\.env.local`
3. `%ProgramData%\Flux Inc\DICOM Printer 2\config\.env`
4. `%ProgramData%\Flux Inc\DICOM Printer 2\config\.env.local`
5. process environment variables

Process environment values have highest precedence. This matters for configs
that use `${VAR}` or `${VAR:-default}` in connection parameters or Drop Monitor
settings. After upgrading, use the Console Manage pane to run inline C-ECHO or
query-test actions against endpoints with placeholder-backed host, port, or AE
title values, and verify the Drop Monitor log if `<DropMonitor><Path>` uses a
placeholder.

### Worklist Modality filtering

Worklist root `Modality` `(0008,0060)` can now act as an alias for Scheduled
Procedure Step Modality inside `(0040,0100)`. Literal modality values are sent
as SPS matching keys and also enforced locally. Regex, wildcard, pipe-list,
exclusion, and `match="local"` modality filters are requested as empty SPS
return keys and then filtered locally by DP2.

If a Worklist query previously returned extra rows because modality was only
present inside the SPS sequence, expect the result set to become narrower after
the upgrade.

### Store association lifetime

Each `Store` action now reuses one DICOM association across compatible
instances in the job. Multi-page jobs should show one association request, one
C-STORE per generated instance, and one association release in receiver logs.

### Site-profile installer

The 2.4.7 installer includes the site-profile companion-file workflow for
managed deployments. A selected profile writes environment values to the root
`.env` file and can install a companion config template. See
[Installation and Deployment](installation.md#87-site-profile-installation) for
the companion file names and silent install flags.

## Upgrading to 2.4.0

Version 2.4.0 consolidates the legacy `DICOMPrinterControl.exe` WinForms application and the separately-branded Queue Dashboard web UI into a single **[DICOM Printer Console](control-app.md)** (WebView2 desktop) backed by a local ASP.NET Core HTTP service. The installer performs the migration automatically; the notes below cover what changes on disk and what to verify after upgrade.

### Service rename and binary swap

The Windows service that backed the prior Queue Dashboard has been renamed:

| Before 2.4.0 | 2.4.0+ |
|---|---|
| Service name `DICOMPrinterQueueService` | `DICOMPrinterApiService` |
| Binary `QueueDashboard.exe` (self-contained .NET 8 `x64`) | `DICOMPrinterApi.exe` (framework-dependent .NET 10 `x86`) |
| WinSW wrapper `QueueDashboard.WinSW.xml` | `DICOMPrinterApi.WinSW.xml` |

The upgrade installer:

1. Stops and removes the prior `DICOMPrinterQueueService` (or the legacy queue/control service) before installing the new one.
2. Removes the retired `DICOMPrinterControl.exe` from `{app}` and the legacy "Control Application" Start Menu shortcut.
3. Cleans up the prior WinSW wrapper file so the new service launches cleanly.
4. Stops the previous API/console process before replacing binaries, eliminating "DLL in use" failures on upgrade.

The default API listener is `http://localhost:5009` (loopback only) — unchanged from earlier releases.

### Shortcuts and launchers

- The Start Menu entry "DICOM Printer Console" launches via `OpenQueueDashboard.exe` (compatibility alias).
- The legacy "Control Application" Start Menu shortcut is removed.
- The `dicom-printer-2-queue\` install subdirectory is retained as a compatibility alias for the install path — the binaries inside are the new Console + API stack.

### Offline-capable installer

The 2.4.0 installer bundles the ASP.NET Core 10 `x86` runtime and an offline WebView2 runtime; no internet access is required at install time. Earlier installers downloaded these at install time and could fail on isolated networks.

### Verification after a 2.4.0 upgrade

1. Confirm the new service is registered and running:
   ```cmd
   sc query DICOMPrinterApiService
   ```
2. Confirm the prior service is gone:
   ```cmd
   sc query DICOMPrinterQueueService
   ```
   Should report "service does not exist".
3. Open the Console from the Start Menu (Flux Inc → DICOM Printer Console). The window should open and connect to `http://localhost:5009`.
4. From the Console **Manage** pane verify service status, that the storage endpoint list shows each configured Store/Worklist/Study endpoint, and that the config editor loads `config.xml`.

### Config compatibility

`config.xml` is preserved across the upgrade. New optional Query attributes (`select`, `order-by`, `match="local"`) and the General `<RedactSensitiveLogValues>` option default to behavior that matches earlier releases. See the [Configuration Reference](config.md) and [Query Actions](actions/query.md) for full attribute details.

## Before Upgrading

### 1. Backup Configuration

**Critical:** Always backup your configuration before upgrading.

```cmd
copy "%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml" "%USERPROFILE%\Desktop\config_backup.xml"
```

### 2. Record Activation Code

Save your activation code:
- Open the DICOM Printer Console → Manage → Activate (or extract from `config.xml`)
- Copy activation code
- OR extract from config.xml `<RegistrationKey>` element

### 3. Note Current Version

Check current version:
- DICOM Printer Console → Manage → Service (the version is shown alongside the service state)
- OR command line: `DicomPrinter.exe --version`

### 4. Review Release Notes

Before upgrading, review release notes for:
- New features
- Breaking changes
- Configuration migration requirements
- Known issues

### 5. Stop the Service

```cmd
net stop DICOMPrinterService
```

OR use the DICOM Printer Console Manage pane to stop the service.

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
sc query DICOMPrinterService
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

- Check license status in the DICOM Printer Console (Manage → Activate)
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
net stop DICOMPrinterService
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
net start DICOMPrinterService
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
