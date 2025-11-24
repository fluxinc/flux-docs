# Route Filter

The route filter lets you route incoming DICOM data to different destinations (or disk) based on configurable criteria.

In order to enable the route filter, you must add the `route` filter to the `filters` section of your `config.yml` file.

```yaml
# config.yml

filters:
  - route
```

or, simply:

```yaml
# config.yml
filters: route
```

Once enabled, the route filter will use the `routings.yml` file to determine which destinations to route incoming DICOM data to. If this file is invalid, DICOM Capacitor will halt with an error. If this file is missing, the route filter will be disabled.

## Route Components

Each route component is defined as follows:

- `AeTitles`: (Optional) A list of destination AE titles to which this route applies.
- `Conditions`: (Optional) A list of conditions that must be met for this route to apply.
- `Actions`: (Required) A list of actions to take when this route applies.

### AeTitles

The `AeTitles` field is an optional list of AE titles that this route applies to.

- If this field is not provided, the route will apply to all AE titles.
- If this field is provided, the route will only apply to AE titles that match one of the provided values.

### Conditions

The `Conditions` field is an optional list of conditions that must be met for this route to apply. If this field is not provided, the route will apply to all incoming DICOM data (provided that the `AeTitles` field is either not present, or is present and matches the incoming DICOM data).

Conditions are a shared concept between the `route` and `mutate` filters, and are described in their own [Conditions](./conditions) page.

### Actions

The `Actions` field is required and must be a list of one or more actions to take when this route applies.

Each action has the following fields:

- `Type`: (Optional) The type of action to perform. Defaults to `add_destination` if not specified.
  - `add_destination`: Sends the incoming DICOM data to a specified DICOM destination.
  - `save_file`: Saves the incoming DICOM data to a file on disk.
  - `drop`: Drops the incoming DICOM data.
- `Description`: (Optional) A human-readable description of the action.
- `RemoveOriginal`: (Optional) Used in `add_destination` and `save_file` action types. If `true`, the original file is removed from the source. Defaults to `false`. *Note: `drop` actions always remove the original file regardless of this setting.*
- `Log`: (Optional) Controls the logging level for this action.
  - `info`: Logs at the INFO level.
  - `debug`: Logs at the DEBUG level (default).
- `Target`: (Required for the `add_destination` and `save_file` actions) The AE title to which the incoming DICOM data should be sent, or the path to which the dataset should be saved.

For example, the following action will save the incoming DICOM data to disk, replacing the `#{8,50}` placeholder with the incoming DICOM data's Accession Number (0008,0050) attribute:

```yaml
- Description: Save incoming DICOM data to disk
  Type: save_file
  Target: /path/to/incoming/#{8,50}/
  RemoveOriginal: false
```

The `RemoveOriginal` field is optional and defaults to `false` (we include it here for clarity). We frequently use this pattern to "stash" incoming DICOM data for additional testing or analysis.

## Routing Examples

The following example shows a complete `routings.yml` file with various routing scenarios:

```yaml
# routings.yml

# Example 1: Drop all Dose SR instances
- Conditions:
    - Tag: 0002,0002
      MatchExpression: ^1\.2\.840\.10008\.5\.1\.4\.1\.1\.88\.67$
  Actions:
    - Description: Drop dose SR
      Type: drop

# Example 2: Stash all SC instances to disk
- Conditions:
    - Tag: 8,60
      MatchExpression: ^SC$
  Actions:
    - Description: Save SC to disk
      Type: save_file
      Target: "C:/dicom/#{8,50}/#{8,18}.dcm"

# Example 3: Route URGENT instances from PACS_1 to MRPACS
- AeTitles:
    - PACS_1
  Conditions:
    - Tag: 10,4000
      MatchExpression: ^.*URGENT.*$
  Actions:
    - Description: Send to PACS_2
      Type: add_destination
      Target: MRPACS
      RemoveOriginal: true

# Example 4: Save incoming data using complex directory structure
# This creates paths like: c:/dicom/PAT123456/20240501_Contrast_CT_ACC9401202/1_First_Series/CT_1.dcm
- Actions:
    - Description: Save to disk
      Type: save_file
      Target: "C:/dicom/#{10,20}/#{8,20}_#{8,1030}_#{8,50}/#{20,11}_#{8,103e}/#{8,60}_#{20,13}.dcm"

# Example 5: Match multiple conditions and send to multiple destinations
# Setting RemoveOriginal to true on any action will remove the original file
# after ALL actions complete. Both destinations are added before removal occurs.
- AeTitles:
    - PACS
  Conditions:
    - Tag: 0002,0002
      MatchExpression: ^1\.2\.840\.10008\.5\.1\.4\.1\.1\.88\.67$
    - Tag: 0008,0050
      MatchExpression: ^CT$
  Actions:
    - Description: Send to PACS_1
      Type: add_destination
      Target: PACS_1
      RemoveOriginal: false
    - Description: Send to PACS_2
      Type: add_destination
      Target: PACS_2
      RemoveOriginal: true

# Example 6: Debug logging for troubleshooting
# Use Log: info to enable verbose logging for specific routes
- Conditions:
    - Tag: 0008,0060
      MatchExpression: ^OT$
  Actions:
    - Description: Drop OT instances with logging
      Type: drop
      Log: info
```
