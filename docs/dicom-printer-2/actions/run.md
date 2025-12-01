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
  <Arguments>command_arguments</Arguments>
  <Input>input_mapping</Input>
  <Output>output_mapping</Output>
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

```xml
<Arguments>--input "#{InputFile}" --patient-id "#{PatientID}"</Arguments>
```

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

### `<Input>` (Optional)
Specifies how input data is passed to the plugin.

### `<Output>` (Optional)
Specifies how output data is received from the plugin.

## Console Plugins

Console plugins are command-line applications that run in the background without user interaction.

### Basic Console Plugin

```xml
<Run name="ProcessImage" type="Console">
  <Command>C:\Tools\ImageConverter.exe</Command>
  <Arguments>--input "#{InputFile}" --output "#{OutputFile}"</Arguments>
</Run>
```

### Console Plugin with Placeholders

```xml
<Run name="CustomProcessor" type="Console">
  <Command>C:\Scripts\process.bat</Command>
  <Arguments>
    --patient "#{PatientID}"
    --study "#{StudyDate}"
    --file "#{InputFile}"
    --output "C:\Temp\processed_#{PatientID}.dcm"
  </Arguments>
</Run>
```

### Console Plugin Example: PDF Conversion

```xml
<Run name="ConvertPDFToImage" type="Console">
  <Command>C:\Tools\pdftopng.exe</Command>
  <Arguments>-r 300 "#{InputFile}" "#{OutputPath}\image.png"</Arguments>
</Run>
```

### Console Plugin Example: Custom Validation

```xml
<Run name="ValidateData" type="Console">
  <Command>C:\Scripts\validate.exe</Command>
  <Arguments>
    --patient-id "#{PatientID}"
    --patient-name "#{PatientName}"
    --check-database
  </Arguments>
</Run>
```

### Console Plugin Example: Long-Running Processing

```xml
<Run name="ComplexProcessing" type="Console">
  <Command>C:\Tools\HeavyProcessor.exe</Command>
  <Arguments>--input "#{InputFile}" --quality high</Arguments>
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
  <Arguments>--file "#{InputFile}"</Arguments>
</Run>
```

### Interactive Plugin with Patient Context

```xml
<Run name="EditMetadata" type="Interactive">
  <Command>C:\Tools\MetadataEditor.exe</Command>
  <Arguments>
    --file "#{InputFile}"
    --patient "#{PatientID}"
    --name "#{PatientName}"
  </Arguments>
</Run>
```

### Interactive Plugin Example: Manual Annotation

```xml
<Run name="AnnotateImage" type="Interactive">
  <Command>C:\Tools\Annotator.exe</Command>
  <Arguments>--image "#{InputFile}" --output "#{OutputPath}\annotated.dcm"</Arguments>
</Run>
```

### Interactive Plugin Example: Remote Client Review

Display the review interface on the remote client's desktop:

```xml
<Run name="RemoteQCReview" type="Interactive" resolveHostNameAutomatically="true">
  <Command>C:\Tools\QualityControl.exe</Command>
  <Arguments>--file "#{InputFile}" --patient "#{PatientID}"</Arguments>
  <Timeout>600000</Timeout>  <!-- 10 minutes for user interaction -->
</Run>
```

**Scenario:** A technician at workstation `TECH-PC-05` sends a print job. With `resolveHostNameAutomatically="true"`, the QC review window appears on `TECH-PC-05`, not on the server.

## Plugin Communication Protocol

Plugins can communicate with DICOM Printer 2 through:

### Exit Codes

The plugin's exit code determines the workflow outcome:

- **0** - Success, continue processing
- **Non-zero** - Failure, trigger error handling based on `onError` attribute

### File-Based Input/Output

Plugins can read the input DICOM file and write a modified version:

```xml
<Run name="FileProcessor" type="Console">
  <Command>C:\Tools\processor.exe</Command>
  <Arguments>--in "#{InputFile}" --out "#{OutputFile}"</Arguments>
</Run>
```

The workflow automatically uses the output file for subsequent actions.

### Environment Variables

DICOM Printer 2 provides environment variables to plugins:

- `DP2_PATIENT_ID` - Patient ID (0010,0020)
- `DP2_PATIENT_NAME` - Patient Name (0010,0010)
- `DP2_STUDY_DATE` - Study Date (0008,0020)
- `DP2_INPUT_FILE` - Path to input DICOM file
- `DP2_WORK_DIR` - Working directory for temporary files

### Example Using Environment Variables

```python
# Python plugin example
import os
import sys

patient_id = os.environ.get('DP2_PATIENT_ID')
input_file = os.environ.get('DP2_INPUT_FILE')

# Process the file
# ...

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
  <Perform action="AutoValidate"/>

  <If field="VALIDATION_FAILED" value="true">
    <!-- Run Interactive plugin for manual review -->
    <Perform action="ManualReview"/>
  </If>

  <Perform action="SendToPACS"/>
</Workflow>
```

### Plugin Error Handling

```xml
<Actions>
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
</Actions>
```

## Common Use Cases

### Custom Image Processing

```xml
<Run name="EnhanceImage" type="Console">
  <Command>C:\Tools\ImageEnhancer.exe</Command>
  <Arguments>
    --input "#{InputFile}"
    --output "#{OutputPath}\enhanced.dcm"
    --brightness 10
    --contrast 20
  </Arguments>
</Run>
```

### Database Integration

```xml
<Run name="UpdateDatabase" type="Console">
  <Command>C:\Scripts\UpdateDB.exe</Command>
  <Arguments>
    --patient-id "#{PatientID}"
    --study-date "#{StudyDate}"
    --accession "#{AccessionNumber}"
    --action "insert_study"
  </Arguments>
</Run>
```

### OCR Processing

```xml
<Run name="ExtractText" type="Console">
  <Command>C:\Tools\ocr.exe</Command>
  <Arguments>
    --input "#{InputFile}"
    --output "#{OutputPath}\text.txt"
    --language eng
  </Arguments>
</Run>
```

### Quality Control Review

```xml
<Run name="QCReview" type="Interactive">
  <Command>C:\Tools\QCReviewer.exe</Command>
  <Arguments>
    --file "#{InputFile}"
    --patient "#{PatientID}"
    --require-approval
  </Arguments>
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
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <!-- Parse patient ID -->
    <ParseJobFileName name="GetPatientID">
      <Pattern>(\d+)_.*\.pdf</Pattern>
      <DcmTag tag="0010,0020" group="1"/>
    </ParseJobFileName>

    <!-- Query worklist -->
    <Query name="FindPatient" type="Worklist">
      <ConnectionParameters>
        <PeerAETitle>RIS</PeerAETitle>
        <MyAETitle>PRINTER</MyAETitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Custom PDF processing -->
    <Run name="ProcessPDF" type="Console">
      <Command>C:\Tools\PDFProcessor.exe</Command>
      <Arguments>
        --input "#{InputFile}"
        --output "C:\Temp\processed_#{PatientID}.dcm"
        --patient-id "#{PatientID}"
        --enhance
      </Arguments>
    </Run>

    <!-- Manual quality review if query fails -->
    <Run name="ManualReview" type="Interactive">
      <Command>C:\Tools\ReviewApp.exe</Command>
      <Arguments>--file "#{InputFile}" --patient "#{PatientID}"</Arguments>
    </Run>

    <!-- Update external database -->
    <Run name="LogToDatabase" type="Console">
      <Command>C:\Scripts\LogStudy.exe</Command>
      <Arguments>
        --patient "#{PatientID}"
        --date "#{Date}"
        --status "processed"
      </Arguments>
    </Run>

    <!-- Store to PACS -->
    <Store name="SendToPACS">
      <ConnectionParameters>
        <PeerAETitle>PACS</PeerAETitle>
        <MyAETitle>PRINTER</MyAETitle>
        <Host>192.168.1.100</Host>
        <Port>104</Port>
      </ConnectionParameters>
    </Store>
  </Actions>

  <Workflow>
    <Perform action="GetPatientID"/>
    <Perform action="FindPatient"/>

    <If field="QUERY_FOUND" value="true">
      <!-- Automated path -->
      <Perform action="ProcessPDF"/>
      <Perform action="LogToDatabase"/>
      <Perform action="SendToPACS"/>
    </If>

    <If field="QUERY_FOUND" value="false">
      <!-- Manual review path -->
      <Perform action="ManualReview"/>
      <Perform action="SendToPACS"/>
    </If>
  </Workflow>
</DicomPrinter>
```

## Related Topics

- [Actions Overview](index.md)
- [Workflow Control Nodes](../workflow/control-nodes.md)
- [Placeholders](../placeholders.md)
