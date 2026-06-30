# Query Actions

Query actions perform DICOM C-FIND operations to search for patient data, studies, or worklist entries from remote DICOM servers.

## Query Types

DICOM Printer 2 supports four query types:

- **Worklist (MWL)** - Query DICOM Modality Worklist for scheduled procedures
- **Study** - Query for existing DICOM studies using the Study Root Information Model
- **Patient** - Query for DICOM patients using the Patient Root Information Model. Supports a `level` attribute: `PATIENT`, `STUDY`, `SERIES`, `IMAGE`
- **Manual** - Parks jobs in `queue/manual/` for operator-driven worklist matching via the [DICOM Printer Console](/dicom-printer-2/control-app). Does not perform a C-FIND query — see [Manual Matching](/dicom-printer-2/queue-dashboard)

## Basic Syntax

```xml
<Query name="ActionName" type="QueryType">
  <ConnectionParameters>
    <PeerAeTitle>RemoteAE</PeerAeTitle>
    <MyAeTitle>LocalAE</MyAeTitle>
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

#### `PeerAeTitle`
The AE Title of the remote DICOM server being queried.

#### `MyAeTitle`
The AE Title of DICOM Printer 2 (this application).

#### `Host`
The hostname or IP address of the remote DICOM server.

#### `Port`
The TCP port number of the remote DICOM server (typically 104 or 11112).

## Optional Attributes

### `forcePeerAe`

**Worklist only.** When set to `1`, DP2 inserts the current job's Scheduled Station AE Title value into Scheduled Station AE Title `(0040,0001)` within the `(0040,0100)` Scheduled Procedure Step Sequence, sending it as a matching key. When set to `0`, that tag is sent as an empty return key instead. It has no effect on Study, Patient, or Manual queries.

**Type:** Boolean (`1`/`0`)
**Default:** `0`

```xml
<Query name="FindWorklistEntry" type="Worklist" forcePeerAe="1" ...>
```

### `select`

Controls how a multi-result C-FIND response is reduced before assignment.

**Type:** Enum
**Valid Values:** `first`, `last`
**Default:** unset — the legacy "single match wins, multiple match warns and skips assignment" behavior is preserved.

```xml
<Query name="FindStudies" type="Study" select="first" ...>
```

When `select="first"` or `select="last"` is set, the locally-filtered result list is reduced to that single dataset and assignment proceeds. When unset, multi-result responses log a warning and no tags are assigned (the historical behavior).

`select` pairs naturally with [`order-by`](#order-by) so the choice of which result wins is deterministic across runs:

```xml
<Query name="LatestStudy" type="Study"
       select="last" order-by="StudyDate asc">
  <!-- ... -->
</Query>
```

Added in 2.4.0 (#84).

### `order-by`

SQL-like sort clause applied to the locally-filtered result list before `select` reduces it.

**Type:** String — one or more comma-separated clauses
**Default:** unset — results retain the PACS response order.

Each clause is `<tag> [asc|desc]`. The tag is either a DCMTK dictionary name (e.g. `StudyDate`, `AccessionNumber`) or a numeric DICOM tag in `(GGGG,EEEE)` form. Direction defaults to `asc`.

```xml
<!-- Newest study first -->
<Query name="LatestStudy" type="Study"
       select="first" order-by="StudyDate desc">
  <!-- ... -->
</Query>

<!-- Sort by date, then time as a tie-breaker -->
<Query name="OrderedStudies" type="Study"
       order-by="(0008,0020) asc, (0008,0030) asc">
  <!-- ... -->
</Query>
```

Tag-name lookup is case-insensitive. Numeric tags are accepted with or without parentheses (`0008,0020` and `(0008,0020)` are equivalent).

Sort semantics:

- Missing values are ordered **after** present values, regardless of `asc`/`desc`.
- Ties preserve the PACS response order (stable sort).
- If a requested sort tag is missing from one or more returned datasets, DP2 logs a warning identifying the tag so operators can either add it to the query's return keys or drop the clause.

### `force-assignment`

Legacy alias for `select="first"`.

**Type:** Boolean
**Default:** `false`

```xml
<Query name="FindWorklistEntry" force-assignment="true" ...>
```

When both `force-assignment` and `select` are present, `select` wins. If the two disagree (e.g. `select="last" force-assignment="true"`), a warning is logged. New configs should prefer `select`.

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
    <PeerAeTitle>RIS</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
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
    <PeerAeTitle>PACS</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
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

For Study queries, `ModalitiesInStudy` `(0008,0061)` may contain multiple
modalities. Pipe-list exclusions such as `!CR|!OT` exclude any returned study
whose `ModalitiesInStudy` value matches either excluded modality.

## Patient Query Example

Patient queries use the Patient Root Information Model instead of the Study Root model. They support a `level` attribute that controls the Query/Retrieve level: `PATIENT` (default), `STUDY`, `SERIES`, or `IMAGE`.

```xml
<Query name="FindPatient" type="Patient" level="PATIENT">
  <ConnectionParameters>
    <PeerAeTitle>PACS</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
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

DP2 evaluates Query `<DcmTag>` patterns both as wire-level query keys sent to the SCP and as local filters applied to the SCP's response. When the SCP returns a superset (it doesn't honor every constraint, interprets ranges differently, or returns extra rows on purpose), local post-filtering rejects results that don't match the configured pattern before the workflow consumes them.

Use `match="local"` when the value should not be sent as a wire matching key:

```xml
<DcmTag tag="(0008,0020)" match="local">#{Date,-7,7}</DcmTag>
```

With `match="local"`, DP2 sends the tag as an empty C-FIND return key and applies the configured value only after results come back. This is useful for SCPs that reject `YYYYMMDD-YYYYMMDD` range syntax but will accept a broader query and return the date field needed for local filtering. The default is `match="both"`, which preserves the existing behavior: send the value on the wire and post-filter locally.

Date constraints are the most load-bearing case:

- **Study and Patient queries** — `<DcmTag tag="(0008,0020)">#{Date,-7,7}</DcmTag>` is sent on the wire as a date range *and* enforced locally against `(0008,0020)` StudyDate in each returned dataset. Out-of-range studies are dropped even if the SCP returns them.
- **Worklist queries** — date constraints target Scheduled Procedure Step Start Date `(0040,0002)` inside the `(0040,0100)` Scheduled Procedure Step Sequence. A candidate is accepted if any SPS item's Start Date matches; otherwise the candidate is rejected.

If an SCP returns zero rows because it rejected range syntax on the wire, use `match="local"` on the date tag to avoid sending the range as a wire matching key. This still depends on the SCP accepting the broader query and returning the date attribute DP2 needs for local filtering.

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

   Add `match="local"` to request SPS Start Date as an empty return key while enforcing the date range only in DP2:

   ```xml
   <DcmTag tag="(0008,0020)" match="local">#{Date,-7,7}</DcmTag>
   ```

3. **Job-derived StudyDate** — when no date is configured, DP2 uses the current job's `(0008,0020)` StudyDate as the SPS Start Date constraint.

4. **Default** — when neither the config nor the job supplies a date, DP2 defaults to `#{Date,-7,7}` — the 15-day window ending today (today minus 14 through today, centered 7 days ago).

The selected constraint is enforced locally on returned candidates, not just sent on the wire. If both the canonical SPS form and the root alias are configured, the canonical form wins and the alias is ignored with a warning in the log.

A root `StudyDate` *exclusion* alias (e.g. `!#{Date,-7,7}`) cannot be combined with an explicit `(0040,0100)` sequence filter. That mixed inclusion/exclusion combination is rejected at config-load time. To exclude items by date while applying other SPS filters, place the exclusion directly inside the canonical SPS sequence form.

## Worklist Modality Constraints

For Worklist queries, root `Modality` `(0008,0060)` is also accepted as an
ergonomic alias for Scheduled Procedure Step Modality `(0040,0100)/(0008,0060)`.
This lets a config use the familiar root tag while DP2 targets the Worklist SPS
item where MWL servers normally return modality.

Literal single-modality values are sent to the SCP as SPS Modality and then
enforced locally:

```xml
<Query name="FindWorklistEntry" type="Worklist">
  <DcmTag tag="(0008,0060)">CR</DcmTag>
</Query>
```

Patterns that are not safe or portable as wire matching keys are requested as
empty SPS Modality return keys and filtered locally by DP2. This includes
regular expressions, pipe-list alternates, wildcards, exclusions, and explicit
`match="local"`:

```xml
<!-- Accept CI, CR, or PF locally. -->
<DcmTag tag="(0008,0060)">^(CI|CR|PF)$</DcmTag>

<!-- Exclude CR and OT locally. -->
<DcmTag tag="(0008,0060)">!CR|!OT</DcmTag>

<!-- Force local filtering even for a literal value. -->
<DcmTag tag="(0008,0060)" match="local">CR</DcmTag>
```

Multiple modality filters are enforced independently. If the config also
contains a canonical in-sequence SPS Modality filter, the canonical sequence
constraint is authoritative for that sequence item. `match="local"` remains a
`<DcmTag>` attribute; it is not supported on `<DcmSequence>`.

## Manual Query

Manual Query parks a job in `queue/manual/` for operator-driven worklist matching through the [DICOM Printer Console](/dicom-printer-2/control-app). Unlike other query types, it does **not** perform a C-FIND operation.

When executed, ManualQuery:

1. Moves all job files (`.dxi`, `.txt`, images, PDFs, and companion files) to a `queue/manual/` subdirectory
2. Deletes any existing `.meta` file (giving the job a fresh retry budget if it re-enters the workflow)
3. Sets the **Held** flag on the job, which prevents file deletion and stops workflow execution

`ConnectionParameters` are **optional** on a Manual query — DP2 does not contact a remote SCP. The Console enumerates the *other* `<Query>` actions in the config (Worklist, Study, Patient) to populate its endpoint selector.

```xml
<Query name="ParkForManualMatch" type="Manual" />
```

A typical workflow pairs Manual with `ManualMatch` to wait for the operator's `.match` file before continuing:

```xml
<Workflow>
  <Perform action="FindWorklistEntry"/>
  <If field="QUERY_FOUND" value="0">
    <Statements>
      <Perform action="ParkForManualMatch"/>
      <Perform action="ManualMatch"/>
    </Statements>
  </If>
  <Perform action="SendToPACS"/>
</Workflow>
```

See [Manual Matching](/dicom-printer-2/queue-dashboard) for the on-disk contract and [DICOM Printer Console](/dicom-printer-2/control-app) for the operator UI.

## Using Query Results

Query results are automatically merged into the current DICOM object. Tags returned from the query overwrite existing tags in the job.

### Checking Query Success

Use workflow conditional nodes to check if the query found results:

```xml
<Workflow>
  <Perform action="FindWorklistEntry"/>

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <!-- Query found matching entry -->
      <Perform action="ProcessWithPatientData"/>
    </Statements>
  </If>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <!-- Query found no matches -->
      <Perform action="HandleMissingPatient"/>
    </Statements>
  </If>
</Workflow>
```

### Checking Partial Matches

```xml
<If field="QUERY_PARTIAL" value="1">
  <Statements>
    <!-- Query returned multiple matches -->
    <Suspend resumeAction="FindWorklistEntry"/>
  </Statements>
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
<!DOCTYPE DicomPrinterConfig SYSTEM "config.dtd">
<DicomPrinterConfig>
  <ActionsList>
    <Query name="FindPatientWorklist" type="Worklist">
      <ConnectionParameters>
        <PeerAeTitle>RIS_SERVER</PeerAeTitle>
        <MyAeTitle>DICOM_PRINTER</MyAeTitle>
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
  </ActionsList>

  <Workflow>
    <Perform action="FindPatientWorklist"/>

    <If field="QUERY_FOUND" value="1">
      <Statements>
        <!-- Patient matched - continue processing -->
        <Perform action="SendToPACS"/>
      </Statements>
    </If>

    <If field="QUERY_FOUND" value="0">
      <Statements>
        <!-- No match - suspend for manual review -->
        <Suspend resumeAction="FindPatientWorklist"/>
      </Statements>
    </If>
  </Workflow>
</DicomPrinterConfig>
```

## Exclusion Filters

Prefix a `<DcmTag>` value with `!` to exclude matching results from the query response. The tag is sent as an empty value (universal match) to retrieve all results from the server, then matching entries are filtered out client-side.

```xml
<Query name="FindStudies" type="Study">
  <ConnectionParameters>
    <PeerAeTitle>PACS</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
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
- `!CR|!OT` — exclude either value in a pipe-list

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
    <PeerAeTitle>RIS</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
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
