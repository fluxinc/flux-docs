# Running DICOM Capacitor in Docker

DICOM Capacitor is available as a Docker image at `fluxinc/dicom-capacitor`. The image supports both `amd64` and `arm64` architectures.

## Quick Start

```bash
mkdir -p data cache
docker run -d \
  --name capacitor \
  -p 1040:1040 \
  -p 1080:1080 \
  -v ./data:/data \
  -v ./cache:/cache \
  fluxinc/dicom-capacitor:latest
```

The web dashboard is available at `http://localhost:1080`. Check the logs for the activation URL on first run:

```bash
docker logs capacitor
```

## Docker Compose

A basic Docker Compose file:

```yaml
# compose.yaml
services:
  capacitor:
    image: fluxinc/dicom-capacitor:latest
    ports:
      - "1040:1040"             # Store SCP (main DICOM storage)
      - "1080:1080"             # Web UI and REST API
      - "1041:1041"             # Worklist/Find SCP (optional)
      - "2763:2763"             # Query/Retrieve SCP (optional)
      - "1042:1042"             # Storage Commit SCP (optional)
    volumes:
      - ./data:/data
      - ./cache:/cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "echoscu", "-aec", "FLUX_CAPACITOR", "localhost", "1040"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Compose with Lua Scripts

Mount your Lua scripts alongside the configuration files in the `/data` volume. This example enables the Lua filter with an external script and shared library:

```yaml
# compose.yaml
services:
  capacitor:
    image: fluxinc/dicom-capacitor:latest
    ports:
      - "1040:1040"
      - "1080:1080"
    environment:
      CAPACITOR_FILTERS: "lua"
    volumes:
      - ./data:/data
      - ./cache:/cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "echoscu", "-aec", "FLUX_CAPACITOR", "localhost", "1040"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Then create the config files on the host:

```
data/
├── config.yml
├── nodes.yml
├── lua.yml
├── libs/
│   └── phi.lua
└── scripts/
    └── route-smart.lua
```

```yaml
# data/nodes.yml
- AeTitle: PACS_MAIN
  HostName: 192.168.1.10
  Port: 104
  NodeRole: Storage

- AeTitle: AI_SERVER
  HostName: 192.168.1.20
  Port: 11112
  NodeRole: Storage
```

```yaml
# data/lua.yml

# Anonymize images going to the AI server
- Description: Anonymize for AI
  Script: |
    include('libs/phi.lua')
    strip_phi(dataset)
  AeTitles:
    - AI_SERVER

# Route CT images, checking destination health first
- Description: Smart CT routing
  Script: scripts/route-smart.lua
  Conditions:
    - Tag: 0008,0060
      MatchExpression: CT
```

```lua
-- data/libs/phi.lua
function strip_phi(ds)
    ds:Set('PatientName', 'ANONYMOUS')
    ds:Set('PatientID', '00000')
    ds:Remove('PatientBirthDate')
    ds:Remove('PatientAddress')
    ds:Remove('ReferringPhysicianName')
end
```

```lua
-- data/scripts/route-smart.lua
-- Only route when the destination isn't overwhelmed
local failed = queue:countByDestination('AI_SERVER', 'Failed')
if failed > 20 then
    log:warn('AI_SERVER has', failed, 'failures — holding')
    error('retry: destination has too many failures')
end

route:Add('AI_SERVER')

-- Tag partial studies for review
local total = study.queue:totalCount()
local studyFailed = study.queue:countByState('Failed')
if studyFailed > 0 then
    log:warn('Study has', studyFailed, 'of', total, 'items failed')
    dataset:Set('ImageComments',
        'PARTIAL_STUDY: ' .. studyFailed .. '/' .. total .. ' failed')
end
```

## Compose with Fan-Out Routing

Route incoming images to multiple destinations with per-destination anonymization:

```yaml
# compose.yaml
services:
  capacitor:
    image: fluxinc/dicom-capacitor:latest
    ports:
      - "1040:1040"
      - "1080:1080"
    environment:
      CAPACITOR_FILTERS: "lua"
      CAPACITOR_MY_AE_TITLE: "ROUTER"
    volumes:
      - ./data:/data
      - ./cache:/cache
    restart: unless-stopped
```

```yaml
# data/nodes.yml
- AeTitle: PACS_MAIN
  HostName: pacs.hospital.local
  Port: 104
  NodeRole: Storage

- AeTitle: RESEARCH
  HostName: research.hospital.local
  Port: 11112
  NodeRole: Storage

- AeTitle: CLOUD_AI
  HostName: ai.vendor.com
  Port: 4242
  NodeRole: Storage
```

```yaml
# data/lua.yml
- Description: Fan-out mammography
  Script: |
    -- Original goes to PACS unmodified.
    -- Research gets anonymized copy. Cloud AI gets de-identified copy with new UIDs.
    route:Add('RESEARCH', function(ds)
        ds:Set('PatientName', 'ANONYMOUS')
        ds:Set('PatientID', '00000')
        ds:Remove('PatientBirthDate')
    end)
    route:Add('CLOUD_AI', function(ds)
        ds:Set('PatientName', 'DEIDENTIFIED')
        ds:Set('PatientID', uid())
        ds:Set('StudyInstanceUID', uid())
        ds:Set('SeriesInstanceUID', uid())
        ds:Set('SOPInstanceUID', uid())
        ds:Remove('PatientBirthDate')
        ds:Remove('ReferringPhysicianName')
    end)
  Conditions:
    - Tag: 0008,0060
      MatchExpression: MG
```

## Volumes

The container uses two mount points:

| Volume | Purpose |
|--------|---------|
| `/data` | Configuration files (`config.yml`, `nodes.yml`, `lua.yml`, scripts), licensing, logs |
| `/cache` | DICOM file processing cache (incoming, prepared, failed, etc.) |

Create the directories before starting and ensure the container user has read/write access:

```bash
mkdir -p ./data ./cache
chown -R 1000:1000 ./data ./cache   # Match the container user
```

You can optionally set the `user:` directive in your compose file to run as a specific UID/GID:

```yaml
user: "1000:1000"
```

## Port Mappings

Expose only the services you need:

| Port | Service | Required? |
|------|---------|-----------|
| 1040 | Store SCP (receive DICOM images) | Yes |
| 1080 | Web UI and REST API | Recommended |
| 1041 | Worklist/Find SCP | Optional |
| 2763 | Query/Retrieve SCP (C-FIND/C-MOVE) | Optional |
| 1042 | Storage Commitment SCP | Optional |

Disable any SCP by setting its port to `0` in `config.yml` or via environment variable (e.g., `CAPACITOR_FIND_SCP_PORT=0`).

## Web UI

The built-in web dashboard is served on port 1080 and provides:

- **Dashboard** — Live queue statistics, node status, system info
- **Queue** — Browse, filter, and manage queued DICOM items (retry, move, bulk actions)
- **Settings** — Read-only view of live YAML configuration and Lua scripts
- **Logs** — Application and audit log viewers

The settings page is protected by the API token configured in `config.yml`:

```yaml
# data/config.yml
api:
  token: your-secret-token
```

## Configuration via Environment Variables

Most `config.yml` settings can be overridden via environment variables using the `CAPACITOR_` prefix. Property names are converted from camelCase to UPPER_SNAKE_CASE:

| config.yml | Environment Variable |
|------------|---------------------|
| `myAeTitle` | `CAPACITOR_MY_AE_TITLE` |
| `scpPort` | `CAPACITOR_SCP_PORT` |
| `filters` | `CAPACITOR_FILTERS` |
| `processDelay` | `CAPACITOR_PROCESS_DELAY` |
| `processDelayWindowMultiplier` | `CAPACITOR_PROCESS_DELAY_WINDOW_MULTIPLIER` |

```yaml
environment:
  CAPACITOR_MY_AE_TITLE: "MY_ROUTER"
  CAPACITOR_SCP_PORT: "11112"
  CAPACITOR_FILTERS: "lua"
```

Environment variables override `config.yml` settings. Command-line overrides (`--config.*`) take highest priority.

## Health Checks

The recommended health check uses `echoscu` (included in the container) to send a DICOM C-ECHO:

```yaml
healthcheck:
  test: ["CMD", "echoscu", "-aec", "FLUX_CAPACITOR", "localhost", "1040"]
  interval: 30s
  timeout: 10s
  retries: 3
```

Replace `FLUX_CAPACITOR` with your configured `myAeTitle`. You can check the health status with:

```bash
docker inspect --format='{{.State.Health.Status}}' capacitor
```

## Viewing Logs

```bash
# Follow logs in real-time
docker compose logs -f capacitor

# View last 100 lines
docker compose logs --tail=100 capacitor
```

The service log is also written to the `/data/log/` volume, so you can access `capacitor_service.log` directly from the host:

```bash
tail -f ./data/log/capacitor_service.log
```

## Upgrading

```bash
docker compose pull
docker compose up -d
```

Configuration files in `./data/` are preserved across upgrades. Only the container image is replaced.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No DICOM response on expected port | Verify port mapping matches `scpPort` (default 1040 inside container) |
| Web UI not accessible | Ensure port 1080 is mapped: `-p 1080:1080` |
| Permission denied on volumes | Ensure host directory ownership matches container user (`chown 1000:1000`) |
| Activation required | Check logs for activation URL: `docker compose logs capacitor` |
| Container keeps restarting | Check logs for startup errors: `docker compose logs --tail=50 capacitor` |
| Images stuck in cache | Verify destination is reachable from inside the container: `docker exec capacitor echoscu -aec DEST_AE host port` |
| Lua scripts not loading | Verify `filters: lua` is set in config.yml and `lua.yml` exists in `/data` |
