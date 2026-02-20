# SetSequence Action

The `SetSequence` action writes a DICOM sequence structure — with nested items and tags — directly into the job dataset. It is useful for encoding complex structured data (e.g., Procedure Code Sequence, Scheduled Procedure Step Sequence) before sending to a PACS or using as a C-FIND query payload.

## Basic Syntax

```xml
<SetSequence name="ActionName" tag="(GGGG,EEEE)">
  <DcmItem>
    <DcmTag tag="(GGGG,EEEE)">value</DcmTag>
    <DcmTag tag="(GGGG,EEEE)">#{Placeholder}</DcmTag>
  </DcmItem>
</SetSequence>
```

## Attributes

| Attribute | Required | Description |
|---|---|---|
| `name` | Yes | Unique identifier for this action. |
| `tag` | Yes | The DICOM tag for the sequence, in `(GGGG,EEEE)` format. |
| `vr` | No | Value Representation. Usually inferred from the DICOM dictionary. Required for private tags. |
| `tagName` | No | Name for private sequence tags (odd group number). |
| `replace` | No | `"true"` to replace an existing sequence with the same tag; `"false"` to append (default: `"false"`). |
| `unique` | No | `"true"` to write a separate sequence per image instance; `"false"` for a single sequence applied to all instances in the job (default: `"false"`). |

## Child Elements

### `<DcmItem>`

Represents one item in the sequence. A sequence may contain multiple items.

### `<DcmTag>` (inside `<DcmItem>`)

A DICOM tag within an item. The `tag` attribute specifies the tag in `(GGGG,EEEE)` format. The text content is the value, and supports full [placeholder substitution](/dicom-printer-2/placeholders).

### Nested `<DcmSequence>` (inside `<DcmItem>`)

For deeply nested structures, a `<DcmItem>` may contain a `<DcmSequence>` child, which in turn contains `<DcmItem>` elements.

## Placeholder Support

Tag values within sequence items support full placeholder substitution:

- **Tag placeholders**: `#{PatientID}`, `#{0010,0020}`
- **Date placeholders**: `#{Date}`, `#{Date,-7}`

```xml
<SetSequence name="SetProcedureCode" tag="(0032,1064)">
  <DcmItem>
    <DcmTag tag="(0008,0100)">#{ProcedureCodeValue}</DcmTag>
    <DcmTag tag="(0008,0104)">#{ProcedureDescription}</DcmTag>
  </DcmItem>
</SetSequence>
```

## Examples

### Set a Procedure Code Sequence

```xml
<SetSequence name="SetProcedureCode" tag="(0032,1064)">
  <DcmItem>
    <DcmTag tag="(0008,0100)">CHEST-PA</DcmTag>
    <DcmTag tag="(0008,0102)">99LOCAL</DcmTag>
    <DcmTag tag="(0008,0104)">Chest PA View</DcmTag>
  </DcmItem>
</SetSequence>
```

### Replace an Existing Sequence

Use `replace="true"` to overwrite a sequence that may already be present in the job dataset (e.g., one populated by a prior Query):

```xml
<SetSequence name="OverrideProcedureCode" tag="(0032,1064)" replace="true">
  <DcmItem>
    <DcmTag tag="(0008,0100)">#{ProcedureCodeValue}</DcmTag>
  </DcmItem>
</SetSequence>
```

### Per-Image Sequence

Use `unique="true"` when each image instance in the job needs its own distinct sequence value:

```xml
<SetSequence name="SetInstanceSequence" tag="(0040,A730)" unique="true">
  <DcmItem>
    <DcmTag tag="(0008,1155)">#{SOPInstanceUID}</DcmTag>
  </DcmItem>
</SetSequence>
```

### Nested Sequences

For complex structures that require sequences within sequences:

```xml
<SetSequence name="SetRequestAttributes" tag="(0040,A370)">
  <DcmItem>
    <DcmTag tag="(0020,000D)">#{StudyInstanceUID}</DcmTag>
    <DcmSequence tag="(0032,1064)">
      <DcmItem>
        <DcmTag tag="(0008,0100)">#{ProcedureCodeValue}</DcmTag>
        <DcmTag tag="(0008,0104)">#{ProcedureDescription}</DcmTag>
      </DcmItem>
    </DcmSequence>
  </DcmItem>
</SetSequence>
```

## Interaction with Query

A SetSequence-populated sequence is injected into a C-FIND request only when the corresponding `<Query>` contains a matching `<DcmSequence>` element with the same tag. If the Query has no such element, the sequence still exists in the job dataset but is not sent as part of the query payload.

See [Query Attributes](/dicom-printer-2/actions/query-attributes#setsequence-integration) for details on how SetSequence interacts with Query actions.

## Related Topics

- [SetTag Action](settag.md)
- [Placeholders](/dicom-printer-2/placeholders)
- [Query Attributes](/dicom-printer-2/actions/query-attributes)
