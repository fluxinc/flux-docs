# Configuration

DICOM Printer 2 is configured through an XML file named `config.xml` located in the `config/` subdirectory of the base installation path.

## Configuration File Location

**Default Path:** `%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml`

If using a custom base directory (via `--path`), the configuration file will be at:
```
<base-path>\config\config.xml
```

## Configuration Structure

The `config.xml` file contains three main sections:

### 1. General Settings

General settings control the overall behavior of the DICOM Printer 2 service, including:
- Job checking intervals
- Suspension time for failed jobs
- Logging verbosity and rotation
- License registration

See [Settings Reference](config.md) for a complete list of general settings.

### 2. Actions

Actions define the processing steps that are applied to each print job or file. DICOM Printer 2 supports multiple action types:

- **[Query](actions/query.md)** - Query DICOM worklists or studies for patient data
- **[Store](actions/store.md)** - Send DICOM objects to remote PACS or storage systems
- **[Print](actions/print.md)** - Send images to DICOM film printers
- **[Parse](actions/parse.md)** - Extract data from filenames or text files
- **[SetTag](actions/settag.md)** - Add, modify, or delete DICOM tags
- **[Save](actions/save.md)** - Save DICOM files to local directories
- **[Image Manipulation](actions/image-manipulation.md)** - Trim, rotate, or resize images
- **[Run (Plugins)](actions/run.md)** - Execute external console or GUI applications
- **[Notify](actions/notify.md)** - Send notifications

See [Actions Reference](actions/index.md) for detailed information about each action type.

### 3. Workflow

The workflow section defines the sequence and conditional logic for executing actions. Workflows support:

- Sequential execution of actions
- [Conditional branching](workflow/conditional-nodes.md) based on data values
- [Control flow](workflow/control-nodes.md) with suspend, discard, and resume operations

See [Workflow Reference](workflow/index.md) for workflow configuration details.

## Configuration Example

Here's a basic configuration structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <General>
    <CheckingInterval>1000</CheckingInterval>
    <SuspensionTime>15</SuspensionTime>
    <Verbosity>35</Verbosity>
  </General>

  <Actions>
    <Query name="FindPatient">
      <!-- Query configuration -->
    </Query>
    <Store name="SendToPACS">
      <!-- Store configuration -->
    </Store>
  </Actions>

  <Workflow>
    <Perform action="FindPatient"/>
    <If field="QUERY_FOUND" value="true">
      <Perform action="SendToPACS"/>
    </If>
  </Workflow>
</DicomPrinter>
```

## XML Validation

The configuration file must conform to the `config.dtd` Document Type Definition. The DTD is located in the installation directory and defines:
- Valid elements and attributes
- Required and optional elements
- Element nesting rules
- Attribute data types

Invalid configuration files will cause the service to fail to start. Check the log files for detailed validation errors.

## Editing Configuration

**Important:** Stop the DICOM Printer 2 service before editing the configuration file.

1. Stop the service (see [Starting and Stopping the Service](starting-and-stopping.md))
2. Edit `config.xml` with a text editor
3. Validate the XML structure
4. Start the service
5. Check the logs for any configuration errors

The service will log an error and fail to start if the configuration file contains XML syntax errors or DTD validation failures.

## Tag Placeholders

Throughout the configuration, you can use tag placeholders to reference DICOM tag values dynamically:

- `#{GGGG,EEEE}` - Tag value by group/element numbers
- `#{PatientName}` - Tag value by tag name
- `#{Date}` - Current date
- `#{Date,offset}` - Date with offset
- `#{Date,offset,range}` - Date with offset and range

See [Placeholders](placeholders.md) for complete placeholder syntax and examples.

## Related Topics

- [Settings Reference](config.md) - Complete list of general settings
- [Actions Reference](actions/index.md) - All available actions
- [Workflow Reference](workflow/index.md) - Workflow configuration
- [Placeholders](placeholders.md) - Tag placeholder syntax
