# Starting and Stopping the Service

## Windows

Use the Services console or the `sc` command:

```cmd
sc start "DICOMCapacitorService"
sc stop "DICOMCapacitorService"
sc query "DICOMCapacitorService"
```

Or use the Services MMC (`services.msc`) to start, stop, and configure the startup type.

## macOS

DICOM Capacitor runs as a LaunchDaemon with the label `co.fluxinc.dicom-capacitor`.

**Start:**
```bash
sudo launchctl bootstrap system /Library/LaunchDaemons/co.fluxinc.dicom-capacitor.plist
sudo launchctl kickstart -k system/co.fluxinc.dicom-capacitor
```

**Stop:**
```bash
sudo launchctl bootout system/co.fluxinc.dicom-capacitor
```

**Restart:**
```bash
sudo launchctl bootout system/co.fluxinc.dicom-capacitor || true
sleep 2
sudo launchctl bootstrap system /Library/LaunchDaemons/co.fluxinc.dicom-capacitor.plist
sudo launchctl kickstart -k system/co.fluxinc.dicom-capacitor
```

**Check status:**
```bash
sudo launchctl print system/co.fluxinc.dicom-capacitor
```

**Enable/disable auto-start:**
```bash
sudo launchctl enable system/co.fluxinc.dicom-capacitor
sudo launchctl disable system/co.fluxinc.dicom-capacitor
```

The service is configured with `KeepAlive` set to restart on failure. If the process exits with a non-zero status, launchd will restart it after 10 seconds.

## Linux

DICOM Capacitor runs as a systemd service named `dicom-capacitor`.

**Start:**
```bash
sudo systemctl start dicom-capacitor
```

**Stop:**
```bash
sudo systemctl stop dicom-capacitor
```

**Restart:**
```bash
sudo systemctl restart dicom-capacitor
```

**Check status:**
```bash
sudo systemctl status dicom-capacitor
```

**Enable/disable auto-start:**
```bash
sudo systemctl enable dicom-capacitor
sudo systemctl disable dicom-capacitor
```

The service is configured with `Restart=on-failure` and a 10-second restart delay.

## Docker

```bash
docker compose up -d          # Start
docker compose stop            # Stop
docker compose restart         # Restart
docker compose logs -f         # Follow logs
```

See the [Docker Operations](/dicom-capacitor/docker) page for more details.

## Health Check

You can verify the service is accepting DICOM connections using `echoscu` (from [dcmtk](https://dicom.offis.de/dcmtk/)):

```bash
echoscu -aec FLUX_CAPACITOR localhost 1040
```

Replace `FLUX_CAPACITOR` with your configured `myAeTitle` and `1040` with your configured `scpPort`.

## Viewing Logs

| Platform | Command |
|----------|---------|
| Windows | Open `%ProgramData%\Flux Inc\DICOM Capacitor\log\capacitor_service.log` |
| macOS | `tail -f /var/lib/dicom-capacitor/data/log/capacitor_service.log` |
| macOS (launchd errors) | `tail -f /var/lib/dicom-capacitor/data/log/launchctl-error.log` |
| Linux | `journalctl -u dicom-capacitor -f` |
| Linux (file) | `tail -f /var/lib/dicom-capacitor/data/log/capacitor_service.log` |
| Docker | `docker compose logs -f` |

See [Interrogating the Logs](logs) for more details on log files and rotation.
