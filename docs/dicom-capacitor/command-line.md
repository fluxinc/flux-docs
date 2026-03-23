# Command Line Options

## Basic Syntax
```bash
DICOMCapacitorService.exe [options]
```

## Service Options
- `--uninstall`, `-u`: Remove Windows service
- `--restart-service [PID]`, `-rs [PID]`: Restart service using process ID
- `--path`: Sets the path to the configuration files. Default:
  - **Windows**: `%ProgramData%\Flux Inc\DICOM Capacitor\`
  - **macOS/Linux**: `/var/lib/dicom-capacitor/data/`

## Configuration Options
- `--activation-code [CODE]`, `-a [CODE]`: Set product activation code
- `--activate`: Run the interactive activation flow and exit
- `--no-storage-scu`: Disables the Storage SCU
- `--no-worklist-scu`: Disables the Worklist SCU
- `--no-prepare`: Disables preparation, which is the process of preparing files for storage
- `--save-config`: Saves the current settings to the `config.yml` file.  Be careful with this option, as it
  will overwrite the existing `config.yml` file.

## Output Options
- `--console`, `-c`: Force log output to the console (useful for debugging)
- `--log [DIR]`: Set the log output directory (overrides the default log path)
- `--version`: Display the current version and exit
- `--status`: Display the activation/license status and exit

## API Options

The HTTP management API is configured via the `api:` section in `config.yml`, not via command-line flags. See [Settings → api](./config#api) and the [HTTP API reference](./api).

## Development Options
- `--mutate`: Applies the mutations defined in `mutations.yml`. This option requires a list of
  DICOM files to be provided, and is intended for testing purposes.
- `--clear-secure-logs [PASSWORD]`: Clear secure audit logs
- `--quit`, `-q`: Exit after running commands

## Examples

### Set Activation
```bash
DICOMCapacitorService.exe --activation-code "XXXX-XXXX-XXXX" --save-config
```

### Development Usage
```bash
# Process single file
DICOMCapacitorService.exe --mutate [SRC_AE] [DST_AE] [IN_DCM_FILE] [OUT_DCM_FILE]

# Clear logs
DICOMCapacitorService.exe --clear-secure-logs "password"
```
