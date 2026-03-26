# Web Dashboard

DICOM Capacitor includes a built-in web dashboard for monitoring and managing the service. It is served on port **1080** by default alongside the [HTTP API](./api).

## Accessing the Dashboard

Open `http://<host>:1080` in a browser. When running locally, that's:

```
http://localhost:1080
```

In Docker, map the port:

```bash
docker run -p 1080:1080 ...
```

The dashboard binds to `127.0.0.1` on native installs (localhost only) and `0.0.0.0` inside Docker containers.

## Authentication

Most dashboard pages are read-only and do not require authentication. Actions that modify state (retrying items, editing nodes, managing queue items) and the **Settings** page require a service password.

Configure the service password in `config.yml`:

```yaml
api:
  servicePassword: "your-password"
```

When a protected action is attempted, the dashboard prompts for the service password. The password is stored as a browser cookie (`capacitor_session`) and persists across tabs and sessions.

For programmatic/scripted API access, a separate bearer token can also be configured:

```yaml
api:
  token: "your-api-token"
```

If neither credential is configured, write endpoints are open (backward-compatible).

## Pages

### Dashboard

The landing page shows a live overview of the service:

- **Queue statistics** — Total items and counts by state (New, Prepared, Failed, Rejected)
- **Node status** — Each configured destination node with queue depth, delivery stats, and C-ECHO testing
- **Inline node editing** — Edit node properties (host, port, transfer syntax, aliases, etc.) directly from the dashboard. Click the pencil icon on any node row, enter the service password, and the node is automatically paused for editing. Changes are saved atomically to `nodes.yml`.
- **Schedule override** — Temporarily bypass a node's `ProcessSchedule` to release studies outside of scheduled windows. The fast-forward button appears next to each scheduled node.
- **System info** — Version, uptime, AE title, and activation state

Data refreshes automatically every few seconds. When the service is unavailable (stopped, restarting), the dashboard shows a gentle overlay indicating it is waiting for the service to respond.

### Queue

Browse and manage individual items in the processing queue:

- **Filter** by state, source AE title, destination AE title, modality, or free-text search
- **Sort** by any column
- **Item actions** — Retry failed/rejected items, move items between states
- **Bulk actions** — Retry all failed, flush prepared items

### Logs

Two tabs:

- **Application log** — Recent service log entries from the in-memory ring buffer, filterable by level (Debug, Info, Warn, Error)
- **Audit log** — HMAC-secured audit trail of DICOM operations (tag mutations, routing decisions, deliveries)

### Settings

Read-only view of the live YAML configuration files. Shows only files that exist in the configuration directory — missing optional files are not displayed.

Files shown include:

- `config.yml`, `nodes.yml`, `mutations.yml`, `routings.yml`, `sortings.yml`, `lua.yml`
- Any `.lua` script files referenced by `Script:` entries in `lua.yml`

This page requires the service password.

## Changing the Port

The default port is 1080. Change it in `config.yml`:

```yaml
api:
  port: 9090
```

Or via environment variable:

```bash
CAPACITOR_API_PORT=9090
```

If the configured port is busy, the service auto-increments until it finds an available one. The actual bound port is logged at startup.
