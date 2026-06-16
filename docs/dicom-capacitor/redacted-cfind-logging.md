# Redacted C-FIND Proxy Visibility

## What it is

When DICOM Capacitor proxies a Query/Retrieve or Modality Worklist C-FIND, it
normally logs the association and DIMSE status flow but **not** the shape of
the query identifier. That makes "the PACS says the query is too open" style
incidents hard to diagnose without a packet capture or temporarily unsafe
full-dataset logging.

Redacted C-FIND proxy visibility adds **PHI-safe, correlated** diagnostic log
lines that show the *shape* of the query and results — never the values — so
you can prove whether Capacitor forwarded a broad query, a tightened query, or
a transformed query, and what the upstream PACS returned.

It is **off by default**. When off, the code paths are cheap no-ops.

## Enabling it

| Setting | Type | Default | Meaning |
|---|---|---|---|
| `redactedCFindLogging` | bool | `false` | Master enable. |
| `redactedCFindLoggingExtraTags` | string list | empty | Extra diagnostic tags beyond the built-in sets. Each entry is a DICOM keyword (`InstitutionName`) or a `gggg,eeee` group/element (`0008,0080`). Unparseable entries are ignored. |

Like all Capacitor settings these are overridable via environment
(`CAPACITOR_REDACTED_C_FIND_LOGGING=true`) or CLI
(`--config.redactedCFindLogging=true`). Lines are written to the normal
support log (`capacitor_service.log`), not the audit log.

## What gets logged

Each proxied C-FIND emits correlated single-line entries, prefixed
`CFIND-PROXY`, at these phases:

| Phase | When | Answers |
|---|---|---|
| `inbound` | as received from the caller, before any Lua/YAML transform | What shape did the caller send? |
| `outbound` | immediately before the upstream send, after Lua/YAML (and, for worklist, the date-range merge) | What shape did we actually forward? |
| `upstream-status` | each upstream response status, including pending and terminal statuses | What did upstream say, including `Processing failure`? |
| `result-summary` | once, terminating, after response transforms/filtering | How many results, terminal status, and aggregate redacted shape |
| `cache-hit` | worklist only — a fresh cache served the caller, so no upstream query happened | Confirms no upstream query occurred |

Every line carries correlation fields: `family` (`qr`/`worklist`), `phase`,
`msgId` (DIMSE message id), `calling`, `called`, `upstream` (resolved node
AE), `model` (SOP class UID), and `level` (QR only).

> Note: `called` is the AE title the caller addressed. When that is an alias,
> `called` shows the alias and `upstream` shows the resolved node AE title.

## The redaction model

For each diagnostic tag, exactly one token is emitted:

| Token | Meaning |
|---|---|
| `absent` | tag not present |
| `empty` | present but empty/whitespace |
| `present(len=N)` | present with a concrete value, N characters |
| `wildcard(len=N)` | value contains `*` or `?` |
| `range(len=N)` | a date/time-VR value containing `-` (e.g. `20260101-20260131`) |

Only the character **length** is ever emitted — never the value, and (by
deliberate design) **no hashes**. Tags nested in a sequence are rendered
`SEQLABEL:Tag` (e.g. `SPS:ScheduledStationAETitle`); the first sequence item
is summarized and the item count annotated when > 1 (`SPS[n=2]:...`).

`result-summary` aggregates result datasets as state counts only:
`resultTags=[PatientID={present:3} StudyDate={absent:1 present:2}]` — no
values, lengths, or hashes in the aggregate.

### Built-in tag sets

- **QR**: QueryRetrieveLevel, PatientName, PatientID, PatientBirthDate,
  PatientSex, StudyDate, StudyTime, AccessionNumber, StudyInstanceUID,
  ModalitiesInStudy, StudyDescription.
- **Worklist**: PatientName, PatientID, AccessionNumber, and inside
  `ScheduledProcedureStepSequence`: ScheduledProcedureStepStartDate/Time,
  Modality, ScheduledStationAETitle, ScheduledProcedureStepID.

## Sample lines (the PMH-style incident)

```
CFIND-PROXY family=qr phase=inbound msgId=23 calling=PMH_MAMMO called=CPSI_QR upstream=CPSI_PACS_SERVER model=1.2.840.10008.5.1.4.1.2.2.1 level=STUDY tags=[QueryRetrieveLevel=present(len=5) PatientName=wildcard(len=3) PatientID=absent StudyDate=range(len=17) AccessionNumber=empty ...]
CFIND-PROXY family=qr phase=outbound msgId=23 calling=PMH_MAMMO called=CPSI_QR upstream=CPSI_PACS_SERVER model=1.2.840.10008.5.1.4.1.2.2.1 level=STUDY tags=[QueryRetrieveLevel=present(len=5) PatientName=wildcard(len=3) PatientID=absent StudyDate=range(len=17) ...]
CFIND-PROXY family=qr phase=upstream-status msgId=23 calling=PMH_MAMMO called=CPSI_QR upstream=CPSI_PACS_SERVER status="Processing failure [0x0110]" hasDataset=false
CFIND-PROXY family=qr phase=result-summary msgId=23 calling=PMH_MAMMO called=CPSI_QR upstream=CPSI_PACS_SERVER count=0 terminalStatus="Processing failure [0x0110]" resultTags=[]
```

Reading this: the caller sent a wildcard `PatientName` with no `PatientID`
and a `StudyDate` range; Capacitor forwarded the same shape; the upstream PACS
returned `Processing failure` with no data. That proves the broad query was
forwarded as-is and rejected upstream — diagnosable from one log file.

## What this is *not*

This is **not** full DICOM dataset logging. Full-dataset logging would be
useful for deep debugging but is inappropriate as a default production support
mechanism. The output here is a PHI-safe diagnostic summary of query *shape*.
