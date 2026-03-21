# Uninstallation

## Windows

1. Open Add/Remove Programs (`appwiz.cpl`)
2. Locate DICOM Capacitor and click Uninstall

Alternatively, remove the service manually:

```cmd
sc stop "DICOMCapacitorService"
sc delete "DICOMCapacitorService"
```

Configuration and cache data at `%ProgramData%\Flux Inc\DICOM Capacitor\` are not removed by the uninstaller. Delete this directory manually if you no longer need the data.

## macOS

Stop and remove the LaunchDaemon, then remove the binaries and data:

```bash
# Stop and remove the service
sudo launchctl bootout system/co.fluxinc.dicom-capacitor
sudo rm /Library/LaunchDaemons/co.fluxinc.dicom-capacitor.plist

# Remove binaries
sudo rm -rf /opt/dicom-capacitor

# Remove data (config, logs, cache) — only if no longer needed
sudo rm -rf /var/lib/dicom-capacitor

# Remove the service user (optional)
sudo dscl . -delete /Users/_dicomcapacitor

# Remove sudoers file (optional)
sudo rm /etc/sudoers.d/flux-dicom-capacitor
```

## Linux

Stop and remove the systemd service, then remove the binaries and data:

```bash
# Stop and disable the service
sudo systemctl stop dicom-capacitor
sudo systemctl disable dicom-capacitor
sudo rm /etc/systemd/system/dicom-capacitor.service
sudo systemctl daemon-reload

# Remove binaries
sudo rm -rf /opt/dicom-capacitor

# Remove data (config, logs, cache) — only if no longer needed
sudo rm -rf /var/lib/dicom-capacitor

# Remove the service user (optional)
sudo userdel dicom-capacitor
```

## Docker

```bash
docker compose down

# Remove data — only if no longer needed
rm -rf ./data ./cache
```
