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
