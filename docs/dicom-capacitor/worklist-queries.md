# Managed Worklist Queries

Managed worklist queries keep upstream worklist results cached locally on a configurable schedule. Each query polls an upstream MWL node, stores the results, and serves them to downstream callers without requiring the modality to initiate the request.

Managed queries are defined in the `Queries` section of [`worklist.yml`](worklist-automation). They can be used standalone (to provide a local worklist cache) or as the trigger source for [pre-fetch rules](prefetch).

## How It Works

1. Capacitor sends a C-FIND to the configured worklist node on each refresh interval.
2. Results are cached locally and served to downstream AE titles that request a matching query.
3. Each refresh is compared against the previous snapshot to detect newly-appeared items.
4. New items are forwarded to any [pre-fetch rules](prefetch) whose `QueryIds` include this query.

When the upstream worklist node is unreachable, Capacitor can optionally serve stale cached results for a configurable window (`ServeStaleForSeconds`).

## Query Reference

### Id

- Type: `string`
- Required

A unique identifier for the query. Referenced by prefetch rules via `QueryIds`. Must match the pattern `[A-Za-z0-9_-]{1,64}`.

### Description

- Type: `string`
- Default: same as `Id`

A human-readable description shown in the dashboard and logs.

### WorklistNode

- Type: `string`
- Required

The AE title (or alias) of the upstream worklist node to query. Must reference a `NodeRole: Worklist` node in `nodes.yml`.

### RefreshIntervalSeconds

- Type: `number`
- Required

How often (in seconds) to re-query the upstream worklist node. Minimum value is 1.

### ExpireAfterSeconds

- Type: `number`
- Default: `RefreshIntervalSeconds * 2`

How long cached results remain valid. If a refresh fails and the cache is older than this, the query enters a Degraded state.

### ServeStaleForSeconds

- Type: `number`
- Default: `0` (disabled)

When the upstream worklist node is unreachable, continue serving cached results for this many seconds after the last successful refresh. Set to `0` to disable stale serving.

### ServeAeTitles

- Type: `string[]`
- Default: `[]` (serve to all callers)

Restricts which downstream AE titles can be served results from this query. When empty, any caller whose request matches the query's filters is eligible. When set, only the listed AE titles are served.

### Request

Defines the C-FIND request filters. All fields are optional; omitted fields are not constrained.

| Field | DICOM Tag | Description |
|-------|-----------|-------------|
| `PatientID` | (0010,0020) | Patient ID pattern |
| `PatientName` | (0010,0010) | Patient name pattern |
| `Modality` | (0008,0060) | Modality filter (e.g., `CT`, `MR`) |
| `ScheduledStationAETitle` | (0040,0001) | Station AE title filter |
| `ScheduledStationName` | (0040,0010) | Station name filter |
| `ScheduledDate` | (0040,0002) | Date range (see below) |

#### ScheduledDate

The date range for `ScheduledProcedureStepStartDate`. Two formats are supported:

**WindowDays** -- a sliding window starting from today:

```yaml
ScheduledDate:
  WindowDays: 3    # today through today + 3 days
```

**Offset range** -- explicit start and end offsets from today:

```yaml
ScheduledDate:
  StartOffsetDays: -1    # yesterday
  EndOffsetDays: 7       # one week ahead
```

If neither is specified, no date constraint is applied.

## Examples

### Basic CT Worklist Cache

```yaml
Queries:
  - Id: ct-worklist
    WorklistNode: MWL_MAIN
    RefreshIntervalSeconds: 60
    Request:
      Modality: CT
      ScheduledDate:
        WindowDays: 1
```

### Multiple Queries with Stale Fallback

```yaml
Queries:
  - Id: ct-today
    Description: CT worklist for today
    WorklistNode: MWL_MAIN
    RefreshIntervalSeconds: 30
    ServeStaleForSeconds: 120
    Request:
      Modality: CT
      ScheduledDate:
        WindowDays: 1

  - Id: mr-week
    Description: MR worklist for the week
    WorklistNode: MWL_MAIN
    RefreshIntervalSeconds: 300
    ServeStaleForSeconds: 600
    ServeAeTitles: [MR_SCANNER_1, MR_SCANNER_2]
    Request:
      Modality: MR
      ScheduledDate:
        StartOffsetDays: 0
        EndOffsetDays: 7
```

## Dashboard

The **Worklist** page in the web dashboard shows each managed query with:

- **State**: Starting (first refresh pending), Ready (cache populated), Empty (query returned no results), Degraded (upstream unreachable and cache is stale).
- **Response count**: Number of cached worklist items.
- **Last refresh**: Timestamp of the last successful upstream query.
- **Refresh button**: Triggers an immediate refresh (requires API authentication).

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/worklist/status` | Whether managed queries are configured and running |
| GET | `/api/worklist/managed-queries` | List all queries with current status |
| GET | `/api/worklist/managed-queries/{id}` | Single query detail |
| POST | `/api/worklist/managed-queries/{id}/refresh` | Force immediate refresh (requires auth) |
