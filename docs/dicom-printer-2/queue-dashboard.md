# Queue Dashboard

The Queue Dashboard is a web-based interface for managing jobs that could not be automatically matched to a worklist entry during DICOM Printer 2 processing. It provides visibility into the processing queue, worklist search, manual patient matching, and job lifecycle management.

## How It Works

When DICOM Printer 2 encounters a document that cannot be matched to a worklist entry automatically, the `ManualQuery` workflow action moves the job's files into a `queue/manual/` subdirectory and marks the job as held. The Queue Dashboard monitors this directory and presents unmatched jobs to the operator, who can search the Modality Worklist, select the correct patient/study, and confirm the match.

Once matched, the dashboard writes a `.match` companion file containing the selected DICOM tag assignments. The matched job is returned to the main `queue/` directory where DICOM Printer 2 picks it up, reads the `.match` file, and resumes workflow processing with the matched metadata applied.

## Prerequisites

- DICOM Printer 2 installed and configured
- .NET 8 Runtime (or use the self-contained build which bundles the runtime)
- Network access to the Modality Worklist SCP (for worklist queries)

The self-contained build (`QueueDashboard.exe`) does not require a separate .NET installation.

## Starting the Dashboard

```bash
QueueDashboard.exe --path <dp2-run-dir> [--port <port>]
```

| Option   | Description | Default |
|----------|-------------|---------|
| `--path` | Path to DICOM Printer 2's runtime directory (contains `config/`, `queue/`, etc.) | Current directory |
| `--port` | HTTP listen port | `5009` |

Once started, open `http://localhost:5009` (or the configured port) in a web browser.

## Queue Tabs

The dashboard organizes jobs into three tabs:

### Needs Matching

Jobs in `queue/manual/` that do not yet have a `.match` companion file. These are jobs that the `ManualQuery` action parked because automatic worklist matching failed. The operator should review each job's document pages, search the worklist, and confirm a match.

### Matched

Jobs in `queue/` that have a `.match` companion file. These jobs have been matched by the operator and are waiting for DICOM Printer 2 to pick them up and resume processing.

### Expired

Jobs that have been moved to `queue_expired/`. Expired jobs can be restored back to the active queue from this tab.

## Worklist Search

When reviewing a job, the operator can query the Modality Worklist SCP to find the correct patient and study. The dashboard sends a C-FIND request using the connection parameters defined in `config.xml`.

Search fields include patient name, patient ID, and accession number. Results are ranked by match score based on similarity to the job's parsed metadata.

If multiple Query endpoints are configured in `config.xml`, an endpoint selector allows switching between them.

## Page Viewer

Each job includes rendered page images (PNG files) of the original document. The page viewer displays these as a lightbox with thumbnails for navigation, allowing the operator to review the document content before making a match decision.

## Job Management

The dashboard provides the following actions:

- **Match** -- Select a worklist result and confirm. Writes a `.match` file and returns the job to the main queue.
- **Remove** -- Move a job to `queue_removed/`. Bulk remove is also supported.
- **Restore** -- Move an expired job back to the active queue.
- **Return to Queue** -- Move a manual queue job back to the main queue (with or without a match).

## Match Companion Files

When the operator confirms a match, the dashboard writes a `.match` file alongside the job's `.dxi` file. The file contains one DICOM tag assignment per line in `(GGGG,EEEE)=Value` format:

```
(0010,0010)=DOE^JOHN
(0010,0020)=MRN12345
(0008,0050)=ACC001
(0008,1030)=Treadmill Stress Test
```

DICOM Printer 2 reads this file when it resumes processing the job and applies the tag values to the job's DICOM dataset.

## Configuration

The dashboard reads `config/config.xml` from the runtime directory specified by `--path`. It extracts:

- **ParseJobTextFile rules** -- Regex patterns used to parse metadata (patient name, ID, accession number, etc.) from the job's extracted text. These are the same rules DICOM Printer 2 uses during processing.
- **Query connection parameters** -- Host, port, AE titles, and timeout settings for each `<Query>` action defined in the config. Used for worklist C-FIND requests.

### Environment Variable Interpolation

The dashboard supports environment variable interpolation in `config.xml` values using the syntax `${VAR:-default}`:

1. Real environment variables are checked first
2. Values from `config/.env` file are checked next
3. The inline default value is used as a fallback

This allows the same `config.xml` to be used across environments without modification.

Example `config/.env`:

```
WORKLIST_HOST=192.168.1.50
WORKLIST_PORT=11112
WORKLIST_AE=DIMOD
```

## Auto-Refresh

The dashboard automatically refreshes the job list. It uses filesystem watchers to detect changes in the `queue/`, `queue/manual/`, and `queue_expired/` directories. The web UI also polls for updates every 30 seconds.

## Directory Structure

The dashboard expects the following layout under the `--path` directory:

```
<path>/
  config/
    config.xml      -- DP2 configuration (parse rules + worklist connection)
    .env            -- Environment variable overrides (optional)
  queue/            -- Active jobs awaiting processing
    manual/         -- Jobs parked by ManualQuery for manual matching
  queue_expired/    -- Expired jobs
  queue_removed/    -- Jobs removed via the dashboard
```

Each job in the queue consists of:
- `<jobId>.dxi` -- Job descriptor file
- `<jobId>.txt` -- Extracted text content
- `<jobId>_*.png` -- Rendered page images
- `<jobId>.match` -- Match file with DICOM tag assignments (created by the dashboard)

## Related Topics

- [DICOM Printer 2 Overview](index.md)
