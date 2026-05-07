# Query Actions

Query actions perform DICOM C-FIND operations to search for patient data, studies, or worklist entries from remote DICOM servers.

## Query Types

DICOM Printer 2 supports four query types:

- **Worklist (MWL)** - Query DICOM Modality Worklist for scheduled procedures
- **Study** - Query for existing DICOM studies using the Study Root Information Model
- **Patient** - Query for DICOM patients using the Patient Root Information Model. Supports a `level` attribute: `PATIENT`, `STUDY`, `SERIES`, `IMAGE`
- **Manual** - Parks jobs in `queue/manual/` for manual worklist matching via the [Queue Dashboard](/dicom-printer-2/queue-dashboard). Does not perform a C-FIND query

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

**Valid Values:** `Worklist`, `Study`, `Patient`, `Manual`

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

## Patient Query Example

Patient queries use the Patient Root Information Model instead of the Study Root model. They support a `level` attribute that controls the Query/Retrieve level: `PATIENT` (default), `STUDY`, `SERIES`, or `IMAGE`.

```xml
<Query name="FindPatient" type="Patient" level="PATIENT">
  <ConnectionParameters>
    <PeerAETitle>PACS</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.100</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <!-- Patient ID -->
  <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
  <!-- Patient Name -->
  <DcmTag tag="0010,0010"></DcmTag>
  <!-- Patient Birth Date -->
  <DcmTag tag="0010,0030"></DcmTag>
</Query>
```

The `level` attribute determines which required tags are automatically included in the query. For example, `level="STUDY"` includes Study Date, Study Time, Accession Number, and Study Instance UID among others. If an unknown level value is provided, it defaults to `PATIENT`.

## Local Post-Filtering

DP2 evaluates `<DcmTag>` patterns both as wire-level query keys sent to the SCP and as local filters applied to the SCP's response. When the SCP returns a superset (it doesn't honor every constraint, interprets ranges differently, or returns extra rows on purpose), local post-filtering rejects results that don't match the configured pattern before the workflow consumes them.

Date constraints are the most load-bearing case:

- **Study and Patient queries** — `<DcmTag tag="(0008,0020)">#{Date,-7,7}</DcmTag>` is sent on the wire as a date range *and* enforced locally against `(0008,0020)` StudyDate in each returned dataset. Out-of-range studies are dropped even if the SCP returns them.
- **Worklist queries** — date constraints target Scheduled Procedure Step Start Date `(0040,0002)` inside the `(0040,0100)` Scheduled Procedure Step Sequence. A candidate is accepted if any SPS item's Start Date matches; otherwise the candidate is rejected.

Local post-filtering does not recover when an SCP returns zero rows because it rejected range syntax on the wire. If your SCP does not honor `YYYYMMDD-YYYYMMDD` range queries, narrow the wire query to a single date or split into multiple queries.

## Worklist Date Constraints

DP2 accepts four input forms for the Worklist scheduled-date filter, in precedence order:

1. **Canonical SPS date** — explicit `(0040,0002)` Scheduled Procedure Step Start Date inside the `(0040,0100)` sequence:

   ```xml
   <DcmSequence tag="(0040,0100)">
     <DcmItem>
       <DcmTag tag="(0040,0002)">#{Date,-7,7}</DcmTag>
     </DcmItem>
   </DcmSequence>
   ```

2. **Root `StudyDate` alias** — root `(0008,0020)` is an ergonomic shorthand for SPS Start Date. DP2 rewrites it into the canonical SPS sequence form before sending the wire query and applying the local filter:

   ```xml
   <DcmTag tag="(0008,0020)">#{Date,-7,7}</DcmTag>
   ```

3. **Job-derived StudyDate** — when no date is configured, DP2 uses the current job's `(0008,0020)` StudyDate as the SPS Start Date constraint.

4. **Default** — when neither the config nor the job supplies a date, DP2 defaults to `#{Date,-7,7}` — the 15-day window ending today (today minus 14 through today, centered 7 days ago).

The selected constraint is enforced locally on returned candidates, not just sent on the wire. If both the canonical SPS form and the root alias are configured, the canonical form wins and the alias is ignored with a warning in the log.

A root `StudyDate` *exclusion* alias (e.g. `!#{Date,-7,7}`) cannot be combined with an explicit `(0040,0100)` sequence filter. That mixed inclusion/exclusion combination is rejected at config-load time. To exclude items by date while applying other SPS filters, place the exclusion directly inside the canonical SPS sequence form.

## Manual Query

Manual Query parks a job in `queue/manual/` for manual worklist matching through the [Queue Dashboard](/dicom-printer-2/queue-dashboard). Unlike other query types, it does **not** perform a C-FIND operation.

When executed, ManualQuery:

1. Moves all job files (`.dxi`, `.txt`, images, PDFs, and companion files) to a `queue/manual/` subdirectory
2. Deletes any existing `.meta` file (giving the job a fresh retry budget if it re-enters the workflow)
3. Sets the **Held** flag on the job, which prevents file deletion and stops workflow execution

`ConnectionParameters` are **optional**. If provided, they are read by the Queue Dashboard for worklist lookup but are not used by DICOM Printer 2 itself.

```xml
<Query name="ParkForManualMatch" type="Manual">
  <!-- Optional: connection settings used by Queue Dashboard for worklist lookup -->
  <ConnectionParameters>
    <PeerAETitle>RIS</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.200</Host>
    <Port>11112</Port>
  </ConnectionParameters>
</Query>
```

See [Queue Dashboard](/dicom-printer-2/queue-dashboard) for details on the manual matching workflow.

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

## Exclusion Filters

Prefix a `<DcmTag>` value with `!` to exclude matching results from the query response. The tag is sent as an empty value (universal match) to retrieve all results from the server, then matching entries are filtered out client-side.

```xml
<Query name="FindStudies" type="Study">
  <ConnectionParameters>
    <PeerAETitle>PACS</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.100</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <!-- Exclude studies with description matching DEMO* -->
  <DcmTag tag="0008,1030">!DEMO*</DcmTag>
  <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
</Query>
```

Exclusion filters support wildcards:

- `!DEMO*` — exclude entries starting with "DEMO"
- `!*TEST*` — exclude entries containing "TEST"
- `!CARDIOLOGY` — exclude exact match "CARDIOLOGY"

Exclusion filters also work on sequence tags within `<DcmSequence>` elements. When an exclusion filter matches, the entire result dataset is rejected.

## Sequence Persistence

By default, sequences returned from C-FIND responses are discarded after matching. To persist a sequence into the job dataset for use by downstream actions (such as `SetTag` or `Store`), add the `persist="true"` attribute to the `<DcmSequence>` element.

```xml
<Query name="FindWorklistEntry" type="Worklist">
  <!-- Scheduled Procedure Step Sequence — persisted to job dataset -->
  <DcmSequence tag="(0040,0100)" persist="true">
    <DcmItem>
      <DcmTag tag="(0040,0001)"/>  <!-- Scheduled Station AE Title -->
      <DcmTag tag="(0040,0002)"/>  <!-- Scheduled Procedure Step Start Date -->
      <DcmTag tag="(0040,0003)"/>  <!-- Scheduled Procedure Step Start Time -->
    </DcmItem>
  </DcmSequence>
  <ConnectionParameters>
    <PeerAETitle>RIS</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.200</Host>
    <Port>11112</Port>
  </ConnectionParameters>
  <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
</Query>
```

With `persist="true"`, the matched sequence is cloned from the C-FIND response into the job's DICOM dataset, making it available to subsequent workflow actions.

## Related Topics

- [Actions Overview](index.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
- [Placeholders](../placeholders.md)
- [SetTag Actions](settag.md)
