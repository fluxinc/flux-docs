# Workflow

The workflow defines the sequence of operations and conditional logic applied to each print job or file processed by DICOM Printer 2.

## Workflow Concept

A workflow is a series of nodes that execute in order. Each node represents an operation:
- Performing an action
- Making a decision based on data
- Controlling job flow (suspend, discard); a suspended job is automatically re-queued and resumes at its `<Suspend resumeAction="...">` target after the SuspensionTime elapses

Workflows enable:
- Sequential processing
- Conditional branching
- Error handling
- Dynamic routing

## Workflow Structure

Workflows are defined in the `<Workflow>` section of `config.xml`:

```xml
<DicomPrinterConfig>
  <ActionsList>
    <!-- Action definitions -->
  </ActionsList>

  <Workflow>
    <!-- Workflow nodes -->
  </Workflow>
</DicomPrinterConfig>
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

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <!-- Patient matched -->
      <Perform action="SetMetadata"/>
      <Perform action="SendToPACS"/>
    </Statements>
  </If>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <!-- No patient match -->
      <Suspend resumeAction="QueryWorklist"/>
    </Statements>
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

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <Perform action="SetMetadata"/>

      <If field="TAG_VALUE(0010,0040)" value="^M$">
        <Statements>
          <!-- Male patient -->
          <Perform action="ProcessMalePatient"/>
        </Statements>
      </If>

      <If field="TAG_VALUE(0010,0040)" value="^F$">
        <Statements>
          <!-- Female patient -->
          <Perform action="ProcessFemalePatient"/>
        </Statements>
      </If>

      <Perform action="SendToPACS"/>
    </Statements>
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

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <!-- Patient found - add metadata and send to PACS -->
      <Perform action="SetMetadata"/>
      <Perform action="SendToPACS"/>
    </Statements>
  </If>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <!-- Patient not found - suspend for manual review -->
      <Suspend resumeAction="QueryWorklist"/>
    </Statements>
  </If>
</Workflow>
```

### Multi-Destination Routing

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <!-- Send to primary PACS -->
      <Perform action="SendToPrimaryPACS"/>

      <!-- Send to backup -->
      <Perform action="SendToBackup"/>

      <!-- Conditionally print -->
      <If field="TAG_VALUE(0008,0060)" value="^CR$">
        <Statements>
          <!-- Print CR modality images -->
          <Perform action="PrintToFilm"/>
        </Statements>
      </If>
    </Statements>
  </If>
</Workflow>
```

### Error Handling with Fallbacks

```xml
<Workflow>
  <Perform action="SendToPrimaryPACS"/>

  <If field="STORE_SUCCEEDED" value="0">
    <Statements>
      <!-- Primary failed - try backup -->
      <Perform action="SendToBackupPACS"/>
    </Statements>
  </If>

  <If field="STORE_SUCCEEDED" value="0">
    <Statements>
      <!-- Both failed - suspend -->
      <Suspend resumeAction="SendToPrimaryPACS"/>
    </Statements>
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

  <If field="TAG_VALUE(0010,0020)" value="^$">
    <Statements>
      <!-- No patient ID - discard -->
      <Discard/>
    </Statements>
  </If>

  <!-- Query worklist -->
  <Perform action="QueryWorklist"/>

  <If field="QUERY_PARTIAL" value="1">
    <Statements>
      <!-- Multiple matches - manual review needed -->
      <Perform action="NotifyMultipleMatches"/>
      <Suspend resumeAction="QueryWorklist"/>
    </Statements>
  </If>

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <!-- Single match - continue -->
      <Perform action="SendToPACS"/>
    </Statements>
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

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <Perform action="LogProcessingPatient"/>
      <Perform action="SendToPACS"/>
      <Perform action="LogStoreResult"/>
    </Statements>
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
<!DOCTYPE DicomPrinterConfig SYSTEM "config.dtd">
<DicomPrinterConfig>
  <ActionsList>
    <ParseJobFileName name="ExtractPatientID">
      <DcmTag tag="0010,0020">(\d+)_.*\.pdf</DcmTag>
    </ParseJobFileName>

    <Query name="FindWorklist" type="Worklist">
      <ConnectionParameters>
        <PeerAeTitle>RIS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
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
           compression="JPEG_Lossless">
      <ConnectionParameters>
        <PeerAeTitle>PACS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.100</Host>
        <Port>104</Port>
      </ConnectionParameters>
    </Store>

    <Save name="SaveToArchive">
      <Directory>E:\Archive\#{PatientID}\#{StudyDate}</Directory>
      <Filename>#{SeriesNumber}-#{InstanceNumber}.dcm</Filename>
    </Save>

    <Notify name="AlertNoMatch" mandatory="false" onError="Ignore"/>
  </ActionsList>

  <Workflow>
    <!-- Extract patient ID from filename -->
    <Perform action="ExtractPatientID"/>

    <!-- Validate patient ID exists -->
    <If field="TAG_VALUE(0010,0020)" value="^$">
      <Statements>
        <!-- No patient ID - cannot process -->
        <Discard/>
      </Statements>
    </If>

    <!-- Query worklist for patient data -->
    <Perform action="FindWorklist"/>

    <If field="QUERY_FOUND" value="1">
      <Statements>
        <!-- Patient matched - process normally -->
        <Perform action="AddMetadata"/>
        <Perform action="RemoveMargins"/>
        <Perform action="SendToPACS"/>
        <Perform action="SaveToArchive"/>
      </Statements>
    </If>

    <If field="QUERY_FOUND" value="0">
      <Statements>
        <!-- No patient match - alert and suspend -->
        <Perform action="AlertNoMatch"/>
        <Suspend resumeAction="FindWorklist"/>
      </Statements>
    </If>
  </Workflow>
</DicomPrinterConfig>
```

## Related Topics

- [Conditional Nodes](conditional-nodes.md) - If and Switch nodes
- [Control Nodes](control-nodes.md) - Perform, Suspend, Discard, Update nodes
- [Actions Overview](../actions/index.md)
- [Configuration Overview](../configuration.md)
