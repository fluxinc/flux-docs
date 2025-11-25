# Mutate Filter

The mutate filter lets you apply mutations to incoming DICOM data. Mutations are defined in a `mutations.yml` file, and are applied to incoming DICOM data before it is sent to destinations. If this file is invalid, DICOM Capacitor will halt with an error. If this file is missing, the route filter will be disabled.

In order to enable the mutate filter, you must add the `mutate` filter to the `filters` section of your `config.yml` file.
```yaml
# config.yml
filters: mutate
```

## Mutate Components

Each mutation component is defined as follows:

- `Conditions`: (Optional) A list of conditions that must be met for this mutation to apply.
- `Actions`: (Required) A list of actions to take when this mutation applies.
- `Affects`: (Optional) A list of DICOM dataset contexts that this mutation affects. Defaults to `["storage"]` if not specified.
  - `storage`: Affects stored DICOM files
  - `worklist_query`: Affects worklist queries
  - `worklist_result`: Affects worklist results
  - `qr_find_query`: Affects query/retrieve find queries
  - `qr_find_result`: Affects query/retrieve find results

### Conditions

The `Conditions` field is an optional list of conditions that must be met for this mutation to apply.  Conditions are a shared concept between the `route` and `mutate` filters, and are described in their own [Conditions](./conditions) page.

### Actions

The `Actions` field is required and must be a list of one or more actions to take when each mutation applies.

Each action has the following fields:

- `Description`: (Optional) A human-readable description of the action that will appear in the logs.

- `Type`: (Optional) The type of action to perform. Defaults to `add_or_update` if not specified. Possible values are:

  - `add_or_update`: Adds new tags or updates existing ones based on pattern matching
  
  - `anonymize`: Anonymizes patient
  
  - `exclude_result`: Excludes the current dataset from processing
  
  - `query`: Performs a worklist query and merges results into the dataset
  
  - `remove`: Removes specified tags from the dataset
  
  - `stamp`: Adds visual stamps to image data

- `Source`: (Optional, `add_or_update` action only) Object containing source tag information:
  - `Tag`: DICOM tag to match
  - `Expression`: Regular expression pattern to match (defaults to `^(.+)$`)

- `Destination`: (Required for `add_or_update`, `remove` and `stamp` actions) Object containing destination tag information:
  - `Tag`: DICOM tag to modify
  - `Value`: New value to set (defaults to `$1`)

- `Node`: (Required for `query` type) The worklist node to query for additional data

- `Request`: (Required for `query` type) List of source/destination pairs defining query parameters:
  ```yaml
  Request:
    - Source:
        Tag: 0010,0020
      Destination:
        Tag: 0010,0020
  ```

- `Response`: (Required for `query` type) List of source/destination pairs defining result merging:
  ```yaml
  Response:
    - Source:
        Tag: 0032,1060
      Destination:
        Tag: 0008,1030
  ```

- `OnError`: (Optional - `add_or_update` and `query` actions only) Error handling behavior:
  - `skip_action`: Skip current action
  - `end_mutation`: Stop mutation chain
  - `retry`: Retry operation
  - `fail`: Fail processing

## How Mutations Work

The mutate filter applies transformations to DICOM datasets based on configurable rules. Understanding mutation behavior is essential for building effective data processing pipelines:

### Mutation Evaluation

- Mutations are evaluated against incoming data based on AeTitles and Conditions
- Only mutations that match will execute
- Mutations are applied in the order they appear in `mutations.yml`
- Each mutation that matches will execute all of its actions sequentially

### Action Execution

When a mutation matches, actions execute sequentially:

1. **Sequential processing** - Actions run in the order they appear in the Actions list
2. **OnError handling** - If an action encounters an error, the OnError setting determines what happens next:
   - `skip_action`: Skip this action and continue to the next action
   - `end_mutation`: Stop processing this mutation's remaining actions, but continue to the next mutation
   - `retry`: Retry the entire file processing later
   - `fail`: Fail the entire conversion

### Action Types

- **add_or_update**: Modifies or adds DICOM tags. Supports pattern matching with Source/Destination fields and special replacement values.
- **anonymize**: Anonymizes patient information using a mapping file to maintain consistent anonymous IDs.
- **exclude_result**: Excludes the current dataset from query/retrieve or worklist results (only valid with Affects field).
- **query**: Queries a worklist or other DICOM service and merges results into the current dataset.
- **remove**: Removes specified DICOM tags from the dataset.
- **stamp**: Adds visual stamps or overlays to image data.

### Pattern Matching

The `add_or_update` action supports regex pattern matching for sophisticated transformations:

- **Source.Expression**: Regular expression to match against the source tag value. Defaults to `^(.+)$`.
- **Destination.Value**: Replacement pattern using capture groups from Source.Expression (e.g., `$1`, `$2`).

Example: To suffix a value, use `Source.Expression: ^(.*)$` and `Destination.Value: $1_SUFFIX`

### Special Values

The `Destination.Value` field supports special replacement values:

- **:uid:**: Generates a new DICOM UID
- **:timestamp:**: Inserts the current Unix timestamp in milliseconds
- **:hash(tag,length):**: Generates a hash of the specified tag (e.g., `:hash(0010,0020,5):` for 5-character hash of Patient ID)

### Affects Context

The `Affects` field controls which DICOM operations the mutation applies to:

- **storage** (default): Applies to stored DICOM files
- **worklist_query**: Modifies outgoing worklist query requests
- **worklist_result**: Modifies incoming worklist query results
- **qr_find_query**: Modifies outgoing C-FIND query requests
- **qr_find_result**: Modifies incoming C-FIND query results

Note: Mutations affecting query contexts (worklist_query, qr_find_query, etc.) cannot use the `query` action type.

## Mutations Examples

The following example shows a complete `mutations.yml` file with various mutation scenarios:

```yaml
# mutations.yml

# Example 1: Change SOP Class UID using simple value replacement
- Description: Change SOP Class UID to CT Image Storage
  Conditions:
    - Tag: 0008,0016
      MatchExpression: ^1\.2\.840\.10008\.5\.1\.4\.1\.1\.2$
  Actions:
    - Type: add_or_update
      Destination:
        Tag: 0008,0016
        Value: 1.2.840.10008.5.1.4.1.1.2.1

# Example 2: Suffix SeriesNumber using pattern matching
- Description: Suffix SeriesNumber with 8 if ProtocolName ends with "id"
  Conditions:
    - Tag: 0018,1030
      MatchExpression: ^.*[A-Z]id.*$
  Actions:
    - Description: Suffix SeriesNumber with 8
      Type: add_or_update
      Source:
        Tag: 0020,0011
        Expression: ^(.*)$
      Destination:
        Tag: 0020,0011
        Value: $18

# Example 3: Remove PatientName tag
- Description: Remove patient name from dataset
  Conditions:
    - Tag: 0010,0010
      MatchExpression: ^.+$
  Actions:
    - Type: remove
      Destination:
        Tag: 0010,0010

# Example 4: Anonymize patient data with mapping file
- Description: Anonymize patient information
  Actions:
    - Type: anonymize
      Destination:
        Value: /var/lib/dicom-capacitor/mappings.csv

# Example 5: Generate new UID for SeriesInstanceUID
- Description: Replace SeriesInstanceUID with generated UID
  Actions:
    - Type: add_or_update
      Destination:
        Tag: 0020,000E
        Value: ":uid:"

# Example 6: Add timestamp to PatientID
- Description: Append timestamp to Patient ID
  Actions:
    - Type: add_or_update
      Source:
        Tag: 0010,0020
        Expression: ^(.*)$
      Destination:
        Tag: 0010,0020
        Value: $1_:timestamp:

# Example 7: Query worklist and merge results
- Description: Enrich dataset with worklist information
  Actions:
    - Type: query
      Node: WORKLIST_SCP
      Request:
        - Source:
            Tag: 0010,0020  # Patient ID
          Destination:
            Tag: 0010,0020
      Response:
        - Source:
            Tag: 0032,1060  # Requested Procedure Description
          Destination:
            Tag: 0008,1030  # Study Description
      OnError: skip_action

# Example 8: Exclude specific study results from query/retrieve
- Description: Exclude specific accession number from QR results
  Affects:
    - qr_find_result
  Conditions:
    - Tag: 0008,0050  # Accession Number
      MatchExpression: ^12345$
  Actions:
    - Type: exclude_result

# Example 9: Mutation with error handling
- Description: Update study description with retry on error
  Actions:
    - Type: add_or_update
      Source:
        Tag: 0008,1030
        Expression: ^(.*)$
      Destination:
        Tag: 0008,1030
        Value: $1 [PROCESSED]
      OnError: retry

# Example 10: Add Scheduled Procedure Step to worklist queries
- Description: Add SPS sequence to worklist queries
  Affects:
    - worklist_query
  Actions:
    - Type: add_or_update
      Destination:
        Tag: 0040,0009  # Scheduled Procedure Step ID
        Value: "SPS001"
    - Type: add_or_update
      Destination:
        Tag: 0040,0001  # Scheduled Station AE Title
        Value: "CT1"
```