# HTTP API

DICOM Capacitor includes a built-in HTTP management API for monitoring and controlling the service. All endpoints bind to `localhost` only — the API is not accessible from other machines.

## Configuration

Enable the API in `config.yml`:

```yaml
api:
  enabled: true
  port: 1080       # auto-increments if busy
  token: "secret"  # required for write endpoints
```

The actual bound port is logged at startup:

```
INFO: API listening on http://127.0.0.1:1080
```

## Authentication

Read endpoints are open. Write endpoints (marked 🔒) accept either credential:

- **Service password** (browser UI): Set `api.servicePassword` in `config.yml`. Sent as a `capacitor_session` cookie.
- **Bearer token** (programmatic): Set `api.token` in `config.yml`. Sent as `Authorization: Bearer <token>` header.

```yaml
api:
  servicePassword: "your-password"   # for browser UI
  token: "your-api-token"            # for scripted access
```

Missing or wrong credentials → `403 Forbidden`. If neither is configured, write endpoints are open (backward-compatible).

## Response Envelope

All endpoints except the [backward-compatible](#backward-compatible) ones return a uniform envelope:

```json
{ "ok": true, "data": { ... }, "error": null, "timestamp": "2026-03-22T10:00:00Z" }
```

On error:

```json
{ "ok": false, "data": null, "error": { "code": "NOT_FOUND", "message": "..." }, "timestamp": "..." }
```

---

## Endpoints

### System

#### `GET /api/system/info`

Returns version, uptime, AE title, and activation state.

```json
{
  "ok": true,
  "data": {
    "product": "DICOM Capacitor",
    "version": "4.1.0",
    "startedAt": "2026-03-22T08:00:00Z",
    "uptimeSeconds": 3600,
    "aeTitle": "CAPACITOR",
    "activationState": "Active"
  }
}
```

---

### Nodes

#### `GET /api/nodes`

Returns all configured destination nodes with per-node queue depth.

```json
{
  "ok": true,
  "data": [
    {
      "aeTitle": "PACS",
      "hostName": "pacs.hospital.org",
      "port": 104,
      "role": "Storage",
      "queue": { "new": 12, "prepared": 3, "failed": 0, "checkedOut": 1 }
    }
  ]
}
```

#### `GET /api/nodes/{aeTitle}`

Returns a single node. `404` if not found.

#### `GET /api/nodes/{aeTitle}/stats`

Returns delivery statistics for a single node: success/fail/timeout counts (lifetime and recent window), average transfer time, last success time, and last failure/echo details.

```json
{
  "ok": true,
  "data": {
    "success": 1200, "failed": 3, "timedOut": 1,
    "recentSuccess": 45, "recentFailed": 0, "recentTimedOut": 0,
    "recentWindowMinutes": 60,
    "avgTransferMs": 120.5,
    "lastSuccessAt": "2026-04-06T10:00:00Z",
    "lastFailure": { "at": "2026-04-05T08:00:00Z", "error": "Connection refused" },
    "lastEcho": { "at": "2026-04-06T10:05:00Z", "success": true, "latencyMs": 12 }
  }
}
```

#### `PUT /api/nodes/{aeTitle}` 🔒

Updates a node's properties. The node must be paused and fully drained (no checked-out items) before editing.

```json
{
  "role": "Storage",
  "hostName": "192.168.1.100",
  "port": 104,
  "priority": 0,
  "processDelay": 0,
  "impersonate": false,
  "transferSyntax": "",
  "batchSize": 0,
  "minimumLineSpeed": 500,
  "aliases": ["PACS", "ARCHIVE"]
}
```

The `role` field is required to disambiguate when multiple nodes share the same AE title (e.g., one Storage and one QueryRetrieve). Returns `409 Conflict` if the node is not paused or has items checked out.

#### `POST /api/nodes/{aeTitle}/pause` 🔒

Pauses delivery for a single node. Other nodes continue processing normally.

#### `POST /api/nodes/{aeTitle}/resume` 🔒

Resumes delivery for a paused node.

#### `POST /api/nodes/{aeTitle}/echo` 🔒

Sends a C-ECHO to the node and returns latency and success status. Times out after 10 seconds.

#### `POST /api/nodes/{aeTitle}/override-schedule` 🔒

Temporarily overrides the node's `ProcessSchedule`, allowing delivery outside of scheduled windows. The override is in-memory only and clears on service restart.

#### `DELETE /api/nodes/{aeTitle}/override-schedule` 🔒

Clears the schedule override, returning the node to its configured schedule.

---

### Queue

#### `GET /api/queue/filter-options`

Returns the distinct values available for queue filters. Used by the UI to populate filter dropdowns.

```json
{
  "ok": true,
  "data": {
    "sources": ["CT_SCANNER", "MR_SCANNER"],
    "destinations": ["PACS", "ARCHIVE"],
    "modalities": ["CT", "MR", "DX"]
  }
}
```

#### `GET /api/queue/items`

Returns a paginated list of queue items. Supports query filters:

| Parameter | Description |
|-----------|-------------|
| `state` | Filter by state (`new`, `prepared`, `failed`, `rejected`) |
| `source` | Filter by source AE title |
| `dest` | Filter by destination AE title |
| `modality` | Filter by modality (e.g. `CT`) |
| `search` | Full-text search across UIDs and AE titles |
| `skip` | Pagination offset (default `0`) |
| `limit` | Page size (default `100`) |

```json
{
  "ok": true,
  "data": {
    "items": [ { "id": 1, "state": "prepared", "modality": "CT", ... } ],
    "total": 142,
    "skip": 0,
    "limit": 100
  }
}
```

#### `GET /api/queue/items/{id}`

Returns full detail for a single item including DICOM tags. `404` if not found.

#### `POST /api/queue/items/{id}/fail` 🔒

Moves the item to `Failed` state (will retry on next cycle).

#### `POST /api/queue/items/{id}/reject` 🔒

Moves the item to `Rejected` state (will not retry).

#### `POST /api/queue/items/{id}/retry` 🔒

Moves a failed or rejected item back to `New` state for reprocessing.

#### `POST /api/queue/items/{id}/move` 🔒

Moves an item to a specified target state. Body: `{ "targetState": "New" }`.

#### `DELETE /api/queue/items/{id}` 🔒

Permanently deletes the item and its file from disk.

#### `POST /api/queue/actions/retry-failed` 🔒

Bulk retries all failed items matching optional filters (source, destination, modality).

#### `POST /api/queue/actions/retry-rejected` 🔒

Bulk retries all rejected items matching optional filters.

#### `POST /api/queue/studies/{studyUid}/move` 🔒

Moves all items in a study to a target state. Body: `{ "targetState": "New" }`.

#### `DELETE /api/queue/studies/{studyUid}` 🔒

Deletes all items in a study.

#### `POST /api/queue/series/{seriesUid}/move` 🔒

Moves all items in a series to a target state.

#### `POST /api/queue/seed` 🔒

Seeds the queue with test data. Development/testing only.

---

### Service

#### `GET /api/service/status`

Returns current processing flags.

```json
{
  "ok": true,
  "data": {
    "storageScu": true,
    "worklistScu": true,
    "storageCommitScu": true,
    "prepare": true
  }
}
```

#### `POST /api/service/pause` 🔒

Disables all processing (Storage SCU, Worklist SCU, Storage Commit SCU, Prepare). Incoming files continue to be received and queued.

#### `POST /api/service/resume` 🔒

Re-enables all processing.

#### `GET /api/service/processing-status`

Returns a summary of processing state including per-node pause status and active job count.

```json
{
  "ok": true,
  "data": {
    "allPaused": false,
    "checkedOutItems": 2,
    "activeJobs": 3,
    "idle": false
  }
}
```

---

### Metrics

#### `GET /api/metrics`

Returns aggregate queue statistics and service status.

```json
{
  "ok": true,
  "data": {
    "totalItems": 155,
    "byState": { "new": 12, "prepared": 130, "failed": 8, "rejected": 5 },
    "checkedOut": 3,
    "service": { "storageScu": true, "prepare": true, ... }
  }
}
```

---

### Logs

#### `GET /api/logs/recent`

Returns the most recent log entries from the in-memory ring buffer (last 1000 entries).

| Parameter | Description |
|-----------|-------------|
| `lines` | Number of entries to return (default `100`) |
| `level` | Filter by level: `DEBUG`, `INFO`, `WARN`, `ERROR` |

```json
{
  "ok": true,
  "data": [
    { "timestamp": "2026-03-22T10:01:00Z", "level": "INFO", "message": "Study delivered to PACS", "logger": "StorageSCU" }
  ]
}
```

#### `GET /api/logs/web/recent`

Same as `/api/logs/recent` but returns web UI log entries (HTTP request logs). Supports the same `lines` and `level` parameters.

#### `GET /api/logs/audit`

Returns audit log entries (configuration changes, administrative actions). Supports `?lines=N` (default 500).

---

### Worklist

#### `GET /api/worklist/status`

Returns whether managed worklist queries are configured and whether any worklist cache is populated (from either managed or modality-origin queries).

```json
{
  "ok": true,
  "data": {
    "managedQueriesPresent": true,
    "worklistCachePopulated": true
  }
}
```

#### `GET /api/worklist/managed-queries`

Returns all configured managed worklist queries with their current state, cache statistics, and query context.

```json
{
  "ok": true,
  "data": [
    {
      "id": "demo-managed-ct",
      "description": "CT worklist from PACS",
      "worklistNode": "PACS_WL",
      "identity": "97e08b3171e1bc7d",
      "refreshIntervalSeconds": 30,
      "expireAfterSeconds": 120,
      "serveStaleForSeconds": 0,
      "serveAeTitles": [],
      "modality": "CT",
      "scheduledDateRange": "Today + 2 days",
      "responseCount": 37,
      "refreshCount": 142,
      "lastSuccessAtUtc": "2026-04-06T10:00:00Z",
      "lastRefreshCompletedAtUtc": "2026-04-06T10:00:00Z",
      "nextRefreshAtUtc": "2026-04-06T10:00:30Z",
      "lastFailureClass": "None",
      "lastError": null,
      "cacheTouchedAtUtc": "2026-04-06T10:00:00Z"
    }
  ]
}
```

Key fields:

| Field | Description |
|-------|-------------|
| `serveAeTitles` | AE titles this query serves worklist to. Empty = prefetch seed only. |
| `modality` | DICOM modality filter (e.g. `CT`, `MR`), null if unfiltered |
| `scheduledDateRange` | Human-readable date window (e.g. `Today + 2 days`), null if unfiltered |
| `lastFailureClass` | `None`, `Unreachable`, `Timeout`, `ProtocolError`, `UpstreamReject`, or `Cancelled` |

#### `GET /api/worklist/managed-queries/{id}`

Returns a single managed query. `404` if not found.

#### `POST /api/worklist/managed-queries/{id}/refresh` 🔒

Triggers an immediate refresh of the specified query. The refresh happens synchronously.

```json
{ "ok": true, "data": { "refreshed": true, "id": "demo-managed-ct" } }
```

Returns `400` if the query cannot be refreshed (e.g., not found, scheduler not running).

---

### Prefetch

#### `GET /api/prefetch/status`

Returns the current state of the prefetch subsystem.

```json
{
  "ok": true,
  "data": {
    "enabled": true,
    "running": true,
    "startupState": "Running",
    "configPath": "/opt/capacitor/worklist.yml",
    "journalPath": "/opt/capacitor/prefetch.db",
    "ruleCount": 2,
    "rulesPresent": true,
    "concurrency": 4,
    "queueSize": 100,
    "queued": 3,
    "activeWorkers": 2,
    "lastActivityAtUtc": "2026-04-06T10:00:00Z",
    "lastError": null,
    "lastErrorAtUtc": null,
    "counters": {
      "enqueued": 150, "dropped": 0, "started": 148, "completed": 145,
      "failed": 3, "findFailed": 1, "moveFailed": 2,
      "skippedCooldown": 10, "skippedStored": 50, "skippedQueued": 5, "skippedJournal": 200
    },
    "warnings": []
  }
}
```

#### `GET /api/prefetch/rules`

Returns all configured prefetch rules.

```json
{
  "ok": true,
  "data": [
    {
      "id": "fetch-priors",
      "description": "Fetch prior CTs for scheduled patients",
      "mode": "QueryRetrieve",
      "queryIds": ["demo-managed-ct"],
      "queryRetrieveNode": "PACS",
      "moveDestination": "CAPACITOR",
      "findKeys": ["PatientID", "StudyDate"],
      "lookbackYears": 5,
      "maxStudies": 3,
      "cooldownMinutes": 60,
      "fetchScheduledStudy": false
    }
  ]
}
```

#### `GET /api/prefetch/activity`

Returns recent prefetch work items. Supports `?limit=N` (default 25).

```json
{
  "ok": true,
  "data": [
    {
      "ruleId": "fetch-priors",
      "ruleDescription": "Fetch prior CTs for scheduled patients",
      "status": "Completed",
      "patientId": "PAT001",
      "studyInstanceUid": "1.2.3.4.5",
      "attemptCount": 1,
      "createdAtUtc": "2026-04-06T09:55:00Z",
      "completedAtUtc": "2026-04-06T09:55:12Z"
    }
  ]
}
```

---

### Settings

#### `GET /api/settings/config-files` 🔒

Returns the content of all configuration files (config.yml, nodes.yml, worklist.yml, etc.) along with their paths and modification times.

```json
{
  "ok": true,
  "data": {
    "directoryPath": "/opt/capacitor",
    "files": [
      {
        "key": "config",
        "name": "config.yml",
        "path": "/opt/capacitor/config.yml",
        "exists": true,
        "lastModifiedUtc": "2026-04-01T12:00:00Z",
        "content": "api:\n  enabled: true\n  port: 1080\n...",
        "error": null
      }
    ]
  }
}
```

---

## Backward-Compatible Endpoints

These endpoints existed before the management API and retain their original response shape (no envelope).

#### `GET /api/queue/stats`

```json
{ "total": 155, "byState": { "new": 12, "prepared": 130 }, "checkedOut": 3 }
```

> **Note:** Counts all operator-visible records including worklist JSON. Use `/api/queue/delivery` for image-only counts.

#### `GET /api/queue/delivery`

Returns image-only delivery statistics. Unlike `/api/queue/stats` (which counts all records including worklist JSON), this endpoint counts only `format=dcm` records.

```json
{ "waiting": 15, "sending": 2, "attention": 1 }
```

- `waiting` — New + Prepared images
- `sending` — Images currently checked out for delivery
- `attention` — Failed + Rejected images

#### `GET /api/queue/health`

```json
{ "status": "ok", "timestamp": "2026-03-22T10:00:00Z" }
```

---

🔒 = requires `Authorization: Bearer <token>`
