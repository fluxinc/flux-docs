# Tag Placeholders

DICOM Printer 2 supports placeholder syntax that allows you to dynamically reference DICOM tag values, dates, and other contextual information throughout the configuration.

## Placeholder Syntax

Placeholders use the format `#{...}` and can be used in:
- Action attributes (filenames, directory paths, tag values)
- Workflow conditional values
- Any string configuration value

## Tag Value Placeholders

### By Group and Element Number

Reference a DICOM tag by its group and element numbers:

```
#{GGGG,EEEE}
```

**Note:** Whitespace is allowed within the placeholder syntax. For example, `#{ 0010 , 0020 }` is equivalent to `#{0010,0020}`.

**Source:** `src/DicomPrinter/Action.cpp:45` (regex pattern allows `\s*`)

**Example:**
```xml
<!-- Reference Patient Name (0010,0010) -->
<SetTag tag="0008,0080" value="#{0010,0010}"/>

<!-- Use Patient ID in filename -->
<Save filename="patient_#{0010,0020}.dcm"/>
```

### By Tag Name

Reference a DICOM tag by its standard tag name:

```
#{TagName}
```

**Note:** Tag name placeholders reference existing values in the DICOM dataset. They do not generate new values. If a tag doesn't exist in the current dataset, the placeholder resolves to an empty string.

**Example:**
```xml
<!-- Reference tags by name -->
<SetTag tag="0008,0080" value="#{PatientName}"/>

<!-- Use tag names in directory paths -->
<Save directory="#{PatientID}/#{StudyDate}"/>

<!-- Combine multiple tag placeholders -->
<Save filename="#{PatientID}_#{StudyDate}_#{SeriesNumber}.dcm"/>
```

**Common Tag Names:**
- `#{PatientID}` - Patient ID (0010,0020)
- `#{PatientName}` - Patient's Name (0010,0010)
- `#{StudyDate}` - Study Date (0008,0020)
- `#{StudyTime}` - Study Time (0008,0030)
- `#{StudyInstanceUID}` - Study Instance UID (0020,000D)
- `#{SeriesNumber}` - Series Number (0020,0011)
- `#{InstanceNumber}` - Instance Number (0020,0013)
- `#{Modality}` - Modality (0008,0060)
- `#{AccessionNumber}` - Accession Number (0008,0050)

## Date Placeholders

Date placeholders dynamically generate date values at the time of processing.

**Note:** `#{Date}` is currently the only dynamically generated placeholder. All other placeholders (like `#{Time}`, `#{PatientID}`, etc.) reference existing values from the DICOM dataset.

### Current Date

```
#{Date}
```

Returns the current date in YYYYMMDD format.

**Example:**
```xml
<SetTag tag="0008,0020" value="#{Date}"/>
```

### Date with Offset

```
#{Date,offset}
```

Returns a date offset by the specified number of days. Negative values go backward in time.

**Example:**
```xml
<!-- Yesterday's date -->
<SetTag tag="0008,0020" value="#{Date,-1}"/>

<!-- Tomorrow's date -->
<SetTag tag="0008,0020" value="#{Date,1}"/>

<!-- Date 7 days from now -->
<SetTag tag="0008,0020" value="#{Date,7}"/>

<!-- Date 30 days ago -->
<SetTag tag="0008,0020" value="#{Date,-30}"/>
```

### Date with Offset and Range

```
#{Date,offset,range}
```

Returns two dates separated by a hyphen, representing a date range. The range extends both backwards and forwards from the base date (current date + offset).

- First date = (current date + offset) - range
- Second date = (current date + offset) + range

**Example:**
```xml
<!-- Query for studies from last 7 days -->
<!-- If today is 20240315:
     baseDate = 20240315 + (-7) = 20240308
     startDate = 20240308 - 7 = 20240301
     endDate = 20240308 + 7 = 20240315
     Result: 20240301-20240315 -->
<Query name="RecentStudies">
  <DcmTag tag="0008,0020">#{Date,-7,7}</DcmTag>
</Query>

<Query name="FindStudies" type="Study" calledAE="PACS" callingAE="PRINTER"
       host="192.168.1.100" port="104">
  <!-- Query for today's studies -->
  <DcmTag tag="0008,0020">#{Date}</DcmTag>

  <!-- Query by patient ID -->
  <DcmTag tag="0010,0020">#{PatientID}</DcmTag>

  <!-- Query studies from last 7 days -->
  <DcmTag tag="0008,0020">#{Date,-7,7}</DcmTag>
</Query>
```

### In SetTag Actions

```xml
<SetTag name="SetStudyDate">
  <!-- Set to current date -->
  <DcmTag tag="0008,0020">#{Date}</DcmTag>

  <!-- Copy value from another tag -->
  <DcmTag tag="0008,0080" value="#{InstitutionName}"/>

  <!-- Combine static text with placeholder -->
  <DcmTag tag="0008,0070" value="Manufacturer: #{Manufacturer}"/>
</SetTag>
```

### In Save Actions

```xml
<Save name="SaveToArchive">
  <!-- Directory structure using patient and study info -->
  <Directory>C:\Archive\#{PatientID}\#{StudyDate}</Directory>

  <!-- Filename with multiple placeholders -->
  <Filename>#{PatientID}_#{SeriesNumber}_#{InstanceNumber}.dcm</Filename>
</Save>
```

### In Conditional Logic

```xml
<If field="TAG_VALUE" tag="0010,0010" value="#{ExpectedPatientName}">
  <Perform action="ProcessPatient"/>
</If>
```

## Placeholder Resolution

Placeholders are resolved when:
1. Actions are executed
2. Workflow conditions are evaluated
3. File paths are constructed

If a placeholder references a tag that doesn't exist in the current DICOM object:
- The placeholder is replaced with an empty string
- No error is generated
- The action continues processing

## Special Characters in Tag Values

When tag values contain special characters (e.g., patient names with commas, backslashes in PN VR), the placeholder value includes those characters exactly as they appear in the tag.

For file paths, you may need to sanitize tag values that could contain invalid filename characters.

## Examples

### Create Organized Archive Structure

```xml
<Save name="OrganizedArchive">
  <Directory>E:\DICOM\#{Modality}\#{PatientID}\#{StudyDate}</Directory>
  <Filename>#{SeriesNumber}-#{InstanceNumber}.dcm</Filename>
</Save>
```

### Query Worklist for Today's Patients

```xml
<Query name="TodayWorklist" type="Worklist" calledAE="RIS" callingAE="PRINTER"
       host="192.168.1.200" port="104">
  <DcmTag tag="0040,0100">
    <DcmSequence>
      <DcmTag tag="0040,0002">#{Date}</DcmTag>
    </DcmSequence>
  </DcmTag>
</Query>
```

### Set Multiple Tags with Dynamic Values

```xml
<SetTag name="SetMetadata">
  <DcmTag tag="0008,0020">#{Date}</DcmTag>
  <DcmTag tag="0008,0080" value="Medical Center - #{Department}"/>
  <DcmTag tag="0008,1030" value="Study for #{PatientName}"/>
</SetTag>
```

## Related Topics

- [SetTag Actions](actions/settag.md)
- [Query Actions](actions/query.md)
- [Save Actions](actions/save.md)
- [Workflow Conditional Nodes](workflow/conditional-nodes.md)
