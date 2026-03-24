# Lua Filter

The Lua filter lets you write scripts that read and modify DICOM tags, route images to multiple destinations with per-destination modifications, and maintain state across images in the same study or series. Lua scripts are defined in a `lua.yml` file and execute against each incoming DICOM image during the prepare phase. If this file is invalid, DICOM Capacitor will halt with an error. If this file is missing, the Lua filter will be disabled.

In order to enable the Lua filter, you must add the `lua` filter to the `filters` section of your `config.yml` file.

```yaml
# config.yml
filters: lua
```

The Lua filter can be combined with other filters. Filters execute in the order they appear:

```yaml
# config.yml
filters: route, lua, mutate
```

## Lua Script Entry Components

Each entry in `lua.yml` defines a script to run, with optional conditions for when it applies:

- `Script`: (Required) Inline Lua code or a path to a `.lua` file. Paths ending in `.lua` are loaded from the configuration directory.
- `Description`: (Optional) A human-readable label that appears in log messages.
- `Conditions`: (Optional) A list of conditions that must be met for this entry to execute. Conditions are a shared concept described on the [Conditions](./conditions) page.
- `AeTitles`: (Optional) A list of destination AE titles to which this entry applies. If not provided, the entry applies to all destinations.
- `OnError`: (Optional) Error handling behavior when a script fails. Defaults to `skip`.
  - `skip`: Log a warning and continue to the next entry.
  - `fail`: Stop the pipeline and move the file to the Failed state.

### Script

The `Script` field accepts either inline Lua code or a file path:

```yaml
# Inline script
- Script: |
    dataset:Set('PatientName', 'ANONYMOUS')

# File reference (loaded from the configuration directory)
- Script: scripts/anonymize.lua
```

File paths must end in `.lua`, must be relative to the configuration directory, and cannot contain `..`.

### AeTitles

The `AeTitles` field restricts a script entry to specific destinations:

```yaml
- Script: |
    dataset:Set('InstitutionName', 'HOSPITAL')
  AeTitles:
    - AI_SERVER
    - RESEARCH
```

### Conditions

The `Conditions` field filters which images a script applies to based on DICOM tag values. All conditions must match (AND logic). Conditions are described in their own [Conditions](./conditions) page.

```yaml
- Script: scripts/route-ct.lua
  Conditions:
    - Tag: 0008,0060
      MatchExpression: CT
```

## Lua API

Scripts have access to the following globals:

| Global | Type | Description |
|--------|------|-------------|
| `dataset` | object | Read and write DICOM tags with audit logging |
| `route` | object | Route images to additional destinations |
| `file` | object | Read-only metadata about the current image |
| `queue` | object | Read-only queries against the in-memory processing queue |
| `study` | table | Key-value state shared across images in the same study (24h TTL) |
| `study.queue` | object | Read-only queue queries scoped to the current study |
| `series` | table | Key-value state shared across images in the same series (24h TTL) |
| `print(...)` | function | Log output (appears in per-file logs) |
| `uid()` | function | Generate a new DICOM UID |
| `include(path)` | function | Load a shared Lua library file |

### dataset

The `dataset` object reads and writes DICOM tags. Tags can be referenced by keyword (e.g., `PatientName`) or hex notation (e.g., `0010,0010` or `00100010`). Every `Set()` and `Remove()` call is recorded in the audit log.

- `dataset:Get(tag)` - Returns the tag value as a string, or `nil` if the tag is absent.
- `dataset:Set(tag, value)` - Sets a tag to a new value. Creates the tag if it doesn't exist.
- `dataset:Remove(tag)` - Removes a tag from the dataset. Silent no-op if the tag doesn't exist.

```lua
local name = dataset:Get('PatientName')
local modality = dataset:Get('0008,0060')

dataset:Set('PatientName', 'ANONYMOUS')
dataset:Set('0010,0020', 'NEW_ID')

dataset:Remove('PatientBirthDate')
```

### route

The `route` object controls where images are sent. Destinations must be defined in `nodes.yml` with `NodeRole: Storage`.

- `route:Add(destination)` - Send a copy of the image to the specified destination.
- `route:Add(destination, function(ds) ... end)` - Send a copy with per-destination modifications. The function receives a dataset proxy for the cloned copy; mutations only affect that copy.
- `route:Drop()` - Remove the original image. Only routed copies will be sent.

```lua
-- Send a copy to another destination
route:Add('AI_SERVER')

-- Route with per-destination modifications
route:Add('RESEARCH', function(ds)
    ds:Set('PatientName', 'ANONYMOUS')
    ds:Set('PatientID', '00000')
    ds:Remove('PatientBirthDate')
end)

-- Drop the original (only routed copies are sent)
route:Drop()
```

**Important:** Route lambdas execute *after* all `lua.yml` entries have completed. The lambda receives a clone of the dataset in its final state after all entries have run. If any lambda fails, the entire file fails and no output files are created — there is no partial persistence.

If `route:Add()` is called multiple times with the same destination, the last call wins — the previous lambda (if any) is replaced.

### file

The `file` object provides read-only metadata about the current image:

- `file.sourceAeTitle` - The AE title of the system that sent this image.
- `file.destinationAeTitle` - The AE title of the destination this image is being prepared for.

```lua
if file.sourceAeTitle == 'CT_SCANNER_1' then
    dataset:Set('StationName', 'CT Room 1')
end

if file.destinationAeTitle == 'EXTERNAL_PACS' then
    dataset:Remove('PatientBirthDate')
end
```

### queue

The `queue` object provides read-only access to the in-memory processing queue. This is the same data visible in the web UI's queue view. All queries run against the live in-memory database and return a snapshot at the time of the call.

**Count methods** return a number:

- `queue:total()` — Total number of items in the queue.
- `queue:count(state)` — Count of items in the specified state (`"New"`, `"Prepared"`, `"Failed"`, `"Rejected"`, `"Expired"`).
- `queue:countByStudy(studyUID)` — Count of items belonging to a study.
- `queue:countByStudy(studyUID, state)` — Count of items belonging to a study in a specific state.
- `queue:countByDestination(aeTitle)` — Count of items destined for a specific AE title.
- `queue:countByDestination(aeTitle, state)` — Count filtered by destination and state.

**Find methods** return an item list (see [Iterating Queue Items](#iterating-queue-items) below):

- `queue:findByStudy(studyUID)` — All items for a study.
- `queue:findByState(state)` — All items in a state.
- `queue:findByDestination(aeTitle)` — All items for a destination.
- `queue:findByDestination(aeTitle, state)` — Items for a destination in a specific state.

```lua
-- Check how many items are waiting globally
local pending = queue:count('New')
print('Pending items:', pending)

-- Check if a specific destination has failures
if queue:countByDestination('AI_SERVER', 'Failed') > 10 then
    -- Too many failures, skip routing to AI_SERVER
    print('AI_SERVER has too many failures, skipping')
else
    route:Add('AI_SERVER')
end
```

### study.queue

The `study.queue` object provides the same query capabilities as `queue`, but automatically scoped to the current image's StudyInstanceUID. Available when the image has a StudyInstanceUID; `nil` otherwise.

- `study.queue:totalCount()` — Total items in this study.
- `study.queue:countByState(state)` — Items in this study with a specific state.
- `study.queue:items()` — All items in this study.
- `study.queue:itemsByState(state)` — Items in this study filtered by state.
- `study.queue:destinations()` — Distinct destination AE titles for this study (string array).
- `study.queue:modalities()` — Distinct modalities for this study (string array).

```lua
-- Wait for all images before routing
local newCount = study.queue:countByState('New')
local preparedCount = study.queue:countByState('Prepared')
if newCount > 1 then
    -- More images still arriving, don't route yet
    error('retry: waiting for study to complete (' .. newCount .. ' images pending)')
end

-- Check which destinations this study has been routed to
local dests = study.queue:destinations()
print('Study destinations:', dests.Length)
```

### Iterating Queue Items

The `queue:find*()` and `study.queue:items*()` methods return an item list object. Use `count()` and `get(i)` to iterate (1-based indexing):

```lua
local items = study.queue:items()
for i = 1, items:count() do
    local item = items:get(i)
    print(item.state, item.destinationAeTitle, item.modality)
end
```

Each item exposes these read-only fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Internal record ID |
| `state` | string | `"New"`, `"Prepared"`, `"Failed"`, `"Rejected"`, or `"Expired"` |
| `sourceAeTitle` | string | AE title of the sender |
| `destinationAeTitle` | string | AE title of the destination |
| `studyInstanceUID` | string | DICOM Study Instance UID |
| `seriesInstanceUID` | string | DICOM Series Instance UID |
| `sopInstanceUID` | string | DICOM SOP Instance UID |
| `sopClassUID` | string | DICOM SOP Class UID |
| `modality` | string | DICOM modality (e.g., `"CT"`, `"MR"`) |
| `patientID` | string | Patient ID |
| `patientName` | string | Patient name |
| `accessionNumber` | string | Accession number |
| `attemptCount` | number | Number of delivery attempts |
| `lastError` | string | Last error message (if any) |
| `format` | string | File format (`"dcm"`, `"json"`, `"yml"`) |
| `pendingState` | string | Deferred state change (if any) |
| `createdAt` | string | ISO 8601 timestamp when the item entered the queue |
| `updatedAt` | string | ISO 8601 timestamp of the last state change |

### study and series

The `study` and `series` tables provide key-value storage scoped to the current image's StudyInstanceUID and SeriesInstanceUID respectively. State persists across all images sharing the same UID and is evicted after 24 hours of inactivity. State is held in memory and lost on service restart.

```lua
-- Count images per study
study.image_count = (study.image_count or 0) + 1

-- Track per-series state
series.last_instance = dataset:Get('SOPInstanceUID')
```

### print

The `print(...)` function logs output to the per-file item log. Arguments are converted to strings and separated by tabs.

```lua
print('Processing', dataset:Get('PatientName'))
print('Modality:', dataset:Get('Modality'))
```

### uid

The `uid()` function generates a new globally unique DICOM UID.

```lua
route:Add('RESEARCH', function(ds)
    ds:Set('StudyInstanceUID', uid())
    ds:Set('SeriesInstanceUID', uid())
    ds:Set('SOPInstanceUID', uid())
end)
```

### include

The `include(path)` function loads and executes a Lua file from the configuration directory. Files are loaded at most once per image (deduplicated by canonical path). The path must be relative, end in `.lua`, and cannot contain `..`.

```lua
-- Load a shared library from the configuration directory
include('libs/anonymize.lua')
anonymize(dataset)
```

```lua
-- libs/anonymize.lua
function anonymize(ds)
    ds:Set('PatientName', 'ANONYMOUS')
    ds:Set('PatientID', '00000')
    ds:Remove('PatientBirthDate')
    ds:Remove('PatientAddress')
    ds:Remove('ReferringPhysicianName')
end
```

### Standard Library

The full Lua 5.4 standard library is available, including `string`, `table`, `math`, `os`, `io`, and more.

```lua
dataset:Set('ContentDate', os.date('%Y%m%d'))

local desc = dataset:Get('StudyDescription') or ''
dataset:Set('StudyDescription', string.upper(desc))
```

## Error Handling

Lua scripts can control processing flow using `error()` with two special keywords:

| Keyword in message | Behavior |
|--------------------|----------|
| `retry` | File stays in queue, retried on the next processing cycle |
| `fail` | File moves to the Failed state, pipeline stops |
| *(anything else)* | Behavior depends on the entry's `OnError` setting |

Only `retry` and `fail` are special keywords. Any other error message (including the word "skip") is handled by the entry's `OnError` setting — `skip` (the default) logs a warning and continues to the next entry, while `fail` stops the pipeline.

Keywords are matched case-insensitively as substrings, so `error('retry: waiting for tag')` triggers a retry.

```lua
-- Retry if a required tag is missing
if dataset:Get('PatientName') == nil then
    error('retry: waiting for patient name')
end

-- Force failure for critical issues
if dataset:Get('Modality') == nil then
    error('fail: missing modality')
end
```

### Rollback on Error

When a script entry errors, all side effects from that entry are atomically rolled back:

- Dataset mutations are reverted to their pre-entry state
- Route additions are reverted
- Scoped state changes (`study`/`series`) are restored

Subsequent entries see the state as if the failed entry never ran. Previous entries' mutations are preserved.

## How Lua Scripts Execute

For each DICOM image entering the prepare phase:

1. One Lua VM is created for the image
2. All matching `lua.yml` entries execute **sequentially in the same VM**
3. After all entries complete, routing clones are materialized and lambdas execute
4. The modified dataset is saved (or dropped if `route:Drop()` was called)

Because all entries share the same VM:

- Variables set in one entry are visible to later entries
- Dataset mutations accumulate across entries
- Route additions accumulate across entries

## Lua Examples

The following examples show a complete `lua.yml` file with common scenarios:

```yaml
# lua.yml

# Example 1: Anonymize all images
# Strip patient information from every image that passes through
- Description: Strip PHI
  Script: |
    dataset:Set('PatientName', 'ANONYMOUS')
    dataset:Set('PatientID', '00000')
    dataset:Remove('PatientBirthDate')
    dataset:Remove('PatientAddress')
    dataset:Remove('ReferringPhysicianName')

# Example 2: Route CT images to an AI server
# Use conditions to match modality, then add a routing destination
- Description: Route CT to AI
  Script: |
    route:Add('AI_SERVER')
  Conditions:
    - Tag: 0008,0060
      MatchExpression: CT

# Example 3: Fan-out with per-destination anonymization
# Send mammography to multiple destinations with different PHI policies.
# The original goes to MAMMO_PACS unmodified. The AI vendor gets an
# anonymized copy. The teaching archive gets fully de-identified data
# with new UIDs.
- Description: Distribute mammography
  Script: |
    route:Add('MAMMO_PACS')
    route:Add('AI_VENDOR', function(ds)
        ds:Set('PatientName', 'ANONYMOUS')
        ds:Set('PatientID', '00000')
        ds:Set('InstitutionName', 'REDACTED')
    end)
    route:Add('TEACHING_ARCHIVE', function(ds)
        ds:Set('PatientName', 'TEACHING')
        ds:Set('PatientID', uid())
        ds:Set('StudyInstanceUID', uid())
        ds:Set('SeriesInstanceUID', uid())
        ds:Set('SOPInstanceUID', uid())
        ds:Remove('PatientBirthDate')
        ds:Remove('PatientAddress')
        ds:Remove('ReferringPhysicianName')
    end)
  Conditions:
    - Tag: 0008,0060
      MatchExpression: MG

# Example 4: Drop and reroute
# Redirect vascular ultrasound to a specialized PACS. The original
# destination is dropped so only the rerouted copy is sent.
- Description: Redirect vascular US
  Script: |
    route:Add('VASCULAR_PACS')
    route:Drop()
  Conditions:
    - Tag: 0008,0060
      MatchExpression: US
    - Tag: 0008,1030
      MatchExpression: '*VASCULAR*'

# Example 5: Enrich images based on source
# Tag images with the originating scanner so downstream systems can
# identify where the study was acquired.
- Description: Tag by source scanner
  Script: |
    local sources = {
        CT_SCANNER_1  = 'CT Room 1 - Main Building',
        CT_SCANNER_2  = 'CT Room 2 - Emergency',
        MR_SCANNER    = 'MRI Suite A',
    }
    local label = sources[file.sourceAeTitle]
    if label then
        dataset:Set('StationName', label)
    end

# Example 6: Study-level image counting with conditional routing
# Count images per study and route large studies to a dedicated
# archive server. Uses scoped state to track counts across images.
- Description: Route large studies
  Script: |
    study.image_count = (study.image_count or 0) + 1
    if study.image_count > 500 then
        route:Add('LARGE_STUDY_ARCHIVE')
    end

# Example 7: Shared library for reusable anonymization
# Factor common logic into a library file and call it from multiple
# entries. The include() function loads each file at most once.
- Description: Anonymize for research
  Script: |
    include('libs/phi.lua')
    route:Add('RESEARCH_ARCHIVE', function(ds)
        strip_phi(ds)
        ds:Set('PatientID', uid())
    end)

# Example 8: Destination-specific enrichment
# Only runs when preparing images for the AI_SERVER destination.
# Adds institutional metadata that the AI vendor requires.
- Description: Enrich for AI server
  Script: |
    dataset:Set('InstitutionName', 'GENERAL HOSPITAL')
    dataset:Set('InstitutionalDepartmentName', 'RADIOLOGY')
  AeTitles:
    - AI_SERVER

# Example 9: Critical script with fail-on-error
# Validate that required tags are present before sending to an
# external system. If validation fails, the image is held rather
# than sent incomplete.
- Description: Validate required tags
  Script: |
    local required = {'PatientID', 'PatientName', 'Modality', 'StudyInstanceUID'}
    for _, tag in ipairs(required) do
        if dataset:Get(tag) == nil then
            error('fail: missing required tag ' .. tag)
        end
    end
  AeTitles:
    - EXTERNAL_PACS
  OnError: fail

# Example 10: Timestamp injection and string manipulation
# Normalize study descriptions to uppercase and stamp images with
# the processing date using the Lua standard library.
- Description: Normalize and timestamp
  Script: |
    local desc = dataset:Get('StudyDescription') or ''
    dataset:Set('StudyDescription', string.upper(desc))
    dataset:Set('ContentDate', os.date('%Y%m%d'))
    dataset:Set('ContentTime', os.date('%H%M%S'))

# Example 11: Queue-aware routing
# Only route to the AI server when the queue isn't backed up there.
# Uses the global queue API to check destination health before routing.
- Description: Route to AI if healthy
  Script: |
    local failed = queue:countByDestination('AI_SERVER', 'Failed')
    local pending = queue:countByDestination('AI_SERVER', 'New')
    if failed > 20 then
        print('AI_SERVER has ' .. failed .. ' failures, skipping')
    elseif pending > 100 then
        print('AI_SERVER backlog at ' .. pending .. ', skipping')
    else
        route:Add('AI_SERVER')
    end
  Conditions:
    - Tag: 0008,0060
      MatchExpression: CT

# Example 12: Study completeness check
# Use study.queue to detect partially processed studies and tag
# them for operator review.
- Description: Flag partial studies
  Script: |
    local total = study.queue:totalCount()
    local prepared = study.queue:countByState('Prepared')
    local failed = study.queue:countByState('Failed')
    if failed > 0 and prepared > 0 then
        -- Some images failed, some succeeded — flag for review
        dataset:Set('ImageComments',
            'PARTIAL_STUDY: ' .. failed .. ' of ' .. total .. ' failed')
    end
```
