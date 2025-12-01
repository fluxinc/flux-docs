# Print Actions

Print actions send images to DICOM film printers using the DICOM Basic Grayscale Print Management service.

## Basic Syntax

```xml
<Print name="ActionName">
  <BasicFilmSessionAttributes>
    <!-- Film session attributes -->
  </BasicFilmSessionAttributes>
  <BasicFilmBoxAttributes>
    <!-- Film box attributes -->
  </BasicFilmBoxAttributes>
  <BasicImageBoxAttributes>
    <!-- Image box attributes -->
  </BasicImageBoxAttributes>
  <PrintMode>Grayscale8</PrintMode>
  <ConnectionParameters>
    <PeerAETitle>PrinterAE</PeerAETitle>
    <MyAETitle>LocalAE</MyAETitle>
    <Host>hostname</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <Resolution>300x300</Resolution> <!-- Optional -->
</Print>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

## Required Attributes

### `name`
Unique identifier for this action.

## Required Elements

### `PrintMode`
The print mode determines the color depth for the output.

**Valid Values:** `Color`, `Grayscale8`, `Grayscale12`
**Default:** `Grayscale8`

```xml
<PrintMode>Grayscale8</PrintMode>
```

**Print Modes:**

- **`Color`** - 24-bit RGB color printing
- **`Grayscale8`** - 8-bit grayscale (256 gray levels)
- **`Grayscale12`** - 12-bit grayscale (4096 gray levels)

**Note:** Grayscale12 may be reduced to 8-bit depth depending on printer capabilities.

### `ConnectionParameters`
Network connection settings for the remote DICOM printer. Must contain the following nested elements:

#### `PeerAETitle`
The AE Title of the DICOM film printer.

#### `MyAETitle`
The AE Title of DICOM Printer 2 (this application).

#### `Host`
The hostname or IP address of the DICOM film printer.

#### `Port`
The TCP port number of the DICOM film printer (typically 104).

## Optional Elements

### `Resolution`
Specifies the printer's resolution in DPI (dots per inch). When set, images are automatically resized to match the printer's resolution before printing.

**Type:** String
**Format:** `WIDTHxHEIGHT` (e.g., `300x300`)

```xml
<Resolution>300x300</Resolution>
```

If the Resolution element is not specified or set to `0x0`, images are sent to the printer at their original resolution without automatic resizing.

**Common Resolutions:**
- `150x150` - Low resolution (draft quality)
- `300x300` - Standard resolution (typical for medical imaging)
- `600x600` - High resolution (detailed imaging)

**Note:** The resolution values must be positive integers. The format is parsed using the pattern `WIDTHxHEIGHT` where both values represent DPI.

**Source:** `src/DicomPrinter/Print.cpp:337-359`

## Film Session Attributes

Film session attributes control the overall print job settings.

```xml
<BasicFilmSessionAttributes>
  <PrintPriority>MED</PrintPriority>
  <MediumType>BLUE FILM</MediumType>
  <FilmDestination>MAGAZINE</FilmDestination>
  <NumberOfCopies>1</NumberOfCopies>
</BasicFilmSessionAttributes>
```

### `PrintPriority`
**Valid Values:** `HIGH`, `MED`, `LOW`
**Default:** `MED`

Sets the priority of the print job in the printer's queue.

### `MediumType`
**Examples:** `PAPER`, `BLUE FILM`, `CLEAR FILM`

Specifies the type of medium to print on. Valid values depend on the printer's capabilities.

### `FilmDestination`
**Examples:** `MAGAZINE`, `PROCESSOR`, `BIN_1`

Specifies where the printed film should be sent. Valid values depend on the printer.

### `NumberOfCopies`
**Type:** Integer
**Default:** `1`

Number of copies to print.

## Film Box Attributes

Film box attributes control the layout and appearance of the printed film.

```xml
<BasicFilmBoxAttributes>
  <ImageDisplayFormat>STANDARD\1,1</ImageDisplayFormat>
  <FilmOrientation>PORTRAIT</FilmOrientation>
  <FilmSizeID>14INX17IN</FilmSizeID>
  <MagnificationType>REPLICATE</MagnificationType>
  <Trim>NO</Trim>
  <BorderDensity>BLACK</BorderDensity>
  <EmptyImageDensity>WHITE</EmptyImageDensity>
</BasicFilmBoxAttributes>
```

### `ImageDisplayFormat`
Specifies the layout of images on the film.

**Format:** `STANDARD\rows,columns`

**Examples:**
- `STANDARD\1,1` - Single image per film
- `STANDARD\2,2` - 2x2 grid (4 images)
- `STANDARD\3,4` - 3 rows, 4 columns (12 images)

### `FilmOrientation`
**Valid Values:** `PORTRAIT`, `LANDSCAPE`

### `FilmSizeID`
Specifies the physical size of the film.

**Common Values:**
- `8INX10IN` - 8" x 10"
- `10INX12IN` - 10" x 12"
- `11INX14IN` - 11" x 14"
- `14INX14IN` - 14" x 14"
- `14INX17IN` - 14" x 17"

### `MagnificationType`
**Valid Values:** `REPLICATE`, `BILINEAR`, `CUBIC`, `NONE`

Specifies the image interpolation method when scaling.

### `Trim`
**Valid Values:** `YES`, `NO`

Whether to trim the border around the image area.

### `BorderDensity`
**Valid Values:** `BLACK`, `WHITE`

Density of the border around images.

### `EmptyImageDensity`
**Valid Values:** `BLACK`, `WHITE`

Density for empty image boxes when using multi-image layouts.

## Image Box Attributes

Image box attributes control individual image settings.

```xml
<BasicImageBoxAttributes>
  <Polarity>NORMAL</Polarity>
  <MagnificationFactor></MagnificationFactor>
  <SmoothingType></SmoothingType>
</BasicImageBoxAttributes>
```

### `Polarity`
**Valid Values:** `NORMAL`, `REVERSE`

Controls whether the image is printed normally or inverted.

### `MagnificationFactor`
Custom magnification factor for the image. Leave empty for automatic.

### `SmoothingType`
Image smoothing algorithm. Leave empty for printer default.

## Basic Print Example

Print a single image to a film printer:

```xml
<Print name="PrintToFilm">
  <BasicFilmSessionAttributes>
    <PrintPriority>MED</PrintPriority>
    <MediumType>BLUE FILM</MediumType>
    <FilmDestination>MAGAZINE</FilmDestination>
    <NumberOfCopies>1</NumberOfCopies>
  </BasicFilmSessionAttributes>
  <BasicFilmBoxAttributes>
    <ImageDisplayFormat>STANDARD\1,1</ImageDisplayFormat>
    <FilmOrientation>PORTRAIT</FilmOrientation>
    <FilmSizeID>14INX17IN</FilmSizeID>
    <MagnificationType>BILINEAR</MagnificationType>
    <Trim>NO</Trim>
  </BasicFilmBoxAttributes>
  <BasicImageBoxAttributes>
    <Polarity>NORMAL</Polarity>
  </BasicImageBoxAttributes>
  <PrintMode>Grayscale8</PrintMode>
  <ConnectionParameters>
    <PeerAETitle>FILM_PRINTER</PeerAETitle>
    <MyAETitle>DICOM_PRINTER</MyAETitle>
    <Host>192.168.1.50</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <Resolution>300x300</Resolution>
</Print>
```

## True-Size Printing

For accurate physical sizing (e.g., printing radiographs at 1:1 scale), configure the printer resolution and use appropriate film sizes:

```xml
<Print name="PrintTrueSize">
  <BasicFilmSessionAttributes>
    <PrintPriority>HIGH</PrintPriority>
    <MediumType>BLUE FILM</MediumType>
    <FilmDestination>PROCESSOR</FilmDestination>
  </BasicFilmSessionAttributes>
  <BasicFilmBoxAttributes>
    <ImageDisplayFormat>STANDARD\1,1</ImageDisplayFormat>
    <FilmOrientation>PORTRAIT</FilmOrientation>
    <FilmSizeID>14INX17IN</FilmSizeID>
    <MagnificationType>CUBIC</MagnificationType>
  </BasicFilmBoxAttributes>
  <PrintMode>Grayscale12</PrintMode>
  <ConnectionParameters>
    <PeerAETitle>FILM_PRINTER</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.50</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <Resolution>300x300</Resolution>
</Print>
```

## Multiple Copies

Print multiple copies with high priority:

```xml
<Print name="PrintMultipleCopies">
  <BasicFilmSessionAttributes>
    <PrintPriority>HIGH</PrintPriority>
    <MediumType>BLUE FILM</MediumType>
    <FilmDestination>MAGAZINE</FilmDestination>
    <NumberOfCopies>3</NumberOfCopies>
  </BasicFilmSessionAttributes>
  <BasicFilmBoxAttributes>
    <ImageDisplayFormat>STANDARD\1,1</ImageDisplayFormat>
    <FilmOrientation>PORTRAIT</FilmOrientation>
    <FilmSizeID>14INX17IN</FilmSizeID>
  </BasicFilmBoxAttributes>
  <PrintMode>Grayscale8</PrintMode>
  <ConnectionParameters>
    <PeerAETitle>FILM_PRINTER</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.50</Host>
    <Port>104</Port>
  </ConnectionParameters>
</Print>
```

## Multi-Image Layout

Print multiple images on a single film:

```xml
<Print name="PrintMultiImage">
  <BasicFilmSessionAttributes>
    <PrintPriority>MED</PrintPriority>
    <MediumType>BLUE FILM</MediumType>
    <FilmDestination>MAGAZINE</FilmDestination>
  </BasicFilmSessionAttributes>
  <BasicFilmBoxAttributes>
    <!-- 2x2 grid layout -->
    <ImageDisplayFormat>STANDARD\2,2</ImageDisplayFormat>
    <FilmOrientation>PORTRAIT</FilmOrientation>
    <FilmSizeID>14INX17IN</FilmSizeID>
    <MagnificationType>BILINEAR</MagnificationType>
    <Trim>YES</Trim>
    <BorderDensity>BLACK</BorderDensity>
    <EmptyImageDensity>WHITE</EmptyImageDensity>
  </BasicFilmBoxAttributes>
  <PrintMode>Grayscale8</PrintMode>
  <ConnectionParameters>
    <PeerAETitle>FILM_PRINTER</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.50</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <Resolution>300x300</Resolution>
</Print>
```

## Workflow Integration

Print after successful PACS storage:

```xml
<Workflow>
  <Perform action="SendToPACS"/>

  <If field="STORE_SUCCEEDED" tag="SendToPACS" value="true">
    <!-- Only print if PACS storage succeeded -->
    <Perform action="PrintToFilm"/>
  </If>
</Workflow>
```

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <!-- Query for patient -->
    <Query name="FindPatient" type="Worklist">
      <ConnectionParameters>
        <PeerAETitle>RIS</PeerAETitle>
        <MyAETitle>PRINTER</MyAETitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

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

    <!-- Print to film -->
    <Print name="PrintToFilm">
      <BasicFilmSessionAttributes>
        <PrintPriority>MED</PrintPriority>
        <MediumType>BLUE FILM</MediumType>
        <FilmDestination>MAGAZINE</FilmDestination>
        <NumberOfCopies>1</NumberOfCopies>
      </BasicFilmSessionAttributes>
      <BasicFilmBoxAttributes>
        <ImageDisplayFormat>STANDARD\1,1</ImageDisplayFormat>
        <FilmOrientation>PORTRAIT</FilmOrientation>
        <FilmSizeID>14INX17IN</FilmSizeID>
        <MagnificationType>CUBIC</MagnificationType>
        <Trim>NO</Trim>
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
      <Resolution>300x300</Resolution>
    </Print>
  </Actions>

  <Workflow>
    <Perform action="FindPatient"/>
    <If field="QUERY_FOUND" value="true">
      <Perform action="SendToPACS"/>
      <Perform action="PrintToFilm"/>
    </If>
  </Workflow>
</DicomPrinter>
```

## Printer Compatibility

Different DICOM film printers support different attributes and values. Consult your printer's DICOM Conformance Statement for:
- Supported film sizes
- Available medium types
- Film destinations
- Supported image display formats
- Maximum number of copies

## Related Topics

- [Actions Overview](index.md)
- [Store Actions](store.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
