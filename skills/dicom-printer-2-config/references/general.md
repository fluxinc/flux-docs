# Reference: General, DropMonitor, ConnectionParameters

Reflects the engine's actual behavior (and the separate Drop Monitor service, which reads
`<DropMonitor>`). Where this disagrees with the DTD or the old PDF manual, this wins.

## `<General>`

Required (engine **quits** if any is missing): `CheckingInterval`, `SuspensionTime`,
`Verbosity`. Use the element names exactly as shown — the required-element check matches
the exact names, so a mis-cased required tag (e.g. `<checkinginterval>`) is treated as
missing.

| element | type | default | units | notes |
|---|---|---|---|---|
| `CheckingInterval` | +int | 1 | **seconds** | spool poll interval. 0/invalid → 1 |
| `SuspensionTime` | +int | 15 | **minutes** | wait before a suspended job is re-queued |
| `Verbosity` | +int | 35 | level | higher = more detail (≈20 = full, ≈2 = normal) |
| `ValidityPeriod` | +int | 5 | **days** | unfinished jobs older than this are dropped |
| `RedactSensitiveLogValues` | bool | true | — | obscures PHI in logs; keep `true` in production |
| `MaximumLogFileSize` | `<int>[K\|M\|G]` | 50M | bytes | **bare number = megabytes** (e.g. `50` = 50 MB) |
| `MaximumLogFileCount` | int | 10 | count | rotated log files retained |

```xml
<General>
  <CheckingInterval>1</CheckingInterval>       <!-- seconds -->
  <SuspensionTime>15</SuspensionTime>          <!-- minutes -->
  <Verbosity>20</Verbosity>
  <ValidityPeriod>5</ValidityPeriod>           <!-- days -->
  <RedactSensitiveLogValues>true</RedactSensitiveLogValues>
  <MaximumLogFileSize>50M</MaximumLogFileSize>
  <MaximumLogFileCount>10</MaximumLogFileCount>
</General>
```

**Inert** (accepted by the schema but ignored): `<SpoolDirectory>` (the spool path is
fixed) and `<RegistrationKey>` (not read). Licensing/activation is handled
separately: the activation code is stored in a `.activation` file next to config.xml, not
in config.xml. Don't use these elements.

## `<ConnectionParameters>` — element names **case-sensitive**

Lives inside `Print`, `Store`, `Query`. Required & validated: `PeerAeTitle`, `Host`, `Port`.

| element | type | default | required | notes |
|---|---|---|---|---|
| `PeerAeTitle` | AE | "" | **yes** | remote SCP's AE title |
| `Host` | host/IP | "" | **yes** | remote address |
| `Port` | int | 0 | **yes** | try 104; non-numeric = hard load failure |
| `MyAeTitle` | AE | `DICOM_PRINTER` | no | our calling AE title |
| `MaxPdu` | int | 16384 | no | invalid value → default (warns) |
| `BlockingMode` | `BLOCKING`\|`NONBLOCKING` | BLOCKING | no | **exact uppercase** |
| `AssociationTimeout` | int sec (-1 = infinite) | 30 | no | manual says 1 — wrong |
| `DimseTimeout` | int sec (-1 = infinite) | -1 | no | manual says 1 — wrong |

```xml
<ConnectionParameters>
  <MyAeTitle>DICOM_PRINTER</MyAeTitle>
  <PeerAeTitle>PACS_AE</PeerAeTitle>
  <Host>192.168.1.50</Host>
  <Port>104</Port>
  <AssociationTimeout>30</AssociationTimeout>
  <DimseTimeout>30</DimseTimeout>
</ConnectionParameters>
```

## `<DropMonitor>` — optional watched-folder ingestion

A *separate* .NET service (not the print engine) watches a folder; dropped PDFs/images/text
become DICOM jobs that then run through the normal `Workflow`. Supports `${VAR:-default}`
environment-variable interpolation in values (this `${...}` syntax is **Drop-Monitor only** —
it is NOT the `#{...}` tag placeholder used elsewhere).

| element | values | default | notes |
|---|---|---|---|
| `Path` | folder | `<ProgramData>\Flux Inc\DICOM Printer 2\drop` | watched directory |
| `ConvertToPNG` | bool | **false** | ⚠ enabled unless the value is literally `false` |
| `Montage` | bool | **false** | ⚠ same `!= "false"` rule; combine PDF pages into one image |
| `PdfRasterDpi` | int | 300 | PDF→PNG rasterization DPI |
| `PdfConversionTimeoutMs` | int ms | 5000 | wait for the PDF converter |
| `Layout` | `raw`\|`layout`\|… | raw | passed to pdftotext `-<Layout>` |
| `LineEndings` | `unix`\|`dos`\|`mac` | unix | pdftotext `-eol` |
| `MetadataEncoding` | .NET encoding name | utf-8 | e.g. `utf-8`, `windows-1252`; bad name throws at startup |
| `MetadataOutputFormat` | `plaintext`\|`base64` | plaintext | |
| `TextFileEncoding` | .NET encoding name | utf-8 | for dropped `.txt` files |

```xml
<DropMonitor>
  <Path>${DP2_DROP_PATH:-C:\ProgramData\Flux Inc\DICOM Printer 2\drop}</Path>
  <ConvertToPNG>false</ConvertToPNG>
  <PdfRasterDpi>300</PdfRasterDpi>
</DropMonitor>
```

Gotchas: to **disable** `ConvertToPNG`/`Montage` you must write exactly `false` — `0`, `no`,
`off`, or a typo all count as enabled. `MetadataInputEncoding` appears in the DTD but is **not
read** — use `MetadataEncoding`. The print engine ignores `<DropMonitor>` entirely; only the
Drop Monitor service reads it.
