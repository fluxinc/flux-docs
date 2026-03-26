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

---

## Backward-Compatible Endpoints

These endpoints existed before the management API and retain their original response shape (no envelope).

#### `GET /api/queue/stats`

```json
{ "total": 155, "byState": { "new": 12, "prepared": 130 }, "checkedOut": 3 }
```

#### `GET /api/queue/health`

```json
{ "status": "ok", "timestamp": "2026-03-22T10:00:00Z" }
```

---

🔒 = requires `Authorization: Bearer <token>`
