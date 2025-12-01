# Command-Line Options

DICOM Printer 2 supports several command-line options for configuration and testing purposes.

## Available Options

### `--path <directory>`

Specifies the base directory for all DICOM Printer 2 data and configuration files.

**Usage:**
```bash
DicomPrinterService.exe --path "D:\CustomPath\DICOM Printer 2"
```

**Default:** `%ProgramData%\Flux Inc\DICOM Printer 2\`

When a custom path is specified, all subdirectories (config/, log/, queue/, etc.) are created under this base directory.

**Example:**
```bash
# Use custom directory on D: drive
DicomPrinterService.exe --path "D:\Data\DICOM Printer"

# Directory structure will be:
# D:\Data\DICOM Printer\config\
# D:\Data\DICOM Printer\log\
# D:\Data\DICOM Printer\queue\
# etc.
```

### `--activation-data`

Generates and displays the activation request code for license activation.

**Usage:**
```bash
DicomPrinterService.exe --activation-data
```

This option loads the configuration file and generates an activation request code that can be used to obtain a license key. The request code is displayed in the console output.

**Workflow:**
1. Run with `--activation-data` to generate request code
2. Submit request code to Flux Inc for license activation
3. Receive activation code
4. Use `--activate` option to enter the activation code

**Source:** `src/DicomPrinter/main.cpp:53-61`

### `--activate`

Launches the interactive activation flow to enter and validate a license activation code.

**Usage:**
```bash
DicomPrinterService.exe --activate
```

This option starts an interactive console session where you can enter the activation code received from Flux Inc. The activation process validates the code and configures the license for the application.

**Note:** This option disables the EventReporter to prevent "No device" errors during the activation process.

**Source:** `src/DicomPrinter/main.cpp:63-75`

### `--console`

Runs the service in console mode instead of as a Windows service.

**Usage:**
```bash
DicomPrinterService.exe --console
```

This is useful for testing and troubleshooting. The application runs in the foreground and can be stopped by pressing any key.

## Testing and Troubleshooting Mode

For testing configurations or troubleshooting issues, you can run DICOM Printer 2 directly from the command line without installing it as a Windows service.

**Example:**
```bash
# Run with default path in console mode
DicomPrinterService.exe --console

# Run with custom path in console mode
DicomPrinterService.exe --path "D:\Testing\DICOM Printer" --console
```

When running in console mode:
- The application runs in the foreground
- Log messages are written to both the log file and console output
- Press any key to stop the service
- Useful for verifying configuration changes and diagnosing workflow issues

## Service Installation

To install DICOM Printer 2 as a Windows service, use the Inno Setup installer. Command-line service installation is not supported.

See [Installation](installation.md) for installation instructions.

## Examples

### Run with Custom Path
```bash
DicomPrinterService.exe --path "E:\DICOM\Printer2"
```

### Run in Console Mode
```bash
DicomPrinterService.exe --console
```

### Run with Custom Path in Console Mode
```bash
DicomPrinterService.exe --path "D:\Testing\DICOM Printer" --console
```
