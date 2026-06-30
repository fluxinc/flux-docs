# Manual Matching

DICOM Printer 2 supports operator-driven worklist matching for jobs that cannot be matched automatically. The workflow uses a parked-job directory, a `.match` companion file, and the [DICOM Printer Console](control-app.md) for the operator UI.

> **What happened to the "Queue Dashboard"?**
> Through 2.3.x DP2 shipped a standalone web UI called the Queue Dashboard, backed by the `DICOMPrinterQueueService` Windows service. In 2.4.0 it was folded into the new **DICOM Printer Console** (`DICOMPrinterConsole.exe` WebView2 desktop + `DICOMPrinterApi.exe` HTTP service, `DICOMPrinterApiService`). The `dicom-printer-2-queue/` install directory and `OpenQueueDashboard.exe` launcher remain as compatibility aliases. See [DICOM Printer Console](control-app.md) for the UI.

This page documents the on-disk contract that makes manual matching work — the directory layout, the `.match` companion file, and how `DicomPrinter.exe` consumes them. Use it when integrating other tooling or when troubleshooting matches that do not get picked up.

## How it works

1. The workflow runs a `<Query type="Manual">` action followed by `<Perform action="ManualMatch" />`. The Manual query parks the job's files into `queue/manual/` and sets the **Held** flag so file deletion is suppressed and workflow execution stops.
2. The Console (or another tool that follows the same contract) presents the parked job to the operator, runs a worklist or PACS query, and writes a `.match` companion file beside the job's `.dxi`.
3. The job is moved from `queue/manual/` back to `queue/`.
4. `DicomPrinter.exe` picks the job up on the next checking interval, reads the `.match` file, applies the tag values to the job's DICOM dataset, and resumes the workflow at the next node after `ManualMatch`.

The Held flag also clears the `.meta` retry counter, so a job that has exhausted its retry budget regains a fresh budget on resume.

## Operator workflow

See [DICOM Printer Console § Manual matching](control-app.md#manual-matching) for the UI walkthrough. The user-facing flow is:

1. Open the Console; the parked job appears in the **Review** tab.
2. Review page previews of the original document.
3. Query a configured Worklist, Study, or PACS endpoint. The Console deduplicates endpoints by host/port/peer AE/local AE and labels each with the contributing config element.
4. Select a candidate and (optionally) edit values; **Apply Match** is enabled when the form holds enough exam data and proposed values differ materially from the seeded values.
5. The Console writes the `.match` companion file and returns the job to `queue/`.

## Directory layout

DP2's runtime root (default `%ProgramData%\Flux Inc\DICOM Printer 2`) has these queue-related directories:

```
<root>/
  .env                  Environment-variable values (optional)
  .env.local            Local environment overrides (optional)
  config/
    config.xml          DP2 configuration (parse rules + Query endpoints)
    .env                Environment-variable overrides (optional)
    .env.local          Config-local environment overrides (optional)
  queue/                Active jobs awaiting processing
    manual/             Jobs parked by ManualQuery for manual matching
  queue_expired/        Expired jobs
  queue_removed/        Jobs removed via the Console
```

Each job is a set of files sharing a stem and described by its `.dxi` manifest:

| File | Role |
|---|---|
| `<jobId>.dxi` | Job descriptor / manifest. Lists the payload files (PDF, images, text) that belong to the job. |
| `<jobId>.txt` | Extracted text content used by `ParseJobTextFile`. |
| `<jobId>_*.png` | Rendered page images displayed by the Console preview. |
| `<jobId>.match` | DICOM tag assignments applied on resume. Created by the Console (or any compatible matcher). |
| `<jobId>.match.json` | Optional JSON-shaped sidecar containing the matched dataset, used by `<Query type="Manual">` to round-trip private tags safely. |
| `<jobId>.meta` | Retry counter and timestamps used by `<Suspend>`. Deleted by ManualQuery so the job restarts with a fresh budget. |

## `.match` file format

The `.match` file is a plain-text companion that contains one DICOM tag assignment per line in `(GGGG,EEEE)=value` format:

```
(0010,0010)=DOE^JOHN
(0010,0020)=MRN12345
(0008,0050)=ACC001
(0008,1030)=Treadmill Stress Test
(0020,000D)=1.2.840.113619.2.55.3.604688119.971.1571243437.640
```

- Tag numbers are written in the canonical `(GGGG,EEEE)` form with hexadecimal group/element.
- Values are written as the raw UTF-8 string DCMTK expects for the tag's VR.
- One assignment per line; lines that fail to parse are skipped with a log warning.

### Private tags

Private tags require the private creator block to exist before the private-data slot is populated. The `.match.json` sidecar (used by the Manual query round-trip) registers the private creator before insertion. When writing a `.match` text file by hand, register the creator first (e.g. via a preceding `SetTag`) or use the JSON sidecar.

### `StudyInstanceUID`

For matches that need to land on an existing study, populate `(0020,000D)` in the `.match` file. The Console fills this from the selected worklist or Study Root record when applicable.

## Required configuration

The matching surface (Console or third-party tool) reads `config/config.xml` from the runtime root and extracts:

- **`ParseJobTextFile` rules** — regex patterns used to seed the form from the job's extracted text. These are the same rules `DicomPrinter.exe` uses, so seeded values stay consistent across the two.
- **Query endpoints** — host, port, AE titles, and timeout settings for each `<Query>` action defined in the config. Worklist, Study, and PACS endpoints are all enumerated and deduplicated.

### Environment variable interpolation

`config.xml` values support `${VAR:-default}` interpolation:

1. Root `.env` and `.env.local` are loaded from the DP2 runtime root.
2. `config/.env` and `config/.env.local` are loaded next.
3. Process environment variables override all file values.
4. The inline default is used as a fallback.

Example root `.env` or `config/.env`:

```
WORKLIST_HOST=192.168.1.50
WORKLIST_PORT=11112
WORKLIST_AE=DIMOD
```

The Console/API uses this same resolver when it reads query endpoints for manual
matching, storage endpoint listing, inline C-ECHO, and query-test actions.

## Endpoint configuration (`<Query type="Manual">`)

`ConnectionParameters` on a Manual query are optional — DP2 itself does not perform a C-FIND when it sees `type="Manual"`. The Console uses the *other* `<Query>` actions in the config (Worklist, Study, Patient) as the endpoints it can query when the operator needs to look something up.

A minimal Manual query that does nothing but park the job:

```xml
<Query name="ParkForManualMatch" type="Manual" />
```

A typical workflow chains it with `ManualMatch`:

```xml
<Workflow>
  <Perform action="FindWorklistEntry"/>
  <If field="QUERY_FOUND" value="0">
    <Statements>
      <Perform action="ParkForManualMatch"/>
      <Perform action="ManualMatch"/>
    </Statements>
  </If>
  <Perform action="SendToPACS"/>
</Workflow>
```

`ManualMatch` waits for the `.match` companion file. When DP2 sees the matched job back in `queue/`, it applies the file's assignments and continues the workflow.

## Auto-refresh and detection

The API service watches the `queue/`, `queue/manual/`, and `queue_expired/` directories with filesystem watchers and the Console polls every 30 seconds as a fallback. `DicomPrinter.exe` polls `queue/` on its configured `<CheckingInterval>` (default 1 second), so a returned-from-manual job is normally picked up within one or two seconds of the move.

## Related topics

- [DICOM Printer Console](control-app.md)
- [Query Actions](actions/query.md)
- [Workflow Conditional Nodes](workflow/conditional-nodes.md)
- [Troubleshooting](troubleshooting.md)
