# Save Actions

Save actions write DICOM files to local directories with customizable naming and organization.

## Basic Syntax

```xml
<Save name="ActionName">
  <Directory>path</Directory>
  <Filename>filename</Filename>
  <Format>dxi</Format>
</Save>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

## Elements

### `<Directory>` (Required)
The directory path where files will be saved. Supports placeholders for dynamic directory organization.

```xml
<Directory>C:\Archive\DICOM</Directory>
```

### `<Filename>` (Required)
The filename pattern for saved files. Supports placeholders for dynamic naming.

```xml
<Filename>#{PatientID}_#{SeriesNumber}_#{InstanceNumber}.dcm</Filename>
```

### `<Format>` (Optional)
The output format to use. The value is matched case-insensitively, and the only special value is `dxi`. Any other value — or omitting `<Format>` entirely — produces the default DICOM File Set.

**Default:** DICOM File Set (omit `<Format>`, or use any value other than `dxi`)

```xml
<Format>dxi</Format>
```

- **DICOM File Set (default)** - Writes Secondary Capture `.dcm` files into the target directory together with a generated `DICOMDIR` index file (FileSet ID `DICOM_PRINTER_2`). This is the behaviour for an absent `<Format>` or any value that is not `dxi`.
- **DXI** - Copies the original captured job file (`.dxi`) and all of its companion files (page images, PDF, text) into the target directory verbatim, with no DICOM conversion. Use this to archive the raw print-capture job rather than generating DICOM.

## Using Placeholders

Both directory and filename support tag placeholders for dynamic organization:

### Simple Directory Structure

```xml
<Save name="SaveToArchive">
  <Directory>E:\DICOM Archive</Directory>
  <Filename>image_#{InstanceNumber}.dcm</Filename>
</Save>
```

### Organized by Patient

```xml
<Save name="SaveByPatient">
  <Directory>E:\Archive\#{PatientID}</Directory>
  <Filename>#{StudyDate}_#{SeriesNumber}_#{InstanceNumber}.dcm</Filename>
</Save>
```

Results in structure:
```
E:\Archive\
  ├── 12345\
  │   ├── 20240315_1_1.dcm
  │   ├── 20240315_1_2.dcm
  │   └── 20240315_2_1.dcm
  └── 67890\
      └── 20240316_1_1.dcm
```

### Organized by Modality and Patient

```xml
<Save name="SaveByModalityPatient">
  <Directory>E:\Archive\#{Modality}\#{PatientID}\#{StudyDate}</Directory>
  <Filename>#{SeriesNumber}-#{InstanceNumber}.dcm</Filename>
</Save>
```

Results in structure:
```
E:\Archive\
  ├── CT\
  │   └── 12345\
  │       └── 20240315\
  │           ├── 1-1.dcm
  │           └── 1-2.dcm
  └── MR\
      └── 67890\
          └── 20240316\
              └── 1-1.dcm
```

### Organized by Date

```xml
<Save name="SaveByDate">
  <Directory>E:\Archive\#{StudyDate}\#{PatientID}</Directory>
  <Filename>#{StudyTime}_#{SeriesNumber}_#{InstanceNumber}.dcm</Filename>
</Save>
```

## Complete Filename Examples

### With Patient and Study Information

```xml
<Filename>#{PatientID}_#{PatientName}_#{StudyDate}_#{SeriesNumber}.dcm</Filename>
```

Example: `12345_Doe^John_20240315_1.dcm`

### With Accession Number

```xml
<Filename>ACC#{AccessionNumber}_#{InstanceNumber}.dcm</Filename>
```

Example: `ACC987654_1.dcm`

### With Study Instance UID

```xml
<Filename>#{StudyInstanceUID}.dcm</Filename>
```

Example: `1.2.840.113619.2.55.3.123456789.dcm`

### With Timestamp

```xml
<Filename>#{Date}_#{PatientID}.dcm</Filename>
```

Example: `20240315_12345.dcm`

## Format Options

### Standard DICOM Format

```xml
<Save name="SaveDICOM">
  <Directory>E:\Archive</Directory>
  <Filename>#{PatientID}.dcm</Filename>
  <Format>DICOM</Format>
</Save>
```

### DXI (Raw Job Archive) Format

```xml
<Save name="SaveDXI">
  <Directory>E:\Archive\Raw</Directory>
  <Filename>#{PatientID}</Filename>
  <Format>dxi</Format>
</Save>
```

DXI format copies the original captured `.dxi` job file and all of its companion files (page images, PDF, text) into the target directory verbatim, with no DICOM conversion. Use this to:
- Archive the raw print-capture job exactly as it was captured
- Retain the original page images, PDF, and text alongside the job file
- Reprocess or troubleshoot a job later from its native source

## Multiple Save Actions

Save to multiple locations with different organization:

```xml
<ActionsList>
  <!-- Save to primary archive -->
  <Save name="SaveToPrimary">
    <Directory>E:\Primary Archive\#{Modality}\#{PatientID}</Directory>
    <Filename>#{StudyDate}_#{SeriesNumber}_#{InstanceNumber}.dcm</Filename>
  </Save>

  <!-- Save to backup with simpler structure -->
  <Save name="SaveToBackup">
    <Directory>F:\Backup</Directory>
    <Filename>#{StudyInstanceUID}_#{InstanceNumber}.dcm</Filename>
  </Save>

  <!-- Archive the raw captured job -->
  <Save name="SaveRaw">
    <Directory>E:\Archive\Raw\#{Date}</Directory>
    <Filename>#{PatientID}</Filename>
    <Format>dxi</Format>
  </Save>
</ActionsList>

<Workflow>
  <Perform action="SaveToPrimary"/>
  <Perform action="SaveToBackup"/>
  <Perform action="SaveRaw"/>
</Workflow>
```

## Directory Creation

Directories are created automatically if they don't exist. The entire directory path is created, including intermediate directories.

```xml
<Save name="DeepStructure">
  <Directory>E:\Archive\#{Year}\#{Month}\#{Day}\#{Modality}\#{PatientID}</Directory>
  <Filename>image.dcm</Filename>
</Save>
```

This creates the full path automatically, e.g.:
```
E:\Archive\2024\03\15\CT\12345\image.dcm
```

## Error Handling

### Mandatory Save

```xml
<Save name="MustSave">
  <Directory>E:\Archive</Directory>
  <Filename>#{PatientID}.dcm</Filename>
</Save>

Use in workflow with error handling:
```xml
<Perform action="MustSave" onError="Hold"/>
```
```

If the save fails (e.g., disk full, permissions error), the job is held and retried.

### Optional Save

```xml
<Save name="OptionalBackup">
  <Directory>F:\Backup</Directory>
  <Filename>#{PatientID}.dcm</Filename>
</Save>

Use in workflow with error handling:
```xml
<Perform action="OptionalBackup" onError="Ignore"/>
```
```

If the save fails, the error is logged but processing continues.

## Workflow Integration

### Save After Successful Query

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <!-- Save to verified patients folder -->
      <Perform action="SaveToVerified"/>
    </Statements>
  </If>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <!-- Save to unverified folder for review -->
      <Perform action="SaveToUnverified"/>
    </Statements>
  </If>
</Workflow>
```

### Save Before and After Processing

```xml
<Workflow>
  <!-- Save original -->
  <Perform action="SaveOriginal"/>

  <!-- Process image -->
  <Perform action="TrimImage"/>
  <Perform action="RotateImage"/>

  <!-- Save processed version -->
  <Perform action="SaveProcessed"/>

  <!-- Send to PACS -->
  <Perform action="SendToPACS"/>
</Workflow>
```

## File Naming Best Practices

1. **Use unique identifiers** to prevent overwriting files
2. **Include timestamp or date** for temporal organization
3. **Avoid special characters** that might cause filesystem issues
4. **Keep filenames reasonably short** (under 255 characters)
5. **Use consistent naming patterns** across your organization

### Good Filename Patterns

```xml
<!-- Guaranteed unique with Study Instance UID -->
<Filename>#{StudyInstanceUID}_#{InstanceNumber}.dcm</Filename>

<!-- Organized and readable -->
<Filename>#{PatientID}_#{Date}_#{SeriesNumber}-#{InstanceNumber}.dcm</Filename>

<!-- With accession number for tracking -->
<Filename>ACC#{AccessionNumber}_#{SeriesNumber}_#{InstanceNumber}.dcm</Filename>
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
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Set metadata -->
    <SetTag name="SetMetadata">
      <DcmTag tag="0008,0020" value="#{Date}"/>
      <DcmTag tag="0008,0080" value="Medical Center"/>
    </SetTag>

    <!-- Save to organized archive -->
    <Save name="SaveToArchive">
      <Directory>E:\DICOM Archive\#{Modality}\#{PatientID}\#{StudyDate}</Directory>
      <Filename>#{SeriesNumber}-#{InstanceNumber}.dcm</Filename>
      <Format>DICOM</Format>
    </Save>

    <!-- Archive the raw captured job -->
    <Save name="SaveRaw">
      <Directory>E:\Archive\Raw\#{Date}</Directory>
      <Filename>#{PatientID}</Filename>
      <Format>dxi</Format>
    </Save>

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
        <Perform action="SetMetadata"/>
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
