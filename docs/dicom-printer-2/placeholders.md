# Tag Placeholders

DICOM Printer 2 supports placeholder syntax that allows you to dynamically substitute DICOM tag values and dates into configuration values.

## Placeholder Syntax

Placeholders use the format `#{...}`.

> **Important:** Tag placeholders (`#{TagName}`, `#{GGGG,EEEE}`) are substituted only when the placeholder is the **entire** config value — they do not work when surrounded by static text. Date placeholders (`#{Date}`) are the exception: they work anywhere within a string, including when mixed with other text.

## Tag Value Placeholders

### By Tag Name

```
#{TagName}
```

Reads a tag from the current job dataset by its DCMTK dictionary name. If the tag is not present, the placeholder is left unchanged.

**Example:**
```xml
<SetTag name="CopyPatientName" tag="(0008,1030)">#{PatientName}</SetTag>
<SetTag name="CopyAccession" tag="(0008,0051)">#{AccessionNumber}</SetTag>
```

**Common tag names:**
- `#{PatientID}` — Patient ID (0010,0020)
- `#{PatientName}` — Patient's Name (0010,0010)
- `#{StudyDate}` — Study Date (0008,0020)
- `#{StudyInstanceUID}` — Study Instance UID (0020,000D)
- `#{SeriesNumber}` — Series Number (0020,0011)
- `#{InstanceNumber}` — Instance Number (0020,0013)
- `#{Modality}` — Modality (0008,0060)
- `#{AccessionNumber}` — Accession Number (0008,0050)

### By Group and Element Number

```
#{GGGG,EEEE}
```

Reads a tag by its hex group and element numbers. Whitespace around the comma is allowed.

**Example:**
```xml
<SetTag name="CopyPatientID" tag="(0008,1030)">#{0010,0020}</SetTag>
```

## Date Placeholders

Date placeholders are resolved at processing time and **work anywhere within a string**, including when mixed with other text.

### Current Date

```
#{Date}
```

Returns the current date in `YYYYMMDD` format.

```xml
<SetTag name="SetStudyDate" tag="(0008,0020)">#{Date}</SetTag>
```

### Date with Offset

```
#{Date,N}
```

Returns the current date offset by `N` days. Negative values go backward.

```xml
<SetTag name="SetYesterday" tag="(0008,0021)">#{Date,-1}</SetTag>
<SetTag name="SetNextWeek"  tag="(0008,0023)">#{Date,7}</SetTag>
```

### Date Range

```
#{Date,offset,range}
```

Returns two dates separated by a hyphen: `(today + offset - range)-(today + offset + range)`.
Useful for DICOM date range queries. Only applies when `range > 1`.

```xml
<!-- Query for studies within ±7 days of a week ago -->
<DcmTag tag="(0008,0020)">#{Date,-7,7}</DcmTag>
```

## Where Placeholders Work

| Context | Tag placeholders | Date placeholders |
|---|---|---|
| `<SetTag>` value | Yes (entire value only) | Yes (anywhere) |
| `<SetSequence>` `<DcmTag>` value | Yes (entire value only) | Yes (anywhere) |
| `<Query>` `<DcmTag>` value | Yes (entire value only) | Yes (anywhere) |
| `<Save>` directory / filename | Yes (entire value only) | Yes (anywhere) |
| `<PrintText>` text content | Yes (anywhere) | Yes (anywhere) |
| `<If>` / `<Switch>` condition values | No | No |

**"Entire value only"** means the config value must be nothing but the placeholder. For example:

```xml
<!-- Works: entire value is the placeholder -->
<SetTag name="CopyInstitution" tag="(0008,0080)">#{InstitutionName}</SetTag>

<!-- Does NOT work: placeholder mixed with static text -->
<SetTag name="SetLabel" tag="(0008,1030)">Study for #{PatientName}</SetTag>

<!-- Works: Date placeholder works even in mixed strings -->
<SetTag name="SetLabel" tag="(0008,1030)">Archived on #{Date}</SetTag>
```

## Examples

### Copy a tag value to another tag

```xml
<SetTag name="CopyPatientToDescription" tag="(0008,1030)">#{PatientName}</SetTag>
```

### Set study date to today

```xml
<SetTag name="SetStudyDate" tag="(0008,0020)">#{Date}</SetTag>
```

### Save with patient-based directory

```xml
<Save name="ArchiveByPatient">
  <Directory>E:\DICOM\#{PatientID}</Directory>
  <Filename>#{Date}</Filename>
</Save>
```

Each path segment must be a pure placeholder or static text. The directory `E:\DICOM\#{PatientID}` will not expand — instead, use `#{PatientID}` as the full `<Directory>` value and configure the base path elsewhere, or use date-based organization:

```xml
<Save name="ArchiveByDate">
  <Directory>E:\DICOM\#{PatientID}</Directory>
  <Filename>#{Date}</Filename>
</Save>
```

### Worklist query using today's date

Worklist scheduled dates live inside `(0040,0100)` Scheduled Procedure Step Sequence at `(0040,0002)` Scheduled Procedure Step Start Date. Use the canonical SPS sequence form, or the root `(0008,0020)` StudyDate alias as a shorthand:

```xml
<Query name="TodayWorklist" type="Worklist">
  <ConnectionParameters>
    <PeerAETitle>RIS</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.200</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <!-- Root StudyDate is an ergonomic alias for SPS Start Date -->
  <DcmTag tag="(0008,0020)">#{Date}</DcmTag>
  <DcmTag tag="(0010,0020)">#{PatientID}</DcmTag>
</Query>
```

See [Worklist Date Constraints](actions/query.md#worklist-date-constraints) for the full precedence order and the canonical SPS sequence form.

## Related Topics

- [SetTag Actions](actions/settag.md)
- [SetSequence Actions](actions/setsequence.md)
- [Query Actions](actions/query.md)
- [Save Actions](actions/save.md)
