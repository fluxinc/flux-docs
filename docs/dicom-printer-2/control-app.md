# DICOM Printer Console

The **DICOM Printer Console** is the operator UI for DICOM Printer 2. It bundles a WebView2 desktop window (`DICOMPrinterConsole.exe`) with a local ASP.NET Core HTTP service (`DICOMPrinterApi.exe`, Windows service `DICOMPrinterApiService`).

The Console covers:

- Queue triage — Review, Queue, and Expired tabs with page previews and `.dxi`-backed payload navigation
- **Manual worklist matching** — search any configured Worklist or Study endpoint, propose values, and apply a `.match` companion file to a parked job
- **Manage pane** — service status, start/stop/restart of `DICOMPrinterApiService` and `DicomPrinterService`, storage endpoint listing with inline C-ECHO and query test, and a multi-source live log tail
- **Config editor** — CodeMirror XML editor with line numbers, syntax highlighting, DTD validation, inline gutter markers at the line/column reported by the parser, and a save-triggered config reload that does not bounce the service
- Activation — surfaces the installed activator via `/api/admin/activate-info`

## Architecture

| Process | Role |
|---|---|
| `DICOMPrinterApi.exe` | ASP.NET Core HTTP service (`DICOMPrinterApiService`) — exposes the Console UI assets and the `/api/*` endpoints used by the desktop window. Default listener: `http://localhost:5009`. |
| `DICOMPrinterConsole.exe` | WebView2 desktop window. Embeds Microsoft Edge WebView2 and points it at the local API. Installer ships an offline-capable WebView2 runtime bundle so no internet access is required at install time. |
| `OpenQueueDashboard.exe` | Compatibility launcher used by the Start Menu shortcut and by plugins. Reopens an existing Console window if one is already running. |

The API service runs as a Windows service started by the installer. The Console can be launched on demand from the Start Menu (Flux Inc → DICOM Printer Console) or by running `OpenQueueDashboard.exe`. Closing the Console window does not stop the API service.

### HTTP API surface

The Console UI is the primary consumer of the API, but the endpoints are documented because plugins and external tooling can call them on `http://localhost:5009`.

| Endpoint | Purpose |
|---|---|
| `/api/admin/service/status` | Current state of `DicomPrinterService` |
| `/api/admin/service/start`, `/stop`, `/restart` | Service lifecycle control |
| `/api/admin/config/get`, `/validate`, `/save` | Config read, DTD-aware validation, and save (triggers a reload across the API) |
| `/api/admin/activate-info` | Resolves the installed activator path and launches it via `launch-activate` |
| `/api/storage-endpoints` | Distinct Store/Worklist/Study/Manual endpoints derived from the last saved config; used by the Manage pane for listing and C-ECHO |

## Launching

### Start Menu

```
Start Menu → Flux Inc → DICOM Printer 2 → DICOM Printer Console
```

The shortcut runs `OpenQueueDashboard.exe`, which opens a Console window or focuses the existing one.

### Installation directory

```
C:\Program Files (x86)\Flux Inc\DICOM Printer 2\dicom-printer-2-queue\OpenQueueDashboard.exe
```

The `dicom-printer-2-queue\` subdirectory is a compatibility alias; the binaries inside are the Console + API stack.

### Command line

```cmd
"C:\Program Files (x86)\Flux Inc\DICOM Printer 2\dicom-printer-2-queue\OpenQueueDashboard.exe"
```

If the API service is not running, start it with `net start DICOMPrinterApiService` (see [Starting and Stopping](starting-and-stopping.md)).

## Working with the Console

### Queue triage

Jobs surface in three tabs:

- **Review** — jobs parked by `<Query type="Manual">` plus `<Perform action="ManualMatch" />` that do not yet have a `.match` companion file. The operator can preview pages, search a worklist or PACS, and apply a match.
- **Queue** — jobs in the active queue, including those with a `.match` companion waiting for `DicomPrinter.exe` to pick them up.
- **Expired** — jobs moved to `queue_expired/`. Operators can restore them back into the active queue.

Page previews and payload enumeration follow the `.dxi` job manifest, so PDF-backed and multi-image jobs all render correctly.

### Manual matching

When a job lands in the Review tab:

1. Select the job. The Console reads the job's parsed text and dataset and seeds the form fields.
2. Run a query against any configured Worklist, Study, or PACS endpoint. The endpoint dropdown is deduplicated by host/port/peer AE/local AE.
3. Pick a candidate and (optionally) edit values. **Apply Match** is enabled only when a job is selected, the form holds enough exam data, and the proposed values are materially different from the seeded values.
4. The Console highlights any missing or insufficient fields rather than silently refusing. The confirmation dialog renders only fields that would actually change.
5. On apply the API writes a `.match` companion file alongside the job's `.dxi`, immediately returns the job from `queue/manual/` to `queue/`, and tolerates brief `.dxi` lock contention during the move.

`.match` companion files use the `(GGGG,EEEE)=value` line format; customer plugins that consume them continue to work. See [Manual Matching](queue-dashboard.md) for the on-disk contract.

### Manage pane

The Manage gear icon in the top bar opens a fullscreen dialog with:

- **Service** — status, start/stop/restart, and an auto-refreshing status line (no manual refresh button).
- **Activate** — resolves and launches the installed activator. Surfaces a concrete error if the host cannot launch instead of silently no-op'ing.
- **Storage** — all configured Store, Worklist, Study, and Manual endpoints from the last saved config, with inline C-ECHO actions where applicable.
- **Logs** — live tail of DICOM Printer, queue, drop-monitor, and console/API logs with regex filtering and follow-by-default. Invalid regexes are reported in a status line without breaking the tail.
- **Config editor** — CodeMirror with line numbers, XML syntax highlighting, DTD-aware validation, and a gutter marker at the line/column reported by the validator. Inline C-ECHO and query-test actions are exposed for the `<ConnectionParameters>` block under the cursor. Save triggers a config reload across the API; no service bounce is required.

Storage endpoint discovery, inline C-ECHO, and query-test actions use the same
environment substitution as the main DICOM Printer service. Config values such
as `<Host>${PACS_HOST}</Host>` or `<Port>${PACS_PORT:-104}</Port>` resolve from
the process environment plus the root/config `.env` and `.env.local` files
before the Console attempts the network operation.

### Keyboard shortcuts

The Console uses a Gmail-style `g`-prefix chord for area navigation when no input is focused:

| Chord | Action |
|---|---|
| `g r` | Go to Review |
| `g q` | Go to Queue |
| `g e` | Go to Expired |

WASD mirrors the arrow keys for row navigation when no input is focused. Press `?` to open the keyboard help.

## Permissions

The Console (WebView2 window) runs as the interactive user. The API service runs under the service account configured for `DICOMPrinterApiService` (Local System by default). Operations that require service control (start/stop/restart of `DicomPrinterService`) are issued via the API, so the desktop window does not need to be elevated.

The HTTP listener binds to loopback (`localhost`) only. Configuration of authentication and remote exposure is covered in the security white paper shipped with the installer.

## Troubleshooting

### Console window does not open

`OpenQueueDashboard.exe` requires the API service to be reachable.

1. Check that `DICOMPrinterApiService` is running:
   ```cmd
   sc query DICOMPrinterApiService
   ```
2. If stopped, start it:
   ```cmd
   net start DICOMPrinterApiService
   ```
3. Verify the listener:
   ```cmd
   curl http://localhost:5009/api/admin/service/status
   ```

### Console starts off-screen

The window centres on the active display on first launch.

### Configuration changes not picked up

Saves through the Manage pane trigger a config reload across the API. If a change was made by hand-editing `config.xml`, click **Reload** in the Manage pane or restart `DicomPrinterService`.

### C-ECHO or endpoint listing shows unresolved environment placeholders

The Console/API reads the same `.env` sources as the main service:
`%ProgramData%\Flux Inc\DICOM Printer 2\.env`, `.env.local`,
`config\.env`, and `config\.env.local`, with process environment variables
taking precedence. If a host, port, or AE title still appears as `${...}`, check
those files and restart `DICOMPrinterApiService` after changing service-level
environment values.

### Inline validation reports an error but the editor cursor is elsewhere

Click the validation echo to jump the editor to the failing line/column and render the echoed snippet alongside.

### Activate button does nothing

The button posts `launch-activate` to the WebView host. If the host cannot launch the activator (missing file, blocked by policy), the Console surfaces a concrete operator-facing error instead of silently doing nothing. Confirm the activator path with `/api/admin/activate-info`.

## Related topics

- [Manual Matching](queue-dashboard.md)
- [Starting and Stopping the Service](starting-and-stopping.md)
- [Licensing and Activation](licensing.md)
- [Configuration](configuration.md)
- [Interrogating the Logs](logs.md)
- [Installation](installation.md)
