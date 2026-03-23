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

Read endpoints are open. Write endpoints require a Bearer token matching the `token` value in `config.yml`:

```
Authorization: Bearer secret
```

Missing or wrong token → `403 Forbidden`. No token configured → `403 Forbidden` with code `NO_TOKEN_CONFIGURED`.

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

#### `DELETE /api/queue/items/{id}` 🔒

Permanently deletes the item and its file from disk.

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
