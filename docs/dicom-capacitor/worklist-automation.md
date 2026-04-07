# Worklist Automation

Worklist automation lets DICOM Capacitor keep upstream worklist results cached locally and optionally pre-fetch studies before a technologist opens the patient. Both features are configured in a single `worklist.yml` file and enabled with one setting in `config.yml`.

## Enabling

1. Set `worklistAutomationEnabled: true` in [`config.yml`](config.md#worklistautomationenabled).
2. Create a `worklist.yml` file in the data directory (same location as `config.yml`).
3. Configure the upstream worklist and Q/R nodes in `nodes.yml`.

An example `worklist.example.yml` is included with the installer.

## worklist.yml

The file has two top-level sections:

- **`Queries`** -- [Managed worklist queries](worklist-queries) that poll upstream worklist nodes on a schedule.
- **`PrefetchRules`** -- [Pre-fetch rules](prefetch) that automatically retrieve studies when new worklist items appear.

Both sections are optional. You can run managed queries without prefetch, or (less commonly) define prefetch rules that reference queries defined elsewhere.

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
    LookbackYears: 3
    MaxStudies: 2
    CooldownMinutes: 60
```

## config.yml Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| [`worklistAutomationEnabled`](config.md#worklistautomationenabled) | boolean | `false` | Master switch for managed queries and pre-fetch |
| [`prefetchConcurrency`](config.md#prefetchconcurrency) | number | `4` | Number of background pre-fetch workers |
| [`prefetchQueueSize`](config.md#prefetchqueuesize) | number | `256` | Bounded queue size; excess items are dropped |

## Dashboard

The web dashboard has dedicated pages for each feature:

- **Worklist** -- shows each managed query's state (Starting, Ready, Empty, Degraded), response count, last refresh time, and a manual refresh button.
- **Prefetch** -- shows queue depth, active workers, telemetry counters, recent activity log, and loaded rule details.

The main dashboard includes an Automation section with summary cards for both.
