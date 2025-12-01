# Control Flow Nodes

Control flow nodes manage job execution and state within workflows.

## Control Node Types

- **Perform** - Execute an action
- **Suspend** - Suspend job for manual intervention
- **Discard** - Discard job and remove from queue
- **Update** - Update workflow state
- **Resume** - Resume suspended jobs

## Perform Nodes

Perform nodes execute actions defined in the `<Actions>` section.

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

  <If field="QUERY_FOUND" value="true">
    <Perform action="SetMetadata"/>
    <Perform action="SendToPACS"/>
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
<Actions>
  <!-- Define base query action -->
  <Query name="QueryWorklist" type="Worklist"
         calledAE="RIS" callingAE="PRINTER"
         host="192.168.1.200" port="104">
    <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
  </Query>
</Actions>

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
<Suspend/>
```

### When to Use Suspend

Use suspend nodes when:
- Manual review is required
- Data validation fails
- Patient matching is ambiguous
- Processing cannot continue automatically
- Quality control checks are needed

### Example: No Patient Match

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="false">
    <!-- No patient match - manual review needed -->
    <Suspend/>
  </If>
</Workflow>
```

### Example: Multiple Matches

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_PARTIAL" value="true">
    <!-- Multiple matches - user must select -->
    <Perform action="NotifyMultipleMatches"/>
    <Suspend/>
  </If>
</Workflow>
```

### Example: Missing Required Data

```xml
<Workflow>
  <Perform action="ParseFilename"/>

  <If field="TAG_VALUE(0010,0020)" value="^$">
    <!-- No patient ID - cannot process -->
    <Suspend/>
  </If>
</Workflow>
```

### Example: Validation Failure

```xml
<Workflow>
  <Perform action="ValidateData"/>

  <If field="VALIDATION_FAILED" value="true">
    <!-- Data validation failed -->
    <Perform action="NotifyValidationFailure"/>
    <Suspend/>
  </If>
</Workflow>
```

### Resuming Suspended Jobs

Suspended jobs remain in the queue and can be resumed:
- Manually through the Control Application
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
<Actions>
  <ParseJobFileName name="ParseID"><!-- config --></ParseJobFileName>
  <Query name="QueryWorklist"><!-- config --></Query>
  <SetTag name="AddMetadata"><!-- config --></SetTag>
  <Store name="SendToPACS"><!-- config --></Store>
</Actions>

<Workflow>
  <Perform action="ParseID"/>           <!-- Step 1: Executes on first run, skipped on resume -->
  <Perform action="QueryWorklist"/>     <!-- Step 2: Executes on first run, THIS IS RESUME POINT -->

  <If field="QUERY_FOUND" value="false">
    <Suspend resumeAction="QueryWorklist"/>  <!-- Suspends here, sets resume to QueryWorklist -->
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
    <!-- No patient ID - cannot process -->
    <Discard/>
  </If>
</Workflow>
```

### Example: Invalid File Format

```xml
<Workflow>
  <If field="PRINTED_FILE_NAME" value=".txt">
    <!-- Text files not supported -->
    <Discard/>
  </If>

  <Perform action="ProcessDocument"/>
</Workflow>
```

### Example: Test Jobs

```xml
<Workflow>
  <If field="TAG_VALUE(0010,0010)" value="^TEST\^PATIENT$">
    <!-- Test patient - discard -->
    <Discard/>
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
<Actions>
  <Print name="PrintToFilm"
         calledAE="FILM_PRINTER" callingAE="PRINTER"
         host="192.168.1.50" port="104">
    <BasicFilmSessionAttributes>
      <NumberOfCopies>1</NumberOfCopies>
    </BasicFilmSessionAttributes>
  </Print>
</Actions>

<Workflow>
  <!-- Update print action to print 3 copies for STAT jobs -->
  <If field="CLIENT_HOST_NAME" value="STAT-WORKSTATION">
    <Update action="PrintToFilm" type="print">
      <BasicFilmSessionAttributes>
        <NumberOfCopies>3</NumberOfCopies>
      </BasicFilmSessionAttributes>
    </Update>
  </If>

  <Perform action="PrintToFilm"/>
</Workflow>
```

Update nodes allow dynamic action configuration changes that are applied during workflow execution.

## Resume Actions

Resume actions are special actions that can resume suspended jobs programmatically.

### Example: Automatic Resume After Time

```xml
<Actions>
  <!-- This action might be triggered externally -->
  <Resume name="ResumeAfterDelay"/>
</Actions>
```

Resume actions are typically triggered:
- By external systems
- After scheduled tasks complete
- When data becomes available
- Through API calls

## Common Control Flow Patterns

### Validate-Process-Route

```xml
<Workflow>
  <!-- Validate -->
  <Perform action="ParseFilename"/>
  <If field="TAG_VALUE(0010,0020)" value="^$">
    <Discard/>
  </If>

  <!-- Process -->
  <Perform action="QueryWorklist"/>
  <If field="QUERY_FOUND" value="false">
    <Suspend/>
  </If>

  <!-- Route -->
  <Perform action="SetMetadata"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

### Try-Fallback-Suspend

```xml
<Workflow>
  <!-- Try primary -->
  <Perform action="SendToPrimaryPACS"/>

  <If field="STORE_SUCCEEDED" tag="SendToPrimaryPACS" value="false">
    <!-- Try fallback -->
    <Perform action="SendToBackupPACS"/>

    <If field="STORE_SUCCEEDED" tag="SendToBackupPACS" value="false">
      <!-- Both failed - suspend -->
      <Perform action="NotifyFailure"/>
      <Suspend/>
    </If>
  </If>
</Workflow>
```

### Process-Validate-Retry

```xml
<Workflow>
  <Perform action="ProcessData"/>
  <Perform action="ValidateResult"/>

  <If field="VALIDATION_PASSED" value="false">
    <Update field="RETRY_COUNT" value="1"/>

    <If field="RETRY_COUNT" value="3">
      <!-- Max retries - suspend -->
      <Suspend/>
    </If>

    <!-- Retry processing -->
    <Perform action="ProcessData"/>
  </If>
</Workflow>
```

### Conditional Routing with Fallback

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="true">
    <!-- Normal path -->
    <Perform action="SendToModalityPACS"/>
  </If>

  <If field="QUERY_FOUND" value="false">
    <!-- Check if test patient -->
    <If field="TAG_VALUE(0010,0020)" value="^TEST">
      <!-- Discard test -->
      <Discard/>
    </If>

    <!-- Not test - suspend for review -->
    <Suspend resumeAction="QueryWorklist"/>
  </If>
</Workflow>
```

### Multi-Destination with Error Handling

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="true">
    <!-- Send to multiple destinations -->
    <Perform action="SendToPrimaryPACS"/>
    <Perform action="SendToBackupPACS"/>
    <Perform action="SaveToArchive"/>

    <!-- Check if at least one succeeded -->
    <If field="STORE_SUCCEEDED" tag="SendToPrimaryPACS" value="false">
      <If field="STORE_SUCCEEDED" tag="SendToBackupPACS" value="false">
        <!-- Both stores failed - suspend -->
        <Perform action="NotifyStorageFailure"/>
        <Suspend/>
      </If>
    </If>
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
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <!-- Data extraction -->
    <ParseJobFileName name="ExtractPatientID">
      <Pattern>(\d+)_.*\.pdf</Pattern>
      <DcmTag tag="0010,0020" group="1"/>
    </ParseJobFileName>

    <!-- Patient lookup -->
    <Query name="FindWorklist" type="Worklist"
           calledAE="RIS" callingAE="PRINTER"
           host="192.168.1.200" port="104">
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Metadata -->
    <SetTag name="AddMetadata">
      <DcmTag tag="0008,0020" value="#{Date}"/>
      <DcmTag tag="0008,0080" value="Medical Center"/>
    </SetTag>

    <!-- Storage -->
    <Store name="SendToPrimaryPACS"
           calledAE="PRIMARY_PACS" callingAE="PRINTER"
           host="192.168.1.100" port="104"/>

    <Store name="SendToBackupPACS"
           calledAE="BACKUP_PACS" callingAE="PRINTER"
           host="192.168.1.200" port="104"/>

    <Save name="SaveToArchive">
      <Directory>E:\Archive\#{PatientID}\#{StudyDate}</Directory>
      <Filename>#{SeriesNumber}-#{InstanceNumber}.dcm</Filename>
    </Save>

    <!-- Notifications -->
    <Notify name="NotifyNoMatch"/>
    <Notify name="NotifyMultipleMatches"/>
    <Notify name="NotifyAllStoreFailed"/>
  </Actions>

  <Workflow>
    <!-- Step 1: Extract patient ID -->
    <Perform action="ExtractPatientID" onError="Discard"/>

    <!-- Step 2: Validate patient ID exists -->
    <If field="TAG_VALUE(0010,0020)" value="^$">
      <!-- No patient ID - cannot process -->
      <Discard/>
    </If>

    <!-- Step 3: Query worklist -->
    <Perform action="FindWorklist" onError="Suspend"/>

    <!-- Step 4: Handle query results -->
    <If field="QUERY_PARTIAL" value="true">
      <!-- Multiple matches - needs manual selection -->
      <Perform action="NotifyMultipleMatches" onError="Ignore"/>
      <Suspend resumeAction="FindWorklist"/>
    </If>

    <If field="QUERY_FOUND" value="false">
      <!-- No match - suspend for manual review -->
      <Perform action="NotifyNoMatch" onError="Ignore"/>
      <Suspend resumeAction="FindWorklist"/>
    </If>

    <!-- Step 5: Process matched patient -->
    <If field="QUERY_FOUND" value="true">
      <!-- Add metadata -->
      <Perform action="AddMetadata"/>

      <!-- Send to primary PACS -->
      <Perform action="SendToPrimaryPACS" onError="Hold"/>

      <!-- Send to backup PACS -->
      <Perform action="SendToBackupPACS" onError="Ignore"/>

      <!-- Save to local archive -->
      <Perform action="SaveToArchive" onError="Ignore"/>

      <!-- Check if at least one store succeeded -->
      <If field="STORE_SUCCEEDED" tag="SendToPrimaryPACS" value="false">
        <If field="STORE_SUCCEEDED" tag="SendToBackupPACS" value="false">
          <!-- Both stores failed - critical error -->
          <Perform action="NotifyAllStoreFailed" onError="Ignore"/>
          <Suspend resumeAction="SendToPrimaryPACS"/>
        </If>
      </If>
    </If>
  </Workflow>
</DicomPrinter>
```

## Related Topics

- [Workflow Overview](index.md)
- [Conditional Nodes](conditional-nodes.md)
- [Actions Overview](../actions/index.md)
- [Configuration Overview](../configuration.md)
