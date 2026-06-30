# Run Actions (Plugins)

Run actions execute external console or interactive applications as part of the workflow, enabling custom processing and integration with third-party tools.

## Plugin Types

DICOM Printer 2 supports two types of plugins:

- **Console** - Command-line applications that run in the background
- **Interactive** - Graphical applications that display a user interface

## Basic Syntax

```xml
<Run name="ActionName" type="Console|Interactive">
  <Command>path_to_executable</Command>
  <Arguments>arg1|arg2|arg3</Arguments>
  <Input tag="(gggg,eeee)"/>
  <Output tag="(gggg,eeee)" type="Global|Unique"/>
</Run>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

## Required Attributes

### `name`
Unique identifier for this action.

### `type`
The plugin type.

**Valid Values:** `Console`, `Interactive`

## Optional Attributes

### `resolveHostNameAutomatically`
Controls whether Interactive plugins should display on remote client machines.

**Valid Values:** `true`, `false`
**Default:** `false`
**Applies to:** Interactive plugins only (ignored for Console plugins)

```xml
<Run name="RemoteReview" type="Interactive" resolveHostNameAutomatically="true">
  <Command>C:\Tools\Reviewer.exe</Command>
</Run>
```

**Behavior:**
- When `true` and the job originates from a remote client:
  - The system resolves the client's hostname to an IP address
  - The Interactive plugin launcher connects to the client's machine
  - The plugin's user interface displays on the **client's desktop**
- When `false` (default):
  - The plugin runs on the **server** (localhost)

**Use Cases:**
- **Enable (`true`):** When technicians submit jobs from workstations and need to interact with the plugin GUI on their own machines
- **Disable (`false`):** When plugins should run on the server, or all jobs are submitted locally

**Requirements:**
- Client machine must have the DICOM Printer 2 plugin launcher installed and running
- Network connectivity must allow connections from server to client
- Firewall rules must permit the launcher port

## Elements

### `<Command>` (Required)
The full path to the executable file.

```xml
<Command>C:\Tools\ImageProcessor.exe</Command>
```

### `<Arguments>` (Optional)
Command-line arguments to pass to the executable. Supports placeholders.

Arguments are **pipe-delimited**, not space-delimited: the value is split on the `|` character, and each `|`-separated segment becomes a single argv element. Spaces within a segment are preserved, so a single argument may contain spaces. For example, `<Arguments>a b|c</Arguments>` produces argv `["a b", "c"]`.

```xml
<Arguments>--input|C:\in.dcm|--output|C:\out.dcm</Arguments>
```

**Note:** Tag *values* are not passed as command-line arguments — pass them to the plugin via `<Input>` (stdin) instead. See [Input and Output](#input-and-output).

### `<Timeout>` (Optional)
Maximum time in milliseconds to wait for the plugin to execute.

**Type:** Integer (milliseconds)
**Default:** `3000` (3 seconds)

```xml
<Timeout>30000</Timeout>  <!-- 30 seconds -->
```

The timeout applies to:
- Starting the plugin process
- Writing input data to the plugin
- Waiting for the plugin to finish execution

If the timeout is exceeded, the action fails and workflow error handling is triggered based on the `onError` attribute.

**Recommended values:**
- **Quick operations:** `5000` (5 seconds)
- **Standard processing:** `30000` (30 seconds)
- **Long-running tasks:** `300000` (5 minutes)
- **Very long tasks:** `600000` (10 minutes)

### `<LauncherPortNumber>` (Deprecated)
**This element is present in the configuration schema for backwards compatibility but is ignored by DICOM Printer 2.**

The launcher port number is automatically determined at runtime:
- **Local jobs:** Port is retrieved from the user's plugin launcher
- **Remote jobs:** Port 37275 is used

**You do not need to configure this element.** Any value specified will be ignored.

```xml
<!-- This element is ignored - do not use -->
<LauncherPortNumber>37275</LauncherPortNumber>
```

## Input and Output

`<Input>` and `<Output>` are **empty elements** with a required `tag` attribute. They define a strictly positional, line-oriented contract over the plugin's standard input and standard output — there are no key=value mappings.

### `<Input>` (Optional)

```xml
<Input tag="(0020,000D)"/>
```

Each `<Input>` declares one DICOM tag whose value is written to the plugin's **stdin**, one value per line, in declaration order. Order is significant: the first `<Input>` becomes the first stdin line, the second `<Input>` the second line, and so on. If a tag has no value, a blank line is still written so the positions stay aligned. (Tag values are never passed as command-line arguments — only on stdin.)

### `<Output>` (Optional)

```xml
<Output tag="(0020,000E)" type="Unique"/>
<Output tag="(0008,103E)" type="Global"/>
```

Each `<Output>` declares one DICOM tag whose value the engine reads from the plugin's **stdout**, line by line, in declaration order. Output is purely position-based — the engine does **not** parse `key=value` or `tag=value`; it reads bare values in the order the `<Output>` elements are declared.

Outputs are read **only when the plugin exits with code 0**. A trailing `\r` is stripped from each line, so CRLF output is safe.

#### `type` attribute

**Valid Values:** `Global`, `Unique`
**Default:** `Global`

- **`Global`** (default) — consumes exactly **one** stdout line and sets the value on the job-level dataset (applies to the whole job).
- **`Unique`** — consumes **one stdout line per image** (`NOFILES` lines; see [Environment Variables](#environment-variables)) and sets each value on the corresponding per-image dataset. If the plugin emits too few lines, the remaining tags are left unset.

An unrecognized `type` value logs a warning and is treated as `Global`.

## Console Plugins

Console plugins are command-line applications that run in the background without user interaction.

### Basic Console Plugin

```xml
<Run name="ProcessImage" type="Console">
  <Command>C:\Tools\ImageConverter.exe</Command>
  <Arguments>--input|#{InputFile}|--output|#{OutputFile}</Arguments>
</Run>
```

### Console Plugin with Placeholders

```xml
<Run name="CustomProcessor" type="Console">
  <Command>C:\Scripts\process.bat</Command>
  <Arguments>--patient|#{PatientID}|--study|#{StudyDate}|--file|#{InputFile}|--output|C:\Temp\processed_#{PatientID}.dcm</Arguments>
</Run>
```

### Console Plugin Example: PDF Conversion

```xml
<Run name="ConvertPDFToImage" type="Console">
  <Command>C:\Tools\pdftopng.exe</Command>
  <Arguments>-r|300|#{InputFile}|#{OutputPath}\image.png</Arguments>
</Run>
```

### Console Plugin Example: Custom Validation

```xml
<Run name="ValidateData" type="Console">
  <Command>C:\Scripts\validate.exe</Command>
  <Arguments>--patient-id|#{PatientID}|--patient-name|#{PatientName}|--check-database</Arguments>
</Run>
```

### Console Plugin Example: Long-Running Processing

```xml
<Run name="ComplexProcessing" type="Console">
  <Command>C:\Tools\HeavyProcessor.exe</Command>
  <Arguments>--input|#{InputFile}|--quality|high</Arguments>
  <Timeout>300000</Timeout>  <!-- 5 minutes for complex processing -->
</Run>
```

Use in workflow with timeout handling:
```xml
<Perform action="ComplexProcessing" onError="Hold"/>
```

If the processing exceeds 5 minutes, the job is held for retry.

## Interactive Plugins

Interactive plugins display a user interface for interactive processing.

### Basic Interactive Plugin

```xml
<Run name="ManualReview" type="Interactive">
  <Command>C:\Tools\ImageReview.exe</Command>
  <Arguments>--file|#{InputFile}</Arguments>
</Run>
```

### Interactive Plugin with Patient Context

```xml
<Run name="EditMetadata" type="Interactive">
  <Command>C:\Tools\MetadataEditor.exe</Command>
  <Arguments>--file|#{InputFile}|--patient|#{PatientID}|--name|#{PatientName}</Arguments>
</Run>
```

### Interactive Plugin Example: Manual Annotation

```xml
<Run name="AnnotateImage" type="Interactive">
  <Command>C:\Tools\Annotator.exe</Command>
  <Arguments>--image|#{InputFile}|--output|#{OutputPath}\annotated.dcm</Arguments>
</Run>
```

### Interactive Plugin Example: Remote Client Review

Display the review interface on the remote client's desktop:

```xml
<Run name="RemoteQCReview" type="Interactive" resolveHostNameAutomatically="true">
  <Command>C:\Tools\QualityControl.exe</Command>
  <Arguments>--file|#{InputFile}|--patient|#{PatientID}</Arguments>
  <Timeout>600000</Timeout>  <!-- 10 minutes for user interaction -->
</Run>
```

**Scenario:** A technician at workstation `TECH-PC-05` sends a print job. With `resolveHostNameAutomatically="true"`, the QC review window appears on `TECH-PC-05`, not on the server.

## Plugin Communication Protocol

Plugins can communicate with DICOM Printer 2 through:

### Exit Codes

The plugin's exit code determines the workflow outcome. Four codes have defined meaning:

- **0** (Ok) - Success; the plugin's `<Output>` values are read and continue processing.
- **-1** (Error) - The action fails and the plugin's stderr is logged as the error (workflow error handling applies based on the `onError` attribute).
- **-2** (Discard) - The job is discarded (removed). The action itself returns success, so `onError` is **not** triggered.
- **-3** (Suspend) - The job is suspended; the workflow resumes at this action later.

Any other non-zero code is treated as a failure (`-1`). `<Output>` values are read **only** on exit code `0` — Discard and Suspend short-circuit before output parsing.

### File-Based Input/Output

Plugins can read the input DICOM file and write a modified version:

```xml
<Run name="FileProcessor" type="Console">
  <Command>C:\Tools\processor.exe</Command>
  <Arguments>--in|#{InputFile}|--out|#{OutputFile}</Arguments>
</Run>
```

The workflow automatically uses the output file for subsequent actions.

### Environment Variables

DICOM Printer 2 sets the following environment variables for Console plugins:

- `CLIENT_HOST_NAME` - The host the job originated from
- `CLIENT_USER_NAME` - The user the job originated from
- `CONTENTS_FILE` - Absolute path to the job's contents file
- `NOFILES` - The number of image files in the job
- `ProgramData` - The all-users application data directory
- `FILE1`, `FILE2`, … `FILEn` - Absolute path to each image file (1-based; there are `NOFILES` of them)

### Example Using Environment Variables

```python
# Python plugin example
import os
import sys

count = int(os.environ.get('NOFILES', '0'))
first_image = os.environ.get('FILE1')

# Process each image file
for i in range(1, count + 1):
    path = os.environ.get(f'FILE{i}')
    # ... process path ...

# Exit with success
sys.exit(0)
```

## Workflow Integration

### Sequential Plugin Execution

```xml
<Workflow>
  <Perform action="ExtractText"/>
  <Perform action="ValidateData"/>
  <Perform action="ConvertImage"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

### Conditional Plugin Execution

```xml
<Workflow>
  <Perform action="AutoValidate" onError="Ignore"/>

  <!-- AutoValidate writes its verdict into a tag; branch on it with TAG_VALUE -->
  <If field="TAG_VALUE(0009,1001)" value="^FAIL$">
    <Statements>
      <!-- Run Interactive plugin for manual review -->
      <Perform action="ManualReview"/>
    </Statements>
  </If>

  <Perform action="SendToPACS"/>
</Workflow>
```

### Plugin Error Handling

```xml
<ActionsList>
  <!-- Mandatory processing - must succeed -->
  <Run name="RequiredProcessor" type="Console">
    <Command>C:\Tools\required.exe</Command>
    <Arguments>"#{InputFile}"</Arguments>
  </Run>

  <!-- Optional processing - failure ignored -->
  <Run name="OptionalProcessor" type="Console">
    <Command>C:\Tools\optional.exe</Command>
    <Arguments>"#{InputFile}"</Arguments>
  </Run>
</ActionsList>
```

## Common Use Cases

### Custom Image Processing

```xml
<Run name="EnhanceImage" type="Console">
  <Command>C:\Tools\ImageEnhancer.exe</Command>
  <Arguments>--input|#{InputFile}|--output|#{OutputPath}\enhanced.dcm|--brightness|10|--contrast|20</Arguments>
</Run>
```

### Database Integration

```xml
<Run name="UpdateDatabase" type="Console">
  <Command>C:\Scripts\UpdateDB.exe</Command>
  <Arguments>--patient-id|#{PatientID}|--study-date|#{StudyDate}|--accession|#{AccessionNumber}|--action|insert_study</Arguments>
</Run>
```

### OCR Processing

```xml
<Run name="ExtractText" type="Console">
  <Command>C:\Tools\ocr.exe</Command>
  <Arguments>--input|#{InputFile}|--output|#{OutputPath}\text.txt|--language|eng</Arguments>
</Run>
```

### Quality Control Review

```xml
<Run name="QCReview" type="Interactive">
  <Command>C:\Tools\QCReviewer.exe</Command>
  <Arguments>--file|#{InputFile}|--patient|#{PatientID}|--require-approval</Arguments>
</Run>
```

## Security Considerations

When using Run actions:

1. **Validate plugin executables** - Ensure plugins are from trusted sources
2. **Use full paths** - Always specify complete paths to executables
3. **Sanitize input** - Be cautious with placeholders in arguments
4. **Limit permissions** - Run DICOM Printer 2 service with minimum required privileges
5. **Test plugins** - Thoroughly test plugins before production use

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinterConfig SYSTEM "config.dtd">
<DicomPrinterConfig>
  <ActionsList>
    <!-- Parse patient ID -->
    <ParseJobFileName name="GetPatientID">
      <DcmTag tag="0010,0020">(\d+)_.*\.pdf</DcmTag>
    </ParseJobFileName>

    <!-- Query worklist -->
    <Query name="FindPatient" type="Worklist">
      <ConnectionParameters>
        <PeerAeTitle>RIS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Custom PDF processing -->
    <Run name="ProcessPDF" type="Console">
      <Command>C:\Tools\PDFProcessor.exe</Command>
      <Arguments>--input|#{InputFile}|--output|C:\Temp\processed_#{PatientID}.dcm|--patient-id|#{PatientID}|--enhance</Arguments>
    </Run>

    <!-- Manual quality review if query fails -->
    <Run name="ManualReview" type="Interactive">
      <Command>C:\Tools\ReviewApp.exe</Command>
      <Arguments>--file|#{InputFile}|--patient|#{PatientID}</Arguments>
    </Run>

    <!-- Update external database -->
    <Run name="LogToDatabase" type="Console">
      <Command>C:\Scripts\LogStudy.exe</Command>
      <Arguments>--patient|#{PatientID}|--date|#{Date}|--status|processed</Arguments>
    </Run>

    <!-- Store to PACS -->
    <Store name="SendToPACS">
      <ConnectionParameters>
        <PeerAeTitle>PACS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.100</Host>
        <Port>104</Port>
      </ConnectionParameters>
    </Store>
  </ActionsList>

  <Workflow>
    <Perform action="GetPatientID"/>
    <Perform action="FindPatient"/>

    <If field="QUERY_FOUND" value="1">
      <Statements>
        <!-- Automated path -->
        <Perform action="ProcessPDF"/>
        <Perform action="LogToDatabase"/>
        <Perform action="SendToPACS"/>
      </Statements>
    </If>

    <If field="QUERY_FOUND" value="0">
      <Statements>
        <!-- Manual review path -->
        <Perform action="ManualReview"/>
        <Perform action="SendToPACS"/>
      </Statements>
    </If>
  </Workflow>
</DicomPrinterConfig>
```

## Related Topics

- [Actions Overview](index.md)
- [Workflow Control Nodes](../workflow/control-nodes.md)
- [Placeholders](../placeholders.md)
