# Sort Filter

The sort filter lets you control DICOM instance ordering within series based on configurable sort criteria. Sorts are defined in a `sortings.yml` file and are applied to incoming DICOM data before it is sent to destinations. If this file is invalid, DICOM Capacitor will halt with an error. If this file is missing, the sort filter will be disabled.

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

The sort filter operates on batches of DICOM instances that belong to the same series. When multiple sort actions are defined, each action is applied **sequentially** to the entire list. The last action determines the final sort order.

For example, if you define two actions — sort by Acquisition Number, then sort by Instance Number — the final order will be sorted by Instance Number (the last action applied).

**Important notes:**
- Sorting only applies when the filter matches the incoming data (based on AeTitles and Conditions)
- If a DICOM tag specified in SortTag is missing from an instance, that instance is placed **at the end** of the sorted list, regardless of sort direction
- String sorting is case-sensitive and uses lexicographic ordering
- Integer sorting parses the tag value as a number. If parsing fails (e.g., a non-numeric value), the value is treated as `0`
- `SortType` and `SortDirection` values must be lowercase (`integer`, `string`, `asc`, `desc`)

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

# Example 4: Sequential sorting
# Each action re-sorts the entire list. The last action determines the final order.
# Here the final order is by Instance Number ascending.
- AeTitles:
    - MR_SCANNER
  Actions:
    - Description: Sort by acquisition (applied first, then overridden)
      Type: sort
      SortTag: 0020,0012
      SortType: integer
      SortDirection: asc
    - Description: Final sort by instance number
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

# Example 7: Single sort for 4D datasets
# Since each action re-sorts the entire list, use the most important sort key.
# For 4D datasets, Instance Number typically provides the correct ordering.
- Actions:
    - Description: Sort by instance number
      Type: sort
      SortTag: 0020,0013
      SortType: integer
      SortDirection: asc
```
