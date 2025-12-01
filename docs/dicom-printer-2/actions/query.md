# Query Actions

Query actions perform DICOM C-FIND operations to search for patient data, studies, or worklist entries from remote DICOM servers.

## Query Types

DICOM Printer 2 supports two query types:

- **Worklist (MWL)** - Query DICOM Modality Worklist for scheduled procedures
- **Study** - Query for existing DICOM studies

## Basic Syntax

```xml
<Query name="ActionName" type="QueryType">
  <ConnectionParameters>
    <PeerAETitle>RemoteAE</PeerAETitle>
    <MyAETitle>LocalAE</MyAETitle>
    <Host>hostname</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <DcmTag tag="GGGG,EEEE">value</DcmTag>
  <!-- Additional query criteria -->
</Query>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

## Required Attributes

### `name`
Unique identifier for this action.

### `type`
The type of query to perform.

**Valid Values:** `Worklist`, `Study`

## Required Elements

### `ConnectionParameters`
Network connection settings for the remote DICOM server. Must contain the following nested elements:

#### `PeerAETitle`
The AE Title of the remote DICOM server being queried.

#### `MyAETitle`
The AE Title of DICOM Printer 2 (this application).

#### `Host`
The hostname or IP address of the remote DICOM server.

#### `Port`
The TCP port number of the remote DICOM server (typically 104 or 11112).

## Optional Attributes

### `forcePeerAe`
Forces the use of the peer's AE Title in the response, even if it differs from `calledAE`.

**Type:** Boolean
**Default:** `false`

```xml
<Query name="FindPatient" forcePeerAe="true" ...>
```

Useful when querying servers that respond with a different AE Title than they're configured with.

## Query Criteria

Query criteria are specified using `<DcmTag>` elements. Each tag can contain:
- A simple value
- A placeholder (e.g., `#{PatientID}`)
- A sequence of nested tags

### Simple Tag Query

```xml
<DcmTag tag="0010,0020">12345</DcmTag>
```

### Tag with Placeholder

```xml
<DcmTag tag="0010,0020">#{PatientID}</DcmTag>
```

### Sequence Tag Query

```xml
<DcmTag tag="0040,0100">
  <DcmSequence>
    <DcmTag tag="0040,0002">#{Date}</DcmTag>
    <DcmTag tag="0040,0003">080000</DcmTag>
  </DcmSequence>
</DcmTag>
```

## Worklist Query Example

Query a DICOM worklist for today's scheduled procedures for a specific patient:

```xml
<Query name="FindWorklistEntry" type="Worklist">
  <ConnectionParameters>
    <PeerAETitle>RIS</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.200</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <!-- Scheduled Procedure Step Sequence -->
  <DcmTag tag="0040,0100">
    <DcmSequence>
      <!-- Scheduled Procedure Step Start Date -->
      <DcmTag tag="0040,0002">#{Date}</DcmTag>
      <!-- Scheduled Procedure Step Start Time -->
      <DcmTag tag="0040,0003"></DcmTag>
    </DcmSequence>
  </DcmTag>
  <!-- Patient ID -->
  <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
  <!-- Patient Name -->
  <DcmTag tag="0010,0010"></DcmTag>
  <!-- Accession Number -->
  <DcmTag tag="0008,0050"></DcmTag>
</Query>
```

Empty tag values request that the server return these fields in the response.

## Study Query Example

Query for studies from the last 7 days for a specific patient:

```xml
<Query name="FindStudies" type="Study">
  <ConnectionParameters>
    <PeerAETitle>PACS</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.100</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <!-- Study Date - last 7 days -->
  <DcmTag tag="0008,0020">#{Date,-7,7}</DcmTag>
  <!-- Patient ID -->
  <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
  <!-- Study Instance UID -->
  <DcmTag tag="0020,000D"></DcmTag>
  <!-- Study Description -->
  <DcmTag tag="0008,1030"></DcmTag>
</Query>
```

## Using Query Results

Query results are automatically merged into the current DICOM object. Tags returned from the query overwrite existing tags in the job.

### Checking Query Success

Use workflow conditional nodes to check if the query found results:

```xml
<Workflow>
  <Perform action="FindWorklistEntry"/>

  <If field="QUERY_FOUND" value="true">
    <!-- Query found matching entry -->
    <Perform action="ProcessWithPatientData"/>
  </If>

  <If field="QUERY_FOUND" value="false">
    <!-- Query found no matches -->
    <Perform action="HandleMissingPatient"/>
  </If>
</Workflow>
```

### Checking Partial Matches

```xml
<If field="QUERY_PARTIAL" value="true">
  <!-- Query returned multiple matches -->
  <Suspend/>
</If>
```

## Date Placeholders in Queries

Date placeholders are particularly useful in query actions:

```xml
<!-- Today's date -->
<DcmTag tag="0008,0020">#{Date}</DcmTag>

<!-- Yesterday -->
<DcmTag tag="0008,0020">#{Date,-1}</DcmTag>

<!-- Last 30 days -->
<DcmTag tag="0008,0020">#{Date,-30,30}</DcmTag>

<!-- Next 7 days -->
<DcmTag tag="0008,0020">#{Date,0,7}</DcmTag>
```

See [Placeholders](../placeholders.md) for complete date placeholder syntax.

## Common Query Tags

### Patient Level Tags

```xml
<DcmTag tag="0010,0010"></DcmTag>  <!-- Patient Name -->
<DcmTag tag="0010,0020"></DcmTag>  <!-- Patient ID -->
<DcmTag tag="0010,0030"></DcmTag>  <!-- Patient Birth Date -->
<DcmTag tag="0010,0040"></DcmTag>  <!-- Patient Sex -->
```

### Study Level Tags

```xml
<DcmTag tag="0020,000D"></DcmTag>  <!-- Study Instance UID -->
<DcmTag tag="0008,0020"></DcmTag>  <!-- Study Date -->
<DcmTag tag="0008,0030"></DcmTag>  <!-- Study Time -->
<DcmTag tag="0008,1030"></DcmTag>  <!-- Study Description -->
<DcmTag tag="0008,0050"></DcmTag>  <!-- Accession Number -->
```

### Worklist Tags

```xml
<!-- Scheduled Procedure Step Sequence (0040,0100) -->
<DcmTag tag="0040,0100">
  <DcmSequence>
    <DcmTag tag="0040,0002"></DcmTag>  <!-- Scheduled Procedure Step Start Date -->
    <DcmTag tag="0040,0003"></DcmTag>  <!-- Scheduled Procedure Step Start Time -->
    <DcmTag tag="0040,0001"></DcmTag>  <!-- Scheduled Station AE Title -->
    <DcmTag tag="0040,0006"></DcmTag>  <!-- Scheduled Performing Physician Name -->
  </DcmSequence>
</DcmTag>
```

## Complete Example

Complete worklist query with patient matching:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <Query name="FindPatientWorklist" type="Worklist">
      <ConnectionParameters>
        <PeerAETitle>RIS_SERVER</PeerAETitle>
        <MyAETitle>DICOM_PRINTER</MyAETitle>
        <Host>ris.hospital.local</Host>
        <Port>11112</Port>
      </ConnectionParameters>
      <!-- Scheduled Procedure Step Sequence -->
      <DcmTag tag="0040,0100">
        <DcmSequence>
          <!-- Today's date -->
          <DcmTag tag="0040,0002">#{Date}</DcmTag>
          <DcmTag tag="0040,0003"></DcmTag>
          <DcmTag tag="0040,0001"></DcmTag>
        </DcmSequence>
      </DcmTag>
      <!-- Patient ID from print job -->
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
      <!-- Request patient demographics -->
      <DcmTag tag="0010,0010"></DcmTag>
      <DcmTag tag="0010,0030"></DcmTag>
      <DcmTag tag="0010,0040"></DcmTag>
      <!-- Request accession number -->
      <DcmTag tag="0008,0050"></DcmTag>
    </Query>
  </Actions>

  <Workflow>
    <Perform action="FindPatientWorklist"/>

    <If field="QUERY_FOUND" value="true">
      <!-- Patient matched - continue processing -->
      <Perform action="SendToPACS"/>
    </If>

    <If field="QUERY_FOUND" value="false">
      <!-- No match - suspend for manual review -->
      <Suspend/>
    </If>
  </Workflow>
</DicomPrinter>
```

## Related Topics

- [Actions Overview](index.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
- [Placeholders](../placeholders.md)
- [SetTag Actions](settag.md)
