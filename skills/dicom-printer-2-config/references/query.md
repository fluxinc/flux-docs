# Reference: Query (C-FIND)

`<Query>` performs a C-FIND against a Worklist or PACS and copies matched values into the job
dataset for later Store/Print. One `name` per query; invoked by `<Perform>`.

## Attributes

| attr | values | default | notes |
|---|---|---|---|
| `name` | string | — | required, unique |
| `type` | `Study` \| `Worklist` \| `Patient` \| `Manual` | Study (with warning) | case-insensitive; unknown = load error |
| `level` | `PATIENT`\|`STUDY`\|`SERIES`\|`IMAGE` | Study→STUDY, Patient→PATIENT | Study/Patient only; Worklist/Manual ignore it |
| `select` | `first` \| `last` | none | which result to assign when >1 survives filtering+ordering |
| `order-by` | `Tag [asc\|desc], …` | — | tag = DICOM name or `(gggg,eeee)`; asc default; e.g. `StudyDate desc, StudyTime desc` |
| `forcePeerAe` | bool | false | **Worklist only**: copy job value into Scheduled Station AE `(0040,0001)` |
| `force-assignment` | bool | false | compatibility alias for `select="first"`; prefer `select` |

## `<DcmTag>` — dual role: return key *and* filter

```xml
<DcmTag tag="(0010,0020)">#{PatientID}</DcmTag>  <!-- match key + local filter -->
<DcmTag tag="(0010,0010)" />                      <!-- empty = ask PACS to return this tag -->
```

- **Empty** = universal return key (no constraint, just "send it back").
- **With a value** = sent as a wire match key AND enforced locally on the results.
- Value patterns: exact, wildcard `*`, range `low-high`, exclusion `!x` (e.g. `!US`),
  and `#{...}` placeholders (`#{PatientID}`, `#{Date,-7,7}`).
- Wildcard/regex/exclusion values are **not** sent as a wire match (an empty return key is sent
  instead) and are enforced purely in DP2's local post-filter.
- `match="local"` forces that behavior explicitly: send an empty wire key, enforce the value
  locally. Use it when an SCP rejects fragile syntax (e.g. DA date ranges). **Not valid on
  `<DcmSequence>`.**

### Result handling

Pipeline: wire C-FIND → local filters → `order-by` sort → `select`.

- 0 results → `QUERY_FOUND=0`. ≥1 → `QUERY_FOUND=1`. >1 → also `QUERY_PARTIAL=1`.
- Exactly 1 result → its tags are copied into the job.
- >1 results: with `select`/`force-assignment`, the first/last ordered result is copied;
  **without it, nothing is copied** (a "Too many query results" warning is logged). There is
  **no** 100-result hard cap (the old manual claim is wrong).
- Multi-valued fields (e.g. `ModalitiesInStudy` `SR\US`) match if **any** component matches.
- Retrieved **sequences** are copied back to the job only if you declare
  `<DcmSequence … persist="true">`.

## Query types

- **Study** — Study Root C-FIND. `level` STUDY/SERIES/IMAGE.
- **Patient** — Patient Root C-FIND. `level` PATIENT/STUDY/SERIES/IMAGE.
- **Worklist** — Modality Worklist. No `level`. Scheduled-procedure handling below.
- **Manual** — does **not** hit the network. Parks the job in a manual queue, writes sidecar
  JSON, marks it Held, and opens the DICOM Printer Console so an operator picks the match; the
  workflow resumes *after* this action. Config can be as small as
  `<Query name="…" type="Manual"/>`; the Console uses the parked job context and configured query
  endpoints for operator matching.

## Worklist specifics

- The canonical scheduled date lives in the Scheduled Procedure Step Sequence
  `(0040,0100)` → Start Date `(0040,0002)`.
- **Root `StudyDate` `(0008,0020)` is an alias**: in a Worklist query it is rewritten into the
  SPS Start Date for both wire and local filtering (MWL responses carry no root StudyDate, so a
  literal root match would reject everything).
- If no date is configured anywhere, the default is `#{Date,-7,7}` (≈ last two weeks).
- These root tags are auto-moved into the SPS item when present at root: ScheduledStationAETitle,
  ScheduledStationName, ScheduledPerformingPhysicianName, ScheduledProcedureStepStartDate/Time,
  ScheduledProcedureStepDescription, StudyDate(→start date), Modality.

```xml
<Query name="QueryWorklist" type="Worklist">
  <ConnectionParameters>
    <MyAeTitle>DICOM_PRINTER</MyAeTitle><PeerAeTitle>WORKLIST_SCP</PeerAeTitle>
    <Host>10.0.0.50</Host><Port>104</Port>
  </ConnectionParameters>
  <DcmTag tag="(0010,0020)">#{PatientID}</DcmTag>     <!-- match -->
  <DcmTag tag="(0008,0020)" match="local">#{Date,-1,1}</DcmTag> <!-- date, local only -->
  <DcmTag tag="(0008,0050)" />                         <!-- return AccessionNumber -->
  <DcmTag tag="(0010,0010)" />                         <!-- return PatientName -->
  <DcmTag tag="(0008,1030)" />                         <!-- return StudyDescription -->
</Query>
```

## Sequences in queries

```xml
<Query name="ProcQuery" type="Worklist">
  <DcmSequence tag="(0040,0100)">          <!-- Scheduled Procedure Step Sequence -->
    <DcmItem>
      <DcmTag tag="(0040,0001)">#{ScheduledStationAETitle}</DcmTag>
      <DcmTag tag="(0040,0002)">#{Date,-1,1}</DcmTag>
    </DcmItem>
  </DcmSequence>
  <DcmTag tag="(0008,0050)" />
</Query>
```
Add `persist="true"` to a `<DcmSequence>` to copy the matched sequence from the result into the
job dataset. A `SetSequence`-built sequence is only sent in a query if that query also declares
a matching `<DcmSequence>` for the same tag.

## Selecting one of many

```xml
<!-- newest study for this patient -->
<Query name="FindNewest" type="Study" level="STUDY"
       order-by="StudyDate desc, StudyTime desc" select="first">
  <ConnectionParameters>…</ConnectionParameters>
  <DcmTag tag="(0010,0020)">#{PatientID}</DcmTag>
</Query>
```
Missing sort values sort last; equal values keep PACS order; omitting `order-by` preserves PACS
order entirely.
