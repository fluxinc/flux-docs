# Image Manipulation Actions

Image manipulation actions perform transformations on DICOM images, including trimming, rotating, auto-orienting, resizing, and adding instances.

## Image Manipulation Types

DICOM Printer 2 supports the following image manipulation operations:

- **Trim** - Remove pixels from image edges
- **Rotate** - Rotate image by a fixed, specified angle
- **AutoRotateText** - Automatically orient pages so the dominant parseable text is upright
- **Resize** - Change image dimensions
- **AddInstance** - Create additional image instances

## Trim Action

The Trim action removes pixels from the edges of an image.

### Basic Syntax

```xml
<Trim name="ActionName">
  <Top>pixels</Top>
  <Bottom>pixels</Bottom>
  <Left>pixels</Left>
  <Right>pixels</Right>
</Trim>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

### Elements

All trim values are in pixels.

#### `<Top>` (Optional)
Number of pixels to remove from the top edge.

```xml
<Top>50</Top>
```

#### `<Bottom>` (Optional)
Number of pixels to remove from the bottom edge.

```xml
<Bottom>100</Bottom>
```

#### `<Left>` (Optional)
Number of pixels to remove from the left edge.

```xml
<Left>25</Left>
```

#### `<Right>` (Optional)
Number of pixels to remove from the right edge.

```xml
<Right>25</Right>
```

### Auto-Trim Feature

The Trim action supports automatic trim detection. When you specify `auto` instead of a pixel value, the system automatically analyzes the image to determine the appropriate trim amount for that edge.

**Syntax:**
```xml
<Top>auto</Top>
<Bottom>auto</Bottom>
<Left>auto</Left>
<Right>auto</Right>
```

**Example:**
```xml
<Trim name="AutoTrimMargins">
  <Top>auto</Top>
  <Bottom>auto</Bottom>
  <Left>auto</Left>
  <Right>auto</Right>
</Trim>
```

This feature automatically detects and removes white space or uniform borders from image edges.

**Source:** `src/DicomPrinter/Trim.hpp:37` (findAutoSize method)

### Trim Examples

#### Remove Header and Footer

```xml
<Trim name="RemoveHeaderFooter">
  <Top>100</Top>
  <Bottom>100</Bottom>
</Trim>
```

#### Remove All Margins

```xml
<Trim name="RemoveMargins">
  <Top>50</Top>
  <Bottom>50</Bottom>
  <Left>50</Left>
  <Right>50</Right>
</Trim>
```

#### Asymmetric Trim

```xml
<Trim name="AsymmetricTrim">
  <Top>200</Top>
  <Bottom>100</Bottom>
  <Left>150</Left>
  <Right>75</Right>
</Trim>
```

## Rotate Action

The Rotate action rotates an image by a specified angle.

### Basic Syntax

```xml
<Rotate name="ActionName">
  <Angle>degrees</Angle>
</Rotate>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition.

### Elements

#### `<Angle>` (Required)
The rotation angle in degrees. Positive values rotate clockwise, negative values rotate counter-clockwise.

**Common Values:**
- `90` - Rotate 90° clockwise
- `180` - Rotate 180°
- `270` - Rotate 270° clockwise (or 90° counter-clockwise)
- `-90` - Rotate 90° counter-clockwise

### Rotate Examples

#### Rotate 90° Clockwise

```xml
<Rotate name="Rotate90CW">
  <Angle>90</Angle>
</Rotate>
```

#### Rotate 180°

```xml
<Rotate name="Rotate180">
  <Angle>180</Angle>
</Rotate>
```

#### Rotate 90° Counter-Clockwise

```xml
<Rotate name="Rotate90CCW">
  <Angle>-90</Angle>
</Rotate>
```

## Resize Action

The Resize action changes the dimensions of an image.

### Basic Syntax

```xml
<Resize name="ActionName">
  <Width>pixels</Width>
  <Height>pixels</Height>
  <Aspect>keep|ignore</Aspect>
</Resize>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition.

### Elements

#### `<Width>` (Required)
The target width in pixels. Must be greater than zero.

```xml
<Width>1024</Width>
```

**Important:** Both `<Width>` and `<Height>` must be specified. You cannot specify only one dimension.

#### `<Height>` (Required)
The target height in pixels. Must be greater than zero.

```xml
<Height>768</Height>
```

**Important:** Both `<Width>` and `<Height>` must be specified. You cannot specify only one dimension.

#### `<Aspect>` (Optional)
Controls aspect ratio preservation during resize.

**Valid Values:** `keep`, `ignore`
**Default:** `keep`

```xml
<Aspect>keep</Aspect>   <!-- Preserve aspect ratio (default) -->
<Aspect>ignore</Aspect> <!-- Stretch to exact dimensions -->
```

**Behavior:**

When `<Aspect>keep` (default):
- Image is scaled to fit within the specified Width×Height dimensions
- Original aspect ratio is preserved
- Final image may be smaller than specified dimensions to maintain proportions
- Uses smooth transformation for high-quality scaling

When `<Aspect>ignore`:
- Image is stretched to exactly Width×Height
- Original aspect ratio is NOT preserved
- May distort the image if aspect ratio doesn't match target dimensions

### Resize Examples

#### Resize to Fit Within Dimensions (Preserve Aspect)

Resize image to fit within 1920×1080 while maintaining aspect ratio:

```xml
<Resize name="ResizeFit">
  <Width>1920</Width>
  <Height>1080</Height>
  <Aspect>keep</Aspect>
</Resize>
```

If the original image is 2400×1600, it will be scaled to 1620×1080 to fit within the bounds while preserving the aspect ratio.

#### Resize with Default Aspect (Keep)

The `<Aspect>` element can be omitted, defaulting to `keep`:

```xml
<Resize name="ResizeDefault">
  <Width>1024</Width>
  <Height>768</Height>
</Resize>
```

Equivalent to `<Aspect>keep</Aspect>`.

#### Resize to Exact Dimensions (Ignore Aspect)

Stretch image to exactly 800×600, ignoring aspect ratio:

```xml
<Resize name="ResizeStretch">
  <Width>800</Width>
  <Height>600</Height>
  <Aspect>ignore</Aspect>
</Resize>
```

**Warning:** This will distort the image if the original aspect ratio doesn't match 4:3.

#### Resize for Standard Display

Resize to fit standard HD resolution:

```xml
<Resize name="ResizeHD">
  <Width>1920</Width>
  <Height>1080</Height>
  <Aspect>keep</Aspect>
</Resize>
```

#### Resize to Square Canvas

Force image into square dimensions:

```xml
<Resize name="ResizeSquare">
  <Width>2048</Width>
  <Height>2048</Height>
  <Aspect>keep</Aspect>
</Resize>
```

Non-square images will be scaled to fit within the 2048×2048 square while maintaining their aspect ratio.

## AddInstance

Adds a new image instance to the DICOM job. The image can be loaded from a file or created as a blank canvas with specified dimensions and color.

### Syntax

```xml
<AddInstance name="ActionName">
  <ImagePath>C:\images\logo.png</ImagePath>
  <InsertionIndex>0</InsertionIndex>
</AddInstance>
```

Or for a blank canvas:

```xml
<AddInstance name="ActionName">
  <Width>2048</Width>
  <Height>2048</Height>
  <CanvasColor>0xFFFFFFFF</CanvasColor>
  <InsertionIndex>-1</InsertionIndex>
</AddInstance>
```

### Elements

| Element | Required | Description |
|---|---|---|
| `ImagePath` | Conditional | Path to source image file. Required if Width/Height not specified. |
| `Width` | Conditional | Canvas width in pixels. Required with Height if ImagePath not specified. |
| `Height` | Conditional | Canvas height in pixels. Required with Width if ImagePath not specified. |
| `CanvasColor` | No | Background color in hex RGBA format (e.g., `0xFF000000` for opaque black, `0xFFFFFFFF` for opaque white). Default: transparent. |
| `InsertionIndex` | No | Position to insert the instance. `-1` for end (default), `0` for beginning, or a specific index. |

Either `ImagePath` OR both `Width` and `Height` must be specified.

## AutoRotateText Action

The AutoRotateText action automatically orients each page — **raster image or PDF** — so the **dominant amount of parseable text** is horizontal and upright. Where [Rotate](#rotate-action) applies a fixed angle you choose, AutoRotateText analyzes each page and decides the rotation (0°, 90°, 180°, or 270° clockwise) on its own.

This is intended for mixed-orientation input — for example a landscape graph printed from a browser, where the chart's axis labels are sideways relative to the page while the browser's header, URL, and page number are upright. AutoRotateText weighs the *amount* of text in each orientation (de-weighting page-margin chrome) so the large body of graph text wins over the small amount of header text.

### Safety-first behavior

Because this runs on medical documents, the action is deliberately conservative:

- It **never confidently flips a page upside-down**; a 180° rotation requires a stricter confidence threshold and a minimum amount of text.
- When the orientation is **ambiguous, it leaves the page unchanged** (a no-op) rather than guess. Pages it cannot confidently orient pass through untouched.
- It only changes pages when the dominant text axis and direction both clear their confidence gates.

It handles **both raster image pages and direct PDF payloads**, with no difference in the orientation decision between them — a PDF page and its rasterized equivalent are oriented identically:

- **Raster pages** are rotated in place (lossless 90°/180°/270° image transform) and re-saved.
- **PDF pages** are rotated **losslessly** by adjusting each page's PDF `/Rotate` attribute, so the page is **not rasterized or re-encoded**. The corrected PDF is then stored as an encapsulated PDF (ePDF), which viewers render upright. Each PDF page is rasterized internally only to *analyze* its orientation, never for storage. Per-page rotation is supported, so a multi-page PDF with mixed orientations is corrected page by page.

This works whether PDFs arrive already as PDF payloads or are rasterized to PNGs by [Drop Monitor](../drop-monitor.md) first.

### Basic Syntax

```xml
<AutoRotateText name="AutoOrient"/>
```

The defaults are conservative and suitable for most workflows; all elements are optional. A fully specified example:

```xml
<AutoRotateText name="AutoOrient">
  <MaxAnalysisSide>1600</MaxAnalysisSide>
  <MinAxisConfidence>0.30</MinAxisConfidence>
  <MinScoreDelta>0.15</MinScoreDelta>
  <MinDirectionConfidence>0.35</MinDirectionConfidence>
  <MinDirectionConfidence180>0.60</MinDirectionConfidence180>
  <MinLinesFor180>6</MinLinesFor180>
  <MarginBandPercent>8</MarginBandPercent>
  <MarginWeight>0.25</MarginWeight>
  <TrustHintConfidence>0.90</TrustHintConfidence>
  <UseHints>true</UseHints>
  <FailOnUnsupported>false</FailOnUnsupported>
</AutoRotateText>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition.

### Elements

All elements are optional. Confidence/weight values are in the range 0–1 unless noted.

| Element | Default | Description |
|---|---|---|
| `MaxAnalysisSide` | `1600` | Longest edge (pixels) the page is downsampled to **for analysis only**. The original full-resolution image is what gets rotated. Larger is more accurate but slower. |
| `MinAxisConfidence` | `0.30` | Minimum confidence that one text axis (horizontal vs. vertical) dominates before any rotation. |
| `MinScoreDelta` | `0.15` | Minimum normalized margin between the winning and losing axis text scores. |
| `MinDirectionConfidence` | `0.35` | Minimum confidence in the up-vs-down decision before applying a 90°/270° correction. |
| `MinDirectionConfidence180` | `0.60` | Stricter confidence required specifically for a 180° flip of an already-horizontal page (the rarest, highest-risk case). |
| `MinLinesFor180` | `6` | Minimum number of detected text lines required before a 180° flip is allowed. |
| `MarginBandPercent` | `8` | Width of the page-edge band, as a percentage of the shorter side, whose text is de-weighted (browser headers/footers, URLs, page numbers). Range 0–49. |
| `MarginWeight` | `0.25` | Weight applied to text inside the margin band. Lower means margin text counts for less toward the orientation decision. |
| `TrustHintConfidence` | `0.90` | A per-page hint from a Drop Monitor orientation sidecar at or above this confidence is trusted directly, skipping raster analysis. |
| `UseHints` | `true` | Whether to read the optional `<jobid>.orientation.json` sidecar next to the job. |
| `FailOnUnsupported` | `false` | When `true`, fail the action on a page it genuinely cannot process (e.g. an unreadable image, or a PDF page when the required QPDF/poppler tools are unavailable). When `false`, log a warning and leave that page unchanged (fail-open). |

#### `<FailOnUnsupported>` (Optional)

Both raster pages and PDF pages are supported. `FailOnUnsupported` controls what happens for a page that genuinely cannot be processed — for example an unreadable image, or a PDF page when the QPDF / poppler tools required for the PDF path are not installed. With `false` (the default) the page is left unchanged and a warning is logged (fail-open); with `true` the action fails.

#### PDF tooling

The PDF path uses two bundled command-line tools, discovered from an environment override, the packaged install location, a development path, then `PATH` (the same scheme as other DP2 tools):

- **QPDF** — applies the lossless per-page `/Rotate` (already packaged for the `MergeJob` action).
- **poppler `pdftopng`** — rasterizes each PDF page for *analysis only* (ships with the Drop Monitor component).

If either tool is missing, PDF pages are left unchanged unless `FailOnUnsupported` is `true`. No configuration is needed for normal installs.

### Orientation hints (Drop Monitor)

AutoRotateText can consume an optional per-page orientation sidecar written by Drop Monitor next to the job manifest, named `<jobid>.orientation.json`. Hints are keyed by emitted raster filename and carry the clockwise rotation to apply:

```json
{
  "version": 1,
  "pages": {
    "1730000000000_0.png": {
      "recommendedClockwiseDegrees": 90,
      "confidence": 0.87,
      "source": "dropmonitor-pdf-raster"
    }
  }
}
```

A hint at or above `TrustHintConfidence` is applied directly and raster analysis is skipped. Lower-confidence, malformed, or missing hints fall back to the built-in analyzer. Set `UseHints` to `false` to ignore sidecars entirely.

### Examples

#### Drop-in auto-orientation

```xml
<AutoRotateText name="AutoOrient"/>
```

```xml
<Workflow>
  <Perform action="AutoOrient"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

Place `AutoRotateText` **before** any action that consumes the page images (Store, Print, Save) so downstream steps see the corrected orientation.

#### Stronger margin de-weighting for browser-printed pages

Browser printouts often carry a header, URL, and page number that you never want to drive orientation. Lowering `MarginWeight` makes that chrome count for even less:

```xml
<AutoRotateText name="AutoOrientBrowser">
  <MarginWeight>0.05</MarginWeight>
</AutoRotateText>
```

#### Disable 180° flips entirely

If you only want landscape↔portrait correction and never an upside-down flip, raise the 180° gate so it never triggers:

```xml
<AutoRotateText name="AutoOrientNo180">
  <MinDirectionConfidence180>1.0</MinDirectionConfidence180>
</AutoRotateText>
```

## Combining Image Manipulations

Multiple image manipulations can be performed in sequence:

```xml
<Actions>
  <!-- Trim margins -->
  <Trim name="TrimMargins">
    <Top>50</Top>
    <Bottom>50</Bottom>
    <Left>50</Left>
    <Right>50</Right>
  </Trim>

  <!-- Rotate 90° -->
  <Rotate name="RotatePortrait">
    <Angle>90</Angle>
  </Rotate>

  <!-- Resize to fit -->
  <Resize name="ResizeForDisplay">
    <Width>1024</Width>
    <Height>1024</Height>
    <Aspect>keep</Aspect>
  </Resize>
</Actions>

<Workflow>
  <Perform action="TrimMargins"/>
  <Perform action="RotatePortrait"/>
  <Perform action="ResizeForDisplay"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

## Use Cases

### Prepare Images for Film Printing

```xml
<Actions>
  <!-- Remove document margins -->
  <Trim name="RemoveMargins">
    <Top>100</Top>
    <Bottom>100</Bottom>
    <Left>75</Left>
    <Right>75</Right>
  </Trim>

  <!-- Rotate to portrait if needed -->
  <Rotate name="ToPortrait">
    <Angle>90</Angle>
  </Rotate>

  <!-- Print to film -->
  <Print name="PrintToFilm">
    <BasicFilmSessionAttributes>
      <PrintPriority>MED</PrintPriority>
      <MediumType>BLUE FILM</MediumType>
      <FilmDestination>MAGAZINE</FilmDestination>
    </BasicFilmSessionAttributes>
    <BasicFilmBoxAttributes>
      <ImageDisplayFormat>STANDARD\1,1</ImageDisplayFormat>
      <FilmOrientation>PORTRAIT</FilmOrientation>
      <FilmSizeID>14INX17IN</FilmSizeID>
    </BasicFilmBoxAttributes>
    <BasicImageBoxAttributes>
      <Polarity>NORMAL</Polarity>
    </BasicImageBoxAttributes>
    <PrintMode>Grayscale8</PrintMode>
    <ConnectionParameters>
      <PeerAETitle>FILM_PRINTER</PeerAETitle>
      <MyAETitle>PRINTER</MyAETitle>
      <Host>192.168.1.50</Host>
      <Port>104</Port>
    </ConnectionParameters>
  </Print>
</Actions>
```

### Standardize Image Sizes

```xml
<Actions>
  <!-- Resize all images to standard size -->
  <Resize name="StandardizeSize">
    <Width>2048</Width>
    <Height>2048</Height>
    <Aspect>keep</Aspect>
  </Resize>

  <!-- Store to PACS -->
  <Store name="SendToPACS">
    <ConnectionParameters>
      <PeerAETitle>PACS</PeerAETitle>
      <MyAETitle>PRINTER</MyAETitle>
      <Host>192.168.1.100</Host>
      <Port>104</Port>
    </ConnectionParameters>
  </Store>
</Actions>
```

### Correct Orientation

When every page needs the *same* fixed correction, use `Rotate` gated on a tag:

```xml
<Actions>
  <!-- Rotate landscape documents to portrait -->
  <Rotate name="CorrectOrientation">
    <Angle>-90</Angle>
  </Rotate>
</Actions>

<Workflow>
  <If field="TAG_VALUE" tag="0028,0011" value="2480">
    <!-- Width is 2480, likely landscape -->
    <Perform action="CorrectOrientation"/>
  </If>
  <Perform action="SendToPACS"/>
</Workflow>
```

When pages arrive in **mixed** orientations (some landscape, some portrait, some upside-down), let [AutoRotateText](#autorotatetext-action) decide per page instead of branching on aspect ratio:

```xml
<Actions>
  <AutoRotateText name="AutoOrient"/>
</Actions>

<Workflow>
  <Perform action="AutoOrient"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

## Performance Considerations

Image manipulation operations can be CPU and memory intensive:

- **Trim** - Fast operation, minimal CPU usage
- **Rotate** - Moderate CPU usage, especially for large images
- **AutoRotateText** - Moderate CPU usage: each page is downsampled to `MaxAnalysisSide` for analysis (lower it to trade accuracy for speed), and only pages that pass the confidence gates are actually rotated. Ambiguous pages are a fast no-op.
- **Resize** - CPU usage depends on scaling algorithm and size change
- **AddInstance** - Fast to moderate CPU usage depending on:
  - Image file loading (if `<ImagePath>` specified)
  - Canvas creation and image compositing (if `<Width>`/`<Height>` specified)
  - Creates additional instance data (increases memory usage)

For high-volume workflows, consider:
- Using optional error handling (`onError="Ignore"`) for non-critical operations
- Resizing before rotating for better performance
- Testing with representative image sizes
- Pre-sizing external images used with AddInstance to avoid runtime scaling
- Limiting the number of AddInstance operations per job

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <!-- Parse patient ID -->
    <ParseJobFileName name="GetPatientID">
      <Pattern>(\d+)_.*\.pdf</Pattern>
      <DcmTag tag="0010,0020" group="1"/>
    </ParseJobFileName>

    <!-- Query worklist -->
    <Query name="FindPatient" type="Worklist">
      <ConnectionParameters>
        <PeerAETitle>RIS</PeerAETitle>
        <MyAETitle>PRINTER</MyAETitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Trim document margins -->
    <Trim name="RemoveDocumentMargins">
      <Top>120</Top>
      <Bottom>120</Bottom>
      <Left>80</Left>
      <Right>80</Right>
    </Trim>

    <!-- Rotate to portrait -->
    <Rotate name="ToPortrait">
      <Angle>90</Angle>
    </Rotate>

    <!-- Resize for standard display -->
    <Resize name="StandardSize">
      <Width>1024</Width>
      <Height>1024</Height>
      <Aspect>keep</Aspect>
    </Resize>

    <!-- Save original -->
    <Save name="SaveOriginal">
      <Directory>E:\Archive\Original\#{PatientID}</Directory>
      <Filename>#{Date}_original.dcm</Filename>
    </Save>

    <!-- Save processed -->
    <Save name="SaveProcessed">
      <Directory>E:\Archive\Processed\#{PatientID}</Directory>
      <Filename>#{Date}_processed.dcm</Filename>
    </Save>

    <!-- Store to PACS -->
    <Store name="SendToPACS">
      <ConnectionParameters>
        <PeerAETitle>PACS</PeerAETitle>
        <MyAETitle>PRINTER</MyAETitle>
        <Host>192.168.1.100</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <Compression type="JPEG_Lossless"/>
    </Store>
  </Actions>

  <Workflow>
    <Perform action="GetPatientID"/>
    <Perform action="FindPatient"/>

    <If field="QUERY_FOUND" value="true">
      <!-- Save original before processing -->
      <Perform action="SaveOriginal"/>

      <!-- Process image -->
      <Perform action="RemoveDocumentMargins"/>
      <Perform action="ToPortrait"/>
      <Perform action="StandardSize"/>

      <!-- Save processed version -->
      <Perform action="SaveProcessed"/>

      <!-- Send to PACS -->
      <Perform action="SendToPACS"/>
    </If>
  </Workflow>
</DicomPrinter>
```

## Related Topics

- [Actions Overview](index.md)
- [Save Actions](save.md)
- [Print Actions](print.md)
- [Store Actions](store.md)
