# Worklist Pre-Fetch

Worklist pre-fetch automatically retrieves studies from a Query/Retrieve node when new items appear on a worklist. This warms the normal storage pipeline so that images are already cached at the destination before a technologist opens the patient.

Pre-fetched images arrive as regular cached files through the existing storage flow. Pre-fetch does not create a local queryable archive -- the QR SCP remains a proxy to upstream QR nodes.

## Managed Worklist Queries

Pre-fetch rules are driven by **managed worklist queries** -- scheduled queries defined in `worklist.yml` that keep worklist results cached locally on a configurable refresh interval. Each managed query polls an upstream worklist node and maintains a snapshot of the current results. When a refresh returns new items that were not present in the previous snapshot, those items are fed into the prefetch evaluation pipeline.

Managed queries and prefetch rules live in the same `worklist.yml` file under separate top-level keys (`Queries` and `PrefetchRules`). Prefetch rules reference managed queries by ID rather than referencing worklist node AE titles directly.

## How It Works

1. A managed query defined in `worklist.yml` refreshes its upstream worklist node on its configured schedule.
2. Capacitor compares the refresh results against the previous snapshot and identifies newly-appeared items.
3. Each new worklist item is evaluated against the `TriggerConditions` of every prefetch rule whose `QueryIds` include that query.
4. For items that pass trigger conditions, Capacitor issues a study-level C-FIND against the configured QR node.
5. C-FIND results are filtered through `StudyConditions` and `ExcludeConditions`.
6. Matching studies are retrieved via C-MOVE to the configured storage destination.

Studies that are already stored (via [storage receipts](logs.md#storage-receipts)) or already queued in the cache are skipped. A persistent journal prevents duplicate fetches across restarts.

## Enabling Pre-Fetch

Pre-fetch requires three things:

1. **Enable in `config.yml`:**
   ```yaml
   worklistAutomationEnabled: true
   ```

2. **Create a `worklist.yml` file** in the data directory (same location as `config.yml`) with both `Queries` and `PrefetchRules` sections.

3. **Configure at least one worklist node and one QR node** in `nodes.yml`.

An example `worklist.example.yml` is included with the installer.

## Configuration

### config.yml Settings

Three settings in `config.yml` control the pre-fetch worker:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| [`worklistAutomationEnabled`](config.md#worklistautomationenabled) | boolean | `false` | Master switch for managed queries and pre-fetch |
| [`prefetchConcurrency`](config.md#prefetchconcurrency) | number | `4` | Number of background worker threads |
| [`prefetchQueueSize`](config.md#prefetchqueuesize) | number | `256` | Bounded queue size; excess items are dropped |

When `worklistAutomationEnabled` is `true`, Capacitor loads both managed queries and prefetch rules from `worklist.yml` at startup.

### worklist.yml

The `worklist.yml` file has two top-level keys:

- **`Queries`**: An array of managed worklist queries that refresh upstream worklist nodes on a schedule.
- **`PrefetchRules`**: An array of prefetch rules that react to new worklist items from those queries.

```yaml
# worklist.yml

Queries:
- Id: mwl-main
  WorklistNode: MWL_MAIN
  RefreshIntervalSeconds: 60
  Request:
    Modality: CT
    ScheduledDate:
      WindowDays: 1

PrefetchRules:
- Id: ct-priors
  Description: Fetch recent CT priors for upcoming CT worklist items
  QueryIds: [mwl-main]
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

### Id

- Type: `string`
- Required

A unique identifier for the rule. Used internally for journal keys, cooldown tracking, deduplication, and log correlation. Must be unique across all rules in the file.

### Description

- Type: `string`
- Default: same as `Id`

A human-readable description of the rule. Used in log messages.

### QueryIds

- Type: `string[]`
- Required (at least one entry)

A list of managed query IDs (from the `Queries` section of `worklist.yml`) that this rule applies to. When a managed query refresh returns new items, they are evaluated against rules that reference that query's ID.

### QueryRetrieveNode

- Type: `string`
- Required

The AE title (or alias) of the Query/Retrieve node to use for study-level C-FIND and C-MOVE operations. Must reference a `NodeRole: QueryRetrieve` node in `nodes.yml`.

### MoveDestination

- Type: `string`
- Required

The AE title (or alias) of the storage destination for C-MOVE. Must reference a `NodeRole: Storage` node in `nodes.yml`. Pre-fetched images are routed through Capacitor's normal storage pipeline to this destination.

### TriggerConditions

- Type: `Condition[]`
- Default: `[]`

A list of [conditions](filters/conditions) evaluated against each new worklist result dataset. All conditions must match for the rule to fire (AND logic). If empty, every new worklist item triggers this rule.

Common trigger conditions include modality, station name, or scheduled procedure step.

### Mode

- Type: `string`
- Default: `scheduled`
- Accepted values: `scheduled`, `priors`

Controls the C-FIND behavior:

- **`scheduled`**: Resolves the scheduled study itself. If the worklist item already contains a `StudyInstanceUID`, the C-FIND is skipped and the C-MOVE uses that UID directly. This is the simplest mode.
- **`priors`**: Performs a patient-level C-FIND with a date range to discover prior studies. Results are filtered through `StudyConditions` and `ExcludeConditions`, sorted by date (most recent first), and capped at `MaxStudies`.

When `Mode: priors` is combined with `FetchScheduledStudy: true`, both the scheduled study and prior studies are fetched.

### FetchScheduledStudy

- Type: `boolean`
- Default: `true` when `Mode: scheduled`, `false` when `Mode: priors`

Whether to also fetch the scheduled study itself. When `Mode: priors`, this adds the current worklist item's study to the fetch list in addition to discovered priors.

### FindKeys

- Type: `string[]`
- Default: `[]`
- Accepted values: `PatientID`, `AccessionNumber`

Controls which identifiers are pushed into the C-FIND request. `PatientID` is always included. Adding `AccessionNumber` narrows the C-FIND to the specific study matching the worklist accession number, which can reduce false positives at the cost of missing studies with mismatched accession numbers.

### LookbackYears

- Type: `number`
- Default: `3`

The number of years to look back when searching for prior studies (`Mode: priors`). A value of `0` removes the date constraint entirely. Ignored when `Mode: scheduled`.

### MaxStudies

- Type: `number`
- Default: `1`

The maximum number of prior studies to retrieve per worklist item (`Mode: priors`). Studies are sorted by date (most recent first). Ignored when `Mode: scheduled`.

### StudyConditions

- Type: `Condition[]`
- Default: `[]`

A list of [conditions](filters/conditions) evaluated against C-FIND result datasets. Only studies matching all conditions are eligible for C-MOVE (AND logic). If empty, all discovered studies pass.

Use this to restrict pre-fetch to specific modalities, study descriptions, or other DICOM attributes returned by the QR node.

### ExcludeConditions

- Type: `Condition[]`
- Default: `[]`

A list of [conditions](filters/conditions) evaluated against C-FIND result datasets. Studies matching any exclude condition are skipped (OR logic). Exclusions are applied before the C-MOVE, where they are cheapest (no images transferred) and the dataset has the richest metadata.

Use this to skip localizers, dose reports, or other studies that should not be pre-fetched.

### CooldownMinutes

- Type: `number`
- Default: `60`

The number of minutes before the same patient can trigger a new priors lookup for this rule. This prevents repeated C-FIND/C-MOVE operations when the same patient appears on multiple worklist refreshes. A value of `0` disables cooldown.

Cooldown applies only to `Mode: priors` lookups. Scheduled study fetches are deduplicated through the journal regardless of cooldown.

## Deduplication and Safety

Pre-fetch uses multiple layers to avoid duplicate work:

1. **Diff-based triggering**: Only newly-appeared worklist items are processed, not the full result set on every refresh.
2. **Cooldown**: Per-patient, per-rule cooldown prevents repeated priors lookups within the configured window.
3. **Journal**: A persistent LiteDB database (`prefetch-journal.db` in the data directory) records every planned and completed fetch. Survives service restarts.
4. **Storage receipt check**: Studies already confirmed stored at the destination are skipped.
5. **Queue check**: Studies already queued in the cache for the destination are skipped.

## Examples

### Fetch the Scheduled Study Only

The simplest configuration: when a CT worklist item appears on the `mwl-main` managed query, fetch the study that the worklist references.

```yaml
# worklist.yml

Queries:
- Id: mwl-main
  WorklistNode: MWL_MAIN
  RefreshIntervalSeconds: 60
  Request:
    Modality: CT
    ScheduledDate:
      WindowDays: 1

PrefetchRules:
- Id: ct-scheduled
  QueryIds: [mwl-main]
  QueryRetrieveNode: PACS_QR
  MoveDestination: VIEWER_CACHE
  TriggerConditions:
  - Tag: "0008,0060"
    MatchExpression: CT
  Mode: scheduled
```

### Fetch Prior CT Studies

Fetch up to 3 prior CT studies from the last 5 years when a CT worklist item appears, excluding localizers and dose reports.

```yaml
# worklist.yml

Queries:
- Id: mwl-main
  WorklistNode: MWL_MAIN
  RefreshIntervalSeconds: 60
  Request:
    Modality: CT
    ScheduledDate:
      WindowDays: 1

PrefetchRules:
- Id: ct-priors
  QueryIds: [mwl-main]
  QueryRetrieveNode: PACS_QR
  MoveDestination: VIEWER_CACHE
  TriggerConditions:
  - Tag: "0008,0060"
    MatchExpression: CT
  Mode: priors
  FetchScheduledStudy: true
  LookbackYears: 5
  MaxStudies: 3
  StudyConditions:
  - Tag: "0008,0061"
    MatchExpression: CT
  ExcludeConditions:
  - Tag: "0008,1030"
    MatchExpression: "(?i)localizer|scout|dose.report"
  CooldownMinutes: 120
```

### Multiple Rules for Different Modalities

```yaml
# worklist.yml

Queries:
- Id: mwl-main
  WorklistNode: MWL_MAIN
  RefreshIntervalSeconds: 60
  Request:
    ScheduledDate:
      WindowDays: 1

PrefetchRules:
- Id: ct-priors
  QueryIds: [mwl-main]
  QueryRetrieveNode: PACS_QR
  MoveDestination: CT_VIEWER
  TriggerConditions:
  - Tag: "0008,0060"
    MatchExpression: CT
  Mode: priors
  LookbackYears: 3
  MaxStudies: 2
  CooldownMinutes: 60

- Id: mr-priors
  QueryIds: [mwl-main]
  QueryRetrieveNode: PACS_QR
  MoveDestination: MR_VIEWER
  TriggerConditions:
  - Tag: "0008,0060"
    MatchExpression: MR
  Mode: priors
  LookbackYears: 2
  MaxStudies: 1
  CooldownMinutes: 60
```

## Troubleshooting

### Pre-fetch is not triggering

- Verify `worklistAutomationEnabled: true` in `config.yml`.
- Verify `worklist.yml` exists in the data directory and contains valid `Queries` and `PrefetchRules` sections.
- Check that the `QueryIds` in each rule reference a valid managed query ID from the `Queries` section.
- Check that managed queries are refreshing (worklist items must appear in the worklist cache).
- Check the service logs for prefetch-related messages -- rules that fail validation at startup are logged with the reason.

### Studies are not being retrieved

- Check that `QueryRetrieveNode` and `MoveDestination` reference valid nodes in `nodes.yml`.
- Check that the QR node is reachable and responds to C-FIND.
- Check cooldown -- if the same patient triggered recently, the lookup is skipped. Set `CooldownMinutes: 0` to test without cooldown.
- Check the logs for "already stored" or "already queued" messages -- the study may have been fetched by a previous run.

### Excessive PACS load

- Increase `CooldownMinutes` to reduce how often the same patient triggers priors lookups.
- Reduce `MaxStudies` to limit how many studies are retrieved per trigger.
- Reduce `prefetchConcurrency` to `1` so only one C-FIND/C-MOVE runs at a time.
- Add `StudyConditions` to narrow C-FIND results before C-MOVE.
- Add `ExcludeConditions` to skip studies that don't need pre-fetching.
