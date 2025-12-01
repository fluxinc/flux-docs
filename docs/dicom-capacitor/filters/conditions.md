# Conditions

Conditions are used to determine whether a filter should apply to incoming DICOM data.  Conditions are a shared concept between the [Route](./route), [Mutate](./mutate), and [Sort](./sort) filters.

They will typically appear in the `Conditions` list of a filter definition, and will look like this:

```yaml
- Conditions:
  - Tag: 0008,0060
    MatchExpression: ^CT$
  Actions:
  - Type: add_or_update
    # etc...
```

## Tag

The `Tag` field specifies the DICOM tag to match. This field is required.

**Note:** For backwards compatibility, the legacy field name `MatchTag` is also supported and behaves identically to `Tag`. New configurations should use `Tag`.

## MatchExpression

The `MatchExpression` field is the DICOM match expression to match.  Expressions can be specified either as a string or as a regular expression.  When specifying regular expressions, remember to escape any special characters.

## Log

The `Log` field is optional and controls the logging level when a condition is evaluated.
- `info`: Logs at the INFO level.
- `debug`: Logs at the DEBUG level (default).

## Search

The `Search` field is optional and determines whether to perform a deep search for the tag within the dataset (including inside sequences).
- `true`: Searches the entire dataset recursively for the tag.
- `false`: Only checks the top-level dataset (default).

### Expression Pattern Rules

DICOM Capacitor evaluates pattern expressions in the following order of precedence:

1. **Literal patterns** - Plain text without special characters
2. **Numeric patterns with dots** - Automatically escaped (e.g., UIDs)
3. **Regular expressions** - Patterns starting with `^` or containing regex special characters
4. **Wildcard patterns** - Patterns using `*` or `?` for simple matching

The first matching rule determines how the pattern is interpreted:

#### Literal Patterns

- Plain text without any special characters will be matched exactly
- Numbers and dots (e.g. "1.2.3") are treated as literal patterns and dots are escaped automatically
- Example: "CHEST" will only match "CHEST"

#### Wildcard Patterns

- Use `*` to match zero or more characters
- Use `?` to match exactly one character
- Examples:
  - "CHEST*" matches "CHEST", "CHEST_PA", "CHEST_LATERAL" etc.
  - "CHEST?" matches "CHEST1", "CHEST2" but not "CHEST" or "CHEST_PA"

#### Regular Expressions

- Patterns starting with `^` are treated as full regular expressions
- Patterns containing regex special characters (`[](){}|+\`) are treated as regular expressions
- Examples:
  - `^CHEST.*PA$` matches strings starting with "CHEST" and ending with "PA"
  - `[ABC]CHEST` matches "ACHEST", "BCHEST", "CHEST"

## Advanced Features

### Nested Sequence Matching

Conditions support matching tags within DICOM sequences using nested structures. This is an advanced feature for working with structured DICOM data like Scheduled Procedure Step Sequence.

**Note:** When using `Search: true`, nested sequence matching is not supported. Search mode performs a flat recursive search of all tags.

Example of nested sequence matching:

```yaml
# Match a tag within a sequence
- Conditions:
  - Tag: 0040,0100  # Scheduled Procedure Step Sequence
    SequenceItems:
      - Tag: 0040,0002  # Scheduled Procedure Step Start Date
        MatchExpression: ^2024.*$
  Actions:
    - Type: add_or_update
      Destination:
        Tag: 0008,0050
        Value: MATCHED_SEQUENCE
```

### Private Tag Support

Conditions can match private DICOM tags using the `PrivateTagCreator` field. This allows you to match vendor-specific tags that use private groups.

Example:

```yaml
# Match a private tag
- Conditions:
  - Tag: 0009,0010
    PrivateTagCreator: SIEMENS CT VA0  COAD
    MatchExpression: ^.*$
  Actions:
    - Type: add_or_update
      Destination:
        Tag: 0008,0050
        Value: HAS_PRIVATE_TAG
```

## Examples

The following examples demonstrate how to match DICOM values using string expressions and regular expressions:

#### Example 1: Match DICOM value with a string

```yaml
# Match DICOM value with a string
- Conditions:
  - Tag: 0008,0060
    MatchExpression: CT
```

#### Example 2: Match multiple DICOM values with multiple expressions

```yaml
# Match multiple DICOM values with multiple expressions
- Conditions:
  - Tag: 0008,1030
    MatchExpression: Full*
  - Tag: 0008,0050
    MatchExpression: ^MR$
  Actions:
    - Type: add_or_update
      Destination:
        Tag: 0008,0050
        Value: MATCHED
```

#### Example 3: Deep search for a tag

The following example searches the entire dataset (including sequences) for a specific tag:

```yaml
# Search for a tag anywhere in the dataset
- Conditions:
  - Tag: 0008,0050
    MatchExpression: ^ACC123$
    Search: true
```

#### Example 4: Debugging a condition

The following example enables verbose logging for a condition to help understand why it is or isn't matching:

```yaml
# Enable info logging for this condition
- Conditions:
  - Tag: 0010,0010
    MatchExpression: ^DOE\^JOHN$
    Log: info
  Actions:
    - Type: add_or_update
      Destination:
        Tag: 0010,0010
        Value: Anonymous
```
