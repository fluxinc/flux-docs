# SetTag Actions

SetTag actions set DICOM tag values in the current DICOM object. Each SetTag action sets a single tag value.

## Basic Syntax

```xml
<SetTag name="ActionName" tag="(GGGG,EEEE)">
  TagValue
</SetTag>
```

## Attributes

| Attribute | Required | Description |
|---|---|---|
| `name` | Yes | Unique identifier for this action. |
| `tag` | Yes | The DICOM tag in `(GGGG,EEEE)` format. |
| `vr` | No | Value Representation (e.g., `LO`, `PN`, `DT`). Usually inferred from the DICOM dictionary. Required for private tags. |
| `tagName` | No | Name for private tags (odd group number). |

::: warning SetTag is always job-level
SetTag always applies its value to the whole job (the job-level dataset). There is no per-instance mode — the `type`/`unique` attribute is not honored by SetTag. SetTag also does not generate UIDs (Study/Series/SOP Instance UIDs are produced automatically by the engine). For per-image sequence values use [SetSequence](index.md) with `unique="true"`.
:::

## Optional Attributes

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

### Placeholder Rules

A `#{TagName}` or `#{GGGG,EEEE}` placeholder must be the **entire** tag value — the whole value is matched exactly, so it cannot be concatenated with surrounding literal text or with another tag placeholder. Only `#{Date...}` placeholders may be embedded within literal text or used more than once in a single value.

```xml
<!-- WRONG: tag-name placeholder mixed with text — #{PatientName} is left literal -->
<SetTag tag="0008,1030" name="SetDescription">
  Study for #{PatientName} on #{Date}
</SetTag>

<!-- WRONG: two tag-name placeholders in one value — neither expands -->
<SetTag tag="0008,0080" name="SetInstitutionDept">
  #{InstitutionName} - #{Department}
</SetTag>

<!-- OK: a single tag-name placeholder as the whole value -->
<SetTag tag="0008,0080" name="SetInstitution">
  #{InstitutionName}
</SetTag>
```

## Common Examples

### Set Study Metadata

Multiple SetTag actions to set study metadata:

```xml
<ActionsList>
  <SetTag tag="0008,0020" name="SetStudyDate">#{Date}</SetTag>
  <SetTag tag="0008,0050" name="SetAccessionNumber">#{AccessionNumber}</SetTag>
  <SetTag tag="0008,1030" name="SetStudyDescription">Printed Document</SetTag>
  <SetTag tag="0020,000D" name="SetStudyInstanceUID">#{StudyInstanceUID}</SetTag>
</ActionsList>
```

### Set Institution Information

```xml
<ActionsList>
  <SetTag tag="0008,0080" name="SetInstitutionName">General Hospital</SetTag>
  <SetTag tag="0008,0081" name="SetInstitutionAddress">123 Medical Drive</SetTag>
  <SetTag tag="0008,0082" name="SetInstitutionDept">Radiology Department</SetTag>
</ActionsList>
```

### Set Device Information

```xml
<ActionsList>
  <SetTag tag="0008,0070" name="SetManufacturer">Flux Inc</SetTag>
  <SetTag tag="0008,1090" name="SetManufacturerModel">DICOM Printer 2</SetTag>
  <SetTag tag="0018,1020" name="SetSoftwareVersion">2.0.0</SetTag>
</ActionsList>
```

### Copy Tags

```xml
<ActionsList>
  <!-- Copy patient demographics to study level -->
  <SetTag tag="0010,1010" name="CopyPatientAge">#{PatientAge}</SetTag>
  <SetTag tag="0010,1020" name="CopyPatientSize">#{PatientSize}</SetTag>
  <SetTag tag="0010,1030" name="CopyPatientWeight">#{PatientWeight}</SetTag>
</ActionsList>
```

## Conditional Tag Setting

Combine with workflow conditionals to set tags based on conditions:

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <!-- Query succeeded - use data from worklist -->
      <Perform action="SetStudyDate"/>
      <Perform action="SetStudyDescription"/>
    </Statements>
  </If>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <!-- No match - use default values -->
      <Perform action="SetDefaultStudyDate"/>
      <Perform action="SetDefaultDescription"/>
    </Statements>
  </If>
</Workflow>
```

## Workflow Example

Multiple SetTag actions used in a workflow:

```xml
<ActionsList>
  <!-- Patient information -->
  <SetTag tag="0010,0010" name="SetPatientName">#{PatientName}</SetTag>
  <SetTag tag="0010,0020" name="SetPatientID">#{PatientID}</SetTag>

  <!-- Study information -->
  <SetTag tag="0008,0020" name="SetStudyDate">#{Date}</SetTag>
  <SetTag tag="0008,1030" name="SetStudyDescription">Printed Report</SetTag>

  <!-- Institution information -->
  <SetTag tag="0008,0080" name="SetInstitutionName">Medical Center</SetTag>
  <SetTag tag="0008,0081" name="SetInstitutionAddress">123 Main Street</SetTag>
</ActionsList>

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
<!DOCTYPE DicomPrinterConfig SYSTEM "config.dtd">
<DicomPrinterConfig>
  <ActionsList>
    <!-- Parse patient ID from filename -->
    <ParseJobFileName name="GetPatientID">
      <DcmTag tag="0010,0020">(\d+)_.*\.pdf</DcmTag>
    </ParseJobFileName>

    <!-- Query worklist for patient data -->
    <Query name="FindPatient" type="Worklist">
      <ConnectionParameters>
        <PeerAeTitle>RIS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Set metadata tags -->
    <SetTag tag="0008,0020" name="SetStudyDate">#{Date}</SetTag>
    <SetTag tag="0008,1030" name="SetStudyDescription">Printed Document</SetTag>
    <SetTag tag="0008,0080" name="SetInstitutionName">General Hospital</SetTag>
    <SetTag tag="0008,0081" name="SetInstitutionDept">Radiology Department</SetTag>
    <SetTag tag="0008,0070" name="SetManufacturer">Flux Inc</SetTag>
    <SetTag tag="0008,1090" name="SetManufacturerModel">DICOM Printer 2</SetTag>

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
        <Perform action="SetStudyDate"/>
        <Perform action="SetStudyDescription"/>
        <Perform action="SetInstitutionName"/>
        <Perform action="SetInstitutionDept"/>
        <Perform action="SetManufacturer"/>
        <Perform action="SetManufacturerModel"/>
        <Perform action="SendToPACS"/>
      </Statements>
    </If>
  </Workflow>
</DicomPrinterConfig>
```

## Related Topics

- [Actions Overview](index.md)
- [Placeholders](../placeholders.md)
- [Query Actions](query.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
