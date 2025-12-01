# Drop Monitor Service

The Drop Monitor is an optional service component that monitors specified directories for files and automatically processes them through the DICOM Printer 2 workflow.

## What is the Drop Monitor?

The Drop Monitor service watches one or more directories on the file system. When files are added to these directories, the Drop Monitor automatically:
1. Detects the new file
2. Optionally converts PDF files to PNG images
3. Queues the file for processing by DICOM Printer 2
4. Applies the configured workflow

This enables integration with:
- Document management systems
- Electronic medical records (EMR) systems
- File-based interfaces
- Automated workflows
- Batch processing systems

## Installation

The Drop Monitor is installed as an optional component during DICOM Printer 2 installation. If not installed initially, run the installer again and select the Drop Monitor component.

### Service Information

- **Service Name:** `DicomPrinter2DropMonitor`
- **Display Name:** DICOM Printer 2 Drop Monitor
- **Startup Type:** Automatic (when installed)
- **Dependencies:** None (independent of main DICOM Printer 2 service)

## Configuration

The Drop Monitor is configured in the main `config.xml` file using the `<DropMonitor>` element.

### Basic Configuration

```xml
<DicomPrinter>
  <General>
    <!-- General settings -->
  </General>

  <DropMonitor>
    <Path>C:\DropFolder</Path>
  </DropMonitor>

  <Actions>
    <!-- Actions -->
  </Actions>

  <Workflow>
    <!-- Workflow -->
  </Workflow>
</DicomPrinter>
```

### Configuration Elements

#### `<Path>` (Required)
The directory path to monitor for new files.

```xml
<DropMonitor>
  <Path>C:\DropFolder</Path>
</DropMonitor>
```

The Drop Monitor watches this directory for:
- New files created
- Files moved or copied into the directory

#### `<ConvertToPNG>` (Optional)
Convert PDF files to PNG images before processing.

**Type:** Boolean (`true` or `false`)
**Default:** `false`

```xml
<DropMonitor>
  <Path>C:\DropFolder</Path>
  <ConvertToPNG>true</ConvertToPNG>
</DropMonitor>
```

When enabled:
- PDF files are automatically converted to PNG format
- Each PDF page becomes a separate PNG image
- PNG images are then processed as normal image files
- Original PDF files are retained

#### `<PathSeparator>` (Optional)
The character used to separate subdirectory paths in filenames.

**Type:** String (single character)
**Default:** `\` (backslash)

```xml
<DropMonitor>
  <Path>C:\DropFolder</Path>
  <PathSeparator>_</PathSeparator>
</DropMonitor>
```

This setting allows subdirectory information to be encoded in flat filenames.

## Subdirectory Support

The Drop Monitor can monitor subdirectories within the main watch path.

### Nested Directory Monitoring

```xml
<DropMonitor>
  <Path>C:\DropFolder</Path>
</DropMonitor>
```

With this configuration, files in subdirectories are also processed:
```
C:\DropFolder\
  ├── file1.pdf         (processed)
  ├── urgent\
  │   └── file2.pdf     (processed)
  └── routine\
      └── file3.pdf     (processed)
```

### Subdirectory Information in Workflow

The subdirectory path can be accessed in the workflow for routing:

```xml
<If field="PRINTED_FILE_NAME" value="urgent">
  <!-- File from urgent\ subdirectory -->
  <Perform action="HighPriorityProcessing"/>
</If>

<If field="PRINTED_FILE_NAME" value="routine">
  <!-- File from routine\ subdirectory -->
  <Perform action="StandardProcessing"/>
</If>
```

## Supported File Types

The Drop Monitor processes:
- **PDF files** - Encapsulated PDF or converted to PNG (if `ConvertToPNG` enabled)
- **Image files** - JPEG, PNG, BMP, TIFF
- **Any file type** that DICOM Printer 2 can process

## File Processing Flow

1. **File Detection** - Drop Monitor detects new file in watched directory
2. **File Lock Wait** - Waits for file to be fully written (no longer locked)
3. **Optional Conversion** - Converts PDF to PNG if configured
4. **Queue** - Places file in DICOM Printer 2 processing queue
5. **Workflow Execution** - File is processed through the configured workflow
6. **Completion** - File moves to appropriate location based on workflow outcome

## Configuration Examples

### Basic Drop Folder

```xml
<DropMonitor>
  <Path>C:\DICOM\Drop</Path>
</DropMonitor>
```

### PDF Conversion Enabled

```xml
<DropMonitor>
  <Path>C:\Documents\Medical</Path>
  <ConvertToPNG>true</ConvertToPNG>
</DropMonitor>
```

### Multiple Priority Levels

Use subdirectories for different priority levels:

```xml
<DropMonitor>
  <Path>C:\DICOM\Drop</Path>
</DropMonitor>
```

Directory structure:
```
C:\DICOM\Drop\
  ├── stat\         (STAT priority)
  ├── urgent\       (Urgent priority)
  └── routine\      (Routine priority)
```

Workflow:
```xml
<Workflow>
  <If field="PRINTED_FILE_NAME" value="stat">
    <Perform action="StatProcessing"/>
    <Perform action="NotifyStatJob"/>
  </If>

  <If field="PRINTED_FILE_NAME" value="urgent">
    <Perform action="UrgentProcessing"/>
  </If>

  <If field="PRINTED_FILE_NAME" value="routine">
    <Perform action="RoutineProcessing"/>
  </If>
</Workflow>
```

### Department-Based Routing

```xml
<DropMonitor>
  <Path>C:\Medical\Documents</Path>
  <ConvertToPNG>true</ConvertToPNG>
</DropMonitor>
```

Directory structure:
```
C:\Medical\Documents\
  ├── radiology\
  ├── cardiology\
  └── oncology\
```

Workflow routes based on subdirectory:
```xml
<Workflow>
  <Perform action="ParseFilename"/>

  <Switch field="PRINTED_FILE_NAME">
    <Case value="radiology">
      <Perform action="SendToRadiologyPACS"/>
    </Case>
    <Case value="cardiology">
      <Perform action="SendToCardiologyPACS"/>
    </Case>
    <Case value="oncology">
      <Perform action="SendToOncologyPACS"/>
    </Case>
  </Switch>
</Workflow>
```

## Integration Scenarios

### EMR System Integration

EMR exports documents to drop folder:

```xml
<DropMonitor>
  <Path>\\EMRServer\Export\DICOM</Path>
  <ConvertToPNG>true</ConvertToPNG>
</DropMonitor>
```

Workflow:
```xml
<Workflow>
  <!-- Extract patient ID from filename -->
  <Perform action="ParseFilename"/>

  <!-- Query worklist for patient data -->
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="true">
    <!-- Send to PACS with patient demographics -->
    <Perform action="SetMetadata"/>
    <Perform action="SendToPACS"/>
  </If>
</Workflow>
```

### Scanning Station Integration

Scanner saves to network share monitored by Drop Monitor:

```xml
<DropMonitor>
  <Path>\\ScanStation\Output</Path>
  <ConvertToPNG>false</ConvertToPNG>
</DropMonitor>
```

### Batch Document Processing

Bulk document processing:

```xml
<DropMonitor>
  <Path>C:\Batch\Input</Path>
  <ConvertToPNG>true</ConvertToPNG>
</DropMonitor>
```

Copy files in batch to the drop folder for automated processing.

## Service Management

### Starting the Service

Using Windows Services:
```
services.msc → DICOM Printer 2 Drop Monitor → Start
```

Using command line:
```cmd
net start DicomPrinter2DropMonitor
```

### Stopping the Service

Using Windows Services:
```
services.msc → DICOM Printer 2 Drop Monitor → Stop
```

Using command line:
```cmd
net stop DicomPrinter2DropMonitor
```

### Service Status

Check if the service is running:
```cmd
sc query DicomPrinter2DropMonitor
```

## Logging

The Drop Monitor writes to the same log file as the main service:
`%ProgramData%\Flux Inc\DICOM Printer 2\log\dicom_printer_service.log`

Log messages include:
- Directory monitoring status
- Files detected
- PDF conversion operations
- Errors and warnings

## Troubleshooting

### Files Not Being Detected

**Possible causes:**
- Drop Monitor service not running
- Incorrect path in configuration
- File permissions prevent access
- Files still being written (locked)

**Solutions:**
- Verify service is running
- Check configuration path
- Ensure service account has read permissions
- Wait for file write to complete

### PDF Conversion Failures

**Possible causes:**
- Corrupted PDF files
- Unsupported PDF features
- Insufficient disk space

**Solutions:**
- Verify PDF file integrity
- Check available disk space
- Review log files for specific errors

### Network Path Access Issues

**Possible causes:**
- Service account lacks network permissions
- Network share not accessible
- Authentication failures

**Solutions:**
- Configure service to run with account that has network access
- Verify network path is accessible
- Check credentials and permissions

## Best Practices

1. **Use dedicated drop folders** - Don't monitor system or application directories
2. **Implement subdirectories** - Use subdirectories for organization and routing
3. **Monitor disk space** - Ensure adequate space for queued files
4. **Set appropriate permissions** - Limit write access to authorized systems only
5. **Test with sample files** - Verify configuration before production use
6. **Monitor logs** - Regularly check logs for errors or issues
7. **Plan for errors** - Implement workflow error handling for failed processing

## Related Topics

- [Installation](installation.md)
- [Configuration](configuration.md)
- [Workflow](workflow/index.md)
- [Starting and Stopping the Service](starting-and-stopping.md)
- [Logging](logs.md)
