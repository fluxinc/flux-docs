# Conditional Nodes

Conditional nodes enable workflow branching based on data values, query results, and action outcomes.

## Conditional Node Types

- **If** - Single condition evaluation with optional Else branch
- **Switch** - Multi-way branching with case statements

## If Nodes

If nodes evaluate a condition and execute the nodes inside `<Statements>` when it is true, or the nodes inside the optional `<Else>` when it is false.

### Basic Syntax

```xml
<If field="FIELD_TYPE" value="CompareValue">
  <Statements>
    <!-- Nodes to execute if the condition is true -->
  </Statements>
  <Else>
    <!-- Optional: nodes to execute if the condition is false -->
  </Else>
</If>
```

**The `<Statements>` element is required.** Workflow nodes placed directly inside `<If>` are a configuration error.

### Attributes

#### `field` (Required)
The type of field to evaluate.

**Valid Values:** `CLIENT_HOST_NAME`, `PRINTED_FILE_NAME`, `QUERY_FOUND`, `QUERY_PARTIAL`, `STORE_SUCCEEDED`, `TAG_VALUE(...)`

#### `value` (Required)
The value to compare against. For `TAG_VALUE(...)` this is a regular expression; for all other fields it is compared literally.

#### `caseSensitive` (Optional, 2.4.8+)
**Valid Values:** `true` (default), `false`

When `false`, literal comparisons (`CLIENT_HOST_NAME`, `PRINTED_FILE_NAME`, ...) ignore case, and `TAG_VALUE(...)` regular expressions match case-insensitively.

## Field Types

### CLIENT_HOST_NAME

Compares the client hostname that submitted the print job (exact string match).

```xml
<If field="CLIENT_HOST_NAME" value="WORKSTATION-01">
  <Statements>
    <Perform action="ProcessFromWorkstation01"/>
  </Statements>
</If>
```

Add `caseSensitive="false"` when host naming conventions are inconsistent:

```xml
<If field="CLIENT_HOST_NAME" value="workstation-01" caseSensitive="false">
  <Statements>
    <Perform action="ProcessFromWorkstation01"/>
  </Statements>
</If>
```

### PRINTED_FILE_NAME

Compares the print job filename using exact string matching.

```xml
<If field="PRINTED_FILE_NAME" value="Report.pdf">
  <Statements>
    <Perform action="ProcessReport"/>
  </Statements>
</If>
```

**Note:** for pattern or substring matching, parse the filename into a tag first (see [Parse Actions](../actions/parse.md)) and use `TAG_VALUE(...)`.

### QUERY_FOUND

Checks whether the most recent query action found a match.

**Valid Values:** `1` (found), `0` (not found)

```xml
<Perform action="QueryWorklist"/>

<If field="QUERY_FOUND" value="1">
  <Statements>
    <!-- Query found a match -->
    <Perform action="ProcessWithPatientData"/>
  </Statements>
  <Else>
    <!-- No match found -->
    <Perform action="HandleNoMatch"/>
  </Else>
</If>
```

### QUERY_PARTIAL

Checks whether the most recent query returned multiple matches (ambiguous results).

**Valid Values:** `1`, `0`

```xml
<Perform action="QueryWorklist"/>

<If field="QUERY_PARTIAL" value="1">
  <Statements>
    <!-- Multiple matches - needs manual selection -->
    <Perform action="NotifyMultipleMatches"/>
    <Suspend resumeAction="QueryWorklist"/>
  </Statements>
</If>
```

### STORE_SUCCEEDED

Checks whether the **most recent** Store action succeeded. The flag is job-wide: it reflects the last `Store` that ran, so test it immediately after the store in question.

**Valid Values:** `1`, `0`

```xml
<Perform action="SendToPrimaryPACS" onError="Ignore"/>

<If field="STORE_SUCCEEDED" value="0">
  <Statements>
    <!-- Primary failed - try backup -->
    <Perform action="SendToBackupPACS"/>
  </Statements>
</If>
```

### TAG_VALUE

Compares a DICOM tag value using **regular expression matching**.

**Syntax:**
- `field` - `TAG_VALUE(GGGG,EEEE)` or `TAG_VALUE(TagName)` — numeric tags use 1-4 hex digits for group and element; dictionary names such as `PatientID` also work
- `value` - Regular expression pattern (Qt `QRegularExpression` / PCRE2 since 2.4.8)

**Matching Behavior:**
Unlike other field types, TAG_VALUE treats `value` as a regular expression and matches it anywhere in the tag's value (substring matching). Anchor with `^...$` for exact matches.

**Absent tags match like empty values:** if the tag is not present in the dataset at all, the condition is evaluated against an empty string. `value="^$"` therefore detects "empty **or** never set" — the standard guard for routing unparsed jobs to manual matching.

```xml
<If field="TAG_VALUE(0010,0020)" value="^$">
  <Statements>
    <!-- No patient ID was captured -->
    <Perform action="ManualMatch"/>
  </Statements>
</If>
```

**Examples:**

Exact modality match:
```xml
<If field="TAG_VALUE(0008,0060)" value="^CT$">
  <Statements>
    <Perform action="ProcessCT"/>
  </Statements>
</If>
```

Non-empty patient ID:
```xml
<If field="TAG_VALUE(0010,0020)" value=".+">
  <Statements>
    <Perform action="ProcessWithID"/>
  </Statements>
</If>
```

Alternation:
```xml
<If field="TAG_VALUE(0008,0060)" value="^(CT|MR)$">
  <Statements>
    <Perform action="ProcessCrossSectional"/>
  </Statements>
</If>
```

Case-insensitive institution check *(2.4.8+)*:
```xml
<If field="TAG_VALUE(0008,0080)" value="general hospital" caseSensitive="false">
  <Statements>
    <Perform action="ProcessGeneralHospital"/>
  </Statements>
</If>
```

Since 2.4.8 the pattern is a full PCRE2 regular expression, so lookahead/lookbehind and inline options such as `(?i)` are available. Escape `<` as `&lt;` inside the XML attribute.

**Private Tags:**
Tags with odd group numbers are automatically treated as private tags and the private creator ID is set automatically.

## Multiple If Nodes

Multiple If nodes can be used for multi-way branching:

```xml
<If field="TAG_VALUE(0008,0060)" value="^CT$">
  <Statements>
    <Perform action="ProcessCT"/>
  </Statements>
</If>

<If field="TAG_VALUE(0008,0060)" value="^MR$">
  <Statements>
    <Perform action="ProcessMR"/>
  </Statements>
</If>
```

**Note:** All matching If nodes execute. This is different from Switch nodes where only one case executes.

## Nested If Nodes

If nodes can be nested for compound conditions:

```xml
<If field="QUERY_FOUND" value="1">
  <Statements>
    <If field="TAG_VALUE(0010,0040)" value="^M$">
      <Statements>
        <Perform action="ProcessMalePatient"/>
      </Statements>
    </If>
  </Statements>
</If>
```

## Switch Nodes

Switch nodes provide multi-way branching where exactly one branch executes: the matching `<Case>`, or `<Default>` when no case matches.

### Supported Field Types

**Important:** Switch nodes only support these field types:
- `CLIENT_HOST_NAME`
- `PRINTED_FILE_NAME`

Switch does NOT support `QUERY_FOUND`, `QUERY_PARTIAL`, `TAG_VALUE`, or `STORE_SUCCEEDED`. Use If nodes for those.

### Basic Syntax

```xml
<Switch field="FIELD_TYPE">
  <Case value="Value1">
    <!-- Execute if field equals Value1 -->
  </Case>
  <Case value="Value2">
    <!-- Execute if field equals Value2 -->
  </Case>
  <Default>
    <!-- Optional: execute if no case matches -->
  </Default>
</Switch>
```

`Case` values are compared exactly. Each `Case` requires a non-empty `value`; the fallback branch is the `<Default>` element.

### Attributes

#### `field` (Required)
`CLIENT_HOST_NAME` or `PRINTED_FILE_NAME`.

#### `caseSensitive` (Optional, 2.4.8+)
**Valid Values:** `true` (default), `false`

When `false`, case lookup ignores case. If two `Case` values differ only by case, the first one declared wins.

### Switch Example: Hostname Routing

```xml
<Switch field="CLIENT_HOST_NAME" caseSensitive="false">
  <Case value="CT-WORKSTATION">
    <Perform action="SendToCTPACS"/>
  </Case>
  <Case value="MR-WORKSTATION">
    <Perform action="SendToMRPACS"/>
  </Case>
  <Default>
    <Perform action="SendToGeneralPACS"/>
  </Default>
</Switch>
```

### Switch vs Multiple If Nodes

**Switch nodes:**
- Exactly one branch executes
- Cleaner syntax for mutually exclusive routing

**Multiple If nodes:**
- All matching conditions execute
- Support regex (`TAG_VALUE`) and query/store outcome fields
- Support an `<Else>` branch per condition

## Common Patterns

### Patient Match Workflow

```xml
<Perform action="QueryWorklist"/>

<If field="QUERY_PARTIAL" value="1">
  <Statements>
    <Perform action="NotifyAmbiguous"/>
    <Suspend resumeAction="QueryWorklist"/>
  </Statements>
</If>

<If field="QUERY_FOUND" value="1">
  <Statements>
    <Perform action="AddMetadata"/>
    <Perform action="SendToPACS"/>
  </Statements>
  <Else>
    <Perform action="NotifyNoMatch"/>
    <Suspend resumeAction="QueryWorklist"/>
  </Else>
</If>
```

### Route Unparsed Jobs to Manual Matching

```xml
<Perform action="ParsePatientId"/>

<If field="TAG_VALUE(0010,0020)" value="^$">
  <Statements>
    <!-- Nothing captured (tag empty or absent) -->
    <Perform action="ManualMatch"/>
  </Statements>
</If>
```

### Store Fallback

```xml
<Perform action="SendToPrimaryPACS" onError="Ignore"/>

<If field="STORE_SUCCEEDED" value="0">
  <Statements>
    <Perform action="SendToBackupPACS"/>
    <If field="STORE_SUCCEEDED" value="0">
      <Statements>
        <Perform action="NotifyAllFailed"/>
        <Suspend resumeAction="SendToPrimaryPACS"/>
      </Statements>
    </If>
  </Statements>
</If>
```

`STORE_SUCCEEDED` always reflects the most recent Store action, which is why the inner check refers to `SendToBackupPACS`.

### Demographics Guard

```xml
<If field="TAG_VALUE(0010,0010)" value="^$">
  <Statements>
    <Suspend resumeAction="QueryWorklist"/>
  </Statements>
</If>
```

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinterConfig SYSTEM "config.dtd">
<DicomPrinterConfig>
  <ActionsList>
    <ParseJobFileName name="ExtractPatientID">
      <DcmTag tag="0010,0020">^(\d+)_.*\.pdf$</DcmTag>
    </ParseJobFileName>

    <Query name="FindWorklist" type="Worklist">
      <ConnectionParameters>
        <PeerAeTitle>RIS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020" />
    </Query>

    <Store name="SendToCTPACS">
      <ConnectionParameters>
        <PeerAeTitle>CT_PACS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.101</Host>
        <Port>104</Port>
      </ConnectionParameters>
    </Store>

    <Store name="SendToGeneralPACS">
      <ConnectionParameters>
        <PeerAeTitle>GENERAL_PACS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.100</Host>
        <Port>104</Port>
      </ConnectionParameters>
    </Store>

    <Notify name="NotifyNoMatch"/>
  </ActionsList>

  <Workflow>
    <Perform action="ExtractPatientID"/>

    <!-- Validate patient ID exists (empty or absent) -->
    <If field="TAG_VALUE(0010,0020)" value="^$">
      <Statements>
        <Discard/>
      </Statements>
    </If>

    <Perform action="FindWorklist"/>

    <If field="QUERY_FOUND" value="1">
      <Statements>
        <!-- Route CT to the CT archive, everything else to general PACS -->
        <If field="TAG_VALUE(0008,0060)" value="^CT$">
          <Statements>
            <Perform action="SendToCTPACS"/>
          </Statements>
          <Else>
            <Perform action="SendToGeneralPACS"/>
          </Else>
        </If>
      </Statements>
      <Else>
        <Perform action="NotifyNoMatch"/>
        <Suspend resumeAction="FindWorklist"/>
      </Else>
    </If>
  </Workflow>
</DicomPrinterConfig>
```

## Related Topics

- [Workflow Overview](index.md)
- [Control Nodes](control-nodes.md)
- [Actions Overview](../actions/index.md)
- [Parse Actions](../actions/parse.md)
- [Query Actions](../actions/query.md)
- [Store Actions](../actions/store.md)
