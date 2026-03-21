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
- **[ManualQuery](query.md#manual-query)** - Parks jobs in `queue/manual/` for manual worklist matching via the [Queue Dashboard](/dicom-printer-2/queue-dashboard)
- **[Store](store.md)** - Send DICOM objects to remote PACS or storage systems using C-STORE
- **[Print](print.md)** - Send images to DICOM film printers using DICOM Basic Grayscale Print

### Data Manipulation Actions

- **[Parse](parse.md)** - Extract data from filenames or text files using regular expressions
- **[SetTag](settag.md)** - Add, modify, or delete DICOM tags and attributes
- **[Save](save.md)** - Save DICOM files to local directories with custom naming

### Image Processing Actions

- **[Image Manipulation](image-manipulation.md)** - Trim, rotate, resize images
- **[AddInstance](image-manipulation.md#addinstance)** - Adds a new image instance to the job from an image file or blank canvas

### Integration Actions

- **[Run (Plugins)](run.md)** - Execute external console or GUI applications as part of the workflow
- **[Notify](notify.md)** - Send notifications to external systems

### Other Actions

- **PrefixDemo** - Prefixes "[DEMO] " to Series Description and Study Description tags. Used for evaluation/demo licensing mode. No configuration required.

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
- The job file remains on disk and workflow processing stops immediately
- The job is **not** automatically retried. It will only be re-processed if the service is restarted or if the file is manually "touched" (to update its creation time)
- Use for failures that require manual intervention or environment fixes before retrying

```xml
<Perform action="SendToPACS" onError="Hold"/>
```

#### `Suspend`
- The job is kept in memory and workflow processing stops at the failing action
- The job is automatically retried after `SuspensionTime` minutes (configured in the General section), resuming exactly from the action that failed
- Use for transient failures (e.g., temporary network glitches) where an automatic retry is appropriate

```xml
<Perform action="FindPatient" onError="Suspend"/>
```

#### `Ignore`
- The failure is logged but processing continues to the next workflow step
- Use for non-critical optional operations

```xml
<Perform action="SendAlert" onError="Ignore"/>
```

#### `Discard`
- The job is immediately removed from the queue with no retry
- Use when a failure is unrecoverable

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
    <Query name="FindPatient" type="Worklist">
      <ConnectionParameters>
        <PeerAETitle>RIS</PeerAETitle>
        <MyAETitle>PRINTER</MyAETitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="(0010,0020)">#{PatientID}</DcmTag>
    </Query>

    <!-- Set metadata tags -->
    <SetTag name="SetStudyDate" tag="(0008,0020)">#{Date}</SetTag>
    <SetTag name="SetInstitution" tag="(0008,0080)">Medical Center</SetTag>

    <!-- Send to PACS -->
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
    <Perform action="FindPatient" onError="Hold"/>
    <If field="QUERY_FOUND" value="true">
      <Perform action="SetStudyDate"/>
      <Perform action="SetInstitution"/>
      <Perform action="SendToPACS" onError="Hold"/>
    </If>
  </Workflow>
</DicomPrinter>
```

## Related Topics

- [Workflow Reference](../workflow/index.md)
- [Placeholders](../placeholders.md)
- [Configuration Overview](../configuration.md)
