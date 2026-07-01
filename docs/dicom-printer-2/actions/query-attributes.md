# Query Attribute Mapping

Query attributes do two jobs:

1. Build the DICOM C-FIND request or the manual matching context.
2. Decide which values from a selected result are copied back into the active job dataset.

This page is the mapping reference. For general syntax and workflow examples, see [Query Actions](query.md).

## Query Type Matrix

| Query type | DICOM model | `level` support | Connection parameters | Special behavior |
| --- | --- | --- | --- | --- |
| `Worklist` | Modality Worklist | Not used | Required | Builds a Scheduled Procedure Step sequence, accepts root-level SPS aliases, and maps selected worklist values back to normal job tags. |
| `Study` | Study Root Query/Retrieve | `STUDY`, `SERIES`, `IMAGE` | Required | Sets `QueryRetrieveLevel` from `level`. |
| `Patient` | Patient Root Query/Retrieve | `PATIENT`, `STUDY`, `SERIES`, `IMAGE` | Required | Sets `QueryRetrieveLevel` from `level`. |
| `Manual` | Manual worklist matching | Not used | Optional | Builds the same worklist query context, parks the job in the manual queue, and lets the DICOM Printer Console complete the match. |

Use only the valid `level` values for the selected query type. `PATIENT` is not a valid Study Root level.

## Request Value Selection

For each configured `<DcmTag>` in a network query, DP2 chooses the outgoing value in this order:

1. A non-empty value in the config wins. Placeholders are expanded before sending.
2. If the config tag is empty, DP2 uses the current job dataset value for that tag when one exists.
3. If neither config nor job has a value, DP2 sends an empty return key.

```xml
<Query name="FindStudy" type="Study" level="STUDY">
  <DcmTag tag="PatientID">#{PatientID}</DcmTag>
  <DcmTag tag="StudyInstanceUID" />
  <DcmTag tag="StudyDescription" />
</Query>
```

In this example, `PatientID` is a match key. `StudyInstanceUID` and `StudyDescription` are return keys unless the current job already has values for those tags.

Tag placeholders such as `#{PatientID}` and `#{0010,0020}` replace the whole configured value. Date placeholders such as `#{Date}` can appear inside larger strings.

## Date Placeholders

`#{Date}` expands from the current date.

| Placeholder | Meaning |
| --- | --- |
| `#{Date}` | Today as `YYYYMMDD`. |
| `#{Date,-7}` | Exactly seven days before today. |
| `#{Date,7}` | Exactly seven days after today. |
| `#{Date,-7,7}` | A date range from 14 days before today through today. |
| `#{Date,0,7}` | A date range from seven days before today through seven days after today. |

The third argument is a symmetric range around the offset date. It is not an end offset.

## Local Filtering

DP2 can avoid sending some configured patterns as PACS match keys. For these cases, DP2 sends an empty return key and filters the returned datasets locally:

| Pattern | Wire request | Local filter |
| --- | --- | --- |
| `match="local"` | Empty return key | Required match. |
| `!CT` | Empty return key | Rejects returned values matching `CT`. |
| `MR|CT` | Empty return key | Matches returned values through regular expression alternation. |
| `^US.*` | Empty return key | Matches returned values through regular expression syntax. |
| `SR*` | Empty return key | Matches returned values through wildcard syntax. |

Local filters are applied after C-FIND returns and before `order-by` and `select`.

```xml
<Query name="FindNonNuclearStudy" type="Study" level="STUDY">
  <DcmTag tag="PatientID">#{PatientID}</DcmTag>
  <DcmTag tag="ModalitiesInStudy">!NM</DcmTag>
  <DcmTag tag="StudyDate">#{Date,-7,7}</DcmTag>
</Query>
```

Scalar matching is case-insensitive. Multi-value DICOM fields are split on backslash and match if any component satisfies the filter.

`match="local"` is valid on `<DcmTag>` only. It is not valid on `<DcmSequence>`.

## Sequence Syntax

Use `<DcmSequence>` with one or more `<DcmItem>` children. Do not wrap a sequence in a `<DcmTag>`.

```xml
<Query name="FindWorklistEntry" type="Worklist">
  <DcmSequence tag="ScheduledProcedureStepSequence">
    <DcmItem>
      <DcmTag tag="ScheduledProcedureStepStartDate">#{Date}</DcmTag>
      <DcmTag tag="ScheduledProcedureStepStartTime" />
      <DcmTag tag="Modality">US</DcmTag>
    </DcmItem>
  </DcmSequence>
</Query>
```

Sequence values are used as query constraints. Returned sequences are copied back into the job only when the configured sequence has `persist="true"`.

```xml
<DcmSequence tag="ScheduledProcedureStepSequence" persist="true">
  <DcmItem>
    <DcmTag tag="ScheduledProcedureStepDescription" />
  </DcmItem>
</DcmSequence>
```

## Result Selection and Assignment

The result pipeline is:

1. Send the C-FIND request.
2. Apply local filters.
3. Apply `order-by`, when configured.
4. Pick a result, when the filtered result count allows assignment.
5. Copy values from the selected result into the job dataset.

Assignment rules:

| Filtered result count | Assignment behavior |
| --- | --- |
| `0` | No values are copied. `QUERY_FOUND` is false. The action still succeeds. |
| `1` | Values from the single result are copied. |
| More than `1` and `select="first"` | Values from the first result after ordering are copied. |
| More than `1` and `select="last"` | Values from the last result after ordering are copied. |
| More than `1` and no `select` | No values are copied. `QUERY_FOUND` is true and partial. |

`force-assignment="true"` is an older spelling for `select="first"`. Prefer `select`.

## Copy-Back Rules

When a result is selected:

- `QueryRetrieveLevel` is ignored.
- Non-sequence result elements are copied into the job dataset using the same tag.
- Returned empty elements can overwrite an existing job value with an empty value.
- Tags omitted from the selected result are not copied.
- Returned sequences are ignored unless the matching configured `<DcmSequence>` has `persist="true"`.
- If `ModalitiesInStudy` contains exactly one modality and the job has no root `Modality`, DP2 derives root `Modality` from it. If it contains multiple modalities, DP2 leaves root `Modality` unchanged.

## Worklist Request Mapping

Worklist queries always contain a Scheduled Procedure Step Sequence. DP2 accepts common root-level tags as aliases and moves them into the SPS item for the wire query.

| Root-level config tag | Sent in SPS as |
| --- | --- |
| `StudyDate` | `ScheduledProcedureStepStartDate` |
| `Modality` | `Modality` |
| `ScheduledStationAETitle` | `ScheduledStationAETitle` |
| `StationName` | `ScheduledStationName` |
| `PerformingPhysicianName` | `ScheduledPerformingPhysicianName` |
| `ScheduledProcedureStepStartDate` | `ScheduledProcedureStepStartDate` |
| `ScheduledProcedureStepStartTime` | `ScheduledProcedureStepStartTime` |
| `ScheduledProcedureStepDescription` | `ScheduledProcedureStepDescription` |

An explicit tag inside `ScheduledProcedureStepSequence` wins over the root-level alias for the same SPS field.

If no worklist date is configured, DP2 uses the job `StudyDate` as `ScheduledProcedureStepStartDate`. If the job has no `StudyDate`, network Worklist queries use a default `#{Date,-7,7}` date range. Manual queries clear that generated range when the job has no single `StudyDate`, so the operator starts with a broader manual search.

`forcePeerAe="1"` copies the job's Scheduled Station AE Title into SPS `ScheduledStationAETitle` as a match key when the config did not set that SPS value. With the default `forcePeerAe="0"`, DP2 sends SPS `ScheduledStationAETitle` as an empty return key when the config did not set it.

Worklist also ensures root `PatientName`, `PatientID`, and `AccessionNumber` are present when those tags were not already supplied by the config. If the job already has a value, that value is sent as a match key; otherwise DP2 sends an empty return key.

## Worklist Result Mapping

After normal selected-result copy-back, Worklist applies additional mappings from the selected worklist result:

| Source in selected worklist result | Target job tag | Condition |
| --- | --- | --- |
| SPS `ScheduledProcedureStepStartDate` | `StudyDate` | Source value is present. |
| SPS `ScheduledProcedureStepStartTime` | `StudyTime` | Source value is present. |
| SPS `Modality` | `Modality` | Source value is present. |
| SPS `ScheduledPerformingPhysicianName` | `PerformingPhysicianName` | Source value is present and the job does not already have `PerformingPhysicianName`. |
| SPS `ScheduledProcedureStepDescription` | `StudyDescription` | Source value is present and the job does not already have `StudyDescription`. |
| `RequestedProcedureDescription` | `StudyDescription` | Used when no SPS description was assigned. |
| `AccessionNumber` | `AccessionNumber` | Used when the job still has no accession number. |

Because normal copy-back runs first, root values returned by the worklist server can already be present before these worklist-specific fallback mappings run.

## Practical Examples

### Worklist With Root Aliases

```xml
<Query name="FindWorklistEntry" type="Worklist" select="first">
  <ConnectionParameters>
    <PeerAeTitle>RIS</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
    <Host>192.168.1.200</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <DcmTag tag="PatientID">#{PatientID}</DcmTag>
  <DcmTag tag="AccessionNumber">#{AccessionNumber}</DcmTag>
  <DcmTag tag="StudyDate">#{Date,-7,7}</DcmTag>
  <DcmTag tag="Modality">US|SR</DcmTag>
</Query>
```

`StudyDate` is sent as SPS Start Date. `Modality` is sent as an empty SPS return key and enforced locally because `US|SR` is a regular expression pattern.

### Worklist With Explicit SPS Sequence

```xml
<Query name="FindTodayWorklistEntry" type="Worklist" select="first">
  <ConnectionParameters>
    <PeerAeTitle>RIS</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
    <Host>192.168.1.200</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <DcmTag tag="PatientID">#{PatientID}</DcmTag>
  <DcmSequence tag="ScheduledProcedureStepSequence" persist="true">
    <DcmItem>
      <DcmTag tag="ScheduledProcedureStepStartDate">#{Date}</DcmTag>
      <DcmTag tag="ScheduledProcedureStepStartTime" />
      <DcmTag tag="ScheduledProcedureStepDescription" />
    </DcmItem>
  </DcmSequence>
</Query>
```

The explicit sequence date wins over any root `StudyDate` alias. Because the sequence has `persist="true"`, the returned SPS sequence is also copied into the job dataset.

### Deterministic Study Assignment

```xml
<Query name="FindNewestStudy" type="Study" level="STUDY"
       select="first" order-by="StudyDate desc, StudyTime desc">
  <ConnectionParameters>
    <PeerAeTitle>PACS</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
    <Host>192.168.1.100</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <DcmTag tag="PatientID">#{PatientID}</DcmTag>
  <DcmTag tag="StudyDate">#{Date,-30,30}</DcmTag>
  <DcmTag tag="StudyTime" />
  <DcmTag tag="StudyInstanceUID" />
</Query>
```

`order-by` runs after local filtering. `select="first"` then copies values from the newest returned study.

### Patient Root Query

```xml
<Query name="FindPatientStudies" type="Patient" level="STUDY"
       select="last" order-by="StudyDate asc">
  <ConnectionParameters>
    <PeerAeTitle>PACS</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
    <Host>192.168.1.100</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <DcmTag tag="PatientID">#{PatientID}</DcmTag>
  <DcmTag tag="StudyDate">#{Date,-30,30}</DcmTag>
  <DcmTag tag="StudyInstanceUID" />
</Query>
```

Patient Root supports `PATIENT`, `STUDY`, `SERIES`, and `IMAGE` levels. Study Root supports `STUDY`, `SERIES`, and `IMAGE`.
