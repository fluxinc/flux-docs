---
name: dicom-printer-2-config
description: >-
  Author, edit, debug, or review DICOM Printer 2 (DP2) config.xml files — the
  General/ActionsList/Workflow XML that drives the DICOM Printer 2 print-capture
  engine. Use this whenever someone wants a DICOM Printer 2 configuration:
  print-to-film or print-to-PACS, Modality Worklist / Study / Patient C-FIND
  queries, storing or printing captured print jobs, parsing accession or patient
  data from a job's filename or text, running external plugins/scripts from the
  workflow, trimming/resizing/rotating/auto-rotating captured pages, drop-folder
  ingestion, or wiring the workflow (Perform / If / Switch / Suspend / Query).
  Trigger on config.xml for DICOM Printer, DP2, ActionsList, Workflow, the
  Print/Store/Query/Run/Parse actions, DcmTag, BasicFilmBox, "Modality Worklist
  printing", or "the printer config" in a DICOM Printer 2 context — even if the
  user never types "config.xml". This skill captures the current documented
  configuration model and the practical defaults agents need to avoid invented XML.
---

# Writing DICOM Printer 2 config.xml

DICOM Printer 2 is a Windows print driver: an app "prints" to it, DP2 rasterizes
the job into images (+ optional extracted text), then runs a **workflow** that
queries a PACS/Worklist, stamps DICOM tags, and **stores** or **prints** the
result as DICOM. `config.xml` is that program.

The sections below summarize the current configuration behavior and the gotchas
that matter when generating XML. Trust this skill when producing or reviewing
DICOM Printer 2 configuration.

## Start from a template

Copy the closest template from `assets/` and edit it — don't write from a blank
file:

| Goal | Template |
|---|---|
| Capture → query Worklist → store to PACS | `assets/config.print-to-pacs.xml` |
| Capture → print to a DICOM film/paper printer | `assets/config.print-to-film.xml` |
| Watched-folder (drop) ingestion → store | `assets/config.drop-monitor.xml` |

Then run the [Self-check before finishing](#self-check-before-finishing) below, and load
the result in the **DICOM Printer Console** — it validates `config.xml` on save (the
authoritative check; there is no command-line validator).

## Document skeleton

```xml
<?xml version="1.0" encoding="utf-8"?>
<DicomPrinterConfig>
  <General> ... </General>           <!-- required: program-wide settings -->
  <ActionsList> ... </ActionsList>   <!-- required: named, reusable actions -->
  <Workflow> ... </Workflow>         <!-- required: ordered execution + control flow -->
  <DropMonitor> ... </DropMonitor>   <!-- optional: watched-folder ingestion -->
</DicomPrinterConfig>
```

**Mental model**

- `<ActionsList>` *declares* actions, each with a unique `name`. Declaring an
  action does nothing on its own.
- `<Workflow>` *runs* actions top-to-bottom via `<Perform action="name"/>`, with
  `If`/`Switch`/`Suspend`/`Discard` control flow.
- Actions share one **job dataset** (the DICOM tags). A value set by one action
  (Parse, SetTag, Query result) is visible to every later action. Order matters.
- Image actions (Trim/Resize/Rotate/…) overwrite the rendered pages in place, so
  run them **before** Store/Print.

Minimal complete config (capture → store everything to PACS, uncompressed):

```xml
<DicomPrinterConfig>
  <General>
    <CheckingInterval>1</CheckingInterval>
    <SuspensionTime>15</SuspensionTime>
    <Verbosity>20</Verbosity>
  </General>
  <ActionsList>
    <Store name="StoreToPACS">
      <ConnectionParameters>
        <MyAeTitle>DICOM_PRINTER</MyAeTitle>
        <PeerAeTitle>PACS</PeerAeTitle>
        <Host>192.168.1.50</Host>
        <Port>104</Port>
      </ConnectionParameters>
    </Store>
  </ActionsList>
  <Workflow>
    <Perform action="StoreToPACS" onError="Suspend" />
  </Workflow>
</DicomPrinterConfig>
```

## General (program-wide)

Only `CheckingInterval`, `SuspensionTime`, `Verbosity` are **required** — the
engine quits without them. Use the element names exactly as shown (the required-element
check matches the exact names, so a mis-cased required tag reads as missing).

```xml
<General>
  <CheckingInterval>1</CheckingInterval>          <!-- spool poll, SECONDS (default 1) -->
  <SuspensionTime>15</SuspensionTime>             <!-- retry wait, MINUTES (default 15) -->
  <Verbosity>20</Verbosity>                       <!-- higher = more log detail (20≈full) -->
  <ValidityPeriod>5</ValidityPeriod>              <!-- drop unfinished jobs after N DAYS (default 5) -->
  <RedactSensitiveLogValues>true</RedactSensitiveLogValues> <!-- keep true in prod (PHI) -->
  <MaximumLogFileSize>50M</MaximumLogFileSize>    <!-- BARE NUMBER = MEGABYTES; or 50M/1G -->
  <MaximumLogFileCount>10</MaximumLogFileCount>
</General>
```

Do **not** use `<SpoolDirectory>` or `<RegistrationKey>` — they are in the DTD
but the engine **ignores** them (activation is stored in a `.activation` file beside
config.xml, not in `config.xml`).

## Connection parameters

Used inside `Print`, `Store`, `Query`. Element names here are **case-sensitive**.
Required: `PeerAeTitle`, `Host`, `Port`.

```xml
<ConnectionParameters>
  <MyAeTitle>DICOM_PRINTER</MyAeTitle>     <!-- our AE; default DICOM_PRINTER -->
  <PeerAeTitle>PACS</PeerAeTitle>          <!-- remote SCP AE (required) -->
  <Host>192.168.1.50</Host>               <!-- (required) -->
  <Port>104</Port>                        <!-- (required; non-numeric = hard fail) -->
  <!-- optional: MaxPdu(16384) BlockingMode(BLOCKING|NONBLOCKING)
       AssociationTimeout(30s) DimseTimeout(-1=infinite) -->
</ConnectionParameters>
```

## DICOM tags and placeholders

A `tag` attribute accepts a number **or** a DCMTK keyword. Numbers are hex with
optional parens/zero-padding — `(0008,0050)` = `0008,0050` = `(8,50)` = `AccessionNumber`.

Three placeholder forms expand inside tag values (SetTag bodies, Query DcmTag
values, Save paths, PrintText). **`#{...}` is the only placeholder syntax.**

| Placeholder | Expands to |
|---|---|
| `#{PatientID}` or `#{0010,0020}` | that tag's current value from the job dataset |
| `#{Date}` | today, `yyyyMMdd` |
| `#{Date,-7}` | today − 7 days |
| `#{Date,-7,7}` | a **range** `yyyyMMdd-yyyyMMdd` centred on today−7 (≈ last 2 weeks) |

**Critical:** `#{TagName}`/`#{GGGG,EEEE}` must be the *entire* value — the whole
string has to match. `Patient: #{PatientID}` does **not** expand, and you cannot
concatenate two tag placeholders. Only `#{Date…}` works as a substring. A missing
source tag leaves the literal `#{...}` text in place (silent). There is **no** UID
placeholder — the engine generates Study/Series/SOP UIDs automatically.

## Action catalog

Every action lives in `<ActionsList>` with a unique `name` and is invoked by
`<Perform action="name"/>`. Core actions have inline examples below; full
attribute/value/default tables for **all** of them are in `references/`.

| Action | Purpose | Reference |
|---|---|---|
| **Query** | C-FIND a Worklist/PACS; copy matched tags into the job | `references/query.md` |
| **Store** | C-STORE the job to a PACS as Secondary Capture | `references/actions.md` |
| **Save** | Write the job to local disk (DICOMDIR or raw copy) | `references/actions.md` |
| **Print** | Send to a DICOM film/paper printer (Basic Print SCU) | `references/print.md` |
| **ParseJobFileName** | Regex-extract tags from the print job's name | `references/actions.md` |
| **ParseJobTextFile** | Regex-extract tags from the job's extracted text | `references/actions.md` |
| **SetTag** | Set/clear a single tag (literal or `#{...}`) | `references/actions.md` |
| **SetSequence** | Build a nested SQ structure on the dataset | `references/actions.md` |
| **Trim/Resize/Rotate** | Crop margins / scale / rotate (90° steps) pages | `references/actions.md` |
| **AutoRotateText** | Auto-orient pages so text is upright | `references/actions.md` |
| **MergeJob** | Merge adjacent spool jobs into one study | `references/actions.md` |
| **AddInstance/PrintText/PrintImage** | Add a page / burn text / overlay an image | `references/actions.md` |
| **Run** | Launch an external script/plugin, pass tags in/out | `references/plugins.md` |
| **Notify** | Show the user a tray/dialog message | `references/plugins.md` |

### Query (the workhorse)

A `<DcmTag>` inside a Query has a **dual role**: empty = "return this tag",
with a value = "match on this AND filter locally".

```xml
<Query name="QueryWorklist" type="Worklist">
  <ConnectionParameters>
    <MyAeTitle>DICOM_PRINTER</MyAeTitle><PeerAeTitle>WORKLIST_SCP</PeerAeTitle>
    <Host>10.0.0.50</Host><Port>104</Port>
  </ConnectionParameters>
  <DcmTag tag="(0010,0020)">#{PatientID}</DcmTag>  <!-- match key (from earlier Parse) -->
  <DcmTag tag="(0008,0060)">!US</DcmTag>           <!-- exclude US (local filter) -->
  <DcmTag tag="(0010,0010)" />                     <!-- empty: ask PACS to return PatientName -->
  <DcmTag tag="(0008,1030)" />                     <!-- return StudyDescription -->
</Query>
```

- `type` = `Worklist` | `Study` | `Patient` | `Manual` (default `Study`).
- Value patterns: exact, wildcard `*`, range `lo-hi`, exclusion `!x`, `#{...}`.
- `match="local"` on a `<DcmTag>` sends an empty wire key but still filters
  locally — use it when an SCP rejects fragile syntax (e.g. date ranges).
- Multiple results: add `order-by="StudyDate desc, StudyTime desc" select="first"`
  to pick one; without `select`, >1 result assigns **nothing**.
- After a Query, test `QUERY_FOUND` (≥1 result) and `QUERY_PARTIAL` (>1, ambiguous)
  in the workflow. `type="Manual"` parks the job for a human to pick the match.

See `references/query.md` for query types, Worklist SPS handling, the
`StudyDate→SPS Start Date` alias, sequences, and `persist`.

### Store / Save

```xml
<Store name="StoreToPACS">
  <Compression type="JPEG_Lossless" />        <!-- RLE | JPEG_Lossless | JPEG_Lossy; omit = uncompressed -->
  <Colormode mode="MONOCHROME8" />            <!-- RGB(default) | MONOCHROME8 | MONOCHROME12 -->
  <ConnectionParameters> ... </ConnectionParameters>
</Store>

<Save name="SaveToDisk">                       <!-- to local disk instead of network -->
  <Directory>D:\dicom</Directory>              <!-- keep stable for DICOM File Set output -->
  <Filename>#{AccessionNumber}.dcm</Filename>  <!-- dynamic values belong here -->
</Save>
```
For DICOM File Set output, keep `<Directory>` stable and put dynamic values in
`<Filename>` unless the exact path behavior has been tested. Set `<Format>dxi</Format>`
only when you want to copy the raw captured job and companion files.

`JPEG_Lossy` + `MONOCHROME12` is a fatal combo (12-bit lossy not allowed).

### Parse / SetTag

```xml
<ParseJobFileName name="ParseAccession">       <!-- regex over the job NAME -->
  <DcmTag tag="(0008,0050)" mandatory="true">([A-Z0-9]{6,})</DcmTag>
</ParseJobFileName>

<ParseJobTextFile name="ParseReport" defaultCaseSensitive="false"> <!-- regex per text LINE -->
  <DcmTag tag="(0010,0020)" mandatory="true">Patient\s*ID\s*:\s*(\w+)</DcmTag>
  <DcmTag tag="(0008,0060)" transform="ToUpper">Modality\s*:\s*(\w{2,16})</DcmTag>
</ParseJobTextFile>

<SetTag name="SetInstitution" tag="(0008,0080)">St. Mary's</SetTag>
<SetTag name="SetModality"    tag="(0008,0060)">#{Modality}</SetTag>
<SetTag name="ClearOrient"    tag="(0020,0020)"></SetTag>   <!-- empty body = blank the tag -->
```

The captured value defaults to regex group 1 (`\1`). `mandatory="true"` fails the
job if that tag never matches. Avoid `SetTag type="Unique"` — it's not parsed
(behaves Global).

### Image actions (run before Store/Print)

```xml
<Trim name="Trim"><Left>auto</Left><Right>auto</Right><Top>auto</Top><Bottom>auto</Bottom></Trim>
<Resize name="Resize"><Width>2000</Width><Height>2000</Height><Aspect>KEEP</Aspect></Resize>
<Rotate name="Rotate90"><Angle>90</Angle></Rotate>     <!-- Angle MUST be a multiple of 90 -->
<AutoRotateText name="AutoOrient"/>                    <!-- normal usage is the empty tag -->
<MergeJob name="MergeStudy"/>                          <!-- defaults: 2s window, match host+user -->
```

### Run (external script/plugin)

See `references/plugins.md` for the full contract — this is the summary. The
engine passes input tag **values on stdin, one line per `<Input>`, in order**, and
reads output tag **values from stdout, one line per `<Output>`, in order**
(`type="Unique"` consumes one line *per image* after the one plugin run). It is
positional, **not** `key=value`. Exit `0` ok, `-1` fail, `-2` discard, `-3`
suspend.
`<Arguments>` are literal pipe-separated argv entries; they do not expand DICOM
tag/date/file placeholders. Do not invent input-file or output-file placeholders
for `Run`: pass DICOM values with `<Input>`/`<Output>`, and use Console plugin
environment variables for job artifact paths.

```xml
<Run name="GetUids" type="Console">
  <Command>plugins\GetUids.exe</Command>
  <Arguments>--mode|prod</Arguments>            <!-- PIPE-separated argv, not spaces -->
  <Input  tag="(0010,0020)" />                  <!-- PatientID  -> stdin line 1 -->
  <Output tag="(0010,0010)" />                  <!-- stdout line 1 -> PatientName -->
  <Output tag="(0020,000D)" />                  <!-- stdout line 2 -> StudyInstanceUID -->
  <Timeout>3000</Timeout>
</Run>
```

Also available to the script as env vars: `CLIENT_HOST_NAME`, `CLIENT_USER_NAME`,
`CONTENTS_FILE`, `NOFILES`, `FILE1..FILEn`, `ProgramData`. Use `type="Interactive"`
only for GUI plugins (needs PluginsLauncher in the user session).

## Workflow engine

```xml
<Workflow>
  <Perform action="ParseAccession" onError="Hold" />
  <Perform action="QueryWorklist" onError="Suspend" />
  <If field="QUERY_FOUND" value="1">
    <Statements>
      <If field="QUERY_PARTIAL" value="1">          <!-- >1 match: let a human choose -->
        <Statements><Perform action="ManualMatch" /></Statements>
      </If>
      <Perform action="StoreToPACS" onError="Suspend" />
    </Statements>
    <Else>
      <Suspend resumeAction="QueryWorklist" maxRetries="10" />  <!-- retry, then fall through -->
    </Else>
  </If>
</Workflow>
```

**`onError`** on `Perform` (and the default when omitted is **`Hold`**):

| onError | Effect | Files | Retry |
|---|---|---|---|
| `Hold` (default) | stop workflow, park job | kept | no (manual) |
| `Ignore` | continue to next node | — | — |
| `Suspend` | stop, re-queue after `SuspensionTime` | kept | yes, at `resumeAction` |
| `Discard` | stop, delete the job | deleted | no |

**`<If field="…" value="…">`** recognized fields:

| field | value is… | notes |
|---|---|---|
| `QUERY_FOUND` | `1`/`0` | last query returned ≥1 result |
| `QUERY_PARTIAL` | `1`/`0` | last query returned >1 (ambiguous) |
| `STORE_SUCCEEDED` | `1`/`0` | last Store succeeded |
| `TAG_VALUE(0010,0010)` | a **regex** (unanchored) | test a tag; `^$` = empty/absent, `\S` = present |
| `CLIENT_HOST_NAME` / `PRINTED_FILE_NAME` | exact string | the sending host / job file name |

Only `TAG_VALUE` is regex; the rest are exact. **`<Switch field="CLIENT_HOST_NAME">`**
(or `PRINTED_FILE_NAME`) with `<Case value="…">`/`<Default>` is exact-match routing.

**`<Suspend resumeAction="X" maxRetries="N"/>`**: re-queues after `SuspensionTime`
minutes, resuming at action `X`. Omitting `maxRetries` = **retry forever**; when
the budget is exhausted it **falls through** to the next node (the usual place for
a `ManualMatch` or `Save`-to-error). `<Discard/>` deletes the job now.

See `references/workflow.md` for `Update`, inline `<Query>` overrides, `defaultQuery`,
and resume internals.

## Gotchas

- `SuspensionTime` is **minutes** (default 15); `CheckingInterval` is **seconds**;
  `ValidityPeriod` is **days**.
- `<MaximumLogFileSize>50</…>` means **50 MB**, not 50 bytes.
- `SpoolDirectory`, `RegistrationKey`, `<LauncherPortNumber>`,
  `AnnotationDisplayFormatId`, `Illumination`, `ReflectedAmbientLight`,
  `MetadataInputEncoding`, and `<Update>` types other than `Print` are **inert** —
  accepted by the schema but ignored.
- Inside `BasicFilmBoxAttributes`/`BasicImageBoxAttributes` the child tags are
  **case-sensitive PascalCase** (`<FilmSizeId>`, not `<filmsizeid>`); a misspelling
  is silently dropped (and a bad block name fails the parse).
- `ImageDisplayFormat` is `STANDARD\COLUMNS,ROWS` (cols first): `STANDARD\2,1` = 2 wide.
- The Print `BasicFilmBox`/`Session` values are omitted when unset; the printer
  SCP's own defaults apply.
- `Rotate` `<Angle>` must be a multiple of 90; `Resize` needs both Width and Height.
- `Notify` message `%N` placeholders must equal the number of `<Input>` tags or the
  action fails to load.
- A typo'd `action` in `<Perform>`/`<Switch>` is a silent no-op (warning), not a
  load error — so double-check every `action="…"` matches a declared action `name`.

## Self-check before finishing

There is no command-line validator (the engine and Console run on Windows, which has no
Python). Instead, before handing back a config, verify it yourself against this checklist —
then load it in the DICOM Printer Console, which validates on save.

- **Structure:** root `<DicomPrinterConfig>` containing `<General>`, `<ActionsList>`,
  `<Workflow>`; `<General>` has `CheckingInterval`, `SuspensionTime`, `Verbosity`.
- **Action names:** every action has a unique `name`; every `<Perform action>`,
  `<Suspend resumeAction>`, and `<Update action>` matches a declared action.
- **Connections:** every `Print`/`Store`/`Query` has `<ConnectionParameters>` with
  `<PeerAeTitle>`, `<Host>`, `<Port>` — exact PascalCase (`PeerAeTitle`, not `PeerAETitle`).
- **If/Switch:** `<If>` wraps its body in `<Statements>` (and any else in `<Else>`), uses
  only the fields QUERY_FOUND / QUERY_PARTIAL / STORE_SUCCEEDED / TAG_VALUE(…) /
  CLIENT_HOST_NAME / PRINTED_FILE_NAME, and has **no** `tag=` attribute; query/store flags
  compare to `"1"`/`"0"` (not `true`/`false`). `<Switch field>` is CLIENT_HOST_NAME or
  PRINTED_FILE_NAME.
- **Store:** `<Compression>`/`<Colormode>` use valid values; never `JPEG_Lossy` + `MONOCHROME12`.
- **Print:** film/image-box child tags are exact PascalCase; `ImageDisplayFormat` is
  `COLUMNS,ROWS`.
- **Image ops:** `<Rotate><Angle>` is a multiple of 90; `<Resize>` has both Width and Height.
- **Run/Notify:** `<Run>` has `<Command>` and positional `<Output>` (not key=value);
  `<Notify>` `%N` count equals its `<Input>` count.
- **Placeholders:** a `#{TagName}`/`#{GGGG,EEEE}` is the *entire* tag value (not concatenated
  with text); only `#{Date…}` embeds. No `#{Time}` and no UID placeholder exist.
- **Don't rely on inert elements:** SpoolDirectory, RegistrationKey, LauncherPortNumber,
  AnnotationDisplayFormatId, Illumination, ReflectedAmbientLight, MetadataInputEncoding.

## References

- `references/actions.md` — full tables for Store, Save, Parse, SetTag, SetSequence,
  Trim, Resize, Rotate, AutoRotateText, MergeJob, AddInstance, PrintText, PrintImage.
- `references/query.md` — query types, placeholders, match/local, order-by/select,
  Manual query, Worklist SPS handling and sequences.
- `references/print.md` — the Basic Print SCU film/image-box attribute enumerations.
- `references/plugins.md` — the Run/Notify external-script I/O contract in full,
  bundled plugins, and a worked example.
- `references/general.md` — General, DropMonitor, and ConnectionParameters in full.
- `assets/config.dtd` — the DTD (structurally useful, but trust this skill over it
  for defaults and which elements are live).
