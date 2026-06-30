# Reference: actions (Store, Save, Parse, SetTag, SetSequence, image ops, AddInstance)

Every action declares a unique `name` and is invoked by `<Perform action="name"/>`.
See `query.md` (Query), `print.md` (Print/PrintText/PrintImage), `plugins.md` (Run/Notify).

## Store — C-STORE to a Storage SCP

Sends the job as Secondary Capture Image Storage.

| element/attr | values | default | notes |
|---|---|---|---|
| `name` (attr) | string | — | required |
| `<ConnectionParameters>` | — | — | required |
| `<Compression type="…"/>` | RLE \| JPEG_Lossless \| JPEG_Lossy | omit = uncompressed | missing/unknown `type` = error |
| `<Colormode mode="…"/>` | RGB \| MONOCHROME8 \| MONOCHROME12 | RGB | missing/unknown `mode` = error |

```xml
<Store name="StoreToPACS">
  <Compression type="JPEG_Lossless" />
  <Colormode mode="MONOCHROME8" />
  <ConnectionParameters>
    <MyAeTitle>DICOM_PRINTER</MyAeTitle><PeerAeTitle>PACS</PeerAeTitle>
    <Host>192.168.1.50</Host><Port>104</Port>
  </ConnectionParameters>
</Store>
```
**Fatal combo:** `JPEG_Lossy` + `MONOCHROME12` fails to load (use RLE or JPEG_Lossless for 12-bit).
The engine auto-fills Study/Series/SOP UIDs, Modality (default OT), dates/times.

## Save — write to local disk instead of network

| element | values | default | notes |
|---|---|---|---|
| `<Directory>` | path | "" | created if missing; keep stable for DICOM File Set output; **always set it** |
| `<Filename>`/`<FileName>` | pattern | "" | supports `#{...}`; engine appends `_NNNNNN` index |
| `<Format>` | (DICOM file set) \| `dxi` | DICOM file set + DICOMDIR | `dxi` = copy the raw job + companion files verbatim |

```xml
<Save name="SaveToDisk">
  <Directory>D:\dicom</Directory>
  <Filename>#{AccessionNumber}.dcm</Filename>
</Save>
<Save name="ArchiveRaw"><Directory>D:\archive</Directory><Format>dxi</Format></Save>
```
Common use: an error/overflow sink after exhausted retries. For DICOM File Set output,
put dynamic values in `<Filename>` unless the exact path behavior has been tested.

## ParseJobFileName / ParseJobTextFile — regex-extract tags

`ParseJobFileName` runs the regex against the print job's **name**; `ParseJobTextFile` runs it
against **each line** of the job's extracted text (no text file → no-op success). The child
element is `<DcmTag>` (the manual's "DcmElement" is wrong).

Action attributes: `name` (req); `defaultReplacePattern` (default `\1`); `defaultTransformation`
(None|ToUpper|ToLower); `defaultCaseSensitive` (default true); `matchPolicy` (lastMatch default |
firstMatch).

Child `<DcmTag>` attributes:

| attr | values | default | notes |
|---|---|---|---|
| `tag` | tag ref | required | target tag |
| (text) | regex (PCRE) | required | typically one capture group |
| `mandatory` | bool | false | if it never matches, the action **fails the job** |
| `replacePattern` | replace string | `\1` | `\1` = group 1 |
| `transform` | None\|ToUpper\|ToLower | None | |
| `caseSensitive` | bool | true | |
| `allowEmpty` | bool | false | if false, an empty result is skipped |

```xml
<ParseJobFileName name="ParseAccession">
  <DcmTag tag="(0008,0050)" mandatory="true">([A-Z0-9]{6,})</DcmTag>
</ParseJobFileName>

<ParseJobTextFile name="ParseReport" defaultCaseSensitive="false" matchPolicy="firstMatch">
  <DcmTag tag="(0010,0020)" mandatory="true">Patient\s*ID\s*:\s*(\w+)</DcmTag>
  <DcmTag tag="(0010,0010)">Name:\s*(.+)</DcmTag>
  <DcmTag tag="(0008,0060)" transform="ToUpper">Modality:\s*(\w{2,16})</DcmTag>
</ParseJobTextFile>
```
`lastMatch` (default): later matches overwrite earlier. `firstMatch`: list highest-priority
patterns first; once captured, only earlier-listed patterns may replace.

## SetTag — set or clear a single tag

| attr/elem | values | default | notes |
|---|---|---|---|
| `name` (attr) | string | — | required |
| `tag` (attr) | tag ref | — | required |
| `tagName` (attr) | string | auto | needed for private (odd-group) tags |
| `vr` (attr) | DICOM VR | LO | only when defining a private tag |
| (body) | value (with `#{...}`) | "" | empty body **blanks** the tag |

```xml
<SetTag name="SetInstitution" tag="(0008,0080)">St. Mary's Hospital</SetTag>
<SetTag name="SetModality"    tag="(0008,0060)">#{Modality}</SetTag>
<SetTag name="ClearOrient"    tag="(0020,0020)"></SetTag>
```
Avoid `type="Unique"` on SetTag — it isn't parsed (behaves Global).

## SetSequence — build a nested SQ

| attr | values | default | notes |
|---|---|---|---|
| `name` | string | — | required |
| `tag` | SQ tag ref | — | required; must be an SQ (or unknown) VR |
| `tagName` | string | auto | for private sequences |
| `unique` | bool | false | true = per-image, false = job dataset |
| `replace` | bool | false | overwrite an existing sequence |

Structure: `<SetSequence>`→`<DcmItem>`+→(`<DcmTag>` leaves and/or nested `<DcmSequence>`). A
`<DcmTag>` is a **leaf** — never nest elements inside it.

```xml
<SetSequence name="SetProcedureCode" tag="(0032,1064)">
  <DcmItem>
    <DcmTag tag="(0008,0100)">CARD6</DcmTag>
    <DcmTag tag="(0008,0104)">Cardiac Procedure</DcmTag>
  </DcmItem>
</SetSequence>
```

## Trim — crop margins (raster images only)

| element | values | default | notes |
|---|---|---|---|
| `<Left>`/`<Right>`/`<Top>`/`<Bottom>` | `auto` or non-negative int (px) | absent = 0 (no trim that side) | negative = parse error |

`auto` = remove the solid border on that side (compared to the top-left reference pixel). A
number trims exactly N pixels. (Don't confuse with the `<Trim>YES</Trim>` film-box attribute.)

```xml
<Trim name="Trim"><Left>auto</Left><Right>auto</Right><Top>auto</Top><Bottom>auto</Bottom></Trim>
```

## Resize — scale (raster images only)

| element | values | default | notes |
|---|---|---|---|
| `<Width>` / `<Height>` | positive int px | **both required** | 0/omitted = parse error |
| `<Aspect>` | KEEP \| IGNORE | KEEP | KEEP = fit within W×H (bounding box); IGNORE = stretch exactly |

```xml
<Resize name="Resize"><Width>2000</Width><Height>2000</Height><Aspect>KEEP</Aspect></Resize>
```

## Rotate — fixed rotation (raster images only)

| element | values | default | notes |
|---|---|---|---|
| `<Angle>` | integer **multiple of 90** | 0 | clockwise; negatives/>360 normalized; non-multiple-of-90 = parse error |

```xml
<Rotate name="Rotate90"><Angle>90</Angle></Rotate>
```

## AutoRotateText — content-aware upright orientation (images **and** PDFs)

Normal usage is just the empty tag; PDFs rotate losslessly (needs `qpdf` + a rasterizer).

```xml
<AutoRotateText name="AutoOrient"/>
```
Advanced tuning knobs (all optional, conservative defaults): `MaxAnalysisSide` (1600),
`TrustHintConfidence` (0.90), `MinAxisConfidence` (0.30), `MinDirectionConfidence` (0.35),
`MinDirectionConfidence180` (0.60), `MinScoreDelta` (0.15), `MarginBandPercent` (8.0),
`MarginWeight` (0.25), `MinLinesFor180` (6), `UseHints` (true), `FailOnUnsupported` (false).

## MergeJob — combine adjacent spool jobs into one study

Merges the immediately-next sorted spool job(s) into the current one (so a study split across
print jobs gets a single Study UID). Run before Query/Store.

| element | type | default | notes |
|---|---|---|---|
| `<Timeout>` | int ms | 2000 | wait window for a late sibling |
| `<PollInterval>` | int ms | 100 | scan interval |
| `<TimeThreshold>` | int ms | 2000 | max creation-time gap to be eligible |
| `<MatchHost>` / `<MatchUser>` | bool | true | require same printer+client host / user |
| `<MaxJobs>` | int | 10 | cap per run |
| `<MergePdf>` / `<MergeText>` | bool | true | concatenate PDFs / append text |

```xml
<MergeJob name="MergeStudy"/>                 <!-- all defaults -->
<MergeJob name="MergeWide"><Timeout>5000</Timeout><MaxJobs>20</MaxJobs></MergeJob>
```

## AddInstance — add a synthetic page

| element | type | default | notes |
|---|---|---|---|
| `<ImagePath>` | path | "" | optional image to place |
| `<Width>` / `<Height>` | uint px | 0 | canvas size (need ImagePath OR both W&H) |
| `<CanvasColor>` | hex ARGB | `FF000000` (black) | e.g. `FFFFFFFF` = white |
| `<InsertionIndex>` | int | -1 (append) | 0-based insert position |

```xml
<AddInstance name="AddBlankPage">
  <Width>2048</Width><Height>2048</Height><CanvasColor>FFFFFFFF</CanvasColor>
</AddInstance>
```
