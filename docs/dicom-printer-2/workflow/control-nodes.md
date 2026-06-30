# Control Flow Nodes

Control flow nodes manage job execution and state within workflows.

## Control Node Types

- **Perform** - Execute an action
- **Suspend** - Suspend job for manual intervention
- **Discard** - Discard job and remove from queue
- **Update** - Update workflow state

## Perform Nodes

Perform nodes execute actions defined in the `<ActionsList>` section.

### Basic Syntax

```xml
<Perform action="ActionName"/>
```

### Attributes

#### `action` (Required)
The name of the action to execute.

```xml
<Perform action="QueryWorklist"/>
```

#### `onError` (Optional)
Controls how the workflow handles errors when the action fails.

**Valid Values:**
- `Hold` - Stop processing and hold the job (files retained for retry) *(default)*
- `Ignore` - Log the error but continue processing
- `Suspend` - Pause the job for manual intervention with resume capability
- `Discard` - Terminate the job and delete all files

**Default:** `Hold`

```xml
<!-- Hold on error (default) - job stops, files retained -->
<Perform action="SendToPACS"/>

<!-- Ignore errors - continue even if action fails -->
<Perform action="OptionalNotification" onError="Ignore"/>

<!-- Suspend on error - allow manual intervention and resume -->
<Perform action="QueryWorklist" onError="Suspend"/>

<!-- Discard on error - terminate job completely -->
<Perform action="ValidateRequired" onError="Discard"/>
```

**Error Handling Examples:**

```xml
<!-- Critical action - must succeed -->
<Perform action="SendToPACS" onError="Hold"/>

<!-- Optional notification - don't stop on failure -->
<Perform action="SendEmail" onError="Ignore"/>

<!-- Query failure - allow retry after fixing data -->
<Perform action="QueryWorklist" onError="Suspend"/>

<!-- Invalid data - discard immediately -->
<Perform action="ValidatePatientID" onError="Discard"/>
```

### Example: Sequential Actions

```xml
<Workflow>
  <Perform action="ParseFilename"/>
  <Perform action="QueryWorklist"/>
  <Perform action="SetMetadata"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

Actions execute in the order specified.

### Example: Conditional Execution

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <Perform action="SetMetadata"/>
      <Perform action="SendToPACS"/>
    </Statements>
  </If>
</Workflow>
```

Actions inside conditionals only execute when the condition is true.

### Example: Multiple Actions

```xml
<Workflow>
  <Perform action="TrimImage"/>
  <Perform action="RotateImage"/>
  <Perform action="ResizeImage"/>
  <Perform action="SaveToArchive"/>
  <Perform action="SendToPACS"/>
  <Perform action="PrintToFilm"/>
</Workflow>
```

### Nested Query Configuration

Perform nodes can contain nested Query elements to override action parameters for specific workflow executions. This allows reusing a Query action with different parameters.

```xml
<ActionsList>
  <!-- Define base query action -->
  <Query name="QueryWorklist" type="Worklist">
    <ConnectionParameters>
      <PeerAeTitle>RIS</PeerAeTitle>
      <MyAeTitle>PRINTER</MyAeTitle>
      <Host>192.168.1.200</Host>
      <Port>104</Port>
    </ConnectionParameters>
    <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
  </Query>
</ActionsList>

<Workflow>
  <!-- Use base query with additional parameter -->
  <Perform action="QueryWorklist">
    <Query>
      <DcmTag tag="0010,0030">#{BirthDate}</DcmTag>
    </Query>
  </Perform>
</Workflow>
```

The nested Query element creates a temporary clone of the action with the specified parameters merged in, allowing workflow-specific customization without defining multiple similar actions.

**Supported Nested Configurations:**
- WorklistQuery
- StudyQuery
- PatientQuery

## Suspend Nodes

Suspend nodes pause job processing, requiring manual intervention to resume.

### Basic Syntax

```xml
<Suspend resumeAction="QueryWorklist"/>
```

The `resumeAction` attribute is required; a `<Suspend>` without it is rejected when the configuration loads.

### When to Use Suspend

Use suspend nodes when:
- Manual review is required
- Data validation fails
- Patient matching is ambiguous
- Processing cannot continue automatically
- Quality control checks are needed

### Attributes

The `maxRetries` attribute limits how many times a job can be suspended before falling through to the next workflow node.

| Attribute | Required | Description |
|---|---|---|
| `resumeAction` | Yes | Action to re-execute when the job is resumed. A `<Suspend>` without `resumeAction` is rejected at config load. |
| `maxRetries` | No | Maximum number of suspend/resume cycles. Default: unlimited (omit the attribute). When exhausted, the node falls through instead of suspending. |

Example:
```xml
<Suspend resumeAction="RetryWorklist" maxRetries="5"/>
```

#### Retry Tracking (.meta files)

When `maxRetries` is set, the system tracks retry count in a JSON companion file stored alongside the job:

```json
{"retries": 3, "lastAttempt": "2026-03-15T14:30:00"}
```

The `.meta` file is:

- Created on the first retry attempt
- Updated each time the job is suspended again
- Deleted when a `ManualQuery` action re-parks the job (giving it a fresh retry budget)

### Example: No Patient Match

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <!-- No patient match - manual review needed -->
      <Suspend resumeAction="QueryWorklist"/>
    </Statements>
  </If>
</Workflow>
```

### Example: Multiple Matches

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_PARTIAL" value="1">
    <Statements>
      <!-- Multiple matches - user must select -->
      <Perform action="NotifyMultipleMatches"/>
      <Suspend resumeAction="QueryWorklist"/>
    </Statements>
  </If>
</Workflow>
```

### Example: Missing Required Data

```xml
<Workflow>
  <Perform action="ParseFilename"/>

  <If field="TAG_VALUE(0010,0020)" value="^$">
    <Statements>
      <!-- No patient ID - cannot process -->
      <Suspend resumeAction="ParseFilename"/>
    </Statements>
  </If>
</Workflow>
```

### Example: Validation Failure

```xml
<Workflow>
  <Perform action="ParseFilename"/>

  <!-- Accession Number is missing or empty -->
  <If field="TAG_VALUE(0008,0050)" value="^$">
    <Statements>
      <!-- Required data missing -->
      <Perform action="NotifyValidationFailure"/>
      <Suspend resumeAction="ParseFilename"/>
    </Statements>
  </If>
</Workflow>
```

### Resuming Suspended Jobs

Suspended jobs remain in the queue and can be resumed:
- Manually through the [DICOM Printer Console](/dicom-printer-2/control-app)
- Automatically after fixing the issue (e.g., adding patient to worklist)
- By modifying the job data and resuming

#### Resume Mechanics

When a job is resumed, the workflow execution follows these steps:

1. **Workflow restarts from the beginning** - The entire workflow is re-executed from the first node
2. **Actions are skipped until resume point** - All Perform nodes before the resume action are skipped
3. **Resume action executes** - When the workflow reaches the action specified in `resumeAction` attribute of the Suspend node:
   - The resumed flag is cleared
   - The resume action executes normally
4. **Normal execution continues** - All subsequent nodes after the resume action execute normally

**Example with resume flow:**

```xml
<ActionsList>
  <ParseJobFileName name="ParseID"><!-- config --></ParseJobFileName>
  <Query name="QueryWorklist"><!-- config --></Query>
  <SetTag name="AddMetadata"><!-- config --></SetTag>
  <Store name="SendToPACS"><!-- config --></Store>
</ActionsList>

<Workflow>
  <Perform action="ParseID"/>           <!-- Step 1: Executes on first run, skipped on resume -->
  <Perform action="QueryWorklist"/>     <!-- Step 2: Executes on first run, THIS IS RESUME POINT -->

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <Suspend resumeAction="QueryWorklist"/>  <!-- Suspends here, sets resume to QueryWorklist -->
    </Statements>
  </If>

  <Perform action="AddMetadata"/>       <!-- Step 3: Only executes after successful resume -->
  <Perform action="SendToPACS"/>        <!-- Step 4: Only executes after successful resume -->
</Workflow>
```

**Resume flow:**
1. Job runs, ParseID executes
2. QueryWorklist executes, finds no match
3. Job suspends at Suspend node with `resumeAction="QueryWorklist"`
4. User adds patient to worklist and resumes job
5. Workflow restarts: ParseID is skipped (already executed)
6. QueryWorklist executes again (resume point), now finds match
7. AddMetadata executes normally
8. SendToPACS executes normally

**Important Notes:**
- Suspend nodes require `resumeAction` attribute specifying which action to resume from
- Resumed jobs cannot be suspended again by Suspend nodes (prevents infinite loops)
- Resumed jobs cannot be discarded by Discard nodes (job has been manually approved)

## Discard Nodes

Discard nodes remove jobs from the queue immediately.

### Basic Syntax

```xml
<Discard/>
```

### When to Use Discard

Use discard nodes when:
- Job is invalid and cannot be processed
- Data is corrupt or incomplete
- Job does not meet minimum requirements
- Processing is not possible or appropriate

### Example: No Patient ID

```xml
<Workflow>
  <Perform action="ParseFilename"/>

  <If field="TAG_VALUE(0010,0020)" value="^$">
    <Statements>
      <!-- No patient ID - cannot process -->
      <Discard/>
    </Statements>
  </If>
</Workflow>
```

### Example: Invalid File Format

```xml
<Workflow>
  <If field="PRINTED_FILE_NAME" value=".txt">
    <Statements>
      <!-- Text files not supported -->
      <Discard/>
    </Statements>
  </If>

  <Perform action="ProcessDocument"/>
</Workflow>
```

### Example: Test Jobs

```xml
<Workflow>
  <If field="TAG_VALUE(0010,0010)" value="^TEST\^PATIENT$">
    <Statements>
      <!-- Test patient - discard -->
      <Discard/>
    </Statements>
  </If>

  <Perform action="SendToPACS"/>
</Workflow>
```

### Difference: Suspend vs Discard

**Suspend:**
- Job remains in queue
- Can be resumed later
- Use when issue might be resolvable
- Requires manual intervention

**Discard:**
- Job is permanently removed
- Cannot be recovered
- Use when job is invalid or unprocessable
- No manual intervention possible

## Update Nodes

Update nodes modify action configuration during workflow execution.

### Basic Syntax

```xml
<Update action="ActionName" type="ActionType">
  <!-- Action-specific configuration -->
</Update>
```

**Supported Action Types:**
- `print` - Update Print action configuration

**Note:** Currently, only Print actions are supported for Update nodes. Other action types will cause an error.

### Example: Update Print Settings

```xml
<ActionsList>
  <Print name="PrintToFilm">
    <ConnectionParameters>
      <PeerAeTitle>FILM_PRINTER</PeerAeTitle>
      <MyAeTitle>PRINTER</MyAeTitle>
      <Host>192.168.1.50</Host>
      <Port>104</Port>
    </ConnectionParameters>
    <BasicFilmSessionAttributes>
      <NumberOfCopies>1</NumberOfCopies>
    </BasicFilmSessionAttributes>
  </Print>
</ActionsList>

<Workflow>
  <!-- Update print action to print 3 copies for STAT jobs -->
  <If field="CLIENT_HOST_NAME" value="STAT-WORKSTATION">
    <Statements>
      <Update action="PrintToFilm" type="print">
        <BasicFilmSessionAttributes>
          <NumberOfCopies>3</NumberOfCopies>
        </BasicFilmSessionAttributes>
      </Update>
    </Statements>
  </If>

  <Perform action="PrintToFilm"/>
</Workflow>
```

Update nodes allow dynamic action configuration changes that are applied during workflow execution.

Resumption is not driven by a dedicated action or node. A suspended job is automatically re-queued after `SuspensionTime` and re-enters the workflow at the action named in the `resumeAction` attribute of its `<Suspend>` node.

## Common Control Flow Patterns

### Validate-Process-Route

```xml
<Workflow>
  <!-- Validate -->
  <Perform action="ParseFilename"/>
  <If field="TAG_VALUE(0010,0020)" value="^$">
    <Statements>
      <Discard/>
    </Statements>
  </If>

  <!-- Process -->
  <Perform action="QueryWorklist"/>
  <If field="QUERY_FOUND" value="0">
    <Statements>
      <Suspend resumeAction="QueryWorklist"/>
    </Statements>
  </If>

  <!-- Route -->
  <Perform action="SetMetadata"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

### Try-Fallback-Suspend

`STORE_SUCCEEDED` is a single job-wide flag that reflects only the **most recent** Store action, so each check must immediately follow the store it refers to.

```xml
<Workflow>
  <!-- Try primary -->
  <Perform action="SendToPrimaryPACS"/>

  <If field="STORE_SUCCEEDED" value="0">
    <Statements>
      <!-- Primary failed - try fallback -->
      <Perform action="SendToBackupPACS"/>

      <If field="STORE_SUCCEEDED" value="0">
        <Statements>
          <!-- Both failed - suspend -->
          <Perform action="NotifyFailure"/>
          <Suspend resumeAction="SendToPrimaryPACS"/>
        </Statements>
      </If>
    </Statements>
  </If>
</Workflow>
```

### Process-Validate-Retry

Retry capping is driven by the `maxRetries` attribute on `<Suspend>`, not by a counter you maintain. Validation guards use `TAG_VALUE(...)` regex checks against the dataset.

```xml
<Workflow>
  <Perform action="ProcessData"/>

  <!-- Validate: require a non-empty Accession Number -->
  <If field="TAG_VALUE(0008,0050)" value="^$">
    <Statements>
      <!-- Suspend and retry up to 3 times, then fall through -->
      <Suspend resumeAction="ProcessData" maxRetries="3"/>

      <!-- Reached only after the retry budget is exhausted -->
      <Perform action="NotifyValidationFailure"/>
    </Statements>
  </If>
</Workflow>
```

### Auto-Retry with ManualQuery Fallback

```xml
<Perform action="AutoWorklist" onError="Ignore"/>
<If field="QUERY_FOUND" value="0">
  <Statements>
    <Suspend resumeAction="RetryWorklist" maxRetries="3"/>
    <!-- Falls through here after 3 failed retries -->
    <Perform action="ParkForManualMatch"/>
  </Statements>
</If>
```

Where `ParkForManualMatch` is a `ManualQuery` action that moves the job to `queue/manual/` for manual matching via the [DICOM Printer Console](/dicom-printer-2/control-app). After three unsuccessful suspend/resume cycles, the `Suspend` node falls through and `ParkForManualMatch` executes, giving operators a way to resolve the job manually.

### Conditional Routing with Fallback

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <!-- Normal path -->
      <Perform action="SendToModalityPACS"/>
    </Statements>
  </If>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <!-- Check if test patient -->
      <If field="TAG_VALUE(0010,0020)" value="^TEST">
        <Statements>
          <!-- Discard test -->
          <Discard/>
        </Statements>
      </If>

      <!-- Not test - suspend for review -->
      <Suspend resumeAction="QueryWorklist"/>
    </Statements>
  </If>
</Workflow>
```

### Multi-Destination with Error Handling

Because `STORE_SUCCEEDED` only reflects the most recent Store, check it immediately after the primary store, and only attempt the backup when the primary failed.

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <!-- Try primary -->
      <Perform action="SendToPrimaryPACS"/>

      <If field="STORE_SUCCEEDED" value="0">
        <Statements>
          <!-- Primary failed - try backup -->
          <Perform action="SendToBackupPACS"/>

          <If field="STORE_SUCCEEDED" value="0">
            <Statements>
              <!-- Both stores failed - suspend -->
              <Perform action="NotifyStorageFailure"/>
              <Suspend resumeAction="SendToPrimaryPACS"/>
            </Statements>
          </If>
        </Statements>
      </If>
    </Statements>
  </If>
</Workflow>
```

## Error Handling Best Practices

1. **Always handle failure cases** - Don't leave conditional paths incomplete
2. **Suspend over Discard** - Suspend when in doubt; discarded jobs are lost
3. **Notify before Suspend** - Send alerts before suspending for visibility
4. **Use meaningful state** - Update node values should be descriptive
5. **Document decision points** - Use XML comments for complex logic
6. **Test all paths** - Ensure every workflow path has been tested

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinterConfig SYSTEM "config.dtd">
<DicomPrinterConfig>
  <ActionsList>
    <!-- Data extraction -->
    <ParseJobFileName name="ExtractPatientID">
      <DcmTag tag="0010,0020">(\d+)_.*\.pdf</DcmTag>
    </ParseJobFileName>

    <!-- Patient lookup -->
    <Query name="FindWorklist" type="Worklist">
      <ConnectionParameters>
        <PeerAeTitle>RIS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Metadata -->
    <SetTag name="AddMetadata">
      <DcmTag tag="0008,0020" value="#{Date}"/>
      <DcmTag tag="0008,0080" value="Medical Center"/>
    </SetTag>

    <!-- Storage -->
    <Store name="SendToPrimaryPACS">
      <ConnectionParameters>
        <PeerAeTitle>PRIMARY_PACS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.100</Host>
        <Port>104</Port>
      </ConnectionParameters>
    </Store>

    <Store name="SendToBackupPACS">
      <ConnectionParameters>
        <PeerAeTitle>BACKUP_PACS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
    </Store>

    <Save name="SaveToArchive">
      <Directory>E:\Archive\#{PatientID}\#{StudyDate}</Directory>
      <Filename>#{SeriesNumber}-#{InstanceNumber}.dcm</Filename>
    </Save>

    <!-- Notifications -->
    <Notify name="NotifyNoMatch"/>
    <Notify name="NotifyMultipleMatches"/>
    <Notify name="NotifyAllStoreFailed"/>
  </ActionsList>

  <Workflow>
    <!-- Step 1: Extract patient ID -->
    <Perform action="ExtractPatientID" onError="Discard"/>

    <!-- Step 2: Validate patient ID exists -->
    <If field="TAG_VALUE(0010,0020)" value="^$">
      <Statements>
        <!-- No patient ID - cannot process -->
        <Discard/>
      </Statements>
    </If>

    <!-- Step 3: Query worklist -->
    <Perform action="FindWorklist" onError="Suspend"/>

    <!-- Step 4: Handle query results -->
    <If field="QUERY_PARTIAL" value="1">
      <Statements>
        <!-- Multiple matches - needs manual selection -->
        <Perform action="NotifyMultipleMatches" onError="Ignore"/>
        <Suspend resumeAction="FindWorklist"/>
      </Statements>
    </If>

    <If field="QUERY_FOUND" value="0">
      <Statements>
        <!-- No match - suspend for manual review -->
        <Perform action="NotifyNoMatch" onError="Ignore"/>
        <Suspend resumeAction="FindWorklist"/>
      </Statements>
    </If>

    <!-- Step 5: Process matched patient -->
    <If field="QUERY_FOUND" value="1">
      <Statements>
        <!-- Add metadata -->
        <Perform action="AddMetadata"/>

        <!-- Send to primary PACS -->
        <Perform action="SendToPrimaryPACS" onError="Ignore"/>

        <!-- STORE_SUCCEEDED reflects the most recent store, so check it here -->
        <If field="STORE_SUCCEEDED" value="0">
          <Statements>
            <!-- Primary failed - try backup -->
            <Perform action="SendToBackupPACS" onError="Ignore"/>

            <If field="STORE_SUCCEEDED" value="0">
              <Statements>
                <!-- Both stores failed - critical error -->
                <Perform action="NotifyAllStoreFailed" onError="Ignore"/>
                <Suspend resumeAction="SendToPrimaryPACS"/>
              </Statements>
            </If>
          </Statements>
        </If>

        <!-- Save to local archive -->
        <Perform action="SaveToArchive" onError="Ignore"/>
      </Statements>
    </If>
  </Workflow>
</DicomPrinterConfig>
```

## Related Topics

- [Workflow Overview](index.md)
- [Conditional Nodes](conditional-nodes.md)
- [Actions Overview](../actions/index.md)
- [Configuration Overview](../configuration.md)
