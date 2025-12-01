# Parse Actions

Parse actions extract data from filenames or text files using regular expressions and populate DICOM tags with the extracted values.

## Parse Types

DICOM Printer 2 supports two parse action types:

- **ParseJobFileName** - Extract data from the print job filename
- **ParseJobTextFile** - Extract data from a text file associated with the print job

## ParseJobFileName

Extracts data from the filename of the print job using regular expressions.

### Basic Syntax

```xml
<ParseJobFileName name="ActionName">
  <Pattern>regular_expression</Pattern>
  <DcmTag tag="GGGG,EEEE" group="1"/>
  <!-- Additional tag mappings -->
</ParseJobFileName>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

### Elements

#### `<Pattern>`
The regular expression pattern to match against the filename. Use capturing groups `()` to extract values.

#### `<DcmTag>`
Maps a captured group to a DICOM tag.

**Attributes:**
- `tag` - The DICOM tag to populate (format: `GGGG,EEEE`)
- `group` - The regex capture group number (1-based)
- `mandatory` (optional) - Whether this tag must be successfully extracted
  - **Valid Values:** `true`, `false`
  - **Default:** `false` (tag is optional)
  - When `true`, the parse action fails if the tag cannot be extracted
  - When `false`, processing continues even if the tag is not found
- `replacePattern` (optional) - Pattern to construct the final tag value from captured groups
  - Uses backreferences: `\1`, `\2`, `\3`, etc. for captured groups
  - **Default:** `\1` (first captured group)
  - Allows reformatting and combining multiple captured groups

### Example: Extract Patient ID from Filename

```xml
<ParseJobFileName name="ExtractPatientID">
  <!-- Filename pattern: PatientID_12345.pdf -->
  <Pattern>PatientID_(\d+)\.pdf</Pattern>
  <DcmTag tag="0010,0020" group="1"/>
</ParseJobFileName>
```

Use in workflow with error handling:
```xml
<Perform action="ExtractPatientID" onError="Discard"/>
```

If the filename is `PatientID_12345.pdf`, this extracts `12345` and sets tag (0010,0020) to that value.

### Example: Extract Multiple Fields

```xml
<ParseJobFileName name="ExtractPatientData">
  <!-- Filename pattern: John_Doe_19800515_M.pdf -->
  <Pattern>(\w+)_(\w+)_(\d{8})_([MF])\.pdf</Pattern>
  <DcmTag tag="0010,0010" group="1,2"/>  <!-- Patient Name: last^first -->
  <DcmTag tag="0010,0030" group="3"/>     <!-- Birth Date -->
  <DcmTag tag="0010,0040" group="4"/>     <!-- Sex -->
</ParseJobFileName>
```

For filename `John_Doe_19800515_M.pdf`:
- Patient Name (0010,0010) = `Doe^John`
- Birth Date (0010,0030) = `19800515`
- Sex (0010,0040) = `M`

### Example: Extract Study Information

```xml
<ParseJobFileName name="ExtractStudyInfo">
  <!-- Filename pattern: PATID12345_CT_20240315_ACC9876.pdf -->
  <Pattern>PATID(\d+)_([A-Z]+)_(\d{8})_ACC(\d+)\.pdf</Pattern>
  <DcmTag tag="0010,0020" group="1"/>  <!-- Patient ID -->
  <DcmTag tag="0008,0060" group="2"/>  <!-- Modality -->
  <DcmTag tag="0008,0020" group="3"/>  <!-- Study Date -->
  <DcmTag tag="0008,0050" group="4"/>  <!-- Accession Number -->
</ParseJobFileName>
```

### Example: Mandatory vs Optional Tags

Use the `mandatory` attribute to control parse failure behavior:

```xml
<ParseJobFileName name="ExtractWithValidation">
  <!-- Filename pattern: ID12345_optional_data.pdf -->
  <Pattern>ID(\d+)(?:_([A-Z]+))?\.pdf</Pattern>

  <!-- Patient ID is mandatory - action fails if not found -->
  <DcmTag tag="0010,0020" group="1" mandatory="true"/>

  <!-- Modality is optional - action succeeds even if not found -->
  <DcmTag tag="0008,0060" group="2" mandatory="false"/>
</ParseJobFileName>
```

Use in workflow with error handling:
```xml
<Perform action="ExtractWithValidation" onError="Discard"/>
```

**Behavior:**
- Filename `ID12345.pdf`: **Success** - Patient ID extracted, Modality empty
- Filename `ID12345_CT.pdf`: **Success** - Both extracted
- Filename `report.pdf`: **Failure** - Patient ID (mandatory) not found, job discarded

### Example: Using replacePattern to Format Data

The `replacePattern` attribute allows you to reformat captured data:

```xml
<ParseJobFileName name="FormatPatientName">
  <!-- Filename pattern: FirstName_LastName_12345.pdf -->
  <Pattern>(\w+)_(\w+)_(\d+)\.pdf</Pattern>

  <!-- Format as DICOM PN: Last^First -->
  <DcmTag tag="0010,0010" replacePattern="\2^\1"/>

  <!-- Patient ID from third group -->
  <DcmTag tag="0010,0020" replacePattern="\3"/>
</ParseJobFileName>
```

For filename `John_Doe_12345.pdf`:
- Patient Name (0010,0010) = `Doe^John` (reformatted)
- Patient ID (0010,0020) = `12345`

**Advanced Formatting:**

```xml
<ParseJobFileName name="FormatComplexData">
  <Pattern>(\d{4})(\d{2})(\d{2})_ID(\d+)\.pdf</Pattern>

  <!-- Reformat date from YYYYMMDD to YYYY-MM-DD format (or keep as YYYYMMDD for DICOM) -->
  <DcmTag tag="0008,0020" replacePattern="\1\2\3"/>

  <!-- Add prefix to ID -->
  <DcmTag tag="0010,0020" replacePattern="PAT\4"/>
</ParseJobFileName>
```

For filename `20240315_ID00123.pdf`:
- Study Date (0008,0020) = `20240315`
- Patient ID (0010,0020) = `PAT00123`

## ParseJobTextFile

Extracts data from a text file using regular expressions.

### Basic Syntax

```xml
<ParseJobTextFile name="ActionName">
  <Pattern>regular_expression</Pattern>
  <DcmTag tag="GGGG,EEEE" group="1"/>
  <!-- Additional tag mappings -->
</ParseJobTextFile>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition.

The text file must have the same name as the print job with a `.txt` extension.

### Example: Parse Text File

For a print job file `report_12345.pdf` with associated `report_12345.txt`:

**Text file content (`report_12345.txt`):**
```
Patient: John Doe
ID: 12345
Date: 2024-03-15
Accession: ACC9876
```

**Parse configuration:**
```xml
<ParseJobTextFile name="ParseReportData">
  <Pattern>Patient:\s*(.+)</Pattern>
  <DcmTag tag="0010,0010" group="1"/>
</ParseJobTextFile>

<ParseJobTextFile name="ParsePatientID">
  <Pattern>ID:\s*(\d+)</Pattern>
  <DcmTag tag="0010,0020" group="1"/>
</ParseJobTextFile>

<ParseJobTextFile name="ParseStudyDate">
  <Pattern>Date:\s*(\d{4}-\d{2}-\d{2})</Pattern>
  <DcmTag tag="0008,0020" group="1"/>
</ParseJobTextFile>
```

### Multiline Patterns

Use the `(?s)` flag to enable multiline matching:

```xml
<ParseJobTextFile name="ParseMultiline">
  <Pattern>(?s)Patient Information:.*?Name:\s*(.+?)\s*ID:\s*(\d+)</Pattern>
  <DcmTag tag="0010,0010" group="1"/>
  <DcmTag tag="0010,0020" group="2"/>
</ParseJobTextFile>
```

## Regular Expression Syntax

DICOM Printer 2 uses standard regular expression syntax:

### Common Patterns

- `\d` - Digit (0-9)
- `\w` - Word character (a-z, A-Z, 0-9, _)
- `\s` - Whitespace
- `.` - Any character
- `+` - One or more
- `*` - Zero or more
- `?` - Zero or one
- `()` - Capturing group
- `[]` - Character class
- `|` - Alternation (OR)

### Examples

```regex
\d{5}              # Exactly 5 digits
[A-Z]{2,4}         # 2 to 4 uppercase letters
\w+@\w+\.\w+       # Simple email pattern
\d{4}-\d{2}-\d{2}  # Date: YYYY-MM-DD
[MF]               # M or F (sex)
```

## Combining Multiple Parse Actions

```xml
<Actions>
  <!-- Parse patient ID from filename -->
  <ParseJobFileName name="GetPatientID">
    <Pattern>(\d{6})_\w+\.pdf</Pattern>
    <DcmTag tag="0010,0020" group="1"/>
  </ParseJobFileName>

  <!-- Parse additional data from text file -->
  <ParseJobTextFile name="GetPatientName">
    <Pattern>Name:\s*(.+)</Pattern>
    <DcmTag tag="0010,0010" group="1"/>
  </ParseJobTextFile>

  <ParseJobTextFile name="GetAccession">
    <Pattern>Accession:\s*(\w+)</Pattern>
    <DcmTag tag="0008,0050" group="1"/>
  </ParseJobTextFile>
</Actions>

<Workflow>
  <Perform action="GetPatientID"/>
  <Perform action="GetPatientName"/>
  <Perform action="GetAccession"/>
  <Perform action="QueryWorklist"/>
</Workflow>
```

## Error Handling

Parse actions can fail in two ways:
1. **Pattern doesn't match** - The regular expression doesn't match the filename/text
2. **Mandatory tag not extracted** - A tag marked `mandatory="true"` was not found

Configure error handling in the workflow using the `onError` attribute on `<Perform>` nodes:
- `onError="Discard"` - Job is discarded on failure
- `onError="Ignore"` - Processing continues with empty tag values
- `onError="Hold"` - Job is held and retried later
- `onError="Suspend"` - Job is suspended for manual review

### Example: Mandatory Tags with Error Handling

Action definition:
```xml
<ParseJobFileName name="ExtractRequiredData">
  <Pattern>(\d+)_(.+)\.pdf</Pattern>
  <!-- Patient ID is mandatory -->
  <DcmTag tag="0010,0020" group="1" mandatory="true"/>
  <!-- Patient Name is optional -->
  <DcmTag tag="0010,0010" group="2" mandatory="false"/>
</ParseJobFileName>
```

Workflow with discard on failure:
```xml
<Perform action="ExtractRequiredData" onError="Discard"/>
```

**Behavior:**
- If Patient ID cannot be extracted, the action fails and job is discarded
- If only Patient Name is missing, the action succeeds with empty Patient Name

### Example: All Tags Optional

Action definition:
```xml
<ParseJobFileName name="OptionalParsing">
  <Pattern>(?:ACC)?(\w+)?</Pattern>
  <!-- All tags are optional (default behavior) -->
  <DcmTag tag="0008,0050" group="1"/>
</ParseJobFileName>
```

Workflow:
```xml
<Perform action="OptionalParsing" onError="Ignore"/>
```

Processing continues even if the pattern doesn't match or no data is extracted.

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <!-- Parse patient ID and accession from filename -->
    <!-- Expected format: 12345_ACC9876_Report.pdf -->
    <ParseJobFileName name="ParseFilename">
      <Pattern>(\d+)_ACC(\w+)_\w+\.pdf</Pattern>
      <DcmTag tag="0010,0020" group="1"/>  <!-- Patient ID -->
      <DcmTag tag="0008,0050" group="2"/>  <!-- Accession Number -->
    </ParseJobFileName>

    <!-- Parse patient name from text file -->
    <ParseJobTextFile name="ParsePatientName">
      <Pattern>Patient Name:\s*(.+)</Pattern>
      <DcmTag tag="0010,0010" group="1"/>
    </ParseJobTextFile>

    <!-- Query worklist with parsed data -->
    <Query name="FindWorklist" type="Worklist">
      <ConnectionParameters>
        <PeerAETitle>RIS</PeerAETitle>
        <MyAETitle>PRINTER</MyAETitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
      <DcmTag tag="0008,0050">#{AccessionNumber}</DcmTag>
    </Query>

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
    <!-- Parse data first -->
    <Perform action="ParseFilename"/>
    <Perform action="ParsePatientName"/>

    <!-- Then query and store -->
    <Perform action="FindWorklist"/>
    <If field="QUERY_FOUND" value="true">
      <Perform action="SendToPACS"/>
    </If>
  </Workflow>
</DicomPrinter>
```

## Best Practices

1. **Test patterns thoroughly** with representative filenames
2. **Use specific patterns** to avoid false matches
3. **Use `mandatory="true"` for critical tags** (e.g., Patient ID, Accession Number) to ensure data quality
4. **Mark optional tags with `mandatory="false"`** explicitly for clarity in configuration
5. **Use `replacePattern` to format data** according to DICOM standards (e.g., Patient Name as `Last^First`)
6. **Validate extracted data** using workflow conditionals
7. **Document expected filename formats** in comments
8. **Use `onError="Discard"` for invalid formats** to avoid processing corrupt data
9. **Combine with Query actions** to validate extracted patient data against authoritative sources

## Related Topics

- [Actions Overview](index.md)
- [SetTag Actions](settag.md)
- [Query Actions](query.md)
- [Placeholders](../placeholders.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
