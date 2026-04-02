# Lua Examples

Complete `lua.yml` snippets and multi-file setups for common scenarios. For API reference, see [Lua Filter](./lua).

## Storage Examples

### Anonymize all images

Strip patient information from every image that passes through.

```yaml
- Description: Strip PHI
  Script: |
    dataset:Set('PatientName', 'ANONYMOUS')
    dataset:Set('PatientID', '00000')
    dataset:Remove('PatientBirthDate')
    dataset:Remove('PatientAddress')
    dataset:Remove('ReferringPhysicianName')
```

### Route CT images to an AI server

Use conditions to match modality, then add a routing destination.

```yaml
- Description: Route CT to AI
  Script: |
    route:Add('AI_SERVER')
  Conditions:
    - Tag: 0008,0060
      MatchExpression: CT
```

### Fan-out with per-destination anonymization

Send mammography to multiple destinations with different PHI policies. The original goes to `MAMMO_PACS` unmodified. The AI vendor gets an anonymized copy. The teaching archive gets fully de-identified data with new UIDs.

```yaml
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
```

### Drop and reroute

Redirect vascular ultrasound to a specialized PACS. The original destination is dropped so only the rerouted copy is sent.

```yaml
- Description: Redirect vascular US
  Script: |
    route:Add('VASCULAR_PACS')
    route:Drop()
  Conditions:
    - Tag: 0008,0060
      MatchExpression: US
    - Tag: 0008,1030
      MatchExpression: '*VASCULAR*'
```

### Enrich images based on source scanner

Tag images with the originating scanner so downstream systems can identify where the study was acquired.

```yaml
- Description: Tag by source scanner
  Script: |
    local sources = {
        CT_SCANNER_1 = 'CT Room 1 - Main Building',
        CT_SCANNER_2 = 'CT Room 2 - Emergency',
        MR_SCANNER   = 'MRI Suite A',
    }
    local label = sources[file.sourceAeTitle]
    if label then
        dataset:Set('StationName', label)
    end
```

### Study-level image counting with conditional routing

Count images per study and route large studies to a dedicated archive. Uses scoped state to track counts across images.

```yaml
- Description: Route large studies
  Script: |
    study.image_count = (study.image_count or 0) + 1
    if study.image_count > 500 then
        route:Add('LARGE_STUDY_ARCHIVE')
    end
```

### Shared library for reusable anonymization

Factor common logic into a library file and call it from multiple entries. `include()` loads each file at most once per image.

```yaml
- Description: Anonymize for research
  Script: |
    include('libs/phi.lua')
    route:Add('RESEARCH_ARCHIVE', function(ds)
        strip_phi(ds)
        ds:Set('PatientID', uid())
    end)
```

### Destination-specific enrichment

Only runs when preparing images for `AI_SERVER`. Adds institutional metadata the AI vendor requires.

```yaml
- Description: Enrich for AI server
  Script: |
    dataset:Set('InstitutionName', 'GENERAL HOSPITAL')
    dataset:Set('InstitutionalDepartmentName', 'RADIOLOGY')
  AeTitles:
    - AI_SERVER
```

### Validate required tags

Validate that required tags are present before sending to an external system. `OnError: fail` ensures the image is held rather than sent incomplete.

```yaml
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
```

### Timestamp injection and string normalization

Normalize study descriptions to uppercase and stamp images with the processing date.

```yaml
- Description: Normalize and timestamp
  Script: |
    local desc = dataset:Get('StudyDescription') or ''
    dataset:Set('StudyDescription', string.upper(desc))
    dataset:Set('ContentDate', os.date('%Y%m%d'))
    dataset:Set('ContentTime', os.date('%H%M%S'))
```

### Queue-aware routing

Only route to the AI server when it isn't backed up. Checks destination health before routing.

```yaml
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
```

### Flag partial studies

Use `study.queue` to detect partially processed studies and tag them for operator review.

```yaml
- Description: Flag partial studies
  Script: |
    local total = study.queue:totalCount()
    local failed = study.queue:countByState('Failed')
    local prepared = study.queue:countByState('Prepared')
    if failed > 0 and prepared > 0 then
        dataset:Set('ImageComments',
            'PARTIAL_STUDY: ' .. failed .. ' of ' .. total .. ' failed')
    end
```

## Query Examples

### Worklist: broaden the query upstream, filter results

Stash the requested station in `session`, widen the upstream request, then suppress results that don't match.

```yaml
- Affects: [worklist_query]
  Description: Broaden worklist query
  Script: |
    session.requestedStation = dataset:Get('ScheduledProcedureStepSequence[1].ScheduledStationAETitle')
    dataset:Set('ScheduledProcedureStepSequence[1].ScheduledStationAETitle', 'WL_PROXY')

- Affects: [worklist_result]
  Description: Filter worklist results
  Script: |
    local resultStation = dataset:Get('ScheduledProcedureStepSequence[1].ScheduledStationAETitle')
    if resultStation ~= session.requestedStation then
        response:drop()
    end
```

### Worklist: suppress cancelled or hidden orders

```yaml
- Affects: [worklist_result]
  Description: Drop cancelled and hidden orders
  Script: |
    local accession = dataset:Get('AccessionNumber') or ''
    if accession == 'CANCELLED' or accession:sub(1, 4) == 'HID_' then
        response:drop()
    end
```

### QR: suppress results from a specific institution

```yaml
- Affects: [qr_find_result]
  Description: Hide results from restricted site
  Script: |
    if dataset:Get('InstitutionName') == 'RESTRICTED_SITE' then
        response:drop()
    end
```

### QR: deduplicate results by accession using session

Suppress duplicate study results when the same accession number has already appeared in this query.

```yaml
- Affects: [qr_find_result]
  Description: Deduplicate by accession
  Script: |
    local acc = dataset:Get('AccessionNumber')
    if acc and acc ~= '' then
        if session['seen_' .. acc] then
            response:drop()
        else
            session['seen_' .. acc] = true
        end
    end
```

### QR: enrich results with a computed field

```yaml
- Affects: [qr_find_result]
  Description: Tag result source
  Script: |
    dataset:Set('InstitutionName', query.nodeAeTitle .. '_PROXY')
```

## Multi-File Project Examples

### Queue-Aware Routing with Shared Libraries

Uses a shared PHI library, a station label library, and an external routing script that checks queue health.

**File layout:**

```
config-dir/
├── config.yml
├── nodes.yml
├── lua.yml
├── libs/
│   ├── phi.lua
│   └── station-labels.lua
└── scripts/
    └── route-smart.lua
```

```yaml
# lua.yml

- Description: Anonymize for viewer
  Script: |
    include('libs/phi.lua')
    strip_phi(dataset)
    dataset:Set('PatientID', uid())
  AeTitles:
    - VIEWER_TEST

- Description: Smart CT routing
  Script: scripts/route-smart.lua
  Conditions:
    - Tag: 0008,0060
      MatchExpression: CT
```

```lua
-- libs/phi.lua
function strip_phi(ds)
    ds:Set('PatientName', 'ANONYMOUS')
    ds:Set('PatientID', '00000')
    ds:Remove('PatientBirthDate')
    ds:Remove('PatientAddress')
    ds:Remove('ReferringPhysicianName')
    ds:Remove('InstitutionName')
    ds:Remove('InstitutionAddress')
end
```

```lua
-- libs/station-labels.lua
STATION_LABELS = {
    CT_SCANNER_1 = 'CT Room 1 - Main Building',
    CT_SCANNER_2 = 'CT Room 2 - Emergency',
    MR_SCANNER   = 'MRI Suite A',
    US_SCANNER   = 'Ultrasound Bay 3',
}

function label_station(ds)
    local label = STATION_LABELS[file.sourceAeTitle]
    if label then
        ds:Set('StationName', label)
    end
end
```

```lua
-- scripts/route-smart.lua
include('libs/station-labels.lua')
label_station(dataset)

local failed = queue:countByDestination('ARCHIVE', 'Failed')
local backlog = queue:countByDestination('ARCHIVE', 'New')

if failed > 50 then
    log:warn('ARCHIVE has', failed, 'failures — holding')
    error('retry: destination has too many failures')
elseif backlog > 200 then
    log:warn('ARCHIVE backlog at', backlog, '— routing with warning')
    dataset:Set('ImageComments', 'ROUTED_UNDER_BACKLOG:' .. backlog)
end

route:Add('ARCHIVE')

local total = study.queue:totalCount()
local studyFailed = study.queue:countByState('Failed')
if studyFailed > 0 then
    log:warn('Study has', studyFailed, 'of', total, 'items failed')
    dataset:Set('ImageComments',
        'PARTIAL_STUDY: ' .. studyFailed .. '/' .. total .. ' failed')
end
```

### Fan-Out with De-Identification

Route mammography to three destinations: clinical PACS unmodified, research with basic anonymization, cloud AI with full de-identification and new UIDs.

```yaml
# lua.yml
- Description: Distribute mammography
  Script: |
    include('libs/phi.lua')

    route:Add('RESEARCH', function(ds)
        strip_phi(ds)
        ds:Set('PatientID', uid())
    end)

    route:Add('CLOUD_AI', function(ds)
        strip_phi(ds)
        ds:Set('PatientName', 'DEIDENTIFIED')
        ds:Set('PatientID', uid())
        ds:Set('StudyInstanceUID', uid())
        ds:Set('SeriesInstanceUID', uid())
        ds:Set('SOPInstanceUID', uid())
    end)

    log:info('Mammography fan-out:',
        file.sourceAeTitle, '->', file.destinationAeTitle,
        '+ RESEARCH + CLOUD_AI')
  Conditions:
    - Tag: 0008,0060
      MatchExpression: MG
```
