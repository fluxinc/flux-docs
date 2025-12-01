# Running DICOM Capacitor in Docker

## Docker Compose

A basic Docker Compose file appears below:

```yaml
# compose.yaml
services:
  capacitor:
    image: fluxinc/dicom-capacitor:latest
    ports:
      - "104:1040"              # Store SCP (main DICOM storage)
      - "1041:1041"             # Worklist/Find SCP (optional)
      - "2763:2763"             # Query/Retrieve SCP (optional)
      - "1042:1042"             # Storage Commit SCP (optional)
    environment:
      DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: false
    volumes:
      - ./data:/data
      - ./cache:/cache
    user: "1000:1000"           # Optional: run as specific user/group
```

### Configuration

Capacitor accepts overrides via environment variables. Most `config.yml` settings can be overridden via environment variables by prefixing the setting name with `CAPACITOR_` and converting the property name from camelCase to UPPER_SNAKE_CASE.

#### Environment Variable Naming Convention

Property names are converted by inserting underscores before capital letters and converting to uppercase:

- `myAeTitle` → `CAPACITOR_MY_AE_TITLE`
- `filters` → `CAPACITOR_FILTERS`
- `processDelayWindowMultiplier` → `CAPACITOR_PROCESS_DELAY_WINDOW_MULTIPLIER`

#### Required: Globalization Support

> [!IMPORTANT]
> The `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: false` setting is **required** for proper DICOM handling.

**Example with environment overrides:**

```yaml
environment:
  DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: false
  CAPACITOR_MY_AE_TITLE: "MY_CUSTOM_AE"
  CAPACITOR_SCP_PORT: "11112"
  CAPACITOR_FILTERS: "route,mutate,sort"
  CAPACITOR_PROCESS_DELAY: "5"
```

This allows for flexible configuration in containerized environments without needing to mount a modified `config.yml` file.

### Volume Permissions

The container requires read/write access to the mounted volumes:

- `/data` - Configuration files, licensing data, and working storage
- `/cache` - Temporary processing cache for DICOM files

**Permission Considerations:**

1. The container creates these directories with `755` permissions if they don't exist
2. For host-mounted volumes, ensure the user running the container has appropriate permissions:
   ```bash
   # Create directories with correct ownership
   mkdir -p ./data ./cache
   chown -R 1000:1000 ./data ./cache
   ```
3. Use the `user:` directive in compose.yaml to run as a specific UID/GID (see example above)
4. If you encounter permission errors, verify the host directory ownership matches the container user

### Port Mappings

The example above exposes all DICOM service ports. You can selectively expose only the services you need:

- **Port 1040** (Store SCP): Required for receiving DICOM images
- **Port 1041** (Worklist/Find SCP): Optional, for worklist queries
- **Port 2763** (Query/Retrieve SCP): Optional, for C-FIND/C-MOVE operations
- **Port 1042** (Storage Commit SCP): Optional, for storage commitment

These ports can be individually enabled/disabled via their corresponding `*ScpPort` configuration settings (set to `0` to disable).
