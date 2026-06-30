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
    <PeerAeTitle>PrinterAE</PeerAeTitle>
    <MyAeTitle>LocalAE</MyAeTitle>
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

### `ConnectionParameters`
Network connection settings for the remote DICOM printer. Must contain the following nested elements:

#### `PeerAeTitle`
The AE Title of the DICOM film printer.

#### `MyAeTitle`
The AE Title of DICOM Printer 2 (this application).

#### `Host`
The hostname or IP address of the DICOM film printer.

#### `Port`
The TCP port number of the DICOM film printer (typically 104).

## Optional Elements

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

## Film Session Attributes

::: warning Case-sensitive tags
The attribute block names (`BasicFilmSessionAttributes`, `BasicFilmBoxAttributes`, `BasicImageBoxAttributes`) and their child tags are case-sensitive and must use the exact PascalCase shown (e.g. `FilmSizeId`, `ImageDisplayFormat`). A lowercase or misspelled child tag is silently ignored, and a wrong-case block name fails the entire configuration parse. `NumberOfCopies` is the only case-insensitive exception.
:::

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

Sets the priority of the print job in the printer's queue. If omitted, `PrintPriority` is not sent and the printer applies its own default (commonly `MED`). More generally, unset film/session attributes are omitted from the print request rather than given DICOM-standard defaults, so the printer SCP's own defaults apply.

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

### `FilmSessionLabel`
**Type:** String
**Default:** `DICOM PRINTER PRINT SESSION`

A human-readable label identifying the film session on the printer.

### `MemoryAllocation`
**Type:** Integer

Amount of printer memory requested for the session. Omitted unless set.

### `OwnerId`
**Type:** String

Identifies the owner of the film session. Omitted unless set.

## Film Box Attributes

Film box attributes control the layout and appearance of the printed film.

```xml
<BasicFilmBoxAttributes>
  <ImageDisplayFormat>STANDARD\1,1</ImageDisplayFormat>
  <FilmOrientation>PORTRAIT</FilmOrientation>
  <FilmSizeId>14INX17IN</FilmSizeId>
  <MagnificationType>REPLICATE</MagnificationType>
  <Trim>NO</Trim>
  <BorderDensity>BLACK</BorderDensity>
  <EmptyImageDensity>WHITE</EmptyImageDensity>
</BasicFilmBoxAttributes>
```

### `ImageDisplayFormat`
Specifies the layout of images on the film.

**Format:** `STANDARD\columns,rows`

**Examples:**
- `STANDARD\1,1` - Single image per film
- `STANDARD\2,2` - 2x2 grid (4 images)
- `STANDARD\3,4` - 3 columns, 4 rows (12 images)

### `FilmOrientation`
**Valid Values:** `PORTRAIT`, `LANDSCAPE`, `AUTO`
**Default:** `AUTO`

With `AUTO` (the default), the engine chooses `LANDSCAPE` or `PORTRAIT` per page based on each image's aspect ratio (landscape if width > height, otherwise portrait).

### `FilmSizeId`
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

Density of the border around images. May also be set to an integer density value in hundredths of OD (optical density).

### `EmptyImageDensity`
**Valid Values:** `BLACK`, `WHITE`

Density for empty image boxes when using multi-image layouts. May also be set to an integer density value in hundredths of OD (optical density).

### `MinDensity` / `MaxDensity`
**Type:** Integer (hundredths of OD)

Minimum and maximum optical density for the film box, expressed in hundredths of OD (e.g. `20` = 0.20 OD). Omitted unless set.

### `SmoothingType`
**Type:** Integer (printer-defined)

Smoothing algorithm identifier. Only sent when `MagnificationType` is `CUBIC`; otherwise omitted.

### `RequestedResolutionId`
**Valid Values:** `STANDARD`, `HIGH`

Requests the printer's standard or high resolution for the film box. Omitted unless set.

### `ConfigurationInformation`
**Type:** String (printer-defined)

Free-form configuration string interpreted by the printer. Consult your printer's Conformance Statement for supported values. Omitted unless set.

### `AnnotationDisplayFormatId` / `Illumination` / `ReflectedAmbientLight`

::: warning Never sent
These attributes are **never** transmitted to the printer. Annotation and presentation-LUT support are disabled in the print engine, so any values configured here are silently dropped.
:::

## Image Box Attributes

Image box attributes control individual image settings.

```xml
<BasicImageBoxAttributes>
  <Polarity>NORMAL</Polarity>
  <MagnificationType>REPLICATE</MagnificationType>
  <SmoothingType></SmoothingType>
</BasicImageBoxAttributes>
```

### `Polarity`
**Valid Values:** `NORMAL`, `REVERSE`

Controls whether the image is printed normally or inverted.

### `MagnificationType`
**Valid Values:** `REPLICATE`, `BILINEAR`, `CUBIC`, `NONE`

Specifies the image interpolation method when scaling individual images. Leave empty for the printer default.

### `SmoothingType`
Image smoothing algorithm. Only sent when `MagnificationType` is `CUBIC`; otherwise omitted.

### `RequestedImageSize`
**Type:** Decimal (millimetres)

Requested printed width of the image, in millimetres. Omitted unless set.

### `RequestedDecimateCropBehavior`
**Valid Values:** `DECIMATE`, `CROP`, `FAIL`

Controls how the printer handles an image larger than the image box: `DECIMATE` shrinks it to fit, `CROP` trims it, `FAIL` rejects it. Omitted unless set, so the printer SCP's own default applies.

### `ConfigurationInformation`
**Type:** String (printer-defined)

Free-form configuration string interpreted by the printer. Omitted unless set. Ignored in `Color` print mode.

### `MinDensity` / `MaxDensity`
**Type:** Integer (hundredths of OD)

Minimum and maximum optical density for individual image boxes, expressed in hundredths of OD (e.g. `20` = 0.20 OD). Omitted unless set, and ignored in `Color` print mode.

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
    <FilmSizeId>14INX17IN</FilmSizeId>
    <MagnificationType>BILINEAR</MagnificationType>
    <Trim>NO</Trim>
  </BasicFilmBoxAttributes>
  <BasicImageBoxAttributes>
    <Polarity>NORMAL</Polarity>
  </BasicImageBoxAttributes>
  <PrintMode>Grayscale8</PrintMode>
  <ConnectionParameters>
    <PeerAeTitle>FILM_PRINTER</PeerAeTitle>
    <MyAeTitle>DICOM_PRINTER</MyAeTitle>
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
    <FilmSizeId>14INX17IN</FilmSizeId>
    <MagnificationType>CUBIC</MagnificationType>
  </BasicFilmBoxAttributes>
  <PrintMode>Grayscale12</PrintMode>
  <ConnectionParameters>
    <PeerAeTitle>FILM_PRINTER</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
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
    <FilmSizeId>14INX17IN</FilmSizeId>
  </BasicFilmBoxAttributes>
  <PrintMode>Grayscale8</PrintMode>
  <ConnectionParameters>
    <PeerAeTitle>FILM_PRINTER</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
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
    <FilmSizeId>14INX17IN</FilmSizeId>
    <MagnificationType>BILINEAR</MagnificationType>
    <Trim>YES</Trim>
    <BorderDensity>BLACK</BorderDensity>
    <EmptyImageDensity>WHITE</EmptyImageDensity>
  </BasicFilmBoxAttributes>
  <PrintMode>Grayscale8</PrintMode>
  <ConnectionParameters>
    <PeerAeTitle>FILM_PRINTER</PeerAeTitle>
    <MyAeTitle>PRINTER</MyAeTitle>
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

  <If field="STORE_SUCCEEDED" value="1">
    <Statements>
      <!-- Only print if PACS storage succeeded -->
      <Perform action="PrintToFilm"/>
    </Statements>
  </If>
</Workflow>
```

## Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinterConfig SYSTEM "config.dtd">
<DicomPrinterConfig>
  <ActionsList>
    <!-- Query for patient -->
    <Query name="FindPatient" type="Worklist">
      <ConnectionParameters>
        <PeerAeTitle>RIS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Store to PACS -->
    <Store name="SendToPACS">
      <ConnectionParameters>
        <PeerAeTitle>PACS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
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
        <FilmSizeId>14INX17IN</FilmSizeId>
        <MagnificationType>CUBIC</MagnificationType>
        <Trim>NO</Trim>
      </BasicFilmBoxAttributes>
      <BasicImageBoxAttributes>
        <Polarity>NORMAL</Polarity>
      </BasicImageBoxAttributes>
      <PrintMode>Grayscale8</PrintMode>
      <ConnectionParameters>
        <PeerAeTitle>FILM_PRINTER</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.50</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <Resolution>300x300</Resolution>
    </Print>
  </ActionsList>

  <Workflow>
    <Perform action="FindPatient"/>
    <If field="QUERY_FOUND" value="1">
      <Statements>
        <Perform action="SendToPACS"/>
        <Perform action="PrintToFilm"/>
      </Statements>
    </If>
  </Workflow>
</DicomPrinterConfig>
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
