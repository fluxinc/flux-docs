# Parse Actions

Parse actions extract data from filenames or text files using regular expressions and populate DICOM tags with the extracted values.

## Parse Types

DICOM Printer 2 supports two parse action types:

- **ParseJobFileName** - Extract data from the print job filename
- **ParseJobTextFile** - Extract data from a text file associated with the print job

Both share the same configuration schema: the action element contains one or more `<DcmTag>` children, and **each `<DcmTag>` carries its own regular expression as element text**.

## Basic Syntax

```xml
<ParseJobFileName name="ActionName">
  <DcmTag tag="GGGG,EEEE">regular_expression</DcmTag>
  <!-- Additional expressions -->
</ParseJobFileName>
```

```xml
<ParseJobTextFile name="ActionName">
  <DcmTag tag="GGGG,EEEE">regular_expression</DcmTag>
  <!-- Additional expressions -->
</ParseJobTextFile>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

### How matching works

- `ParseJobFileName` applies every `<DcmTag>` expression to the print job filename.
- `ParseJobTextFile` applies every `<DcmTag>` expression to **each line** of the text file, one line at a time. An expression can never match across lines.
- When an expression matches, the matched portion of the line is rewritten using `replacePattern` (default `\1`, the first capture group), trimmed, optionally transformed, and written to the configured DICOM tag.
- By default (`matchPolicy="lastMatch"`), every later match overwrites the previous value — later entries beat earlier entries, and later lines beat earlier lines. See [Match Policy](#match-policy) for the alternative.

## Action Attributes

| Attribute | Default | Description |
|---|---|---|
| `name` | (required) | Action name referenced by `<Perform>` |
| `defaultReplacePattern` | `\1` | Default `replacePattern` for all child `DcmTag` entries |
| `defaultTransformation` | `None` | Default `transform` for all child `DcmTag` entries |
| `defaultCaseSensitive` | `true` | Default case sensitivity for all child `DcmTag` expressions *(2.4.8+)* |
| `matchPolicy` | `lastMatch` | `lastMatch` or `firstMatch` — see [Match Policy](#match-policy) *(2.4.8+)* |

## DcmTag Attributes

| Attribute | Default | Description |
|---|---|---|
| `tag` | (required) | DICOM tag to populate: `GGGG,EEEE`, `(GGGG,EEEE)`, or a dictionary name such as `PatientID` |
| `mandatory` | `false` | When `true`, the action fails if this tag was not extracted |
| `replacePattern` | `\1` | Rewrites the matched text using backreferences (`\1`, `\2`, ...) |
| `transform` | `None` | `None`, `ToUpper`, or `ToLower` — applied to the final value |
| `caseSensitive` | `true` | `false` makes this expression match case-insensitively *(2.4.8+)* |
| `allowEmpty` | `false` | `true` allows a matched-but-empty value to be written *(2.4.8+)* |

Tags with odd group numbers are automatically treated as private tags and the private creator ID is set automatically.

## Regular Expression Engine

Since version 2.4.8 the parse engine uses Qt `QRegularExpression` (PCRE2). In addition to the usual character classes, quantifiers, anchors, and capture groups, configurations can use:

- **Lookahead and lookbehind**: `(?<!HRI )ID` matches `ID` not preceded by `HRI `
- **Inline options**: `(?i)` for case-insensitive matching inside the pattern itself
- **Lazy quantifiers**: `.*?`
- **Named groups**: `(?<id>\d+)`

**XML escaping:** patterns are written inside XML, so `<` must be escaped as `&lt;`. A lookbehind is written as:

```xml
<DcmTag tag="0010,0020">(?&lt;!HRI )ID\s*:?\s*(\d{2,10})</DcmTag>
```

Invalid regular expressions are rejected when the configuration is loaded; the service will not start, and the log names the offending pattern.

## Case-Insensitive Matching

Real-world report labels vary (`MRN:`, `mrn`, `Patient Id`, `PATIENT ID:`). Instead of encoding every case variant (`[Pp][Aa][Tt]...`), mark the expression case-insensitive:

```xml
<ParseJobTextFile name="ParsePatientId">
  <DcmTag tag="0010,0020" caseSensitive="false">MRN\s*:?\s*(\d{2,10})</DcmTag>
</ParseJobTextFile>
```

Or set the default for the whole action and override per entry where needed:

```xml
<ParseJobTextFile name="ParsePatientId" defaultCaseSensitive="false">
  <DcmTag tag="0010,0020">MRN\s*:?\s*(\d{2,10})</DcmTag>
  <DcmTag tag="0010,0020" caseSensitive="true">\bW(\d{2,8})\b</DcmTag>
</ParseJobTextFile>
```

## Match Policy

When several expressions target the same DICOM tag — for example a strong labeled match plus a weaker fallback — the default `lastMatch` policy means **whatever matches last wins**, including a weak fallback that happens to match later in the document.

`matchPolicy="firstMatch"` *(2.4.8+)* makes the **configured entry order the priority order**:

- List expressions **strongest first**.
- The first-listed entry that matches anywhere in the document wins for its tag, even if a weaker (later-listed) entry matched earlier in the text.
- An entry never overwrites its own first match (the first occurrence in the document is kept).

```xml
<ParseJobTextFile name="ParsePatientId" matchPolicy="firstMatch" defaultCaseSensitive="false">
  <!-- Strongest: explicit label -->
  <DcmTag tag="0010,0020">MRN\s*:?\s*(\d{2,10})</DcmTag>
  <!-- Fallback: bare legacy W-number -->
  <DcmTag tag="0010,0020">\b[Ww](\d{2,8})\b</DcmTag>
</ParseJobTextFile>
```

With this configuration a document containing a stray `W4444` in the header and `MRN: 12345` in the footer stores `12345` — under the legacy policy it would depend on document order.

**Note:** configurations written for the legacy behavior often list expressions weakest-first (so later, stronger entries overwrite). When opting into `firstMatch`, re-order the entries strongest-first.

## Empty Values

Since 2.4.8, a match whose rewritten value is empty (for example, an optional capture group that did not participate: `MRN:\s*(\d+)?` against the line `MRN:`) is **skipped**: nothing is written, and the entry does not count as found for `mandatory` validation. Previously an empty string was written and satisfied `mandatory`.

If writing a blank value is intentional, opt in per entry:

```xml
<DcmTag tag="0010,0020" allowEmpty="true">MRN:\s*(\d+)?</DcmTag>
```

## ParseJobFileName Examples

### Extract Patient ID from Filename

```xml
<ParseJobFileName name="ExtractPatientID">
  <!-- Filename pattern: PatientID_12345.pdf -->
  <DcmTag tag="0010,0020">PatientID_(\d+)\.pdf</DcmTag>
</ParseJobFileName>
```

Use in workflow with error handling:
```xml
<Perform action="ExtractPatientID" onError="Discard"/>
```

If the filename is `PatientID_12345.pdf`, this extracts `12345` and sets tag (0010,0020) to that value.

### Extract Multiple Fields

Each `<DcmTag>` entry has its own expression; capture what each tag needs:

```xml
<ParseJobFileName name="ExtractStudyInfo">
  <!-- Filename pattern: PATID12345_CT_20240315_ACC9876.pdf -->
  <DcmTag tag="0010,0020">PATID(\d+)</DcmTag>                <!-- Patient ID -->
  <DcmTag tag="0008,0060">PATID\d+_([A-Z]+)_</DcmTag>        <!-- Modality -->
  <DcmTag tag="0008,0020">_(\d{8})_</DcmTag>                 <!-- Study Date -->
  <DcmTag tag="0008,0050">_ACC(\w+)\.pdf</DcmTag>            <!-- Accession -->
</ParseJobFileName>
```

### Reformat with replacePattern

`replacePattern` rewrites the matched text using backreferences, which allows reordering and combining capture groups:

```xml
<ParseJobFileName name="FormatPatientName">
  <!-- Filename pattern: FirstName_LastName_12345.pdf -->
  <!-- Format as DICOM PN: Last^First -->
  <DcmTag tag="0010,0010" replacePattern="\2^\1">(\w+)_(\w+)_\d+\.pdf</DcmTag>
  <DcmTag tag="0010,0020" replacePattern="PAT\1">\w+_\w+_(\d+)\.pdf</DcmTag>
</ParseJobFileName>
```

For filename `John_Doe_12345.pdf`:
- Patient Name (0010,0010) = `Doe^John`
- Patient ID (0010,0020) = `PAT12345`

### Mandatory vs Optional Tags

```xml
<ParseJobFileName name="ExtractWithValidation">
  <!-- Patient ID is mandatory - action fails if not found -->
  <DcmTag tag="0010,0020" mandatory="true">ID(\d+)</DcmTag>
  <!-- Modality is optional - action succeeds even if not found -->
  <DcmTag tag="0008,0060">_([A-Z]{2})\.pdf</DcmTag>
</ParseJobFileName>
```

```xml
<Perform action="ExtractWithValidation" onError="Discard"/>
```

**Behavior:**
- Filename `ID12345.pdf`: **Success** - Patient ID extracted, Modality left unset
- Filename `ID12345_CT.pdf`: **Success** - Both extracted
- Filename `report.pdf`: **Failure** - Patient ID (mandatory) not found, job discarded

Mandatory validation is evaluated per job: a tag found while parsing one job never satisfies validation for a later job *(fixed in 2.4.8)*.

## ParseJobTextFile Examples

The text file is the `.txt` contents file the printer driver writes alongside the print job (same base name as the job). Expressions are applied to each line in turn.

For a print job with this associated text file:

```
Patient: John Doe
ID: 12345
Date: 2024-03-15
Accession: ACC9876
```

```xml
<ParseJobTextFile name="ParseReportData">
  <DcmTag tag="0010,0010">Patient:\s*(.+)</DcmTag>
  <DcmTag tag="0010,0020">^ID:\s*(\d+)</DcmTag>
  <DcmTag tag="0008,0050">Accession:\s*(\w+)</DcmTag>
</ParseJobTextFile>
```

**Line-by-line matching:** because the file is processed one line at a time, multi-line constructs such as `(?s)` have no effect — an expression only ever sees a single line.

### Robust Patient ID capture

A realistic labeled-ID matcher that survives label variants and excludes unwanted labels:

```xml
<ParseJobTextFile name="ParsePatientId" matchPolicy="firstMatch" defaultCaseSensitive="false">
  <!-- Strong labels anywhere in the line; HRI ID is excluded by lookbehind -->
  <DcmTag tag="0010,0020">(?&lt;!HRI )\b(?:Patient\s*ID|MRN|Hospital\s*(?:No\.?|ID))\s*:?\s*(\d{2,10}|[A-Za-z]\d{2,8})\b</DcmTag>
  <!-- Fallback: bare legacy W-number -->
  <DcmTag tag="0010,0020">\b[Ww](\d{2,8})(?![0-9A-Za-z./:-])</DcmTag>
</ParseJobTextFile>
```

## Error Handling

Parse actions fail when a tag marked `mandatory="true"` was not extracted by the end of the action. Configure the failure response in the workflow using the `onError` attribute on `<Perform>` nodes:

- `onError="Discard"` - Job is discarded on failure
- `onError="Ignore"` - Processing continues
- `onError="Hold"` - Job is held and retried later
- `onError="Suspend"` - Job is suspended for manual review

An alternative to `mandatory` is validating afterwards in the workflow — for example routing jobs with no captured Patient ID to manual matching:

```xml
<If field="TAG_VALUE(0010,0020)" value="^$">
  <Statements>
    <Perform action="ManualMatch"/>
  </Statements>
</If>
```

An absent tag matches `^$` exactly like an empty one.

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinterConfig SYSTEM "config.dtd">
<DicomPrinterConfig>
  <ActionsList>
    <!-- Parse patient ID and accession from filename -->
    <!-- Expected format: 12345_ACC9876_Report.pdf -->
    <ParseJobFileName name="ParseFilename">
      <DcmTag tag="0010,0020">^(\d+)_ACC\w+_\w+\.pdf$</DcmTag>
      <DcmTag tag="0008,0050">^\d+_ACC(\w+)_\w+\.pdf$</DcmTag>
    </ParseJobFileName>

    <!-- Parse patient name from the job text file -->
    <ParseJobTextFile name="ParsePatientName">
      <DcmTag tag="0010,0010" caseSensitive="false">Patient Name:\s*(.+)</DcmTag>
    </ParseJobTextFile>

    <Query name="FindWorklist" type="Worklist">
      <ConnectionParameters>
        <PeerAeTitle>RIS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020" />
      <DcmTag tag="0008,0050" />
    </Query>

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
    <Perform action="ParseFilename" onError="Discard"/>
    <Perform action="ParsePatientName"/>
    <Perform action="FindWorklist"/>
    <If field="QUERY_FOUND" value="1">
      <Statements>
        <Perform action="SendToPACS"/>
      </Statements>
    </If>
  </Workflow>
</DicomPrinterConfig>
```

## Best Practices

1. **Test patterns thoroughly** with representative filenames and report text
2. **Use specific patterns** to avoid false matches — never capture bare numbers as patient IDs (phone numbers and dates will match)
3. **Use `caseSensitive="false"`** instead of `[Pp][Aa][Tt]...` character-class encoding
4. **Use `matchPolicy="firstMatch"` with strongest-first ordering** when combining labeled expressions with fallbacks
5. **Use `mandatory="true"` for critical tags**, or validate afterwards with `TAG_VALUE(...) value="^$"` and route to manual matching
6. **Use `replacePattern` to format data** according to DICOM standards (e.g., Patient Name as `Last^First`)
7. **Escape `<` as `&lt;`** in lookbehind patterns — the configuration is XML
8. **Document expected filename/report formats** in comments

## Related Topics

- [Actions Overview](index.md)
- [SetTag Actions](settag.md)
- [Query Actions](query.md)
- [Placeholders](../placeholders.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
