# Architecture & Design


This document provides an overview of the DICOM Printer 2 (DP2) application's operating principles, architecture, and key functions. For detailed information on configuration file tags, please refer to the [Configuration File Tags Specification](/dicom-printer-2/config). For a comprehensive DICOM conformance statement, including details on color support and transfer syntaxes, please consult the [DICOM 3.0 Conformance Statement](/dicom-printer-2/conformance).

## 1. Introduction to DP2

DICOM Printer (DP2) is an application that integrates into healthcare network infrastructures, providing DICOM-compliant query, storage, and print functions to devices that lack these capabilities. It processes tasks through a defined workflow, interacts with remote DICOM systems, and manages data and image processing.

## 2. Application Lifecycle and Core Components

### 2.1. Application Invocation and Command-Line Arguments

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

### 2.2. Event Loop and Service Operation

DP2 operates on a continuous event loop, which is the core engine of the application. This loop constantly monitors for new activities and processes data.

- **Continuous Monitoring**: The system actively monitors configured input sources, such as designated directories for new files (e.g., incoming print jobs or DICOM studies).
- **Data Processing**: When new data or events are detected, DP2 processes them according to the defined workflow. This involves reading data, extracting relevant information, and initiating a series of actions.
- **Timed Events**: The event loop also manages scheduled tasks, such as periodic directory checks or re-attempting failed operations after a set interval. This ensures the system remains responsive and reliable.

When running as a service, DP2 operates silently in the background. Its activities are communicated through its logging system and by triggering actions that interact with external systems.

### 2.3. User Interaction through Actions and Plugins

While DP2 is a console-only application, it can interact with users and external systems through its configurable actions and a plugin system.

- **Plugin System**: A key feature is the ability to launch external executable programs (plugins) to extend functionality. The system can use a simple command-line interaction (sending data via standard input and reading results from standard output) or a more advanced TCP-based protocol for structured, two-way communication.
- **External Program Interaction**: The `<Run>` action is designed to launch external programs or scripts using either the simple console method or the advanced TCP-based communication protocol.

This architecture allows DP2 to be highly adaptable, supporting complex workflows that require external interaction.

### 2.4. Queue Dashboard

| **Queue Dashboard** | Web-based UI for managing queue jobs that need manual worklist matching |

The ManualQuery action parks unmatched jobs in `queue/manual/`. The Queue Dashboard provides a web interface for technologists to search the worklist, select matches, and write `.match` companion files. When DP2 next polls the queue, it reads the `.match` file, applies the matched tags, and resumes normal workflow processing.

### 2.5. Global Application Paths

DP2 internally manages application-wide paths for its resources. This includes the main application directory, configuration file location, log file storage, and temporary processing directories. This system ensures that all components can locate necessary resources.

## 3. Task Processing and Management

### 3.1. Job Lifecycle and File Management

DP2 manages the entire lifecycle of a task, which is referred to as a "Job". The process begins when a new file is detected in a monitored directory. The application parses the file, applies operational flags, manages any image or PDF content, and handles the DICOM dataset. After all processing is complete, the job's files are deleted, unless the job is explicitly held or suspended.

### 3.2. Operational Flags and Workflow States

Each job transitions through various states, which are controlled by a set of internal flags. These flags indicate conditions such as whether a query was successful, if processing is paused, if the job is held for review, or if it should be discarded entirely. These flags are checked at each stage of the workflow to allow for flexible error handling and conditional processing.

### 3.3. Job Suspension and Resumption

DP2 can suspend and resume jobs. A job can be temporarily paused, for example, if a network resource is unavailable. The system holds the job's state and automatically attempts to resume processing after a configurable time interval. This is essential for handling temporary network issues or other external dependencies without losing work.

### 3.4. Directory Monitoring and File Restoration

The application continuously monitors its queue directory for new job files. In addition, it includes a feature to ensure application integrity by monitoring critical configuration files. If a monitored file is modified or corrupted, the system can automatically restore it from a default template.

## 4. DICOM Services and Interactions

### 4.1. DICOM Connection Parameters

To communicate with other DICOM systems, DP2 relies on connection parameters defined in the configuration file. For each relevant action (such as `<Query>`, `<Store>`, or `<Print>`), settings like the AE Title, IP address, and port of the remote system must be specified. These parameters ensure that DP2 can establish DICOM associations correctly.

### 4.2. DICOM Data Preparation

Before sending data, DP2 can prepare DICOM datasets to ensure they are compliant and contain the necessary information. This includes setting default values for required tags and adding or modifying elements related to patients, studies, series, and equipment, primarily through the `<SetTag>` action.

### 4.3. DICOM Print Capabilities

DP2 functions as a DICOM Print client, supporting multiple print modes, including Color, Grayscale 8-bit, and Grayscale 12-bit. It manages the entire print process by creating film sessions, arranging images in film and image boxes, and sending the print job to a remote DICOM printer.

### 4.4. The Print Action Workflow

The `<Print>` action encapsulates the full DICOM printing process. When executed, it connects to the configured DICOM printer, sets up the film session and boxes, configures the image boxes with the correct attributes, and sends the print request, ensuring a compliant printing operation.

### 4.5. DICOM Tag Manipulation

DP2 provides powerful features for manipulating DICOM tags. The `<SetTag>` action can be used to add, delete, or modify tags to meet specific workflow requirements. Additionally, the system can read tag values from a dataset and use them as variables in other action parameters, using a `#{GGGG,EEEE}` or `#{TagName}` placeholder syntax.

### 4.6. Fallback Date/Time Handling

When processing placeholder values, if a DICOM tag for a date is not found, the system can generate a fallback value. Using a `#{Date}` placeholder, DP2 can insert the current date, with an optional offset (e.g., `#{Date,-7}` for seven days ago). This ensures that date-sensitive operations do not fail due to missing information.

## 5. Workflow and Configuration

### 5.1. Configuration File Structure

The operation of DP2 is defined by a central XML configuration file. The application parses this file upon startup, reading three main sections:

- `<General>`: Contains global settings like polling intervals, logging levels, and license information.
- `<ActionsList>`: Defines a library of reusable actions (e.g., a specific `<Store>` or `<Print>` operation) that can be referenced in the workflow.
- `<Workflow>`: Specifies the sequence of operations and the logic for processing jobs.

DP2 validates this structure and the settings within it to ensure a valid configuration before starting its processing loop.

### 5.2. Advanced Workflow Nodes

The `<Workflow>` section is built from a series of nodes that control the flow of a job. DP2 supports several types of nodes to enable complex and customizable logic:

- `<Perform>`: Executes a named action from the `<ActionsList>`. Its `onError` attribute can be used to define behavior on failure.
- `<If>` / `<Switch>`: Provides conditional branching. The workflow can take different paths based on the value of a DICOM tag or other job data.
- `<Update>`: Modifies the job's dataset by adding or changing information.
- `<Suspend>`: Pauses a job for a configured duration before it is automatically resumed.
- `<Discard>`: Terminates a job and deletes its associated files.

These nodes allow for the creation of highly specific and robust task-processing workflows.

## 6. System Monitoring and Support

### 6.1. Event Reporting and Logging

DP2 has a detailed event reporting system that logs all operations. Events are categorized by type (e.g., `Error`, `Warning`, `Information`), and the level of detail is configurable. The logging system supports automatic log rotation based on file size and count and can be configured to write to the console in addition to log files.

### 6.2. Activation and Licensing

The application is managed by an activation system. It uses a hardware-based request code to generate a license key. The system tracks the activation state (e.g., `Active`, `Expired`) and provides tools for troubleshooting. In an evaluation or expired state, a watermark may be added to printed output.

## 7. Job Lifecycle and State Management

DP2 manages the job lifecycle with a state management system that tracks progress and maintains data integrity.

### 7.1. Job State Flags

The state of a job is tracked using a series of flags, including:

- **QueryMatched**: The last query found at least one match.
- **Suspended**: The job is paused and will be retried later.
- **Resumed**: The job is currently being resumed after being suspended.
- **Held**: An error occurred, and the job is held for manual review. Job files are preserved.
- **Discarded**: The job is marked for termination and deletion.
- **PartialMatch**: A query returned multiple possible matches.
- **StoreSucceeded**: The last storage operation was successful.

### 7.2. Job Processing Pipeline

1. **Creation**: A new job is created when a file is detected in a monitored directory. Metadata is extracted, and a DICOM dataset is initialized.
2. **Processing**: The job proceeds through the workflow, with its state flags being updated based on the results of each action.
3. **Completion**: If the workflow completes successfully, temporary files are deleted. If the job is held or suspended, its files are preserved.

### 7.3. Error Recovery and Resilience

The system is designed to be resilient to common problems:

- **Error Classification**: Errors are classified as temporary (e.g., network timeouts), configuration-related, data-related (e.g., corrupted files), or system-related (e.g., disk space).
- **Recovery Strategies**: Depending on the error, the system can perform an automatic retry, suspend the job for manual intervention, or take an alternative path in the workflow.
