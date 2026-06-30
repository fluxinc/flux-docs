# Reference: Print (Basic Print SCU) + PrintText + PrintImage

`<Print>` sends the rendered job to a DICOM film/paper printer SCP. One `<Print>` per distinct
parameter set. `PrintText`/`PrintImage` burn text/overlays onto the pages (declare them as
actions and `Perform` them before Print).

## `<Print>` children

| element | values | default | notes |
|---|---|---|---|
| `<PrintMode>` | `Grayscale8` \| `Grayscale12` \| `Color` | Grayscale8 | case-insensitive; invalid → Grayscale8 |
| `<Resolution>` | `WxH` e.g. `300x300` | none | printer DPI; only rescales if set and differs |
| `<ConnectionParameters>` | — | — | required (see general.md) |
| `<BasicFilmSessionAttributes>` | block | — | see table |
| `<BasicFilmBoxAttributes>` | block | — | see table |
| `<BasicImageBoxAttributes>` | block | — | see table |
| `<Debug/>` | presence | off | diagnostic: dumps converted PNGs to temp |

> **Case-sensitivity:** the block names and their child tags are matched as **exact PascalCase**
> (`<BasicFilmBoxAttributes>`, `<FilmSizeId>`). A lowercase/misspelled child is silently dropped;
> a misspelled block name **fails the parse**. (`<NumberOfCopies>` is the one case-insensitive child.)

> **Defaults myth:** the PDF manual lists DICOM "defaults" (PORTRAIT, 8INX10IN, MED, PAPER, …).
> The engine does **not** send those — unset attributes are **omitted** and the printer SCP
> applies its own defaults. Only set what you actually need to override.

### BasicFilmSessionAttributes

| tag | values | engine default |
|---|---|---|
| `NumberOfCopies` | int | 1 |
| `PrintPriority` | HIGH, MED, LOW | (omitted) |
| `MediumType` | PAPER, CLEAR FILM, BLUE FILM, MAMMO CLEAR FILM, MAMMO BLUE FILM | (omitted) |
| `FilmDestination` | MAGAZINE, PROCESSOR, BIN_i | (omitted) |
| `FilmSessionLabel` | free text | "DICOM PRINTER PRINT SESSION" |
| `MemoryAllocation`, `OwnerId` | int / string | (omitted) |

### BasicFilmBoxAttributes

| tag | values | engine default |
|---|---|---|
| `ImageDisplayFormat` | `STANDARD\C,R` (C=**columns** first, R=rows), `ROW\…`, `COL\…`, `SLIDE`, `SUPERSLIDE`, `CUSTOM\i` | STANDARD\1,1 |
| `FilmOrientation` | PORTRAIT, LANDSCAPE, AUTO | AUTO (picks per page by aspect) |
| `FilmSizeId` | 8INX10IN, 8_5INX11IN, 10INX12IN, 10INX14IN, 11INX14IN, 11INX17IN, 14INX14IN, 14INX17IN, 24CMX24CM, 24CMX30CM, A4, A3 | "" (= job paper size) |
| `MagnificationType` | REPLICATE, BILINEAR, CUBIC, NONE | (omitted) |
| `SmoothingType` | SCP-defined int | (omitted; only with CUBIC) |
| `BorderDensity` / `EmptyImageDensity` | BLACK, WHITE, or int (hundredths OD) | (omitted) |
| `MinDensity` / `MaxDensity` | int (hundredths OD) | (omitted) |
| `Trim` | YES, NO | (omitted) — *this* `<Trim>` is the film-box boolean, not the Trim action |
| `RequestedResolutionId` | STANDARD, HIGH | (omitted) |
| `ConfigurationInformation` | SCP-defined | (omitted) |
| `AnnotationDisplayFormatId`, `Illumination`, `ReflectedAmbientLight` | — | **always ignored** (annotation/LUT support is off) |

### BasicImageBoxAttributes

| tag | values | engine default |
|---|---|---|
| `Polarity` | NORMAL, REVERSE | NORMAL |
| `MagnificationType` | REPLICATE, BILINEAR, CUBIC, NONE | (omitted) |
| `SmoothingType` | SCP-defined | (omitted; only with CUBIC) |
| `MinDensity` / `MaxDensity` / `ConfigurationInformation` | int / SCP | (omitted; ignored in Color mode) |
| `RequestedImageSize` | width mm (decimal) | (omitted) |
| `RequestedDecimateCropBehavior` | DECIMATE, CROP, FAIL | (omitted) |
| `ImageBoxPosition` | — | auto 1..N — **not XML-configurable** |

### Example

```xml
<Print name="PrintFilm">
  <PrintMode>Grayscale12</PrintMode>
  <ConnectionParameters>
    <MyAeTitle>DICOM_PRINTER</MyAeTitle><PeerAeTitle>FILM_SCP</PeerAeTitle>
    <Host>192.168.1.20</Host><Port>104</Port>
  </ConnectionParameters>
  <BasicFilmSessionAttributes>
    <NumberOfCopies>2</NumberOfCopies>
    <MediumType>BLUE FILM</MediumType>
    <FilmDestination>PROCESSOR</FilmDestination>
  </BasicFilmSessionAttributes>
  <BasicFilmBoxAttributes>
    <ImageDisplayFormat>STANDARD\2,2</ImageDisplayFormat>   <!-- 2 cols x 2 rows -->
    <FilmSizeId>14INX17IN</FilmSizeId>
    <FilmOrientation>PORTRAIT</FilmOrientation>
  </BasicFilmBoxAttributes>
</Print>
```

## `<PrintText>` — burn text onto every page

Child tags case-insensitive. `Text` supports `#{gggg,eeee}` placeholders. **X/Y/Width/Height
are percentages (0–100) of image size**, origin top-left, all four required.

| tag | values | default |
|---|---|---|
| `Text` | text + `#{gggg,eeee}` | "" |
| `X` / `Y` / `Width` / `Height` | 0–100 (% of image) | required |
| `Color` | hex `RRGGBB` or `AARRGGBB` | 0000FF (opaque blue) |
| `BackgroundColor` | hex (8-digit for alpha) | transparent |
| `FontHeight` | % of image height | 2 |
| `FontFamily` | font name | "Courier New" |
| `Alignment` | pipe list: Left,Right,Top,Bottom,HCenter,VCenter,Center | HCenter\|Top |

```xml
<PrintText name="Stamp">
  <Text>NOT FOR DIAGNOSTIC USE - #{0010,0010}</Text>
  <X>5</X><Y>2</Y><Width>90</Width><Height>10</Height>
  <Color>FF0000</Color><BackgroundColor>80FFFFFF</BackgroundColor>
  <FontHeight>3</FontHeight><Alignment>HCenter|Top</Alignment>
</PrintText>
```
Color is hex only (`FF0000`, not `red`). 6 digits → opaque; 8 digits → `AARRGGBB`.

## `<PrintImage>` — overlay/watermark an image

| tag | values | notes |
|---|---|---|
| `ImagePath` | file path | required; PNG alpha is honored (watermark) |
| `X` / `Y` / `Width` / `Height` | 0–100 (% of image) | required; **X+Width ≤ 100 and Y+Height ≤ 100** |
| `Aspect` | keep \| ignore | default keep |

```xml
<PrintImage name="Logo">
  <ImagePath>C:\dp2\logo.png</ImagePath>
  <X>80</X><Y>2</Y><Width>18</Width><Height>10</Height>
  <Aspect>keep</Aspect>
</PrintImage>
```
Note: PrintImage currently watermarks only the **first** page of a job.
