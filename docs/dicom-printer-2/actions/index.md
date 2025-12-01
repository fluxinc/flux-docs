# Actions

Actions are the fundamental processing units in DICOM Printer 2. Each action performs a specific operation on a print job or DICOM file as it moves through the workflow.

## What Are Actions?

Actions define the processing steps applied to each job. Common action types include:
- Querying DICOM servers for patient data
- Storing DICOM files to remote PACS systems
- Printing to DICOM film printers
- Manipulating DICOM tags
- Saving files to local directories
- Transforming images

Actions are defined in the `<Actions>` section of the configuration file and referenced by name in the `<Workflow>` section.

## Action Types

DICOM Printer 2 supports the following action types:

### Communication Actions

- **[Query](query.md)** - Query DICOM worklists or studies for patient data and metadata
- **[Store](store.md)** - Send DICOM objects to remote PACS or storage systems using C-STORE
- **[Print](print.md)** - Send images to DICOM film printers using DICOM Basic Grayscale Print

### Data Manipulation Actions

- **[Parse](parse.md)** - Extract data from filenames or text files using regular expressions
- **[SetTag](settag.md)** - Add, modify, or delete DICOM tags and attributes
- **[Save](save.md)** - Save DICOM files to local directories with custom naming

### Image Processing Actions

- **[Image Manipulation](image-manipulation.md)** - Trim, rotate, resize images, or add instances

### Integration Actions

- **[Run (Plugins)](run.md)** - Execute external console or GUI applications as part of the workflow
- **[Notify](notify.md)** - Send notifications to external systems

## Common Action Attributes

All actions support this common attribute:

### `name` (Required)

The unique identifier for the action. This name is used to reference the action in workflow nodes.

```xml
<Query name="FindPatient" ...>
<Store name="SendToPACS" ...>
<SetTag name="AddMetadata">
```

## Error Handling (Workflow Level)

Error handling is configured on `<Perform>` workflow nodes, **not on action definitions**. This allows the same action to be reused with different error handling strategies in different parts of the workflow.

### `onError` Attribute (Optional, Perform node only)

Specifies the action to take when the performed action fails.

**Type:** Enum
**Valid Values:** `Hold`, `Suspend`, `Ignore`, `Discard`
**Default:** `Hold`

```xml
<Workflow>
  <Perform action="SendToPACS" onError="Hold"/>
  <Perform action="SendAlert" onError="Ignore"/>
</Workflow>
```

**Error Handling Modes:**

#### `Hold`
- The job is held in a suspended state
- The job will be retried after `SuspensionTime` minutes (configured in General section)
- The job remains in the queue until it succeeds or is manually discarded
- Use for temporary failures (network outages, PACS downtime)

```xml
<Perform action="SendToPACS" onError="Hold"/>
```

#### `Suspend`
- The job is suspended indefinitely
- The job will not be automatically retried
- Manual intervention is required to resume the job
- Use for failures requiring human review

```xml
<Perform action="FindPatient" onError="Suspend"/>
```

#### `Ignore`
- The failure is logged but ignored
- Processing continues to the next workflow step
- Use for non-critical optional operations

```xml
<Perform action="SendAlert" onError="Ignore"/>
```

#### `Discard`
- The job is immediately discarded
- No retry is attempted
- The job is removed from the queue
- Use when failures are unrecoverable

```xml
<Perform action="ExtractData" onError="Discard"/>
```

## Action Configuration

Actions are defined in the `<Actions>` section of `config.xml`:

```xml
<DicomPrinter>
  <Actions>
    <Query name="FindPatient" type="Worklist" ...>
      <!-- Query configuration -->
    </Query>

    <Store name="SendToPACS" ...>
      <!-- Store configuration -->
    </Store>

    <SetTag name="AddMetadata">
      <!-- SetTag configuration -->
    </SetTag>
  </Actions>
</DicomPrinter>
```

## Using Actions in Workflows

Actions are executed through workflow nodes, primarily using the `<Perform>` node:

```xml
<Workflow>
  <Perform action="FindPatient"/>
  <If field="QUERY_FOUND" value="true">
    <Perform action="AddMetadata"/>
    <Perform action="SendToPACS"/>
  </If>
</Workflow>
```

See [Workflow Reference](../workflow/index.md) for complete workflow documentation.

## Action Execution Order

Actions are executed in the order specified in the workflow, not the order they appear in the `<Actions>` section.

The `<Actions>` section is a declaration area where all available actions are defined. The `<Workflow>` section determines the execution order and conditional logic.

## Example Configuration

Complete example showing multiple actions:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <!-- Query worklist for patient data -->
    <Query name="FindPatient" type="Worklist"
           calledAE="RIS" callingAE="PRINTER" host="192.168.1.200" port="104">
      <DcmTag tag="0040,0100">
        <DcmSequence>
          <DcmTag tag="0040,0002">#{Date}</DcmTag>
          <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
        </DcmSequence>
      </DcmTag>
    </Query>

    <!-- Add metadata tags -->
    <SetTag name="AddMetadata">
      <DcmTag tag="0008,0020">#{Date}</DcmTag>
      <DcmTag tag="0008,0080" value="Medical Center"/>
    </SetTag>

    <!-- Send to PACS -->
    <Store name="SendToPACS"
           calledAE="PACS" callingAE="PRINTER" host="192.168.1.100" port="104"
           compression="JPEG_Lossless"/>
  </Actions>

  <Workflow>
    <!-- Configure error handling at workflow level -->
    <Perform action="FindPatient" onError="Hold"/>
    <If field="QUERY_FOUND" value="true">
      <Perform action="AddMetadata"/>
      <Perform action="SendToPACS" onError="Hold"/>
    </If>
  </Workflow>
</DicomPrinter>
```

## Related Topics

- [Workflow Reference](../workflow/index.md)
- [Placeholders](../placeholders.md)
- [Configuration Overview](../configuration.md)
