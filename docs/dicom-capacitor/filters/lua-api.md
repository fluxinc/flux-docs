# Lua API Reference

All globals available to Lua scripts, organized by object. For context and usage, see [Lua Filter](./lua).

## Availability

| Global | Storage | Query request | Query result |
|--------|:-------:|:-------------:|:------------:|
| `dataset` | ✓ | ✓ | ✓ |
| `route` | ✓ | — | — |
| `file` | ✓ | — | — |
| `study` | ✓ | — | — |
| `series` | ✓ | — | — |
| `query` | — | ✓ | ✓ |
| `session` | — | ✓ | ✓ |
| `request` | — | — | ✓ |
| `response` | — | — | ✓ |
| `queue` | ✓ | ✓ | ✓ |
| `node` | ✓ | ✓ | ✓ |
| `log` | ✓ | ✓ | ✓ |
| `print` | ✓ | ✓ | ✓ |
| `uid` | ✓ | ✓ | ✓ |
| `include` | ✓ | ✓ | ✓ |

---

## dataset

The mutable dataset for the current image, request, or result row. Every mutating call is audit-logged.

| Method | Returns | Notes |
|--------|---------|-------|
| `dataset:Get(path)` | `string` or `nil` | Returns the tag value, or `nil` if absent |
| `dataset:Set(path, value)` | — | Creates the tag (and any missing sequence items) if absent |
| `dataset:Remove(path)` | — | Removes a tag, a sequence item, or a whole sequence. Silent no-op if absent. |
| `dataset:Count(path)` | `number` | Number of items in a sequence, or `0` |
| `dataset:Populate(table)` | — | Bulk-write from a Lua table. See [Path syntax](#path-syntax). |
| `dataset:PopulateAt(path, table)` | — | Bulk-write into a specific path or selected sequence item |

### Path syntax

All path arguments follow the same syntax:

- Plain keyword or hex: `PatientName`, `0010,0010`, `00100010`
- Sequence index (1-based): `ScheduledProcedureStepSequence[1].Modality`
- Selector: `RequestAttributesSequence[ScheduledProcedureStepID='STEP1'].CodeValue` — matches the first item where the tag equals the value. If multiple items match, only the first is used.
- `Set()` and `Populate()` auto-create missing sequences and items
- A selector on a `Set()` or `PopulateAt()` creates the item if none matches and seeds the selector tag
- `Remove('Sequence[n]')` removes the item; `Remove('Sequence[n].Tag')` removes only the child tag

The same path syntax applies to `request:Get()` and `request:Count()`.

---

## request

Read-only view of the effective request dataset. Available in result hooks only.

| Method | Returns | Notes |
|--------|---------|-------|
| `request:Get(path)` | `string` or `nil` | |
| `request:Count(path)` | `number` | |

No mutating methods — `Set`, `Remove`, and `Populate` are not available.

---

## route

Controls where images are sent. Storage context only. Destinations must be defined in `nodes.yml` with `NodeRole: Storage`.

| Method | Notes |
|--------|-------|
| `route:Add(destination)` | Queue a copy to `destination` |
| `route:Add(destination, function(ds) ... end)` | Queue a copy with per-destination mutations. `ds` is an `AuditedDatasetProxy` for the clone. |
| `route:Drop()` | Mark the original for deletion after all entries complete |

Calling `route:Add()` twice with the same destination replaces the previous lambda. Lambdas run after all `lua.yml` entries have completed, against a clone of the final dataset. If any lambda throws, no output files are written.

---

## file

Read-only metadata about the current image. Storage context only.

| Property | Type | Notes |
|----------|------|-------|
| `file.sourceAeTitle` | `string` | AE title of the system that sent this image |
| `file.destinationAeTitle` | `string` | AE title of the destination being prepared |

---

## query

Read-only metadata about the proxied C-FIND session. Query hooks only.

| Property | Type | Notes |
|----------|------|-------|
| `query.kind` | `string` | `"worklist"` or `"qr"` |
| `query.phase` | `string` | `"request"` or `"result"` |
| `query.callingAeTitle` | `string` | AE title of the calling SCU |
| `query.calledAeTitle` | `string` | Raw called AE title from the association |
| `query.nodeAeTitle` | `string` | Resolved Capacitor node AE title. Used for `AeTitles` matching. |
| `query.level` | `string` | Query level (`"STUDY"`, `"PATIENT"`, etc.) or `""` for worklist |

---

## response

Result row control. Result hooks only.

| Method | Notes |
|--------|-------|
| `response:drop()` | Suppress this result row. Only an explicit `drop()` removes a row — script errors do not. |

---

## session

Key-value state shared across the entire proxied query (request phase and all result rows). Query hooks only. Not persisted to disk.

```lua
session.key = value   -- store
local v = session.key -- read
session.key = nil     -- delete
```

Values are coerced to .NET-native types on storage. Storing a Lua function throws an error.

---

## study

Key-value state scoped to the current image's `StudyInstanceUID`. Storage context only. Evicted after 24 hours of inactivity. Lost on service restart.

```lua
study.key = value
local v = study.key
```

`study.queue` is a [`StudyQueueApi`](#studyqueue) instance pre-bound to the current StudyInstanceUID.

---

## series

Key-value state scoped to the current image's `SeriesInstanceUID`. Storage context only. Same TTL and persistence rules as `study`.

```lua
series.key = value
local v = series.key
```

---

## queue

Read-only access to the in-memory processing queue. Available in all contexts.

### Count methods

| Method | Returns | Notes |
|--------|---------|-------|
| `queue:total()` | `number` | Total items in the queue |
| `queue:count(state)` | `number` | Items in a given state |
| `queue:countByStudy(studyUID)` | `number` | Items belonging to a study |
| `queue:countByStudy(studyUID, state)` | `number` | Items in a study with a given state |
| `queue:countByDestination(aeTitle)` | `number` | Items destined for an AE title |
| `queue:countByDestination(aeTitle, state)` | `number` | Items destined for an AE title in a given state |

Valid state strings: `"New"`, `"Prepared"`, `"Failed"`, `"Rejected"`, `"Expired"`.

### Find methods

| Method | Returns |
|--------|---------|
| `queue:findByStudy(studyUID)` | [`QueueItemList`](#queueitemlist) |
| `queue:findByState(state)` | [`QueueItemList`](#queueitemlist) |
| `queue:findByDestination(aeTitle)` | [`QueueItemList`](#queueitemlist) |
| `queue:findByDestination(aeTitle, state)` | [`QueueItemList`](#queueitemlist) |

---

## study.queue

Same query methods as `queue`, automatically scoped to the current image's `StudyInstanceUID`. Storage context only. `nil` if the image has no `StudyInstanceUID`.

| Method | Returns |
|--------|---------|
| `study.queue:totalCount()` | `number` |
| `study.queue:countByState(state)` | `number` |
| `study.queue:items()` | [`QueueItemList`](#queueitemlist) |
| `study.queue:itemsByState(state)` | [`QueueItemList`](#queueitemlist) |
| `study.queue:destinations()` | `string[]` — distinct destination AE titles |
| `study.queue:modalities()` | `string[]` — distinct modalities |

`destinations()` and `modalities()` return .NET string arrays. Iterate with a numeric `for` loop using `.Length` (0-based) or treat as a Lua table with integer keys starting at 1 depending on how NLua exposes them — prefer `items()` and reading `.destinationAeTitle` / `.modality` from each item for portability.

---

## QueueItemList

Returned by `queue:find*()` and `study.queue:items*()` methods.

| Method | Returns | Notes |
|--------|---------|-------|
| `list:count()` | `number` | Total items |
| `list:get(i)` | [`QueueItemResult`](#queueitemresult) or `nil` | 1-based index |

```lua
local items = queue:findByState('Failed')
for i = 1, items:count() do
    local item = items:get(i)
    print(item.destinationAeTitle, item.lastError)
end
```

---

## QueueItemResult

Returned by `QueueItemList:get(i)`. All fields are read-only strings or numbers.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `number` | Internal record ID |
| `state` | `string` | `"New"`, `"Prepared"`, `"Failed"`, `"Rejected"`, or `"Expired"` |
| `sourceAeTitle` | `string` | |
| `destinationAeTitle` | `string` | |
| `studyInstanceUID` | `string` | |
| `seriesInstanceUID` | `string` | |
| `sopInstanceUID` | `string` | |
| `sopClassUID` | `string` | |
| `modality` | `string` | |
| `patientID` | `string` | |
| `patientName` | `string` | |
| `accessionNumber` | `string` | |
| `attemptCount` | `number` | |
| `lastError` | `string` | Last error message, or `nil` |
| `format` | `string` | `"dcm"`, `"json"`, or `"yml"` |
| `pendingState` | `string` | Deferred state change, or `nil` |
| `createdAt` | `string` | ISO 8601 |
| `updatedAt` | `string` | ISO 8601 |

---

## node

Node health and delivery statistics. Available in all contexts.

### node:stats(aeTitle)

Returns a delivery statistics snapshot for the named node as a Lua table.

| Field | Type | Notes |
|-------|------|-------|
| `success` | `number` | Total successful deliveries |
| `failed` | `number` | Total failures |
| `timedOut` | `number` | Total timeouts |
| `recentSuccess` | `number` | Successes in the recent window |
| `recentFailed` | `number` | Failures in the recent window |
| `recentTimedOut` | `number` | Timeouts in the recent window |
| `recentWindowMinutes` | `number` | Size of the recent window in minutes |
| `avgTransferMs` | `number` | Average transfer time in milliseconds |
| `lastSuccessAt` | `string` | ISO 8601, present only if a success has been recorded |
| `lastFailure` | table | Present only if a failure has been recorded. Fields: `at` (ISO 8601), `error` (string) |
| `lastEcho` | table | Present only if an echo has been performed. Fields: `success` (bool), `latencyMs` (number), `at` (ISO 8601) |

### node:echo(aeTitle)

Sends a C-ECHO to the named node and returns the result. Results are cached for 60 seconds. Blocks the Lua script while the echo is in flight.

| Field | Type | Notes |
|-------|------|-------|
| `success` | `boolean` | Whether the echo succeeded |
| `latencyMs` | `number` | Round-trip time in milliseconds |
| `message` | `string` | `"cached"` for a cached result, or an error message on failure |

```lua
local result = node:echo('ARCHIVE')
if not result.success then
    log:warn('ARCHIVE unreachable:', result.message)
    error('fail: destination unreachable')
end
```

---

## log

Writes to the common application log (visible on the Logs page). All contexts.

| Method | Notes |
|--------|-------|
| `log:info(...)` | Informational |
| `log:warn(...)` | Warning |
| `log:error(...)` | Error |
| `log:debug(...)` | Debug — only visible at debug log level |

Arguments are coerced to strings and joined with tabs. All messages are prefixed with `[lua]`.

---

## print

Global function. Writes to the per-item or per-query-session log only — not the common application log. Arguments are coerced to strings and joined with tabs.

```lua
print('value:', dataset:Get('PatientName'))
```

---

## uid

Global function. Generates a new globally unique DICOM UID.

```lua
local newUID = uid()  -- e.g. "2.25.123456789..."
```

---

## include

Global function. Loads and executes a `.lua` file from the config directory. Each file is loaded at most once per image or query session (deduplicated by canonical path).

```lua
include('libs/phi.lua')   -- loads config-dir/libs/phi.lua
```

Constraints: path must be relative, must end in `.lua`, must not contain `..`, and must not escape the config directory.
