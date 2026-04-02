# Lua Filter

The Lua filter lets you write scripts that read and modify DICOM tags, route images to multiple destinations, and maintain state across related datasets. Scripts are defined in a single `lua.yml` file and can run in two contexts:

- **Storage** — the prepare pipeline for each incoming DICOM image
- **Query proxying** — proxied C-FIND request and result flows for Worklist and Query/Retrieve

If `lua.yml` is invalid, DICOM Capacitor will halt with an error. If it is missing, the Lua filter is disabled.

Enable the Lua filter in `config.yml`:

```yaml
filters: lua
```

Filters execute in the order they appear:

```yaml
filters: route, lua, mutate
```

## Script Entries

Each entry in `lua.yml` defines a script and the conditions under which it runs.

```yaml
- Description: Strip PHI           # optional label for log messages
  Affects: [storage]               # which context — defaults to storage
  AeTitles: [PACS, ARCHIVE]        # optional AE title filter
  Conditions:                      # optional dataset conditions (AND logic)
    - Tag: 0008,0060
      MatchExpression: CT
  OnError: skip                    # skip (default) or fail
  Script: |
    dataset:Set('PatientName', 'ANONYMOUS')
```

- **Script** — (Required) Inline Lua code or a path to a `.lua` file relative to the config directory. Paths must end in `.lua` and cannot contain `..`.
- **Affects** — Which context(s) this entry applies to. Defaults to `storage`. See [Affects](#affects) below.
- **Description** — Human-readable label shown in log messages.
- **Conditions** — Dataset conditions that must all match. See the [Conditions](./conditions) page.
- **AeTitles** — For storage entries, the destination AE titles this entry applies to. For query entries, the resolved node AE title. If empty, applies to all.
- **OnError** — `skip` logs a warning and continues to the next entry. `fail` stops the pipeline.

### Affects

`Affects` controls which pipeline phase(s) an entry targets:

| Value | Context |
|-------|---------|
| `storage` | Incoming images in the storage prepare pipeline. **Default.** |
| `worklist_query` | Outbound proxied worklist C-FIND request dataset |
| `worklist_result` | Inbound proxied worklist C-FIND result dataset |
| `qr_find_query` | Outbound proxied Query/Retrieve C-FIND request dataset |
| `qr_find_result` | Inbound proxied Query/Retrieve C-FIND result dataset |

An entry may list multiple `Affects` values within the same family (e.g. `[worklist_query, worklist_result]`), but may not mix `storage` with query affects, or request affects with result affects.

## Storage Context

Storage scripts run in the prepare pipeline for each incoming DICOM image. One Lua VM is created per image; all matching entries execute sequentially in that VM.

Available globals: `dataset`, `route`, `file`, `study`, `series`, `queue`, `log`, `print`, `uid`, `include`.

### dataset

Reads and writes DICOM tags on the current image. Tags can be referenced by keyword (`PatientName`) or hex notation (`0010,0010` or `00100010`). Every mutating call is recorded in the audit log.

- `dataset:Get(tag)` — Returns the tag value as a string, or `nil` if absent.
- `dataset:Count(tag)` — Returns the number of items in a sequence, or `0`.
- `dataset:Set(tag, value)` — Sets a tag value. Creates the tag if it doesn't exist.
- `dataset:Remove(tag)` — Removes a tag. Silent no-op if absent.
- `dataset:Populate(table)` — Bulk-write nested DICOM content from a Lua table. Each field produces an audit entry.
- `dataset:PopulateAt(path, table)` — Bulk-write into a specific sequence item or path.

```lua
local name = dataset:Get('PatientName')
local modality = dataset:Get('0008,0060')

dataset:Set('PatientName', 'ANONYMOUS')
dataset:Remove('PatientBirthDate')
```

#### Path Syntax

All dataset methods accept path expressions for navigating into sequences:

- `ScheduledProcedureStepSequence[1].Modality` — 1-based index into a sequence item
- `RequestAttributesSequence[ScheduledProcedureStepID='STEP1'].CodeValue` — selector: first item where the tag equals the value. If multiple items match, only the first is used.
- `Set()` auto-creates missing sequences and items as needed
- `Set()` with a selector creates the item if none exists, seeding the selector tag
- `Remove('Sequence[2]')` removes a sequence item; `Remove('Sequence[1].Tag')` removes only a child tag

```lua
dataset:Set('ScheduledProcedureStepSequence[1].ScheduledStationAETitle', 'CT_ROOM')

local station = dataset:Get('ScheduledProcedureStepSequence[1].ScheduledStationAETitle')
local stepCount = dataset:Count('ScheduledProcedureStepSequence')

dataset:Remove("RequestAttributesSequence[ScheduledProcedureStepID='STEP1']")
```

The same path syntax applies in all contexts: storage `dataset`, query `dataset`, query `request`, and route lambda datasets.

#### Bulk Writes with Populate

For nested structures, `Populate()` and `PopulateAt()` let you describe the full shape as a Lua table rather than calling `Set()` repeatedly. Arrays of tables map to sequence items.

```lua
dataset:Populate({
  PatientName = 'ANON',
  ScheduledProcedureStepSequence = {
    {
      ScheduledStationAETitle = 'CT_ROOM',
      Modality = 'CT',
      ScheduledProtocolCodeSequence = {
        { CodeValue = 'HEAD', CodingSchemeDesignator = '99TEST' }
      }
    }
  }
})

dataset:PopulateAt("RequestAttributesSequence[ScheduledProcedureStepID='STEP1']", {
  ScheduledProcedureStepDescription = 'UPDATED',
  ScheduledProtocolCodeSequence = {
    { CodeValue = 'PROC1', CodingSchemeDesignator = '99TEST' }
  }
})

dataset:Remove("RequestAttributesSequence[ScheduledProcedureStepID='STEP1'].ScheduledProcedureStepID")
```

### route

Routes images to additional destinations. Destinations must be defined in `nodes.yml` with `NodeRole: Storage`.

- `route:Add(destination)` — Send a copy to another destination.
- `route:Add(destination, function(ds) ... end)` — Send a copy with per-destination modifications. The function receives a dataset proxy for the clone; mutations only affect that copy.
- `route:Drop()` — Remove the original; only routed copies are sent.

```lua
route:Add('AI_SERVER')

route:Add('RESEARCH', function(ds)
    ds:Set('PatientName', 'ANONYMOUS')
    ds:Set('PatientID', '00000')
    ds:Remove('PatientBirthDate')
end)

route:Drop()
```

Route lambdas execute after all `lua.yml` entries complete and receive a clone of the final dataset state. If any lambda fails, no output files are created. Calling `route:Add()` twice for the same destination replaces the previous lambda.

### file

Read-only metadata about the current image.

- `file.sourceAeTitle` — AE title of the system that sent this image.
- `file.destinationAeTitle` — AE title of the destination being prepared.

```lua
if file.sourceAeTitle == 'CT_SCANNER_1' then
    dataset:Set('StationName', 'CT Room 1')
end
```

### study and series

Key-value tables scoped to the current StudyInstanceUID and SeriesInstanceUID. State persists across all images sharing the same UID, with a 24-hour TTL. State is held in memory and lost on service restart.

```lua
study.image_count = (study.image_count or 0) + 1
series.last_instance = dataset:Get('SOPInstanceUID')
```

### queue

Read-only access to the in-memory processing queue.

**Count methods** return a number:

- `queue:total()` — Total items in the queue.
- `queue:count(state)` — Items in the given state (`"New"`, `"Prepared"`, `"Failed"`, `"Rejected"`, `"Expired"`).
- `queue:countByStudy(studyUID)` / `queue:countByStudy(studyUID, state)`
- `queue:countByDestination(aeTitle)` / `queue:countByDestination(aeTitle, state)`

**Find methods** return an item list (see [Iterating items](#iterating-queue-items)):

- `queue:findByStudy(studyUID)`
- `queue:findByState(state)`
- `queue:findByDestination(aeTitle)` / `queue:findByDestination(aeTitle, state)`

```lua
if queue:countByDestination('AI_SERVER', 'Failed') > 10 then
    print('AI_SERVER failing — skipping route')
else
    route:Add('AI_SERVER')
end
```

#### study.queue

Same methods as `queue`, automatically scoped to the current image's StudyInstanceUID. `nil` when the image has no StudyInstanceUID.

- `study.queue:totalCount()`
- `study.queue:countByState(state)`
- `study.queue:items()` / `study.queue:itemsByState(state)`
- `study.queue:destinations()` — distinct destination AE titles
- `study.queue:modalities()` — distinct modalities

```lua
if study.queue:countByState('New') > 1 then
    error('retry: waiting for study to complete')
end
```

#### Iterating Queue Items

`queue:find*()` and `study.queue:items*()` return an item list. Iterate with `count()` and `get(i)` (1-based):

```lua
local items = study.queue:items()
for i = 1, items:count() do
    local item = items:get(i)
    print(item.state, item.destinationAeTitle, item.modality)
end
```

Item fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Internal record ID |
| `state` | string | `"New"`, `"Prepared"`, `"Failed"`, `"Rejected"`, or `"Expired"` |
| `sourceAeTitle` | string | AE title of the sender |
| `destinationAeTitle` | string | AE title of the destination |
| `studyInstanceUID` | string | Study Instance UID |
| `seriesInstanceUID` | string | Series Instance UID |
| `sopInstanceUID` | string | SOP Instance UID |
| `sopClassUID` | string | SOP Class UID |
| `modality` | string | Modality (e.g. `"CT"`, `"MR"`) |
| `patientID` | string | Patient ID |
| `patientName` | string | Patient name |
| `accessionNumber` | string | Accession number |
| `attemptCount` | number | Number of delivery attempts |
| `lastError` | string | Last error message (if any) |
| `format` | string | File format (`"dcm"`, `"json"`, `"yml"`) |
| `pendingState` | string | Deferred state change (if any) |
| `createdAt` | string | ISO 8601 creation timestamp |
| `updatedAt` | string | ISO 8601 last-updated timestamp |

## Query Context

Query scripts run inside a proxied C-FIND session. One Lua VM is created per incoming proxied request; it survives from the request phase through all result rows for that query.

Available globals: `dataset`, `query`, `session`, `request` (result phase only), `response` (result phase only), `queue`, `log`, `print`, `uid`, `include`.

`route`, `file`, `study`, and `series` are not available in query contexts.

### dataset

The same API as storage — `Get`, `Set`, `Remove`, `Count`, `Populate`, `PopulateAt` — applied to the current context:

- In request hooks: the outbound C-FIND request dataset.
- In result hooks: the current result row dataset.

### query

Read-only metadata about the proxied query:

- `query.kind` — `"worklist"` or `"qr"`
- `query.phase` — `"request"` or `"result"`
- `query.callingAeTitle` — AE title of the calling SCU
- `query.calledAeTitle` — Raw called AE title from the association
- `query.nodeAeTitle` — Resolved Capacitor node AE title (used for `AeTitles` matching)
- `query.level` — Query level (e.g. `"STUDY"`, `"PATIENT"`) or `""` for worklist

### session

A key-value table shared across the entire proxied query — request phase and all result rows. Not persisted to disk. Storing Lua functions is rejected.

```lua
-- request hook: stash something for result hooks to use
session.requestedStation = dataset:Get('ScheduledProcedureStepSequence[1].ScheduledStationAETitle')

-- result hook: read it back
if session.requestedStation == 'ROOM_A' then
    response:drop()
end
```

### request

Read-only view of the effective request dataset. Available in result hooks only.

- `request:Get(path)` — Read a tag from the original request.
- `request:Count(path)` — Count items in a sequence in the original request.

`request` has no `Set`, `Populate`, or `Remove` — it is read-only.

### response

Result hook control. Available in result hooks only.

- `response:drop()` — Suppress this result row. Script errors do not silently suppress rows; only an explicit `drop()` does.

```lua
if dataset:Get('AccessionNumber') == 'HIDE' then
    response:drop()
end
```

### Example: Worklist request and result hooks

```yaml
- Affects: [worklist_query]
  Script: |
    -- Stash the requested station, then broaden the query upstream
    session.requestedStation = dataset:Get('ScheduledProcedureStepSequence[1].ScheduledStationAETitle')
    dataset:Set('ScheduledProcedureStepSequence[1].ScheduledStationAETitle', 'WL_PROXY')

- Affects: [worklist_result]
  Script: |
    -- Filter results that don't match the original request
    local resultStation = dataset:Get('ScheduledProcedureStepSequence[1].ScheduledStationAETitle')
    if resultStation ~= session.requestedStation then
        response:drop()
    end
    -- Drop cancelled orders
    if dataset:Get('AccessionNumber') == 'CANCELLED' then
        response:drop()
    end
```

### Example: QR result filtering with request context

```yaml
- Affects: [qr_find_result]
  Script: |
    -- Suppress studies from a specific institution
    if dataset:Get('InstitutionName') == 'HIDDEN_SITE' then
        response:drop()
    end
    -- Log what the original request was asking for
    print('Requested level:', query.level, 'from:', request:Get('PatientID'))
```

## Shared Utilities

These globals are available in all contexts.

### log

Writes to the common application log (visible on the Logs page). Use for operational messages visible to all operators.

- `log:info(...)` / `log:warn(...)` / `log:error(...)` / `log:debug(...)`

Arguments are tab-separated and prefixed with `[lua]`.

```lua
log:info('Processing', dataset:Get('PatientID'))
log:warn('Destination backlog:', queue:countByDestination('AI_SERVER', 'New'), 'items')
```

### print

Logs to the per-item log only (visible when inspecting a specific queue item or query session). Use for per-image or per-query debug output.

```lua
print('Modality:', dataset:Get('Modality'))
print('Phase:', query.phase, 'Kind:', query.kind)
```

### uid

Generates a new globally unique DICOM UID.

```lua
route:Add('RESEARCH', function(ds)
    ds:Set('StudyInstanceUID', uid())
    ds:Set('SeriesInstanceUID', uid())
    ds:Set('SOPInstanceUID', uid())
end)
```

### include

Loads and executes a Lua file from the config directory. Deduplicated per image or query session. Path must be relative, end in `.lua`, and cannot contain `..`.

```lua
include('libs/anonymize.lua')
anonymize(dataset)
```

### Standard Library

The full Lua 5.4 standard library is available (`string`, `table`, `math`, `os`, `io`, etc.):

```lua
dataset:Set('ContentDate', os.date('%Y%m%d'))

local desc = dataset:Get('StudyDescription') or ''
dataset:Set('StudyDescription', string.upper(desc))
```

## Error Handling

### Storage errors

| Keyword in error message | Behavior |
|--------------------------|----------|
| `retry` | File stays in queue, retried on the next cycle |
| `fail` | File moves to Failed state, pipeline stops |
| *(anything else)* | Governed by the entry's `OnError` setting |

Keywords match case-insensitively as substrings: `error('retry: waiting for tag')` triggers a retry.

### Query errors

| Keyword / call | Behavior |
|----------------|----------|
| `error('fail')` | Aborts the entire proxied query |
| `error('retry')` | Not supported — treated as `fail`, with a log warning |
| `response:drop()` | Suppresses this result row only |
| *(anything else)* | Governed by the entry's `OnError` setting |

Script errors never silently suppress result rows — only an explicit `response:drop()` does.

### Rollback on error

When an entry errors, all its side effects are atomically rolled back before the next entry runs:

- Dataset mutations revert to their pre-entry state
- Route additions are removed
- Scoped state (`study`/`series`) and query `session` changes are restored

Previous entries' mutations are preserved.

## Execution Model

**Storage:** One Lua VM per image. Matching entries run sequentially. Route lambdas run after all entries complete with a clone of the final dataset.

**Query:** One Lua VM per proxied C-FIND session. Request-phase entries run first, then result-phase entries run for each result row in the same VM. `dataset` and `response` are rebound per row; `session` and other Lua globals persist across the full session.

**Execution order:**

| Phase | Query/Retrieve | Worklist |
|-------|---------------|---------|
| Request | Lua → YAML mutations → upstream query | Lua → cache/save request → upstream fetch |
| Result | Lua → YAML mutations → emit | Lua → YAML mutations → local filtering → emit |

For complete working examples, see [Lua Examples](./lua-examples).
