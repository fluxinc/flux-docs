# Save Actions

Save actions write the job's images to a local directory, either as a DICOM File Set or as a verbatim copy of the raw captured job.

## Basic Syntax

```xml
<Save name="ActionName">
  <Directory>C:\Archive\DICOM</Directory>
  <Filename>image.dcm</Filename>
  <Format>dxi</Format>
</Save>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

## Elements

### `<Directory>`
The directory where files are written.

```xml
<Directory>C:\Archive\DICOM</Directory>
```

Use a static directory path. DP2 can create this directory for the default DICOM File Set format; for `dxi`, the target directory must already exist.

### `<Filename>` (Optional)
The base name pattern for saved files. The engine always appends an auto-incrementing index (see [Automatic numbering](#automatic-numbering)), so the filename does not need to be unique on its own.

```xml
<Filename>image.dcm</Filename>
```

If `<Filename>` is omitted, the base defaults to `DP` — producing files like `DP_000001`.

### `<Format>` (Optional)
The output format. Matched case-insensitively; the only special value is `dxi`. Any other value — or omitting `<Format>` — produces the default DICOM File Set.

```xml
<Format>dxi</Format>
```

- **DICOM File Set (default)** — Writes Secondary Capture `.dcm` files into the target directory together with a generated `DICOMDIR` index (FileSet ID `DICOM_PRINTER_2`). This is the behavior for an absent `<Format>` or any value that is not `dxi`.
- **DXI (raw job archive)** — Copies the original captured `.dxi` job file and all of its companion files (page images, PDF, text) into the target directory verbatim, with no DICOM conversion.

## Placeholders in Names

`<Filename>` is passed through the same placeholder engine used elsewhere, but with one important rule:

- A **tag placeholder** (`#{PatientID}`, `#{0010,0020}`) is substituted **only when it is the entire filename value**. A placeholder mixed with other text or an extension (e.g. `#{PatientID}.dcm` or `#{PatientID}_#{StudyDate}.dcm`) is **not** expanded and is written literally.
- The **date placeholder** `#{Date[,offset[,range]]}` is the exception: it *is* substituted even when embedded in a larger string.

Because the engine already guarantees unique names via the auto-index, the simplest reliable filename patterns are a static base name or a single whole-value placeholder:

```xml
<!-- Static base — becomes image_000001.dcm, image_000002.dcm, ... -->
<Filename>image.dcm</Filename>

<!-- Single whole-value tag placeholder - becomes 987654_000001 (no extension) -->
<Filename>#{AccessionNumber}</Filename>

<!-- Embedded date is fine - becomes scan_20240315_000001.dcm -->
<Filename>scan_#{Date}.dcm</Filename>
```

Do not use tag placeholders to build dynamic directory trees. Keep `<Directory>` static:

```xml
<Save name="SaveToArchive">
  <Directory>C:\Archive</Directory>
  <Filename>image.dcm</Filename>
</Save>
```

> Combining several tag placeholders, or a tag placeholder plus text, in a single `<Filename>` does **not** build a dynamic filename. Directory placeholders are not a supported way to build dynamic folder trees.

### Invalid-Character Sanitization

After placeholder substitution, the following characters are replaced with an underscore (`_`), along with control characters:

```
< > : " / \ | ? *
```

So a resolved filename base of `Doe^John:2024` is written as `Doe^John_2024`.

### Automatic Numbering

`<Filename>` is a **base pattern**. The engine appends a sequential, zero-padded 6-digit index so every file a save action produces is unique — across the pages of a single job and across repeated saves to the same directory. Any extension in the pattern is preserved after the index:

- `image.dcm` → `image_000001.dcm`, `image_000002.dcm`, …
- `#{AccessionNumber}` (resolves to `987654`) → `987654_000001`
- omitted `<Filename>` → `DP_000001`, `DP_000002`, …

You do not need to add a counter such as `#{InstanceNumber}` to avoid overwriting files; the index guarantees uniqueness on its own.

## Format Options

### DICOM File Set (default)

```xml
<Save name="SaveDICOM">
  <Directory>E:\Archive</Directory>
  <Filename>image.dcm</Filename>
</Save>
```

Writes `.dcm` Secondary Capture files plus a `DICOMDIR` index into the directory. The directory is created automatically if it does not exist.

### DXI (Raw Job Archive)

```xml
<Save name="SaveDXI">
  <Directory>E:\Archive\Raw</Directory>
  <Format>dxi</Format>
</Save>
```

DXI copies the original captured `.dxi` job file and all of its companion files (page images, PDF, text) into the target directory verbatim, with no DICOM conversion. Use this to:

- Archive the raw print-capture job exactly as it was captured
- Retain the original page images, PDF, and text alongside the job file
- Reprocess or troubleshoot a job later from its native source

For the DXI format specifically:

- `<Filename>` is **ignored** — the files keep their original names.
- The target `<Directory>` must already exist; it is not created automatically.

## Multiple Save Actions

Save to more than one location in a single workflow:

```xml
<ActionsList>
  <!-- DICOM File Set to the primary archive -->
  <Save name="SaveToPrimary">
    <Directory>E:\Primary Archive</Directory>
    <Filename>image.dcm</Filename>
  </Save>

  <!-- DICOM File Set to a backup volume -->
  <Save name="SaveToBackup">
    <Directory>F:\Backup</Directory>
    <Filename>image.dcm</Filename>
  </Save>

  <!-- Raw captured job -->
  <Save name="SaveRaw">
    <Directory>E:\Archive\Raw</Directory>
    <Format>dxi</Format>
  </Save>
</ActionsList>

<Workflow>
  <Perform action="SaveToPrimary"/>
  <Perform action="SaveToBackup"/>
  <Perform action="SaveRaw"/>
</Workflow>
```

## Error Handling

Error handling is set with `onError` on the `<Perform>` node:

```xml
<!-- Mandatory save: hold the job on failure (files retained; not auto-retried) -->
<Perform action="MustSave" onError="Hold"/>

<!-- Optional save: log and continue on failure -->
<Perform action="OptionalBackup" onError="Ignore"/>
```

`Hold` retains the job for manual attention but does **not** re-run it automatically. To have a failed save retried automatically, use `onError="Suspend"`, which re-queues the job after `SuspensionTime`. See [Control Flow Nodes](../workflow/control-nodes.md).

## Workflow Integration

### Save After Successful Query

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <Perform action="SaveToVerified"/>
    </Statements>
  </If>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <Perform action="SaveToUnverified"/>
    </Statements>
  </If>
</Workflow>
```

### Save Before and After Processing

```xml
<Workflow>
  <Perform action="SaveOriginal"/>

  <Perform action="TrimImage"/>
  <Perform action="RotateImage"/>

  <Perform action="SaveProcessed"/>

  <Perform action="SendToPACS"/>
</Workflow>
```

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
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Set metadata (one tag per SetTag) -->
    <SetTag name="SetStudyDate" tag="0008,0020">#{Date}</SetTag>
    <SetTag name="SetInstitution" tag="0008,0080">Medical Center</SetTag>

    <!-- Save a DICOM File Set to the archive -->
    <Save name="SaveToArchive">
      <Directory>E:\DICOM Archive</Directory>
      <Filename>image.dcm</Filename>
    </Save>

    <!-- Archive the raw captured job -->
    <Save name="SaveRaw">
      <Directory>E:\Archive\Raw</Directory>
      <Format>dxi</Format>
    </Save>

    <!-- Store to PACS -->
    <Store name="SendToPACS">
      <ConnectionParameters>
        <PeerAeTitle>PACS</PeerAeTitle>
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
        <Perform action="SetStudyDate"/>
        <Perform action="SetInstitution"/>
        <Perform action="SaveToArchive"/>
        <Perform action="SaveRaw"/>
        <Perform action="SendToPACS"/>
      </Statements>
    </If>
  </Workflow>
</DicomPrinterConfig>
```

## Related Topics

- [Actions Overview](index.md)
- [Placeholders](../placeholders.md)
- [Store Actions](store.md)
- [SetTag Actions](settag.md)
