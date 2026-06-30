# PrintText Action

The `<PrintText>` action burns a line of text onto **every page** of a job within a rectangle you position as a percentage of the image. Use it for disclaimers, patient banners, watermark captions, or any text overlay.

`<PrintText>` is declared in `<ActionsList>` and applied with a `<Perform>` node in the workflow, typically before a `<Print>` or `<Store>` so the burned-in text travels with the rendered pages.

## Basic Syntax

```xml
<PrintText name="ActionName">
  <Text>Text to burn in</Text>
  <X>5</X>
  <Y>2</Y>
  <Width>90</Width>
  <Height>10</Height>
</PrintText>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

## Elements

Child element names are matched case-insensitively.

### `<Text>` (Required)
The text to burn onto each page. Supports `#{gggg,eeee}` DICOM tag placeholders (and named [placeholders](../placeholders.md)), so the rendered text can include patient, study, or job values.

```xml
<Text>NOT FOR DIAGNOSTIC USE - #{0010,0010}</Text>
```

### `<X>` `<Y>` `<Width>` `<Height>` (Required)
The rectangle that holds the text, expressed as **percentages (0–100) of the image dimensions**, with the origin at the top-left corner:

- `<X>` — left edge, as a percentage of image width
- `<Y>` — top edge, as a percentage of image height
- `<Width>` — box width, as a percentage of image width
- `<Height>` — box height, as a percentage of image height

All four are required. Using percentages keeps the overlay positioned consistently regardless of the actual pixel size of each page.

```xml
<X>5</X>
<Y>2</Y>
<Width>90</Width>
<Height>10</Height>
```

### `<Color>` (Optional)
The text color as a hex value: `RRGGBB` (6 digits, opaque) or `AARRGGBB` (8 digits, with leading alpha). Color must be hex — names like `red` are not accepted.

**Default:** `0000FF` (opaque blue)

```xml
<Color>FF0000</Color>
```

### `<BackgroundColor>` (Optional)
The fill color behind the text, as a hex value. Use the 8-digit `AARRGGBB` form to control opacity (e.g. a semi-transparent backdrop for legibility over busy images).

**Default:** transparent

```xml
<BackgroundColor>80FFFFFF</BackgroundColor>
```

### `<FontHeight>` (Optional)
The font height as a **percentage of image height**.

**Default:** `2`

```xml
<FontHeight>3</FontHeight>
```

### `<FontFamily>` (Optional)
The font family name used to render the text.

**Default:** `Courier New`

```xml
<FontFamily>Arial</FontFamily>
```

### `<Alignment>` (Optional)
How the text is aligned within the rectangle. Combine flags with the pipe (`|`) character:

- Horizontal: `Left`, `Right`, `HCenter`
- Vertical: `Top`, `Bottom`, `VCenter`
- `Center` — shorthand for centered both ways (`HCenter|VCenter`)

**Default:** `HCenter|Top`

```xml
<Alignment>HCenter|Top</Alignment>
```

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinterConfig SYSTEM "config.dtd">
<DicomPrinterConfig>
  <ActionsList>
    <!-- Burn a disclaimer banner with the patient name across the top -->
    <PrintText name="Stamp">
      <Text>NOT FOR DIAGNOSTIC USE - #{0010,0010}</Text>
      <X>5</X>
      <Y>2</Y>
      <Width>90</Width>
      <Height>10</Height>
      <Color>FF0000</Color>
      <BackgroundColor>80FFFFFF</BackgroundColor>
      <FontHeight>3</FontHeight>
      <FontFamily>Arial</FontFamily>
      <Alignment>HCenter|Top</Alignment>
    </PrintText>

    <!-- Send the stamped pages to a film printer -->
    <Print name="PrintFilm">
      <ConnectionParameters>
        <MyAeTitle>DICOM_PRINTER</MyAeTitle>
        <PeerAeTitle>FILM_SCP</PeerAeTitle>
        <Host>192.168.1.20</Host>
        <Port>104</Port>
      </ConnectionParameters>
    </Print>
  </ActionsList>

  <Workflow>
    <!-- Stamp every page before printing -->
    <Perform action="Stamp"/>
    <Perform action="PrintFilm" onError="Hold"/>
  </Workflow>
</DicomPrinterConfig>
```

## Notes

- `<PrintText>` applies to **every page** in the job. To overlay an image (logo or watermark) instead of text, use `<PrintImage>`.
- Position and font sizing are all percentage-based, so overlays scale automatically across pages of different pixel dimensions.

## Related Topics

- [Actions Overview](index.md)
- [Print Actions](print.md)
- [Placeholders](../placeholders.md)
