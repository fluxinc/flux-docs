# Command-Line Options


DP2 can be started in two primary modes:

- **Direct Execution**: The application can be launched by running its executable file (e.g., `DicomPrinter.exe`) from a command prompt. This mode is used for manual operations, initial setup, or testing. All output is sent to the console.
- **Service Mode**: For continuous, unattended operation, DP2 can be installed and run as a Windows service. It starts automatically with the system and runs in the background without a user interface. This is the recommended mode for production environments, where all information is directed to log files and external plugins.

The application is console-only and has no graphical user interface (GUI). All interactions are managed through log files, command-line output, and configurable actions that can communicate with external systems.

The application's startup behavior is controlled by the following command-line arguments:

| Argument | Description |
|---|---|
| `--path <directory>` | Sets the application's root directory, overriding the default location (`%ProgramData%\Flux Inc\DICOM Printer 2`). All subdirectories (`config/`, `log/`, `queue/`, `temp/`) are resolved relative to this path. Useful for managing multiple operational profiles or testing new configurations. |
| `--console` | Forces the application to run in console mode, even if installed as a service. In this mode, log output is displayed on the console and the application can be terminated by pressing any key. |
| `--activate` | Launches an interactive activation wizard. This mode opens the activation page in the default web browser, displays the hardware request code, and polls the licensing server in the background until activation succeeds. The user can also paste an activation code directly into the console. The application exits after activation completes (or if the user types `quit`). Requires an interactive console session (not Session 0). |
| `--activation-data` | Outputs the current activation data as an XML document to standard output and exits. The XML contains the hardware `RequestCode` and the stored `ActivationCode`. Requires a valid configuration file. Added in v2.2.6. |

Arguments can be combined. For example, to run the activation wizard against a non-default data directory:

```
DicomPrinter.exe --path "D:\DP2\Site-B" --activate
```

