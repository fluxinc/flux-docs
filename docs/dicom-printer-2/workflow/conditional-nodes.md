# Conditional Nodes

Conditional nodes enable workflow branching based on data values, query results, and action outcomes.

## Conditional Node Types

- **If** - Single condition evaluation
- **Switch** - Multi-way branching with case statements

## If Nodes

If nodes execute their child nodes when a condition is true.

### Basic Syntax

```xml
<If field="FieldType" value="CompareValue">
  <!-- Nodes to execute if condition is true -->
</If>
```

### Attributes

#### `field` (Required)
The type of field to evaluate.

**Valid Values:** `CLIENT_HOST_NAME`, `PRINTED_FILE_NAME`, `QUERY_FOUND`, `QUERY_PARTIAL`, `TAG_VALUE`, `STORE_SUCCEEDED`

#### `value` (Required)
The value to compare against.

#### `tag` (Optional)
For `TAG_VALUE` and `STORE_SUCCEEDED` field types, specifies the tag or action name.

## Field Types

### CLIENT_HOST_NAME

Compares the client hostname that submitted the print job.

```xml
<If field="CLIENT_HOST_NAME" value="WORKSTATION-01">
  <!-- Execute for jobs from WORKSTATION-01 -->
  <Perform action="ProcessFromWorkstation01"/>
</If>
```

Use cases:
- Route jobs differently based on source computer
- Apply specific processing for certain workstations
- Implement workstation-specific workflows

### PRINTED_FILE_NAME

Compares the print job filename using exact string matching.

```xml
<If field="PRINTED_FILE_NAME" value="Report.pdf">
  <!-- Execute for files named exactly "Report.pdf" -->
  <Perform action="ProcessReport"/>
</If>
```

The comparison uses **exact matching** - the value must match the complete filename.

```xml
<If field="PRINTED_FILE_NAME" value="PatientData.pdf">
  <!-- Execute for files named exactly "PatientData.pdf" -->
  <Perform action="ProcessPDF"/>
</If>

<If field="PRINTED_FILE_NAME" value="scan001.jpg">
  <!-- Execute for files named exactly "scan001.jpg" -->
  <Perform action="ProcessImage"/>
</If>
```

**Note:** Use TAG_VALUE with appropriate DICOM tags if you need pattern matching or substring matching for filenames

### QUERY_FOUND

Checks if a query action found matching results.

```xml
<Perform action="QueryWorklist"/>

<If field="QUERY_FOUND" value="true">
  <!-- Query found a match -->
  <Perform action="ProcessWithPatientData"/>
</If>

<If field="QUERY_FOUND" value="false">
  <!-- No match found -->
  <Perform action="HandleNoMatch"/>
</If>
```

**Valid Values:** `true`, `false`

Common usage:
- Execute actions only when patient data is found
- Implement fallback processing for unmatched patients
- Trigger alerts or manual review

### QUERY_PARTIAL

Checks if a query returned multiple matches (partial/ambiguous results).

```xml
<Perform action="QueryWorklist"/>

<If field="QUERY_PARTIAL" value="true">
  <!-- Multiple matches - needs manual selection -->
  <Perform action="NotifyMultipleMatches"/>
  <Suspend/>
</If>
```

**Valid Values:** `true`, `false`

Use cases:
- Detect ambiguous patient matches
- Trigger manual review for multiple results
- Prevent incorrect patient matching

### TAG_VALUE

Compares a DICOM tag value using **regular expression matching**.

```xml
<If field="TAG_VALUE(0010,0040)" value="M">
  <!-- Male patient -->
  <Perform action="ProcessMalePatient"/>
</If>

<If field="TAG_VALUE(0010,0040)" value="F">
  <!-- Female patient -->
  <Perform action="ProcessFemalePatient"/>
</If>
```

**Syntax:**
- `field` - `TAG_VALUE(GGGG,EEEE)` where GGGG is group and EEEE is element (1-4 hex digits each)
- `value` - Regular expression pattern to match

**Matching Behavior:**
Unlike other field types that use exact string comparison, TAG_VALUE uses **regular expression substring matching**. The value is treated as a regex pattern and matched against the tag's value using substring matching.

**Examples:**

Check modality (exact match):
```xml
<If field="TAG_VALUE(0008,0060)" value="^CT$">
  <!-- CT images (exact match) -->
  <Perform action="ProcessCT"/>
</If>
```

Check patient ID exists (non-empty):
```xml
<If field="TAG_VALUE(0010,0020)" value=".+">
  <!-- Non-empty patient ID -->
  <Perform action="ProcessWithID"/>
</If>
```

Check accession number pattern:
```xml
<If field="TAG_VALUE(0008,0050)" value="^ACC\d+$">
  <!-- Accession number starting with "ACC" followed by digits -->
  <Perform action="SpecialProcessing"/>
</If>
```

**Private Tags:**
Tags with odd group numbers are automatically treated as private tags and the private creator ID is set automatically.

**Regular Expression Patterns:**
```xml
<!-- Match any CT or MR modality -->
<If field="TAG_VALUE(0008,0060)" value="^(CT|MR)$">
  <Perform action="ProcessCrossSectional"/>
</If>

<!-- Match patient IDs starting with "P" -->
<If field="TAG_VALUE(0010,0020)" value="^P">
  <Perform action="ProcessPrefixedID"/>
</If>

<!-- Check if tag contains specific text -->
<If field="TAG_VALUE(0008,0080)" value="General Hospital">
  <Perform action="ProcessGeneralHospital"/>
</If>
```

### STORE_SUCCEEDED

Checks if a store action succeeded.

```xml
<Perform action="SendToPrimaryPACS"/>

<If field="STORE_SUCCEEDED" tag="SendToPrimaryPACS" value="true">
  <!-- Store succeeded -->
  <Perform action="NotifySuccess"/>
</If>

<If field="STORE_SUCCEEDED" tag="SendToPrimaryPACS" value="false">
  <!-- Store failed - try backup -->
  <Perform action="SendToBackupPACS"/>
</If>
```

**Attributes:**
- `tag` - Name of the Store action
- `value` - `true` or `false`

Use cases:
- Implement fallback destinations
- Trigger notifications on failure
- Conditional processing based on storage success

## Multiple If Nodes

Multiple If nodes can be used for multi-way branching:

```xml
<If field="TAG_VALUE(0008,0060)" value="^CT$">
  <Perform action="ProcessCT"/>
</If>

<If field="TAG_VALUE(0008,0060)" value="^MR$">
  <Perform action="ProcessMR"/>
</If>

<If field="TAG_VALUE(0008,0060)" value="^CR$">
  <Perform action="ProcessCR"/>
</If>
```

**Note:** All matching If nodes execute. This is different from Switch nodes where only one case executes.

## Nested If Nodes

If nodes can be nested for complex conditions:

```xml
<If field="QUERY_FOUND" value="true">
  <!-- Patient found -->
  <If field="TAG_VALUE(0010,0040)" value="^M$">
    <!-- Male patient -->
    <If field="TAG_VALUE(0008,0060)" value="^CT$">
      <!-- Male CT patient -->
      <Perform action="ProcessMaleCT"/>
    </If>
  </If>
</If>
```

## Switch Nodes

Switch nodes provide multi-way branching where only the first matching case executes.

### Supported Field Types

**Important:** Switch nodes only support these field types:
- `CLIENT_HOST_NAME`
- `PRINTED_FILE_NAME`

Switch does NOT support `QUERY_FOUND`, `QUERY_PARTIAL`, `TAG_VALUE`, or `STORE_SUCCEEDED`. Use multiple If nodes for those field types.

### Basic Syntax

```xml
<Switch field="FieldType">
  <Case value="Value1">
    <!-- Execute if field equals Value1 -->
  </Case>
  <Case value="Value2">
    <!-- Execute if field equals Value2 -->
  </Case>
  <!-- Default case (optional) -->
  <Case value="">
    <!-- Execute if no other case matches -->
  </Case>
</Switch>
```

### Switch Example: Hostname Routing

```xml
<Switch field="CLIENT_HOST_NAME">
  <Case value="CT-WORKSTATION">
    <Perform action="SendToCTPACS"/>
  </Case>
  <Case value="MR-WORKSTATION">
    <Perform action="SendToMRPACS"/>
  </Case>
  <Case value="CR-WORKSTATION">
    <Perform action="SendToCRPACS"/>
  </Case>
  <Case value="">
    <!-- Default case -->
    <Perform action="SendToGeneralPACS"/>
  </Case>
</Switch>
```

Only the first matching case executes. If none match, the default case (empty value) executes if present.

### Switch vs Multiple If Nodes

**Switch nodes:**
- Only first match executes
- More efficient for mutually exclusive conditions
- Cleaner syntax for multi-way branching

**Multiple If nodes:**
- All matching conditions execute
- Better for non-exclusive conditions
- More flexible for complex logic

## Common Patterns

### Patient Match Workflow

```xml
<Perform action="QueryWorklist"/>

<If field="QUERY_FOUND" value="true">
  <!-- Single match found -->
  <Perform action="AddMetadata"/>
  <Perform action="SendToPACS"/>
</If>

<If field="QUERY_PARTIAL" value="true">
  <!-- Multiple matches -->
  <Perform action="NotifyAmbiguous"/>
  <Suspend/>
</If>

<If field="QUERY_FOUND" value="false">
  <!-- No match -->
  <Perform action="NotifyNoMatch"/>
  <Suspend/>
</If>
```

### Modality-Based Processing

```xml
<If field="TAG_VALUE(0008,0060)" value="^CT$">
  <Perform action="CompressCT"/>
  <Perform action="SendToCTPACS"/>
</If>

<If field="TAG_VALUE(0008,0060)" value="^MR$">
  <Perform action="CompressMR"/>
  <Perform action="SendToMRPACS"/>
</If>

<If field="TAG_VALUE(0008,0060)" value="^US$">
  <Perform action="ConvertToStandardFormat"/>
  <Perform action="SendToUSPACS"/>
</If>
```

**Note:** Use multiple If nodes for TAG_VALUE matching since Switch doesn't support TAG_VALUE field type.

### Filename-Based Routing

```xml
<If field="CLIENT_HOST_NAME" value="STAT-WORKSTATION">
  <!-- STAT priority workstation -->
  <Perform action="SendToStatPACS"/>
  <Perform action="NotifyStatJob"/>
  <Perform action="PrintToFilm"/>
</If>

<If field="CLIENT_HOST_NAME" value="ROUTINE-WORKSTATION">
  <!-- Routine priority workstation -->
  <Perform action="SendToPACS"/>
</If>
```

### Workstation-Specific Workflows

```xml
<If field="CLIENT_HOST_NAME" value="ER-WORKSTATION">
  <!-- Emergency department -->
  <Perform action="HighPriorityProcessing"/>
  <Perform action="SendToERPACS"/>
  <Perform action="NotifyERStaff"/>
</If>

<If field="CLIENT_HOST_NAME" value="RADIOLOGY-01">
  <!-- Radiology department -->
  <Perform action="StandardProcessing"/>
  <Perform action="SendToRadiologyPACS"/>
</If>
```

### Error Handling with Fallback

```xml
<Perform action="SendToPrimaryPACS"/>

<If field="STORE_SUCCEEDED" tag="SendToPrimaryPACS" value="false">
  <!-- Primary failed - try backup -->
  <Perform action="SendToBackupPACS"/>

  <If field="STORE_SUCCEEDED" tag="SendToBackupPACS" value="false">
    <!-- Both failed - try tertiary -->
    <Perform action="SendToTertiaryPACS"/>

    <If field="STORE_SUCCEEDED" tag="SendToTertiaryPACS" value="false">
      <!-- All failed - suspend -->
      <Perform action="NotifyAllFailed"/>
      <Suspend/>
    </If>
  </If>
</If>
```

### Patient Demographics Check

```xml
<If field="TAG_VALUE(0010,0010)" value="^$">
  <!-- Empty patient name -->
  <Suspend/>
</If>

<If field="TAG_VALUE(0010,0020)" value="^$">
  <!-- Empty patient ID -->
  <Suspend/>
</If>

<If field="TAG_VALUE(0010,0030)" value="^$">
  <!-- Empty birth date -->
  <Perform action="NotifyMissingBirthDate"/>
  <!-- Continue processing -->
</If>
```

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <ParseJobFileName name="ExtractPatientID">
      <Pattern>(\d+)_.*\.pdf</Pattern>
      <DcmTag tag="0010,0020" group="1"/>
    </ParseJobFileName>

    <Query name="FindWorklist" type="Worklist"
           calledAE="RIS" callingAE="PRINTER"
           host="192.168.1.200" port="104">
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <SetTag name="AddMetadata">
      <DcmTag tag="0008,0020" value="#{Date}"/>
    </SetTag>

    <Store name="SendToCTPACS"
           calledAE="CT_PACS" callingAE="PRINTER"
           host="192.168.1.101" port="104"/>

    <Store name="SendToMRPACS"
           calledAE="MR_PACS" callingAE="PRINTER"
           host="192.168.1.102" port="104"/>

    <Store name="SendToGeneralPACS"
           calledAE="GENERAL_PACS" callingAE="PRINTER"
           host="192.168.1.100" port="104"/>

    <Store name="SendToBackupPACS"
           calledAE="BACKUP_PACS" callingAE="PRINTER"
           host="192.168.1.200" port="104"/>

    <Notify name="NotifyNoMatch" mandatory="false" onError="Ignore"/>
    <Notify name="NotifyMultipleMatches" mandatory="false" onError="Ignore"/>
  </Actions>

  <Workflow>
    <!-- Extract patient ID -->
    <Perform action="ExtractPatientID"/>

    <!-- Validate patient ID exists -->
    <If field="TAG_VALUE(0010,0020)" value="^$">
      <Discard/>
    </If>

    <!-- Query worklist -->
    <Perform action="FindWorklist"/>

    <!-- Handle query results -->
    <If field="QUERY_PARTIAL" value="true">
      <!-- Multiple matches - need manual selection -->
      <Perform action="NotifyMultipleMatches"/>
      <Suspend/>
    </If>

    <If field="QUERY_FOUND" value="false">
      <!-- No match - suspend for review -->
      <Perform action="NotifyNoMatch"/>
      <Suspend/>
    </If>

    <If field="QUERY_FOUND" value="true">
      <!-- Single match - process normally -->
      <Perform action="AddMetadata"/>

      <!-- Route by modality using If nodes -->
      <If field="TAG_VALUE(0008,0060)" value="^CT$">
        <Perform action="SendToCTPACS"/>
      </If>

      <If field="TAG_VALUE(0008,0060)" value="^MR$">
        <Perform action="SendToMRPACS"/>
      </If>

      <!-- Default: send to general PACS if not CT or MR -->
      <If field="STORE_SUCCEEDED" tag="SendToCTPACS" value="false">
        <If field="STORE_SUCCEEDED" tag="SendToMRPACS" value="false">
          <Perform action="SendToGeneralPACS"/>

          <If field="STORE_SUCCEEDED" tag="SendToGeneralPACS" value="false">
            <!-- All stores failed - try backup -->
            <Perform action="SendToBackupPACS"/>
          </If>
        </If>
      </If>
    </If>
  </Workflow>
</DicomPrinter>
```

## Related Topics

- [Workflow Overview](index.md)
- [Control Nodes](control-nodes.md)
- [Actions Overview](../actions/index.md)
- [Query Actions](../actions/query.md)
- [Store Actions](../actions/store.md)
