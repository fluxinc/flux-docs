# DICOM Query Attributes Guide

## Overview

DICOM Printer 2 supports multiple query types with configurable attributes that control query behavior and matching. 
This guide covers all available options and their proper configuration.

## Query Architecture

### Supported Query Types
1. **WorklistQuery** - Interfaces with Modality Worklist SCP for retrieving scheduled procedures
2. **StudyQuery** - Performs queries at the study root level for study-centric operations
3. **PatientQuery** - Executes queries at the patient root level for patient-centric workflows


### Attribute Processing Lifecycle

Understanding how attributes are handled throughout the lifecycle of a query is crucial for building reliable workflows. The system evaluates tags differently before sending the query and after receiving the results.

#### 1. Before the Query (Request Building)

When the query is formulated, the system determines the value for each `<DcmTag>` to send to the remote SCP in the following priority order:

1. **Explicit values from configuration:** If the `<DcmTag>` contains a static value or a placeholder, it is evaluated and used.
2. **Active job dataset values:** If the `<DcmTag>` is empty (e.g., `<DcmTag tag="(0010,0020)" />`), the system looks for the tag in the current print job's dataset. If it exists, that value is used as the matching key.
3. **Empty (Universal Match):** If the tag is empty in the configuration and does not exist in the job dataset, it is sent as an empty tag (Universal Match), requesting the SCP to return its value.

**Example: Before the Query**
```xml
<Query type="Worklist" name="FindPatient">
    <!-- Uses the explicit Patient ID from the configuration placeholder -->
    <DcmTag tag="(0010,0020)">#{PatientID}</DcmTag> 
    
    <!-- Empty tag: Will use the value from the job dataset if it exists, otherwise requests it -->
    <DcmTag tag="(0008,0050)" /> 
    
    <!-- Explicit static filter: Only request CT modalities -->
    <DcmTag tag="(0008,0060)">CT</DcmTag> 
</Query>
```

#### 2. When the Query Returns a Value (Match Found)

If the remote SCP returns a match (and the query is allowed to assign data, see `force-assignment`):

- All tags specified in the `<Query>` element (except exclusion filters starting with `!`) are extracted from the SCP's response.
- The values in the **active job dataset** are updated with the authoritative values returned by the SCP.
- Any subsequent actions (like `<Store>` or `<PrintText>`) will use these verified dataset values.

**Example: Successful Return**
If the query above matches a Worklist entry where `(0008,0050)` Accession Number is `ACC12345`:
- The job dataset's Accession Number is updated to `ACC12345`.
- Subsequent `#{0008,0050}` placeholders will resolve to `ACC12345`.

#### 3. When the Query Doesn't Return a Value (Or Empty Match)

If the query returns no matches, or if a specific tag was requested but the SCP returned it empty:

- The job dataset is **not** overwritten with empty or null values from the query response.
- Existing values in the job dataset (from the original print job or earlier actions) are preserved.
- The `QUERY_FOUND` workflow condition evaluates to false, and the `<Perform>` node's `onError` logic will be triggered.

## Configuration Reference

### Base Configuration Structure
All query types share this fundamental configuration structure:

```xml
<Query type="[QueryType]" force-assignment="[boolean]" name="[ActionName]">
    <ConnectionParameters>
        <MyAeTitle>LOCAL_AE</MyAeTitle>
        <PeerAeTitle>REMOTE_AE</PeerAeTitle>
        <Host>remote.host</Host>
        <Port>104</Port>
    </ConnectionParameters>
    <!-- Query-specific tags -->
</Query>
```

# Core Attributes
 
- force-assignment - When true, uses first match even with multiple results
- ConnectionParameters - Network connection settings

## Query-Specific Implementations

### Modality Worklist Query

Specialized for workflow management and procedure scheduling:

```xml
<Query type="Worklist" name="WorklistQuery">
    <DcmTag tag="(0008,0050)">#{AccessionNumber}</DcmTag>
    <DcmSequence tag="(0040,0100)">
        <DcmItem>
            <DcmTag tag="(0032,1060)" />
        </DcmItem>
    </DcmSequence>
</Query>

```

Specific attributes:

- forcePeerAe - Forces use of peer AE title in scheduled station
- Supports Scheduled Procedure Step sequences

### Study Root Query

Optimized for study-level operations:

```xml
<Query type="Study" level="STUDY|SERIES|IMAGE">
    <DcmTag tag="(0008,0020)">#{StudyDate}</DcmTag>
    <DcmTag tag="(0008,0050)">#{AccessionNumber}</DcmTag>
</Query>

```

Specific attributes:

- level - Query retrieve level (STUDY, SERIES, IMAGE)

### Patient Root Query

Designed for patient-centric workflows:

```xml
<Query type="Patient" level="PATIENT|STUDY|SERIES|IMAGE">
    <DcmTag tag="(0010,0020)">#{PatientID}</DcmTag>
</Query>

```

## Advanced Features

### Tag Value Patterns

The system supports sophisticated matching patterns:

- Direct matching: exact_value
- Wildcard matching: value*, *value*
- Range specification: minimum-maximum
- Pattern exclusion: !pattern
- Dynamic placeholders: #{TagName}
- Date ranges: #{Date,-1,1}

### Implementation Guidelines

#### Best Practices

- Always provide complete connection parameters
- Select appropriate query levels for your use case
- Include sufficient matching criteria
- Implement proper error handling
- Test query patterns thoroughly

#### Common Implementation Pitfalls

- Incomplete tag specifications
- Incorrect date format usage
- Query level mismatches
- Network configuration errors
- AE title validation issues

#### Troubleshooting Guide

#### Diagnostic Steps

- Verify network connectivity
- Validate AE title configurations
- Check tag syntax
- Review query level settings
- Monitor DICOM association status

#### Performance Optimization
- Use specific query criteria
- Implement appropriate timeout values

## Examples

### Basic Worklist Query

```xml
<Query type="Worklist">
  <ConnectionParameters>
    <MyAeTitle>LOCAL_AE</MyAeTitle>
    <PeerAeTitle>REMOTE_AE</PeerAeTitle>
    <Host>pacs.hospital.com</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <DcmTag tag="(0008,0050)">#{AccessionNumber}</DcmTag>
  <DcmTag tag="(0010,0020)">#{PatientID}</DcmTag>
</Query>
```

### Study Query With Filters

```xml
<Query type="Study" level="STUDY">
    <ConnectionParameters>
        <MyAeTitle>LOCAL_AE</MyAeTitle>
        <PeerAeTitle>PACS_AE</PeerAeTitle>
        <Host>pacs.hospital.com</Host>
        <Port>104</Port>
    </ConnectionParameters>
    <DcmTag tag="(0008,0020)">#{Date,-1,1}</DcmTag>
    <DcmTag tag="(0008,0061)">!CT</DcmTag>
</Query>
```

### Advanced Worklist Query with SPS Sequence

```xml
<Query type="Worklist" force-assignment="true">
    <ConnectionParameters>
        <MyAeTitle>PRINTER_AE</MyAeTitle>
        <PeerAeTitle>WORKLIST_SCP</PeerAeTitle>
        <Host>worklist.hospital.net</Host>
        <Port>104</Port>
    </ConnectionParameters>
    <DcmTag tag="(0008,0050)">#{AccessionNumber}</DcmTag>
    <DcmSequence tag="(0040,0100)">
        <DcmItem>
            <DcmTag tag="(0040,0001)">#{ScheduledStationAETitle}</DcmTag>
            <DcmTag tag="(0040,0002)">#{StartDate}</DcmTag>
            <DcmTag tag="(0040,0003)">#{StartTime}</DcmTag>
        </DcmItem>
    </DcmSequence>
</Query>
```

### Patient Query with Multiple Levels

```xml
<Query type="Patient" level="STUDY">
    <ConnectionParameters>
        <MyAeTitle>PRINTER_AE</MyAeTitle>
        <PeerAeTitle>PACS_AE</PeerAeTitle>
        <Host>pacs.hospital.net</Host>
        <Port>104</Port>
    </ConnectionParameters>
    <DcmTag tag="(0010,0020)">#{PatientID}</DcmTag>
    <DcmTag tag="(0010,0010)" />
    <DcmTag tag="(0008,0020)">#{Date,-7,0}</DcmTag>
    <DcmTag tag="(0008,0061)">!NM</DcmTag>
</Query>
```
### Study Query with Series Level and Modality Filter

```xml
<Query type="Study" level="SERIES">
    <ConnectionParameters>
        <MyAeTitle>PRINTER_AE</MyAeTitle>
        <PeerAeTitle>ARCHIVE_AE</PeerAeTitle>
        <Host>archive.hospital.net</Host>
        <Port>104</Port>
    </ConnectionParameters>
    <DcmTag tag="(0020,000D)">#{StudyInstanceUID}</DcmTag>
    <DcmTag tag="(0008,0060)">MR|CT</DcmTag>
    <DcmTag tag="(0020,0011)">1-999</DcmTag>
</Query>

```

### Best Practices

1. Always specify connection parameters
2. Use appropriate query levels
3. Include sufficient matching criteria
4. Handle multiple matches appropriately
5. Test exclusion patterns carefully

### Troubleshooting

Common issues:

1. Missing required tags
2. Invalid date formats
3. Incorrect query levels
4. Network connectivity
5. AE title mismatches