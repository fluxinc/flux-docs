# Worklist Prefetch

Worklist prefetch lets DICOM Capacitor start background Query/Retrieve activity when newly refreshed worklist results match configured rules. This is typically used to warm a local cache or viewer destination before the modality user opens the study. DICOM Capacitor can trigger worklist-driven prefetch and route the retrieved studies, but it does not currently act as a dedicated prefetch cache product on its own. Flux Inc offers prefetch-cache functionality as an add-on for deployments that need that behavior.

## How It Works

1. DICOM Capacitor refreshes a configured `NodeRole: Worklist` node.
2. Newly seen worklist responses are compared against the previous refresh for that query.
3. Matching rules from `prefetch.yml` enqueue background work.
4. Background workers use the configured `NodeRole: QueryRetrieve` node to resolve and move studies.
5. Retrieved instances are received through the configured `NodeRole: Storage` destination like any other inbound C-STORE traffic.

Prefetch is event-driven. It runs from newly observed worklist responses, not from every cached worklist item on every refresh.

## Requirements

- `prefetchEnabled: true` in `config.yml`
- A valid `prefetch.yml` in the DICOM Capacitor data directory
- At least one `NodeRole: Worklist` node referenced by rule `AeTitles`
- A `NodeRole: QueryRetrieve` node referenced by `QueryRetrieveNode`
- A `NodeRole: Storage` node referenced by `MoveDestination`

If prefetch is enabled but no valid rules load, the service logs the condition and does not start any prefetch workers.

## `config.yml` Settings

These settings live in `config.yml` and control the worker itself:

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `prefetchEnabled` | boolean | `false` | Master switch for worklist-triggered prefetch |
| `prefetchConcurrency` | number | `1` | Number of background workers processing prefetch items |
| `prefetchQueueSize` | number | `100` | Size of the bounded in-memory work queue |

Environment variable overrides follow the normal DICOM Capacitor naming convention:

- `CAPACITOR_PREFETCH_ENABLED`
- `CAPACITOR_PREFETCH_CONCURRENCY`
- `CAPACITOR_PREFETCH_QUEUE_SIZE`

Size `prefetchQueueSize` for your busiest expected worklist refresh burst. The queue is bounded, so if it fills up, newly triggered prefetch items are skipped and a warning is logged.

## `prefetch.yml`

Rules are loaded from `prefetch.yml` in the DICOM Capacitor data directory:

- **Windows**: `%ProgramData%\Flux Inc\DICOM Capacitor\`
- **macOS/Linux**: `/var/lib/dicom-capacitor/data/`

An example file is shipped as `prefetch.example.yml`. Copy or rename it to `prefetch.yml`, then enable the feature in `config.yml`.

### Example

```yaml
- Id: ct-priors-main
  Description: Fetch recent CT priors for upcoming CT worklist items
  AeTitles:
    - MWL_MAIN
  QueryRetrieveNode: PACS_QR
  MoveDestination: VIEWER_CACHE
  TriggerConditions:
    - Tag: "0008,0060"
      MatchExpression: CT
  Mode: priors
  FindKeys:
    - PatientID
    - AccessionNumber
  LookbackYears: 3
  MaxStudies: 2
  FetchScheduledStudy: true
  StudyConditions:
    - Tag: "0008,0061"
      MatchExpression: CT
  ExcludeConditions:
    - Tag: "0008,1030"
      MatchExpression: "(?i)localizer|scout|dose.report"
  CooldownMinutes: 60
```

## Rule Reference

Rules are YAML objects with the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| `Id` | Yes | Unique rule identifier |
| `Description` | No | Human-readable label. Defaults to `Id` if omitted |
| `AeTitles` | Yes | One or more worklist node names or aliases |
| `QueryRetrieveNode` | Yes | Query/Retrieve node name or alias used for C-FIND/C-MOVE |
| `MoveDestination` | Yes | Storage node name or alias that will receive prefetched images |
| `TriggerConditions` | No | Conditions evaluated against each worklist response. If omitted, every response from the listed worklists can trigger the rule |
| `Mode` | No | `scheduled` or `priors`. Defaults to `scheduled` |
| `FindKeys` | No | Keys used to build study-level lookup requests. Supported values are currently `PatientID` and `AccessionNumber` |
| `LookbackYears` | No | How far back priors lookup should search. Used in `priors` mode |
| `MaxStudies` | No | Maximum number of prior studies to move. Used in `priors` mode |
| `FetchScheduledStudy` | No | Also move the scheduled study in addition to priors |
| `StudyConditions` | No | Conditions used to keep matching prior studies |
| `ExcludeConditions` | No | Conditions used to reject matching prior studies |
| `CooldownMinutes` | No | Per-patient cooldown window for priors lookup |

`TriggerConditions`, `StudyConditions`, and `ExcludeConditions` use the same condition syntax described in [Filter Conditions](./filters/conditions).

## Mode Behavior

### `scheduled`

Scheduled mode fetches the study represented by the worklist response.

- If the worklist response contains `StudyInstanceUID`, DICOM Capacitor issues a direct C-MOVE for that study.
- If `StudyInstanceUID` is missing, DICOM Capacitor performs a study-level C-FIND using the configured `FindKeys` plus the scheduled date, then moves the first matching study returned by the Query/Retrieve source.
- Scheduled mode always includes the scheduled study, even if `FetchScheduledStudy` is not explicitly set.

For worklist feeds that do not include `StudyInstanceUID`, choose the most specific `FindKeys` your PACS can resolve reliably.

### `priors`

Priors mode searches for historical studies related to the current worklist item.

- DICOM Capacitor runs a study-level C-FIND using the configured `FindKeys`.
- The search date range is limited by `LookbackYears`.
- The current study is excluded from the candidate list.
- `StudyConditions` keep only relevant studies.
- `ExcludeConditions` remove unwanted studies.
- Remaining candidates are sorted by `StudyDate` and `StudyTime`, newest first.
- Up to `MaxStudies` are moved.

If `FetchScheduledStudy: true` is also set, the scheduled study is included alongside the selected priors.

`CooldownMinutes` currently applies to priors lookup deduplication. Scheduled-study moves are deduplicated by journal state and by stored/queued-study checks.

## Operational Notes

- Prefetch depends on existing node definitions. Rule names and aliases are resolved against `nodes.yml` at startup.
- `MoveDestination` uses the normal storage pipeline, so transfer syntax, duplicate handling, receipts, and logging still apply there.
- Query/Retrieve node settings also apply to prefetch. In particular, if your upstream PACS authorizes access by calling AE title, verify the `Impersonate` setting on the Query/Retrieve node carefully.
- Prefetch workers run in the background and do not block worklist responses to the original requester.

## Troubleshooting

Start with the main service log:

- `Prefetch is disabled by configuration.` means `prefetchEnabled` is still false.
- `Prefetch configuration not found...` means `prefetch.yml` is missing from the data directory.
- `Skipping prefetch rule ...` means a rule failed validation and was not loaded.
- `Prefetch C-FIND failed ...` means the Query/Retrieve lookup did not complete successfully.
- `Prefetch C-MOVE failed ...` means the study lookup succeeded but the move did not finish successfully.

Common checks:

- Confirm all referenced nodes exist with the expected roles in `nodes.yml`.
- Confirm the worklist results actually contain the tags used by your `TriggerConditions` and `FindKeys`.
- If scheduled mode relies on lookup rather than `StudyInstanceUID`, verify the upstream PACS can resolve the same `PatientID` and/or `AccessionNumber` values that appear on the worklist.
- Increase `prefetchQueueSize` if large refresh bursts are dropping work.
