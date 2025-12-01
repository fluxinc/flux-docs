# Workflow

The workflow defines the sequence of operations and conditional logic applied to each print job or file processed by DICOM Printer 2.

## Workflow Concept

A workflow is a series of nodes that execute in order. Each node represents an operation:
- Performing an action
- Making a decision based on data
- Controlling job flow (suspend, discard, resume)

Workflows enable:
- Sequential processing
- Conditional branching
- Error handling
- Dynamic routing

## Workflow Structure

Workflows are defined in the `<Workflow>` section of `config.xml`:

```xml
<DicomPrinter>
  <Actions>
    <!-- Action definitions -->
  </Actions>

  <Workflow>
    <!-- Workflow nodes -->
  </Workflow>
</DicomPrinter>
```

## Workflow Node Types

### Execution Nodes

- **[Perform](../workflow/control-nodes.md#perform-nodes)** - Execute an action
- **[Update](../workflow/control-nodes.md#update-nodes)** - Update workflow state

### Conditional Nodes

- **[If](../workflow/conditional-nodes.md#if-nodes)** - Conditional execution based on field values
- **[Switch](../workflow/conditional-nodes.md#switch-nodes)** - Multi-way branching

### Control Flow Nodes

- **[Suspend](../workflow/control-nodes.md#suspend-nodes)** - Suspend job for manual intervention
- **[Discard](../workflow/control-nodes.md#discard-nodes)** - Discard job

## Basic Workflow Example

Simple sequential workflow:

```xml
<Workflow>
  <Perform action="ParseFilename"/>
  <Perform action="QueryWorklist"/>
  <Perform action="SetMetadata"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

Nodes execute in order from top to bottom.

## Conditional Workflow Example

Workflow with conditional branching:

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="true">
    <!-- Patient matched -->
    <Perform action="SetMetadata"/>
    <Perform action="SendToPACS"/>
  </If>

  <If field="QUERY_FOUND" value="false">
    <!-- No patient match -->
    <Suspend/>
  </If>
</Workflow>
```

## Execution Order

Workflow nodes execute sequentially:

1. Start at the first node
2. Execute the current node
3. Move to the next node
4. Repeat until:
   - All nodes are completed
   - A Suspend or Discard node is reached
   - An error occurs

## Nested Conditions

Conditional nodes can be nested:

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="true">
    <Perform action="SetMetadata"/>

    <If field="TAG_VALUE" tag="0010,0040" value="M">
      <!-- Male patient -->
      <Perform action="ProcessMalePatient"/>
    </If>

    <If field="TAG_VALUE" tag="0010,0040" value="F">
      <!-- Female patient -->
      <Perform action="ProcessFemalePatient"/>
    </If>

    <Perform action="SendToPACS"/>
  </If>
</Workflow>
```

## Common Workflow Patterns

### Patient Matching and Storage

```xml
<Workflow>
  <!-- Extract patient ID from filename -->
  <Perform action="ParseFilename"/>

  <!-- Query worklist for patient data -->
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="true">
    <!-- Patient found - add metadata and send to PACS -->
    <Perform action="SetMetadata"/>
    <Perform action="SendToPACS"/>
  </If>

  <If field="QUERY_FOUND" value="false">
    <!-- Patient not found - suspend for manual review -->
    <Suspend/>
  </If>
</Workflow>
```

### Multi-Destination Routing

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="true">
    <!-- Send to primary PACS -->
    <Perform action="SendToPrimaryPACS"/>

    <!-- Send to backup -->
    <Perform action="SendToBackup"/>

    <!-- Conditionally print -->
    <If field="TAG_VALUE" tag="0008,0060" value="CR">
      <!-- Print CR modality images -->
      <Perform action="PrintToFilm"/>
    </If>
  </If>
</Workflow>
```

### Error Handling with Fallbacks

```xml
<Workflow>
  <Perform action="SendToPrimaryPACS"/>

  <If field="STORE_SUCCEEDED" tag="SendToPrimaryPACS" value="false">
    <!-- Primary failed - try backup -->
    <Perform action="SendToBackupPACS"/>
  </If>

  <If field="STORE_SUCCEEDED" tag="SendToBackupPACS" value="false">
    <!-- Both failed - suspend -->
    <Suspend/>
  </If>
</Workflow>
```

### Image Processing Pipeline

```xml
<Workflow>
  <!-- Save original -->
  <Perform action="SaveOriginal"/>

  <!-- Process image -->
  <Perform action="TrimMargins"/>
  <Perform action="RotateImage"/>
  <Perform action="ResizeImage"/>

  <!-- Save processed version -->
  <Perform action="SaveProcessed"/>

  <!-- Send to PACS -->
  <Perform action="SendToPACS"/>
</Workflow>
```

### Validation and Manual Review

```xml
<Workflow>
  <!-- Parse data -->
  <Perform action="ParseFilename"/>

  <If field="TAG_VALUE" tag="0010,0020" value="">
    <!-- No patient ID - discard -->
    <Discard/>
  </If>

  <!-- Query worklist -->
  <Perform action="QueryWorklist"/>

  <If field="QUERY_PARTIAL" value="true">
    <!-- Multiple matches - manual review needed -->
    <Perform action="NotifyMultipleMatches"/>
    <Suspend/>
  </If>

  <If field="QUERY_FOUND" value="true">
    <!-- Single match - continue -->
    <Perform action="SendToPACS"/>
  </If>
</Workflow>
```

## Workflow Debugging

Use the workflow to log progress at key points:

```xml
<Workflow>
  <Perform action="LogWorkflowStart"/>

  <Perform action="QueryWorklist"/>
  <Perform action="LogQueryResult"/>

  <If field="QUERY_FOUND" value="true">
    <Perform action="LogProcessingPatient"/>
    <Perform action="SendToPACS"/>
    <Perform action="LogStoreResult"/>
  </If>
</Workflow>
```

Check log files to see which nodes executed and their results.

## Best Practices

1. **Keep workflows simple** - Complex workflows are harder to debug
2. **Use meaningful action names** - Makes workflows self-documenting
3. **Handle all cases** - Don't leave conditional paths incomplete
4. **Test thoroughly** - Test all workflow paths with representative data
5. **Document special cases** - Use XML comments for complex logic
6. **Log key decisions** - Use logging to track workflow execution
7. **Suspend on errors** - Better to suspend than discard potentially important jobs

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
      <DcmTag tag="0008,0080" value="Medical Center"/>
    </SetTag>

    <Trim name="RemoveMargins">
      <Top>100</Top>
      <Bottom>100</Bottom>
    </Trim>

    <Store name="SendToPACS"
           calledAE="PACS" callingAE="PRINTER"
           host="192.168.1.100" port="104"
           compression="JPEG_Lossless"/>

    <Save name="SaveToArchive">
      <Directory>E:\Archive\#{PatientID}\#{StudyDate}</Directory>
      <Filename>#{SeriesNumber}-#{InstanceNumber}.dcm</Filename>
    </Save>

    <Notify name="AlertNoMatch" mandatory="false" onError="Ignore"/>
  </Actions>

  <Workflow>
    <!-- Extract patient ID from filename -->
    <Perform action="ExtractPatientID"/>

    <!-- Validate patient ID exists -->
    <If field="TAG_VALUE" tag="0010,0020" value="">
      <!-- No patient ID - cannot process -->
      <Discard/>
    </If>

    <!-- Query worklist for patient data -->
    <Perform action="FindWorklist"/>

    <If field="QUERY_FOUND" value="true">
      <!-- Patient matched - process normally -->
      <Perform action="AddMetadata"/>
      <Perform action="RemoveMargins"/>
      <Perform action="SendToPACS"/>
      <Perform action="SaveToArchive"/>
    </If>

    <If field="QUERY_FOUND" value="false">
      <!-- No patient match - alert and suspend -->
      <Perform action="AlertNoMatch"/>
      <Suspend/>
    </If>
  </Workflow>
</DicomPrinter>
```

## Related Topics

- [Conditional Nodes](conditional-nodes.md) - If and Switch nodes
- [Control Nodes](control-nodes.md) - Perform, Suspend, Discard, Update nodes
- [Actions Overview](../actions/index.md)
- [Configuration Overview](../configuration.md)
