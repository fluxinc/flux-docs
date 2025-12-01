# SetTag Actions

SetTag actions set DICOM tag values in the current DICOM object. Each SetTag action sets a single tag value.

## Basic Syntax

```xml
<SetTag tag="GGGG,EEEE" name="ActionName" type="Global|Unique" vr="VR">
  TagValue
</SetTag>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

## Required Attributes

### `tag`
The DICOM tag to set in format `GGGG,EEEE`.

```xml
<SetTag tag="0010,0010" name="SetPatientName">
  Doe^John
</SetTag>
```

### `name`
Unique identifier for this action.

## Optional Attributes

### `type`
Determines how the tag value is applied:

- **`Global`** (default) - The tag value applies to all instances in the job
- **`Unique`** - Each instance gets a unique value (useful for generating unique UIDs)

```xml
<!-- Global: Same value for all instances -->
<SetTag tag="0008,0080" name="SetInstitution" type="Global">
  Medical Center
</SetTag>

<!-- Unique: Generate unique value per instance -->
<SetTag tag="0020,000E" name="SetSeriesUID" type="Unique">
  #{SeriesInstanceUID}
</SetTag>
```

**Default:** `Global`

### `vr`
The Value Representation for the tag.

```xml
<SetTag tag="0008,0080" name="SetInstitution" vr="LO">
  Hospital
</SetTag>
```

If not specified, the VR is determined automatically from the DICOM standard.

## Using Placeholders

SetTag actions support all placeholder types:

### Tag Value Placeholders

```xml
<!-- Copy Patient Name to Institution Name -->
<SetTag tag="0008,0080" name="CopyPatientToInstitution">
  #{PatientName}
</SetTag>

<!-- Copy by tag number -->
<SetTag tag="0008,1030" name="CopyPatientToDescription">
  #{0010,0010}
</SetTag>
```

### Date Placeholders

```xml
<!-- Current date -->
<SetTag tag="0008,0020" name="SetStudyDate">
  #{Date}
</SetTag>

<!-- Yesterday -->
<SetTag tag="0008,0021" name="SetSeriesDate">
  #{Date,-1}
</SetTag>

<!-- Series Date = Study Date -->
<SetTag tag="0008,0021" name="CopyStudyDate">
  #{StudyDate}
</SetTag>
```

### Combined Placeholders

```xml
<!-- Combine static text with placeholders -->
<SetTag tag="0008,1030" name="SetDescription">
  Study for #{PatientName} on #{Date}
</SetTag>

<!-- Multiple placeholders -->
<SetTag tag="0008,0080" name="SetInstitutionDept">
  #{InstitutionName} - #{Department}
</SetTag>
```

## Common Examples

### Set Study Metadata

Multiple SetTag actions to set study metadata:

```xml
<Actions>
  <SetTag tag="0008,0020" name="SetStudyDate">#{Date}</SetTag>
  <SetTag tag="0008,0030" name="SetStudyTime">#{Time}</SetTag>
  <SetTag tag="0008,0050" name="SetAccessionNumber">#{AccessionNumber}</SetTag>
  <SetTag tag="0008,1030" name="SetStudyDescription">Printed Document</SetTag>
  <SetTag tag="0020,000D" name="SetStudyInstanceUID">#{StudyInstanceUID}</SetTag>
</Actions>
```

### Set Institution Information

```xml
<Actions>
  <SetTag tag="0008,0080" name="SetInstitutionName">General Hospital</SetTag>
  <SetTag tag="0008,0081" name="SetInstitutionAddress">123 Medical Drive</SetTag>
  <SetTag tag="0008,0082" name="SetInstitutionDept">Radiology Department</SetTag>
</Actions>
```

### Set Device Information

```xml
<Actions>
  <SetTag tag="0008,0070" name="SetManufacturer">Flux Inc</SetTag>
  <SetTag tag="0008,1090" name="SetManufacturerModel">DICOM Printer 2</SetTag>
  <SetTag tag="0018,1020" name="SetSoftwareVersion">2.0.0</SetTag>
</Actions>
```

### Copy Tags

```xml
<Actions>
  <!-- Copy patient demographics to study level -->
  <SetTag tag="0010,1010" name="CopyPatientAge">#{PatientAge}</SetTag>
  <SetTag tag="0010,1020" name="CopyPatientSize">#{PatientSize}</SetTag>
  <SetTag tag="0010,1030" name="CopyPatientWeight">#{PatientWeight}</SetTag>
</Actions>
```

## Conditional Tag Setting

Combine with workflow conditionals to set tags based on conditions:

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="true">
    <!-- Query succeeded - use data from worklist -->
    <Perform action="SetStudyDate"/>
    <Perform action="SetStudyDescription"/>
  </If>

  <If field="QUERY_FOUND" value="false">
    <!-- No match - use default values -->
    <Perform action="SetDefaultStudyDate"/>
    <Perform action="SetDefaultDescription"/>
  </If>
</Workflow>
```

## Workflow Example

Multiple SetTag actions used in a workflow:

```xml
<Actions>
  <!-- Patient information -->
  <SetTag tag="0010,0010" name="SetPatientName">#{PatientName}</SetTag>
  <SetTag tag="0010,0020" name="SetPatientID">#{PatientID}</SetTag>

  <!-- Study information -->
  <SetTag tag="0008,0020" name="SetStudyDate">#{Date}</SetTag>
  <SetTag tag="0008,1030" name="SetStudyDescription">Printed Report</SetTag>

  <!-- Institution information -->
  <SetTag tag="0008,0080" name="SetInstitutionName">Medical Center</SetTag>
  <SetTag tag="0008,0081" name="SetInstitutionAddress">123 Main Street</SetTag>
</Actions>

<Workflow>
  <Perform action="SetPatientName"/>
  <Perform action="SetPatientID"/>
  <Perform action="SetStudyDate"/>
  <Perform action="SetStudyDescription"/>
  <Perform action="SetInstitutionName"/>
  <Perform action="SetInstitutionAddress"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

## Value Representation (VR)

Common VR types:

- **AE** - Application Entity (16 chars)
- **AS** - Age String (4 chars)
- **CS** - Code String (16 chars)
- **DA** - Date (8 chars, YYYYMMDD)
- **DS** - Decimal String
- **DT** - Date Time
- **IS** - Integer String
- **LO** - Long String (64 chars)
- **PN** - Person Name
- **SH** - Short String (16 chars)
- **TM** - Time (6-13 chars)
- **UI** - Unique Identifier
- **US** - Unsigned Short

The VR is usually determined automatically from the DICOM data dictionary.

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <!-- Parse patient ID from filename -->
    <ParseJobFileName name="GetPatientID">
      <Pattern>(\d+)_.*\.pdf</Pattern>
      <DcmTag tag="0010,0020" group="1"/>
    </ParseJobFileName>

    <!-- Query worklist for patient data -->
    <Query name="FindPatient" type="Worklist">
      <ConnectionParameters>
        <PeerAETitle>RIS</PeerAETitle>
        <MyAETitle>PRINTER</MyAETitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Set metadata tags -->
    <SetTag tag="0008,0020" name="SetStudyDate">#{Date}</SetTag>
    <SetTag tag="0008,0030" name="SetStudyTime">#{Time}</SetTag>
    <SetTag tag="0008,1030" name="SetStudyDescription">Printed Document - #{PatientName}</SetTag>
    <SetTag tag="0008,0080" name="SetInstitutionName">General Hospital</SetTag>
    <SetTag tag="0008,0081" name="SetInstitutionDept">Radiology Department</SetTag>
    <SetTag tag="0008,0070" name="SetManufacturer">Flux Inc</SetTag>
    <SetTag tag="0008,1090" name="SetManufacturerModel">DICOM Printer 2</SetTag>

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
      <Perform action="SetStudyDate"/>
      <Perform action="SetStudyTime"/>
      <Perform action="SetStudyDescription"/>
      <Perform action="SetInstitutionName"/>
      <Perform action="SetInstitutionDept"/>
      <Perform action="SetManufacturer"/>
      <Perform action="SetManufacturerModel"/>
      <Perform action="SendToPACS"/>
    </If>
  </Workflow>
</DicomPrinter>
```

## Related Topics

- [Actions Overview](index.md)
- [Placeholders](../placeholders.md)
- [Query Actions](query.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
