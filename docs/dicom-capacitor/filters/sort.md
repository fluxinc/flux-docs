# Sort Filter

The sort filter lets you control DICOM instance ordering within series based on configurable sort criteria. Sorts are defined in a `sortings.yml` file and are applied to incoming DICOM data before it is sent to destinations. 

In order to enable the sort filter, you must add the `sort` filter to the `filters` section of your `config.yml` file.

```yaml
# config.yml
filters: sort
```

## Sort Components

Each sort component is defined as follows:

- `AeTitles`: (Optional) A list of destination AE titles to which this sort applies. If not provided, the sort applies to all AE titles.
- `Conditions`: (Optional) A list of conditions that must be met for this sort to apply.
- `Actions`: (Required) A list of actions to take when this sort applies.

### AeTitles

The `AeTitles` field is an optional list of AE titles that this sort applies to.

- If this field is not provided, the sort will apply to all AE titles.
- If this field is provided, the sort will only apply to AE titles that match one of the provided values.

### Conditions

The `Conditions` field is an optional list of conditions that must be met for this sort to apply. If this field is not provided, the sort will apply to all incoming DICOM data (provided that the `AeTitles` field is either not present, or is present and matches the incoming DICOM data).

Conditions are a shared concept between the `route`, `mutate`, and `sort` filters, and are described in their own [Conditions](./conditions) page.

### Actions

The `Actions` field is required and must be a list of one or more actions to take when each sort applies.

Each action has the following fields:

- `Description`: (Optional) A human-readable description of the action that will appear in the logs.
- `Type`: (Optional) The type of action to perform. Defaults to `sort` if not specified.
- `SortTag`: (Required) The DICOM tag to sort by.
- `SortType`: (Required) The type of data to sort. Must be either `integer` or `string`.
- `SortDirection`: (Required) The direction to sort. Must be either `asc` or `desc`.

## How Sorting Works

The sort filter operates on batches of DICOM instances that belong to the same series. When multiple sort actions are defined:

1. The **first action** is the primary sort key
2. The **second action** (if present) acts as a tie-breaker when the first sort values are equal
3. **Additional actions** continue this pattern, refining the sort order

For example, sorting first by Acquisition Number (0020,0012) and then by Instance Number (0020,0013) will group instances by acquisition, then order them by instance number within each acquisition.

**Important notes:**
- Sorting only applies when the filter matches the incoming data (based on AeTitles and Conditions)
- If a DICOM tag specified in SortTag is missing from an instance, that instance will be placed according to the sort implementation's handling of null values
- String sorting is case-sensitive and uses lexicographic ordering
- Integer sorting parses the tag value as a number

## Sorting Examples

The following example shows a complete `sortings.yml` file with various sorting scenarios:

```yaml
# sortings.yml

# Example 1: Basic ascending numeric sort by Series Number
- AeTitles:
    - PACS_1
  Actions:
    - Description: Sort by SeriesNumber ascending
      Type: sort
      SortTag: 0020,0011
      SortType: integer
      SortDirection: asc

# Example 2: Descending sort by Acquisition Number
- AeTitles:
    - CT_SCANNER
  Actions:
    - Description: Sort by AcquisitionNumber descending
      Type: sort
      SortTag: 0020,0012
      SortType: integer
      SortDirection: desc

# Example 3: String-based sort by Patient Name
- Actions:
    - Description: Sort by PatientName alphabetically
      Type: sort
      SortTag: 0010,0010
      SortType: string
      SortDirection: asc

# Example 4: Multi-level sorting (primary + tie-breaker)
# Sort by Acquisition Number first, then by Instance Number within each acquisition
- AeTitles:
    - MR_SCANNER
  Actions:
    - Description: Primary sort by acquisition
      Type: sort
      SortTag: 0020,0012
      SortType: integer
      SortDirection: asc
    - Description: Secondary sort by instance
      Type: sort
      SortTag: 0020,0013
      SortType: integer
      SortDirection: asc

# Example 5: Conditional sorting for CT images only
# Only sort instances that match specific SOP Class UID
- Conditions:
    - Tag: 0008,0016
      MatchExpression: ^1\.2\.840\.10008\.5\.1\.4\.1\.1\.2$
  Actions:
    - Description: Sort CT images by SliceLocation
      Type: sort
      SortTag: 0020,1041
      SortType: string
      SortDirection: asc

# Example 6: Sort by temporal position
- AeTitles:
    - CARDIAC_MR
  Conditions:
    - Tag: 0008,0008
      MatchExpression: ^.*CARDIAC.*$
  Actions:
    - Description: Sort by TemporalPositionIdentifier
      Type: sort
      SortTag: 0020,0100
      SortType: integer
      SortDirection: asc

# Example 7: Three-level sort for complex 4D datasets
- Actions:
    - Description: Sort by series
      Type: sort
      SortTag: 0020,0011
      SortType: integer
      SortDirection: asc
    - Description: Then by temporal position
      Type: sort
      SortTag: 0020,0100
      SortType: integer
      SortDirection: asc
    - Description: Finally by instance number
      Type: sort
      SortTag: 0020,0013
      SortType: integer
      SortDirection: asc
```
