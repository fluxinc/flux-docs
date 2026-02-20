# DICOM Printer 2.2

## Configuration File Tags Specification

Version 2.2 — © 2008-2026 By Flux Inc. of Toronto, Canada

**Table of Contents**

# Chapter 1: Introduction

The scope of this document is to provide DICOM Printer users complex and detailed information about DICOM Printer configuration file elements. This specification should be delivered along with the DICOM Printer User Manual.

> **See also:** [DP2 Operator Guide](/dicom-printer-2/) for an overview of application architecture and workflows, and the [DICOM 3.0 Conformance Statement](/dicom-printer-2/conformance) for supported SOP classes and transfer syntaxes.

## Section: Conventions

Each tag is described in the same way, as follows:

- **Description**: Short description of the purpose of the element.
- **Occurrence**: How many times the element might occur within the scope of its parent.
- **Attributes**: A list of element attributes with a description or `None` if no attributes are provided.
- **Content**: A list of child elements or the type of the data required.
- **Default Value**: The default value used if this tag is not present. When a tag supports only child elements, `Not applicable` appears. `None` indicates that no default value is assigned.

## Section: Case Insensitivity

As of version 2.2.15, most configuration element names and attribute values are case-insensitive. For example, `<ColorMode mode="rgb">` and `<ColorMode mode="RGB">` are treated identically.

## Section: Tag Placeholder Syntax

Several configuration elements support **tag placeholders** — special tokens embedded in string values that are replaced at runtime with DICOM tag values or computed dates. This section documents all supported placeholder formats.

### DICOM Tag by Group and Element

- **Syntax**: `#{group,element}`
- **Description**: Replaced with the value of the specified DICOM tag from the current dataset. The group and element are hexadecimal numbers in standard DICOM notation. Whitespace around the group and element values is permitted.
- **Example**: `#{0010,0020}` — replaced with the Patient ID value (e.g., `PAT001`).
- **Supported in**: `<PrintText>` `<Text>`, `<Save>` `<Directory>`, `<Save>` `<Filename>`, `<Query>` `<DcmTag>` values.

### DICOM Tag by Name

- **Syntax**: `#{TagName}`
- **Description**: Replaced with the value of the DICOM tag identified by its standard dictionary name. The name must consist of letters only (no spaces or punctuation) and is looked up in the DCMTK data dictionary. Added in version 2.2.17.
- **Example**: `#{PatientName}` — replaced with the patient's name (e.g., `Doe^John`).
- **Supported in**: `<PrintText>` `<Text>`, `<Save>` `<Directory>`, `<Save>` `<Filename>`, `<Query>` `<DcmTag>` values.

### Current Date

- **Syntax**: `#{Date}`
- **Description**: Replaced with the current date in `YYYYMMDD` format.
- **Example**: `#{Date}` — replaced with `20260216` (if today is February 16, 2026).
- **Supported in**: `<PrintText>` `<Text>`, `<Save>` `<Directory>`, `<Save>` `<Filename>`, `<Query>` `<DcmTag>` values, `<SetTag>` content, `<Query>` nested sequence element values.

### Date with Offset

- **Syntax**: `#{Date,offset}`
- **Description**: Replaced with a date offset from the current date by the specified number of days. A negative offset produces a date in the past; a positive offset produces a date in the future. The result is in `YYYYMMDD` format.
- **Example**: `#{Date,-7}` — replaced with the date 7 days ago (e.g., `20260209`).
- **Supported in**: Same elements as `#{Date}`.

### Date Range

- **Syntax**: `#{Date,offset,range}`
- **Description**: Replaced with a DICOM date range string. The base date is computed as the current date plus the offset in days. The range parameter specifies the number of days before and after the base date to include. When the range value is greater than 1, the result is formatted as `YYYYMMDD-YYYYMMDD`. When the range is 0 or 1, the result is a single date.
- **Example**: `#{Date,-7,7}` — produces a 14-day range centered 7 days ago (e.g., `20260202-20260216`).
- **Supported in**: Same elements as `#{Date}`.

### Notes

- When a DICOM tag placeholder (`#{group,element}` or `#{TagName}`) is used in `<PrintText>`, the value is first looked up in the job-level dataset. If not found there, the image-level dataset is searched. If neither contains the tag, the placeholder is removed from the output text.
- When placeholders are used in `<Save>` `<Directory>` or `<Filename>`, any characters in the resolved value that are invalid in file names (such as `<`, `>`, `:`, `"`, `/`, `\`, `|`, `?`, `*`, and control characters) are automatically replaced with underscores.
- The `<SetTag>` content supports Date placeholders (`#{Date}`, `#{Date,offset}`, `#{Date,offset,range}`) but does not support DICOM tag value placeholders (`#{group,element}` or `#{TagName}`).
- The `<Notify>` `<Message>` element uses a different placeholder system based on positional `%1`, `%2`, etc. markers paired with `<Input>` tags, and does not support the `#{...}` placeholder syntax described here.

# Chapter 2: Config File Elements

All actions and parameters that are to be performed by DICOM Printer must be specified in the `config.xml` file structure described in the listing below. (See `config_conformation.xml` for the structure.)

## Section: `<General>`

- **Description**: Contains a set of application-related settings.
- **Occurrence**: One.
- **Attributes**: None
- **Content**:
  - `<CheckingInterval>` element.
  - `<SuspensionTime>` element.
  - `<ValidityPeriod>` element.
  - `<Verbosity>` element.
  - `<RegistrationKey>` element.
- **Default Value**: Not applicable

### Subsection: `<CheckingInterval>`

- **Description**: The number of seconds that DICOM Printer waits between successive checks of spool directory contents.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: Positive integer value.
- **Default Value**: None

### Subsection: `<SuspensionTime>`

- **Description**: The amount of time (in minutes) that a job remains suspended before resuming operation.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: Positive integer value.
- **Default Value**: None

### Subsection: `<ValidityPeriod>`

- **Description**: The amount of time (in days) after which a job expires and is deleted from the spooler.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: Positive integer value.
- **Default Value**: None

### Subsection: `<Verbosity>`

- **Description**: The level of detail included in log files. A value of 20 corresponds to full verbosity, but a value of 2 is recommended for regular operation.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: Positive integer value.
- **Default Value**: None

### Subsection: `<RegistrationKey>`

- **Description**: Your personal, computer-specific registration key.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: String value.
- **Default Value**: None

## Section: `<ActionsList>`

- **Description**: List of user-specified actions. These actions can be arranged into workflows that define overall application function.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: A list of elements.
- **Default Value**: Not applicable.

### Subsection: `<Print>`

- **Description**: Print action specification.
- **Occurrence**: Any.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<ConnectionParameters>`,
  - `<PrintMode>`,
  - `<Resolution>`,
  - `<BasicFilmSessionAttributes>`,
  - `<BasicFilmBoxAttributes>`,
  - `<BasicImageBoxAttributes>`.
- **Default Value**: Not applicable.

#### Subsubsection: `<ConnectionParameters>`

- **Description**: DICOM connection and association parameters.
- **Occurrence**: One.
- **Attributes**: None
- **Content**:
  - `<MyAeTitle>`,
  - `<PeerAeTitle>`,
  - `<Host>`,
  - `<Port>`,
  - `<MaxPdu>`,
  - `<BlockingMode>`,
  - `<AssociationTimeout>`,
  - `<DimseTimeout>`.
- **Default Value**: None

**Paragraph: `<MyAeTitle>`**

- **Description**: Calling Application Entity title.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: Constant character value.
- **Default Value**: None

**Paragraph: `<PeerAeTitle>`**

- **Description**: Called Application Entity title.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: Constant character value.
- **Default Value**: None

**Paragraph: `<Host>`**

- **Description**: Printer's host address.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: Constant character value or IP address.
- **Default Value**: None

**Paragraph: `<Port>`**

- **Description**: Printer's host listening port.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: Positive integer value.
- **Default Value**: None

**Paragraph: `<MaxPdu>`**

- **Description**: Maximum number of Protocol Data Units.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Positive integer value.
- **Default Value**: 16384.

**Paragraph: `<BlockingMode>`**

- **Description**: DIMSE blocking mode.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - BLOCKING,
  - NONBLOCKING.
- **Default Value**: BLOCKING.

**Paragraph: `<AssociationTimeout>`**

- **Description**: Association establishment timeout.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Number of seconds or -1 for infinity.
- **Default Value**: 1.

**Paragraph: `<DimseTimeout>`**

- **Description**: DIMSE message exchange connection timeout.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Number of seconds or -1 for infinity.
- **Default Value**: 1.

#### Subsubsection: `<PrintMode>`

- **Description**: Printer's supported print mode.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: Enumerated values:
  - `Grayscale8`,
  - `Grayscale12`,
  - `Color`.
- **Default Value**: None

#### Subsubsection: `<Resolution>`

- **Description**: Printer's resolution.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: Resolution in horizontal DPI x vertical DPI format, e.g. `650 x 650`.
- **Default Value**: None

#### Subsubsection: `<BasicFilmSessionAttributes>`

- **Description**: Film session presentation module attributes.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**:
  - `<NumberOfCopies>`,
  - `<PrintPriority>`,
  - `<MediumType>`,
  - `<FilmDestination>`,
  - `<FilmSessionLabel>`,
  - `<MemoryAllocation>`,
  - `<OwnerId>`.
- **Default Value**: None

**Paragraph: `<NumberOfCopies>`**

- **Description**: Number of copies of each film to be printed in the film session.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Positive integer value.
- **Default Value**: 1.

**Paragraph: `<PrintPriority>`**

- **Description**: The priority of the print job.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated Values:
  - HIGH
  - MED
  - LOW
- **Default Value**: MED.

**Paragraph: `<MediumType>`**

- **Description**: Type of medium on which the print job will be printed.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - PAPER,
  - CLEAR FILM,
  - BLUE FILM,
  - MAMMO CLEAR FILM,
  - MAMMO BLUE FILM.
- **Default Value**: PAPER.

**Paragraph: `<FilmDestination>`**

- **Description**: Film destination.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - MAGAZINE : the exposed film is stored in film magazine,
  - PROCESSOR : the exposed film is developed in film processor,
  - BIN_i : the exposed film is deposited in a sorter bin where `i` represents the bin number. Film sorter BINs shall be numbered sequentially starting from one and no maximum is placed on the number of BINs. The encoding of the BIN number shall not contain leading zeros.
- **Default Value**: MAGAZINE.

**Paragraph: `<FilmSessionLabel>`**

- **Description**: Human-readable label that identifies the film session.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Constant character data.
- **Default Value**: DICOM PRINTER FILM SESSION.

**Paragraph: `<MemoryAllocation>`**

- **Description**: Amount of memory allocated for the film session. Please note that insufficient memory allocation may result in failure to print highly-detailed images.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Integer value, expressed in KB.
- **Default Value**: None

**Paragraph: `<OwnerId>`**

- **Description**: Identification of the owner of the film session.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Constant character data.
- **Default Value**: None

#### Subsubsection: `<BasicFilmBoxAttributes>`

- **Description**: Film box presentation module attributes.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**:
  - `<ImageDisplayFormat>`,
  - `<AnnotationDisplayFormatId>`,
  - `<FilmOrientation>`,
  - `<FilmSizeId>`,
  - `<MagnificationType>`,
  - `<SmoothingType>`,
  - `<BorderDensity>`,
  - `<EmptyImageDensity>`,
  - `<MinDensity>`,
  - `<MaxDensity>`,
  - `<Trim>`,
  - `<ConfigurationInformation>`,
  - `<Illumination>`,
  - `<ReflectedAmbientLight>`,
  - `<RequestedResolutionId>`.
- **Default Value**: None

**Paragraph: `<ImageDisplayFormat>`**

- **Description**: Type of image display format.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - STANDARD\C,R : film contains equal size rectangular image boxes with R rows of image boxes and C columns of image boxes; C and R are integers,
  - ROW\R1,R2,R3, etc. : film contains rows with equal size rectangular image boxes with R1 image boxes in the first row, R2 image boxes in second row, R3 image boxes in third row, etc.; R1, R2, R3, etc. are integers,
  - COL\C1,C2,C3, etc. : film contains columns with equal size rectangular image boxes with C1 image boxes in the first column, C2 image boxes in second column, C3 image boxes in third column, etc.; C1, C2, C3, etc. are integers,
  - SLIDE : film contains 35mm slides; the number of slides for a particular film size is configuration dependent,
  - SUPERSLIDE : film contains 40mm slides; the number of slides for a particular film size is configuration dependent,
  - CUSTOM\i : film contains a customized ordering of rectangular image boxes; i identifies the image display format; the definition of the image display formats is defined in the Conformance Statement; i is an integer.
- **Default Value**: STANDARD\1,1.

**Paragraph: `<AnnotationDisplayFormatId>`**

- **Description**: Identification of annotation display format.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: The definition of the annotation display formats and the annotation box position sequence are defined in the Conformance Statement.
- **Default Value**: None

**Paragraph: `<FilmOrientation>`**

- **Description**: Film orientation.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - PORTRAIT : vertical film position,
  - LANDSCAPE : horizontal film position.
- **Default Value**: PORTRAIT.

**Paragraph: `<FilmSizeId>`**

- **Description**: Film size identification.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - 8INX10IN,
  - 8_5INX11IN,
  - 10INX12IN,
  - 10INX14IN,
  - 11INX14IN,
  - 11INX17IN,
  - 14INX14IN,
  - 14INX17IN,
  - 24CMX24CM,
  - 24CMX30CM,
  - A4,
  - A3.
- **Default Value**: 8INX10IN.

**Paragraph: `<MagnificationType>`**

- **Description**: Interpolation type by which the printer magnifies or decimates the image in order to fit the image in the image box on film.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - REPLICATE,
  - BILINEAR,
  - CUBIC,
  - NONE.
- **Default Value**: NONE.

**Paragraph: `<SmoothingType>`**

- **Description**: Further specifies the type of the interpolation function.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Values are defined in Conformance Statement. Only valid for Magnification Type = CUBIC.
- **Default Value**: None

**Paragraph: `<BorderDensity>`**

- **Description**: Density of the film areas surrounding and between images on the film.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - BLACK,
  - WHITE,
  - i : where i represents the desired density in hundreds of OD (e.g. 150 corresponds with 1.5 OD).
- **Default Value**: BLACK.

**Paragraph: `<EmptyImageDensity>`**

- **Description**: Density of the image box area on the film that contains no image.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - BLACK,
  - WHITE,
  - i : where i represents the desired density in hundreds of OD (e.g. 150 corresponds with 1.5 OD).
- **Default Value**: BLACK.

**Paragraph: `<MinDensity>`**

- **Description**: Minimum density of the images on the film.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Expressed in hundredths of OD. If Min Density is lower than minimum printer density than Min Density is set to minimum printer density.
- **Default Value**: None

**Paragraph: `<MaxDensity>`**

- **Description**: Maximum density of the images on the film.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Expressed in hundredths of OD. If Max Density is higher than maximum printer density than Max Density is set to maximum printer density.
- **Default Value**: None

**Paragraph: `<Trim>`**

- **Description**: Specifies whether a trim box shall be printed surrounding each image on the film.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - YES,
  - NO.
- **Default Value**: YES.

**Paragraph: `<ConfigurationInformation>`**

- **Description**: Configuration information.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Character string that contains either the ID of the printer configuration table that contains a set of values for implementation specific print parameters (e.g. perception LUT related parameters) or one or more configuration data values, encoded as characters. If there are multiple configuration data values encoded in the string, they shall be separated by backslashes. The definition of values shall be contained in the SCP's Conformance Statement.
- **Default Value**: None

**Paragraph: `<Illumination>`**

- **Description**: Luminance of the lightbox illuminating a piece of transmissive film, or for the case of reflective media, luminance obtainable from diffuse reflection of the illumination present.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Expressed as L0, in candelas per square meter (cd/m2).
- **Default Value**: None

**Paragraph: `<ReflectedAmbientLight>`**

- **Description**: For transmissive film, luminance contribution due to reflected ambient light.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Expressed as La, in candelas per square meter (cd/m2).
- **Default Value**: None

**Paragraph: `<RequestedResolutionId>`**

- **Description**: Specifies the resolution at which images in this Film Box are to be printed.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - STANDARD : approximately 4k x 5k printable pixels on a 14 x 17 inch film,
  - HIGH : Approximately twice the resolution of STANDARD.
- **Default Value**: None

#### Subsubsection: `<BasicImageBoxAttributes>`

- **Description**: Image box pixel presentation module attributes.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**:
  - `<Polarity>`,
  - `<MagnificationType>`,
  - `<SmoothingType>`,
  - `<ConfigurationInformation>`,
  - `<RequestedImageSize>`,
  - `<Illumination>`.
- **Default Value**: None

**Paragraph: `<Polarity>`**

- **Description**: Specifies whether minimum pixel values (after VOI LUT transformation) are to printed black or white.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - NORMAL : pixels shall be printed as specified by the Photometric Interpretation,
  - REVERSE : pixels shall be printed with the opposite polarity as specified by the Photometric Interpretation.
- **Default Value**: NORMAL.

**Paragraph: `<MagnificationType>`**

- **Description**: Interpolation type by which the printer magnifies or decimates the image in order to fit the image in the image box on film.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - REPLICATE,
  - BILINEAR,
  - CUBIC,
  - NONE.
- **Default Value**: NONE.

**Paragraph: `<SmoothingType>`**

- **Description**: Further specifies the type of the interpolation function.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Values are defined in Conformance Statement. Only valid for Magnification Type = CUBIC.
- **Default Value**: None

**Paragraph: `<ConfigurationInformation>`**

- **Description**: Configuration information.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Character string that contains either the ID of the printer configuration table that contains a set of values for implementation specific print parameters (e.g. perception LUT related parameters) or one or more configuration data values, encoded as characters. If there are multiple configuration data values encoded in the string, they shall be separated by backslashes. The definition of values shall be contained in the SCP's Conformance Statement.
- **Default Value**: None

**Paragraph: `<RequestedImageSize>`**

- **Description**: Requested image size.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Width (x-dimension) in mm of the image to be printed. This value overrides the size that corresponds with optimal filling of the Image Box.
- **Default Value**: None

**Paragraph: `<RequestedDecimateCropBehavior>`**

- **Description**: Specifies whether image pixels are to be decimated or cropped if the image rows or columns is greater than the available printable pixels in an Image Box. Decimation means that a magnification factor < 1 is applied to the image. The method of decimation shall be that specified by Magnification Type or the SCP default if not specified. Cropping means that some image rows and/or columns are deleted before printing.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - DECIMATE : a magnification factor < 1 to be applied to the image,
  - CROP : some image rows and/or columns are to be deleted before printing. The specific algorithm for cropping shall be described in the SCP Conformance Statement,
  - FAIL : the SCP shall not crop or decimate.
- **Default Value**: DECIMATE.

### Subsection: `<Query>`

- **Description**: Performs a DICOM C-FIND query to retrieve information from a remote SCP (Service Class Provider). This action supports various query levels and allows for complex filtering of results using DICOM tags and patterns. Query results are first retrieved from the remote SCP, then filtered locally against any patterns specified in `<DcmTag>` elements.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
  - `type` : query type. Enumerated values: `Study`, `Worklist`, or `Patient`.
  - `forceAssignment` or `force-assignment` (Optional): A boolean value (`true` or `false`). If `true` and the query returns multiple results, the first result will be used. If `false` (default) and multiple results are found, a warning will be logged, and no tags will be assigned.
- **Content**:
  - `<ConnectionParameters>`: Defines the DICOM connection and association parameters for communicating with the SCP. Refer to the [Connection Parameters](#subsubsection-connectionparameters) section for details.
  - `<DcmTag>`: Specifies a DICOM tag to include in the query or to use as a local filter for the results. Each `<DcmTag>` can define a specific tag, a pattern to match its value, and whether it is an exclusion filter.
    - **Attributes for `<DcmTag>`**:
      - `tag` : DICOM tag group and element written in standard notation, e.g: `(0010,0020)`.
    - **Content of `<DcmTag>`**: The text content of the element specifies a pattern to match the value of the DICOM tag. If the element is empty, the tag is included in the query but no local filtering is applied. Supported pattern types:
      - **Exact match**: The pattern must exactly equal the tag value (e.g., `CT`). All pattern matching is **case-insensitive**.
      - **Wildcard match**: `*` matches any sequence of characters (e.g., `John*` matches `John Doe`, `Johnny`). **Multiple wildcards** are supported in a single pattern (e.g., `*CHEST*` matches `AP CHEST PORTABLE`).
      - **Range match**: `low-high` (e.g., `20260101-20260131` for dates, `A-M` for strings). Either `low` or `high` can be omitted (e.g., `-20260131` for values up to a date).
      - **Regular expression**: Patterns containing regex metacharacters (`^`, `$`, `[`, `]`, `(`, `)`, `{`, `}`, `+`, `|`) are interpreted as regular expressions and matched case-insensitively against the full value.
      - **Negation prefix (`!`)**: Prefixing the pattern content with `!` inverts the filter into an exclusion filter. Results whose tag value matches the pattern (after stripping `!`) will be excluded. For example, `!CT` excludes results where the tag value is `CT`, and `!*CHEST*` excludes results containing `CHEST`. The `!` prefix is stripped before the pattern is evaluated.
    - **Content of `<DcmTag>` (for sequences)**: When the `tag` attribute refers to a DICOM sequence tag, use `<DcmSequence>` instead (see below).
  - `<DcmSequence>`: Specifies a DICOM sequence tag to include in the query. Contains nested `<DcmItem>` elements, each of which contains `<DcmTag>` elements defining the attributes within the sequence items.
    - **Attributes for `<DcmSequence>`**:
      - `tag` : DICOM sequence tag in standard notation, e.g: `(0040,0100)`.
    - **Content**: One or more `<DcmItem>` elements, each containing `<DcmTag>` elements for the sequence item attributes.
- **Default Value**: Not applicable.

**Example — Study-level query with local filters:**

```xml
<Query name="FindStudy" type="Study">
    <ConnectionParameters>
        <PeerAeTitle>PACS_SCP</PeerAeTitle>
        <Host>192.168.1.100</Host>
        <Port>104</Port>
    </ConnectionParameters>
    <DcmTag tag="(0010,0020)" />           <!-- Patient ID — sent to SCP, no local filter -->
    <DcmTag tag="(0008,0060)">CT</DcmTag>  <!-- Modality — filter results to CT only -->
    <DcmTag tag="(0008,1030)">!*SCOUT*</DcmTag>  <!-- Exclude studies with SCOUT in description -->
</Query>
```

### Subsection: `<Store>`

- **Description**: Stores images from the current job on a Storage SCP (Service Class Provider) using the SC Image Storage SOP Class. This action prepares the dataset to conform to DICOM standards and supports various color modes and compression types. As of version 2.2.27, images and PDFs are stored in separate DICOM series, each with a unique Series Instance UID. Each instance is assigned a unique instance number, and series numbers are sequential starting at 1 (unless a series number was previously set in the dataset).
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<ConnectionParameters>`: Defines the DICOM connection and association parameters for communicating with the SCP. Refer to the [Connection Parameters](#subsubsection-connectionparameters) section for details.
  - `<ColorMode>`: Specifies the color mode used for stored images, controlling how pixel data is encoded.
    - **Attributes for `<ColorMode>`**:
      - `mode` : color mode. Enumerated values:
        - `RGB`: 24-bit RGB color (3 samples per pixel, 8 bits allocated/stored).
        - `Monochrome8`: 8-bit grayscale (1 sample per pixel, 8 bits allocated/stored).
        - `Monochrome12`: 12-bit grayscale (1 sample per pixel, 16 bits allocated, 12 bits stored).
  - `<Compression>`: Specifies the compressed transfer syntax used during association.
    - **Attributes for `<Compression>`**:
      - `type` : compression type. Enumerated values:
        - `RLE`: RLE Lossless compression.
        - `JPEG_Lossy`: JPEG Baseline Process 1 lossy compression.
        - `JPEG_Lossless`: JPEG Lossless, Non-Hierarchical, First-Order Prediction.
- **Default Value**: Not applicable.

#### Subsubsection: `<ConnectionParameters>`

See section: Connection Parameters.

#### Subsubsection: `<ColorMode>`

- **Description**: Color mode used for stored images. Controls how pixel data is encoded and stored in DICOM format.
- **Occurrence**: Zero or one.
- **Attributes**:
  - `mode` : color mode. Enumerated values:
    - RGB : 24-bit RGB color (3 samples per pixel, 8 bits allocated/stored),
    - Monochrome8 : 8-bit grayscale (1 sample per pixel, 8 bits allocated/stored),
    - Monochrome12 : 12-bit grayscale (1 sample per pixel, 16 bits allocated, 12 bits stored).
- **Content**: Empty tag.
- **Default Value**: RGB.

#### Subsubsection: `<Compression>`

- **Description**: Compressed transfer syntax used during association.
- **Occurrence**: Zero or one.
- **Attributes**:
  - `type` : compression type. Enumerated values:
    - RLE : RLE Lossless compression,
    - JPEG_Lossy : JPEG Baseline Process 1 lossy compression,
    - JPEG_Lossless : JPEG Lossless, Non-Hierarchical, First-Order Prediction.
- **Content**: Empty tag.
- **Default Value**: No compression (uncompressed transfer syntax)

### Subsection: `<ParseJobTextFile>`

- **Description**: Parse job text file action. This action parses any extracted print job text data.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<DcmElement>`.
- **Default Value**: Not applicable.

#### Subsubsection: `<DcmElement>`

- **Description**: DICOM tag.
- **Occurrence**: One or more.
- **Attributes**:
  - `tag` : DICOM tag group and element identifiers written in standard notation, e.g: `(20, 7F)`.
- **Content**: Regular expression with one group.
- **Default Value**: None

### Subsection: `<ParseJobFileName>`

- **Description**: Parse job file name action. This action parses the print spooler job name for data, e.g., Adobe Acrobat provides the name of each printed PDF as the spooler job name, where FileName.PDF becomes just "FileName". Print job name assignment from other applications will vary considerably.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
  - `defaultReplacePattern` (Optional): The default regular expression replacement pattern to use for capturing groups within `<DcmElement>`s. Defaults to `\1`.
  - `defaultTransformation` (Optional): The default transformation to apply to extracted values. Accepted values are `toupper`, `tolower`, or `None`. Defaults to `None`.
- **Content**:
  - `<DcmElement>`.
- **Default Value**: Not applicable.

#### Subsubsection: `<DcmElement>`

- **Description**: DICOM tag to extract data into. The content of this element is a regular expression.
- **Occurrence**: One or more.
- **Attributes**:
  - `tag` : DICOM tag group and element identifiers written in standard notation, e.g: `(20, 7F)`.
  - `mandatory` (Optional): If this attribute is present (e.g., `mandatory="true"`), the tag must be found and extracted. If not found, the `ParseJobFileName` action will fail.
  - `replacePattern` (Optional): A regular expression replacement pattern for capturing groups within the element's content. Overrides `defaultReplacePattern`. Defaults to `\1`.
  - `transform` (Optional): A transformation to apply to the extracted value. Accepted values are `toupper`, `tolower`, or `None`. Overrides `defaultTransformation`. Defaults to `None`.
- **Content**: Regular expression with one capturing group. This regular expression is applied to the job file name.
- **Default Value**: None

### Subsection: `<PrintText>`

- **Description**: Prints configuration-specified text onto each image in the current job. Supports dynamic content insertion using DICOM tag placeholders (e.g., `#{ group, element }`).
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<Text>`: Text message to be printed on every image. Can include DICOM tag placeholders like `#{ 0010,0020 }` (Patient ID) which will be replaced with actual values from the job or image dataset.
  - `<X>`: X coordinate of the message bounding box, given by the percentage of the full image width (0-100).
  - `<Y>`: Y coordinate of the message bounding box, given by the percentage of the full image height (0-100).
  - `<Width>`: The width of the message bounding box, given by the percentage of the full image width (0-100).
  - `<Height>`: The height of the message bounding box, given by the percentage of the full image height (0-100).
  - `<Color>` (Optional): The color of the printed text, specified as a hexadecimal RGBA value (e.g., `0000FFFF` for opaque blue). Defaults to opaque blue (`0000FF`).
  - `<BackgroundColor>` (Optional): The background color of the text bounding box, specified as a hexadecimal RGBA value (e.g., `FF000080` for semi-transparent red). Defaults to transparent (`00000000`).
  - `<FontHeight>` (Optional): The height of the font as a percentage of the overall image height (e.g., `2.0` for 2%). Defaults to `2.0`.
  - `<Alignment>` (Optional): Text alignment within the bounding box. Can be a combination of values separated by `|` (e.g., `HCenter|Top`). Supported values:
    - `HCenter`
    - `VCenter`
    - `Center` (combination of `HCenter` and `VCenter`)
    - `Top`
    - `Bottom`
    - `Left`
    - `Right`
    Defaults to `HCenter|Top`.
  - `<FontFamily>` (Optional): The font family to use for the text (e.g., `Courier New`, `Helvetica`, `Times`). Defaults to `Courier New`.
- **Default Value**: Not applicable.

### Subsection: `<Rotate>`

- **Description**: Rotates each image clockwise by a specified angle. The angle must be a multiple of 90 degrees.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<Angle>`: The number of degrees by which the images will be rotated clockwise. Must be an integer value divisible by 90.
- **Default Value**: Not applicable.

### Subsection: `<SetTag>`

- **Description**: Assigns a specified value to a DICOM tag. This action can set both standard and private DICOM tags, with options to control replacement behavior and whether the tag is applied globally to the job or uniquely to each image instance.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
  - `tag` : DICOM tag group and element written in standard notation, e.g: `(0010,0020)`.
  - `tagName` (Optional): A name for the tag. Required when defining private tags (odd group number).
  - `vr` (Optional): Value Representation (VR) of the tag (e.g., `LO`, `PN`, `DT`). Required for private tags.
  - `replace` (Optional): A boolean value (`true` or `false`) indicating whether to replace an existing tag value. Defaults to `false` (append).
  - `unique` (Optional): A boolean value (`true` or `false`) indicating if the tag should be set uniquely for each image in the job (`true`) or globally for the entire job (`false`). Defaults to `false` (global).
- **Content**: The character string value to be assigned to the DICOM tag. This can include DICOM tag placeholders (e.g., `#{ 0010,0020 }`) which will be replaced with actual values from the job dataset.
- **Default Value**: Not applicable.

### Subsection: `<SetSequence>`

- **Description**: Inserts or replaces a DICOM sequence (with nested items and tags) in the job dataset. Supports full tag and date placeholder substitution within item tag values.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
  - `tag` : DICOM tag group and element written in standard notation, e.g: `(0032,1064)`.
  - `tagName` (Optional): A name for the sequence tag. Required when defining private tags (odd group number).
  - `vr` (Optional): Value Representation (VR). Usually inferred from the DICOM dictionary. Required for private tags.
  - `replace` (Optional): `"true"` to replace an existing sequence with the same tag; `"false"` to append. Defaults to `"false"`.
  - `unique` (Optional): `"true"` to write a separate sequence per image instance; `"false"` for a single sequence applied to all instances. Defaults to `"false"`.
- **Content**: One or more `<DcmItem>` child elements. Each `<DcmItem>` may contain `<DcmTag>` elements (with `tag` attribute and text value) and nested `<DcmSequence>` elements for deeply nested structures.
- **Default Value**: Not applicable.

**Example:**
```xml
<SetSequence name="SetProcedureCode" tag="(0032,1064)" replace="true">
  <DcmItem>
    <DcmTag tag="(0008,0100)">#{ProcedureCodeValue}</DcmTag>
    <DcmTag tag="(0008,0104)">#{ProcedureDescription}</DcmTag>
  </DcmItem>
</SetSequence>
```

See [SetSequence Action](/dicom-printer-2/actions/setsequence) for full usage details.

### Subsection: `<Trim>`

- **Description**: Trims (crops) each image in the job by a specified amount from its left, right, top, and/or bottom sides. It supports both fixed pixel values and an "auto" mode to automatically detect and trim empty borders.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<Left>` (Optional): The amount of space, in pixels, to be trimmed from the left side of the image. Can be a positive integer or `auto`.
  - `<Right>` (Optional): The amount of space, in pixels, to be trimmed from the right side of the image. Can be a positive integer or `auto`.
  - `<Top>` (Optional): The amount of space, in pixels, to be trimmed from the top side of the image. Can be a positive integer or `auto`.
  - `<Bottom>` (Optional): The amount of space, in pixels, to be trimmed from the bottom side of the image. Can be a positive integer or `auto`.
- **Default Value**: `0` for all sides if not specified, meaning no trimming.

### Subsection: `<Resize>`

- **Description**: Resizes each image in the job to the specified pixel dimensions. It supports maintaining or ignoring the aspect ratio during resizing.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<Width>`: The target width of the resized image in pixels. Must be a positive integer.
  - `<Height>`: The target height of the resized image in pixels. Must be a positive integer.
  - `<Aspect>` (Optional): Aspect ratio behavior during resizing. Enumerated values:
    - `KEEP`: Maintains the original aspect ratio, fitting the image within the specified `Width` and `Height` without distortion. This is the default behavior.
    - `IGNORE`: Ignores the original aspect ratio, stretching or compressing the image to exactly match the specified `Width` and `Height`.
- **Default Value**: Not applicable.

### Subsection: `<Run>`

- **Description**: Action specification for launching and interacting with external executable programs or scripts. This action supports two primary modes for communication.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
  - `type` : communication mode. Enumerated values:
    - `Console` : communicates via standard input (STDIN) and standard output (STDOUT).
    - `Interactive` : leverages the PluginsLauncher System for structured TCP-based communication.
  - `resolveHostNameAutomatically` (Optional, only for `Interactive` type): If set to `"true"`, automatically resolves the client host name for the PluginsLauncher connection. Defaults to `false`.
- **Content**:
  - `<Command>`: The path to the executable program or script to be run.
  - `<Timeout>` (Optional): The maximum time in milliseconds to wait for the external process to start, finish, or for data to be written/read. Defaults to `10000` (10 seconds).
  - `<Arguments>` (Optional): Command-line arguments to pass to the external program. Multiple arguments should be separated by `|`.
  - `<Input>`: Specifies a DICOM tag whose value will be sent to the external program\'s standard input. Each `<Input>` element has a `tag` attribute.
    - **Attributes for `<Input>`**:
      - `tag` : DICOM tag group and element identifiers in standard notation (e.g., `(0010,0020)`).
  - `<Output>`: Specifies a DICOM tag where output from the external program\'s standard output will be stored. Each `<Output>` element has a `tag` attribute and an optional `type` attribute.
    - **Attributes for `<Output>`**:
      - `tag` : DICOM tag group and element identifiers in standard notation (e.g., `(0010,0020)`).
      - `type` (Optional): Specifies how the output should be handled. Enumerated values:
        - `Unique`: The output value will be applied to each image instance in the job. If there are multiple images, the external program is expected to output a value for each image on a new line.
        - `Global`: The output value will be applied once to the entire job. This is the default.
- **Default Value**: Not applicable.

### Subsection: `<Notify>`

- **Description**: Notification action that extends the Run action to provide specialized notification functionality through the PluginsLauncher system. This action is designed for sending notifications and alerts to users or external systems.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<Message>`: The notification message to be sent. This can include DICOM tag placeholders (e.g., `#{0010,0020}`) which will be replaced with actual values from the job dataset.
- **Default Value**: Not applicable.

### Subsection: `<AddInstance>`

- **Description**: Creates and adds a new DICOM instance to the current job by loading an image file and converting it to DICOM format. This action supports canvas creation with configurable dimensions and background color, and allows precise control over instance insertion order.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<ImagePath>`: The file system path to the source image file to be converted to DICOM format. Supports common image formats (JPEG, PNG, BMP, etc.).
  - `<Width>`: The target width in pixels for the created DICOM instance. Must be a positive integer.
  - `<Height>`: The target height in pixels for the created DICOM instance. Must be a positive integer.
  - `<CanvasColor>` (Optional): The background color for the canvas, specified as a hexadecimal RGB value (e.g., `FFFFFF` for white, `000000` for black). Defaults to white (`FFFFFF`).
  - `<InsertionIndex>` (Optional): Controls where the new instance is inserted in the job's instance list. Enumerated values:
    - `-1`: Insert at the end of the list (default behavior).
    - `0`: Insert at the beginning of the list.
    - Positive integer: Insert at the specified index position.
- **Default Value**: Not applicable.

### Subsection: `<PrintImage>`

- **Description**: Prints (overlays) a watermark image onto each image in the current job. This action supports image scaling and positioning within specified bounding rectangles while maintaining aspect ratio control.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<ImagePath>`: The file system path to the watermark image file to be overlaid. Supports common image formats (JPEG, PNG, BMP, etc.).
  - `<X>`: X coordinate of the watermark bounding box, given as pixels from the left edge of the image.
  - `<Y>`: Y coordinate of the watermark bounding box, given as pixels from the top edge of the image.
  - `<Width>`: The width of the watermark bounding box in pixels. The watermark image will be scaled to fit within this width.
  - `<Height>`: The height of the watermark bounding box in pixels. The watermark image will be scaled to fit within this height.
  - `<AspectRatioMode>` (Optional): Controls how the watermark image is scaled within the bounding box. Enumerated values:
    - `IgnoreAspectRatio`: Scale image to exactly fit the bounding box, potentially distorting the image.
    - `KeepAspectRatio`: Scale image to fit within bounding box while maintaining original aspect ratio (default).
    - `KeepAspectRatioByExpanding`: Scale image to fill bounding box while maintaining aspect ratio, potentially cropping the image.
- **Default Value**: Not applicable.

### Subsection: `<Save>`

- **Description**: Saves the images from the current job to a DICOM File Set (DICOMDIR structure) on disk. The action creates or appends to a DICOMDIR file in the target directory and stores each image as a Secondary Capture instance. Alternatively, the action can save jobs in their original DXI format by copying all associated job files to the target directory.
- **Occurrence**: Zero or more.
- **Attributes**:
  - `name` : a unique identifier by which this action can be referred to by other entities.
- **Content**:
  - `<Directory>`,
  - `<Filename>`,
  - `<Format>`.
- **Default Value**: Not applicable.

#### Subsubsection: `<Directory>`

- **Description**: The file system path to the directory where the DICOM File Set will be stored. The directory will be created automatically if it does not exist. Supports DICOM tag placeholders (e.g., `#{0010,0020}` for Patient ID or `#{PatientName}`) which will be replaced with actual values from the dataset, allowing dynamic directory structures per patient or study. Invalid file name characters in placeholder values are automatically replaced with underscores.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: String value representing a directory path, optionally containing DICOM tag placeholders.
- **Default Value**: None

#### Subsubsection: `<Filename>`

- **Description**: The filename pattern used for saved DICOM files. Supports DICOM tag placeholders (e.g., `#{0010,0020}` or `#{PatientName}`) which will be replaced with actual values from the dataset. A sequential number is automatically appended to ensure unique filenames. Invalid file name characters in placeholder values are automatically replaced with underscores.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: String value representing a filename pattern, optionally containing DICOM tag placeholders.
- **Default Value**: `DP`

#### Subsubsection: `<Format>`

- **Description**: The output format for saved files. When set to `DXI`, the action copies the original job files (DXI file and all associated image and data files) to the target directory instead of creating a DICOM File Set.
- **Occurrence**: Zero or one.
- **Attributes**: None
- **Content**: Enumerated values:
  - `DXI` : save the original job files in DXI format.
- **Default Value**: DICOM File Set format (DICOMDIR).

## Section: `<Workflow>`

- **Description**: Defines the workflow structure that controls the sequence and logic of action execution. The workflow contains various nodes that implement conditional logic, action execution, and job control mechanisms.
- **Occurrence**: One.
- **Attributes**: None
- **Content**: A combination of workflow control nodes that define the processing logic.
- **Default Value**: Not applicable.

### Subsection: `<Perform>`

- **Description**: Executes a specified action with configurable error handling behavior. This is the primary workflow node for action execution.
- **Occurrence**: Zero or more within workflow.
- **Attributes**:
  - `action` (Required): The name of the action to execute. Must match the `name` attribute of an action defined in `<ActionsList>`.
  - `onError` (Optional): Specifies the behavior when the action fails. Enumerated values:
    - `Hold` : maintains job in current state, preventing further processing until manual intervention. This is the default.
    - `Ignore` : continues workflow execution despite action failure, logging error for audit.
    - `Suspend` : temporarily halts job processing, allowing automatic retry after configured delay.
    - `Discard` : terminates job processing and removes job from queue permanently.
- **Content**:
  - `<Query>` (Optional): A nested Query configuration that overrides the tags of the referenced Query action for this specific execution. When present, the `<Perform>` node clones the referenced Query action, applies the nested `<DcmTag>` overrides, and executes the cloned copy. This allows running the same Query action with different tag values at different points in the workflow. Only Query-type actions (`Study`, `Worklist`, and `Patient`) support nested configuration. Added in version 2.2.18.
- **Default Value**: Not applicable.

**Example — Basic perform:**

```xml
<Perform action="StoreAction" onError="Suspend" />
```

**Example — Perform with nested Query tag overrides:**

```xml
<Perform action="QueryAction">
    <Query>
        <DcmTag tag="(0008,0060)">MG</DcmTag>
    </Query>
</Perform>
```

In the above example, `QueryAction` must be a Query action defined in `<ActionsList>`. The nested `<Query>` element overrides the `(0008,0060)` Modality tag value to `MG` for this execution only. The original `QueryAction` definition is not modified.

### Subsection: `<Suspend>`

- **Description**: Suspends job processing with optional resume action specification. Provides controlled job state management for temporary processing halts.
- **Occurrence**: Zero or more within workflow.
- **Attributes**:
  - `resumeAction` (Optional): Specifies the action name to execute when the job is resumed from suspension.
- **Content**: None (empty element).
- **Default Value**: Not applicable.

### Subsection: `<Discard>`

- **Description**: Terminates job processing and removes the job from the processing queue. Provides controlled job termination for various scenarios including validation failures and business rule violations.
- **Occurrence**: Zero or more within workflow.
- **Attributes**: None
- **Content**: None (empty element).
- **Default Value**: Not applicable.

### Subsection: `<Update>`

- **Description**: Dynamically creates and configures workflow actions at runtime. Enables runtime action instantiation with parameter injection based on job context.
- **Occurrence**: Zero or more within workflow.
- **Attributes**:
  - `name` : a unique identifier for this workflow node.
- **Content**:
  - `<ActionName>`: The name to assign to the dynamically created action.
  - `<ActionType>`: The type of action to create (e.g., `Store`, `Query`, `Print`).
  - `<ActionConfiguration>`: Configuration elements specific to the action type being created.
- **Default Value**: Not applicable.

### Subsection: `<If>`

- **Description**: Conditional workflow node that executes different workflow branches based on the value of a specified field. The `field` attribute selects the data source and the `value` attribute provides the expected value to compare against. When the comparison matches, the `<Statements>` branch is executed; otherwise the optional `<Else>` branch is executed.
- **Occurrence**: Zero or more within workflow.
- **Attributes**:
  - `field` (Required): The data source to evaluate. Supported values:
    - `CLIENT_HOST_NAME` — matches against the originating client hostname (the hostname of the machine that sent the print job).
    - `PRINTED_FILE_NAME` — matches against the print job filename.
    - `QUERY_FOUND` — evaluates to `1` if the last query returned results, `0` otherwise.
    - `QUERY_PARTIAL` — evaluates to `1` if the last query returned multiple results, `0` otherwise.
    - `TAG_VALUE(group,element)` — evaluates based on a DICOM tag value from the job dataset. The group and element are hexadecimal numbers in parentheses, e.g., `TAG_VALUE(0008,0060)`. When this field type is used, the `value` attribute is interpreted as a **regular expression** and matched against the tag value.
    - `STORE_SUCCEEDED` — evaluates to `1` if the last store operation succeeded, `0` otherwise. Added in version 2.2.32.
  - `value` (Required): The expected value to compare against. For `QUERY_FOUND`, `QUERY_PARTIAL`, and `STORE_SUCCEEDED`, use `1` (true) or `0` (false). For `CLIENT_HOST_NAME` and `PRINTED_FILE_NAME`, use an exact string. For `TAG_VALUE`, use a regular expression pattern.
- **Content**:
  - `<Statements>` (Required): Workflow nodes to execute when the value matches.
  - `<Else>` (Optional): Workflow nodes to execute when the value does not match.
- **Default Value**: Not applicable.

**Example — Conditional branch based on query result:**

```xml
<If field="QUERY_FOUND" value="1">
    <Statements>
        <Perform action="StoreAction" />
    </Statements>
    <Else>
        <Perform action="NotifyAction" onError="Ignore" />
    </Else>
</If>
```

**Example — Conditional branch based on a DICOM tag value (regex match):**

```xml
<If field="TAG_VALUE(0008,0060)" value="MG|CR">
    <Statements>
        <Perform action="MammographyPrintAction" />
    </Statements>
</If>
```

### Subsection: `<Switch>`

- **Description**: Multi-case conditional workflow node that executes different workflow branches based on a field value. Each `<Case>` child specifies a value to match; the first matching case is executed. If no case matches, the optional `<Default>` branch is executed.
- **Occurrence**: Zero or more within workflow.
- **Attributes**:
  - `field` (Required): The data source to evaluate against case values. Supported values:
    - `CLIENT_HOST_NAME` — matches against the originating client hostname.
    - `PRINTED_FILE_NAME` — matches against the print job filename.
- **Content**:
  - `<Case>` (One or more): Individual case branches with specific values to match.
    - **Attributes for `<Case>`**:
      - `value` : the value to match against the field.
    - **Content**: Workflow nodes (`<If>`, `<Switch>`, `<Perform>`, `<Suspend>`, `<Discard>`) to execute when this case matches.
  - `<Default>` (Optional): Workflow nodes to execute when no case values match.
- **Default Value**: Not applicable.

**Example:**

```xml
<Switch field="CLIENT_HOST_NAME">
    <Case value="WORKSTATION1">
        <Perform action="PrintAction1" />
    </Case>
    <Case value="WORKSTATION2">
        <Perform action="PrintAction2" />
    </Case>
    <Default>
        <Perform action="DefaultPrintAction" />
    </Default>
</Switch>
```
