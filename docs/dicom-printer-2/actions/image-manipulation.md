# Image Manipulation Actions

Image manipulation actions perform transformations on DICOM images, including trimming, rotating, resizing, and adding instances.

## Image Manipulation Types

DICOM Printer 2 supports the following image manipulation operations:

- **Trim** - Remove pixels from image edges
- **Rotate** - Rotate image by specified angle
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

## AddInstance Action

The AddInstance action creates additional image instances in a DICOM series. It can either:
- Load an external image file and add it as a new instance
- Create a blank canvas of specified dimensions
- Combine both by placing an image on a colored canvas

### Basic Syntax

```xml
<AddInstance name="ActionName">
  <ImagePath>path/to/image.jpg</ImagePath>
  <Width>pixels</Width>
  <Height>pixels</Height>
  <CanvasColor>#RRGGBB</CanvasColor>
  <InsertionIndex>position</InsertionIndex>
</AddInstance>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition.

### Configuration Requirements

**At least one of the following must be specified:**
- `<ImagePath>` - Load an external image
- Both `<Width>` and `<Height>` - Create a canvas

### Elements

#### `<ImagePath>` (Conditional)
Path to an external image file to load.

**Supported formats:** JPEG, PNG, BMP, and other formats supported by Qt

```xml
<ImagePath>C:\Images\logo.png</ImagePath>
```

**Supports placeholders:**
```xml
<ImagePath>C:\Templates\#{PatientID}_template.jpg</ImagePath>
```

#### `<Width>` (Conditional)
Width of the canvas in pixels.

**Type:** Unsigned integer
**Required:** If `<ImagePath>` is not specified

```xml
<Width>1024</Width>
```

When both `<Width>` and `<Height>` are specified:
- A canvas of the specified size is created
- Background color is set to `<CanvasColor>`
- If `<ImagePath>` is also provided, the image is centered on the canvas

#### `<Height>` (Conditional)
Height of the canvas in pixels.

**Type:** Unsigned integer
**Required:** If `<ImagePath>` is not specified

```xml
<Height>768</Height>
```

#### `<CanvasColor>` (Optional)
Background color for the canvas when using `<Width>` and `<Height>`.

**Type:** Hexadecimal color value
**Default:** `#000000` (black)
**Formats accepted:**
- `#RRGGBB` - Standard hex format
- `0xRRGGBB` - Hex with 0x prefix
- `RRGGBB` - Hex without prefix

```xml
<CanvasColor>#FFFFFF</CanvasColor>  <!-- White -->
<CanvasColor>#000000</CanvasColor>  <!-- Black -->
<CanvasColor>#FF0000</CanvasColor>  <!-- Red -->
```

Whitespace and case are ignored.

#### `<InsertionIndex>` (Optional)
Position where the new instance should be inserted in the series.

**Type:** Integer
**Default:** `-1` (append at end)

```xml
<InsertionIndex>0</InsertionIndex>   <!-- Insert at beginning -->
<InsertionIndex>2</InsertionIndex>   <!-- Insert at position 2 (0-based) -->
<InsertionIndex>-1</InsertionIndex>  <!-- Append at end (default) -->
```

**Behavior:**
- `0` - Insert at the beginning (before all existing instances)
- Positive value - Insert at that position (0-based index)
- `-1` or negative - Append at the end
- If index exceeds series length, appends at end

### AddInstance Examples

#### Add External Image

Load an external image file and add it as a new instance:

```xml
<AddInstance name="AddLogo">
  <ImagePath>C:\Images\hospital_logo.png</ImagePath>
</AddInstance>
```

#### Create Blank Canvas

Create a blank white canvas:

```xml
<AddInstance name="CreateBlankPage">
  <Width>2048</Width>
  <Height>2048</Height>
  <CanvasColor>#FFFFFF</CanvasColor>
</AddInstance>
```

#### Image Centered on Colored Canvas

Place an image on a larger colored background:

```xml
<AddInstance name="ImageOnCanvas">
  <ImagePath>C:\Images\xray.jpg</ImagePath>
  <Width>2480</Width>
  <Height>3508</Height>
  <CanvasColor>#000000</CanvasColor>  <!-- Black background -->
</AddInstance>
```

The image will be centered on the 2480x3508 black canvas.

#### Insert at Specific Position

Insert a cover page at the beginning:

```xml
<AddInstance name="AddCoverPage">
  <ImagePath>C:\Templates\cover.png</ImagePath>
  <InsertionIndex>0</InsertionIndex>
</AddInstance>
```

#### Add Separator Between Pages

Insert a blank separator page:

```xml
<AddInstance name="AddSeparator">
  <Width>1024</Width>
  <Height>100</Height>
  <CanvasColor>#CCCCCC</CanvasColor>  <!-- Gray separator -->
  <InsertionIndex>5</InsertionIndex>  <!-- After 5th image -->
</AddInstance>
```

### Use Cases

#### Add Hospital Branding

```xml
<Actions>
  <!-- Add hospital logo as first page -->
  <AddInstance name="AddBranding">
    <ImagePath>\\server\templates\hospital_logo.png</ImagePath>
    <Width>2048</Width>
    <Height>2048</Height>
    <CanvasColor>#FFFFFF</CanvasColor>
    <InsertionIndex>0</InsertionIndex>
  </AddInstance>
</Actions>

<Workflow>
  <Perform action="AddBranding"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

#### Create Multi-Page Document

```xml
<Actions>
  <AddInstance name="AddPage1">
    <ImagePath>C:\Reports\#{PatientID}_page1.jpg</ImagePath>
  </AddInstance>

  <AddInstance name="AddPage2">
    <ImagePath>C:\Reports\#{PatientID}_page2.jpg</ImagePath>
  </AddInstance>

  <AddInstance name="AddPage3">
    <ImagePath>C:\Reports\#{PatientID}_page3.jpg</ImagePath>
  </AddInstance>
</Actions>

<Workflow>
  <Perform action="AddPage1"/>
  <Perform action="AddPage2"/>
  <Perform action="AddPage3"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

#### Standardize Image Size with Borders

```xml
<AddInstance name="StandardizeWithBorder">
  <ImagePath>#{InputFile}</ImagePath>
  <Width>2048</Width>
  <Height>2048</Height>
  <CanvasColor>#FFFFFF</CanvasColor>
</AddInstance>
```

Images smaller than 2048x2048 will be centered with white borders.

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

## Performance Considerations

Image manipulation operations can be CPU and memory intensive:

- **Trim** - Fast operation, minimal CPU usage
- **Rotate** - Moderate CPU usage, especially for large images
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
