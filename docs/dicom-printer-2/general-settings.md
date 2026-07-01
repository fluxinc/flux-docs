# General Settings

The `<General>` section holds application-wide settings: how often the spool is
checked, how long suspended jobs wait, how long unfinished jobs live, logging
verbosity, and log-file rotation. It appears exactly once, at the top level of
`<DicomPrinterConfig>`.

```xml
<DicomPrinterConfig>
  <General>
    <!-- application-wide settings -->
  </General>
  <ActionsList>...</ActionsList>
  <Workflow>...</Workflow>
</DicomPrinterConfig>
```

## Required Elements

Three elements are **required**. If any one of them is missing, the engine
**refuses to start**:

- `CheckingInterval`
- `SuspensionTime`
- `Verbosity`

The engine reads `<General>` element names **case-insensitively**, so
`<Verbosity>` and `<verbosity>` are treated the same. The one exception is the
**presence check for the three required elements**, which matches the exact
PascalCase names shown here: a mis-cased required tag (for example
`<checkinginterval>`) is counted as missing and the engine quits. Mis-casing an
*optional* element does **not** disable it — its value is still applied.

## Elements

### `CheckingInterval`

The number of **seconds** DICOM Printer waits between successive checks of the
spool for new jobs.

- **Content:** positive integer (seconds)
- **Default:** `1`
- A value of `0` or an invalid value falls back to `1`.

### `SuspensionTime`

The amount of time, in **minutes**, that a suspended job waits before the
application automatically re-queues and retries it. This is the interval applied
when a `<Perform>` uses `onError="Suspend"`.

- **Content:** positive integer (minutes)
- **Default:** `15`

### `Verbosity`

Controls how much detail is written to the log. Higher values produce more
output; the value is a nesting depth rather than a named level. As a rough guide,
around `20` captures full diagnostic detail and around `2` is normal operation.

- **Content:** positive integer
- **Default:** `35`

### `ValidityPeriod`

The number of **days** after which an unfinished job is considered expired and
dropped from the queue. This has no relation to license or activation validity.

- **Content:** positive integer (days)
- **Default:** `5`

### `RedactSensitiveLogValues`

When `true`, the DICOM-tag-aware log redactor obscures patient identifiers, exam
identifiers, physician/operator names, requested and scheduled procedure
descriptions, admitting diagnoses, and all private tags before they reach the
event log. Hostnames, usernames, and file names are not redacted. When `false`,
real DICOM tag values appear in the log — useful for diagnostics, but it should
be left `true` in production.

- **Content:** `true` or `false`
- **Default:** `true`

### `MaximumLogFileSize`

Maximum size of the active log file before it is rotated. Accepts an integer
optionally followed by a **single-letter** `K`/`M`/`G` suffix (case-insensitive)
— so `50M` is valid, but a two-letter suffix like `50MB` is **not** accepted and
falls back to the default. A **bare integer with no suffix is treated as
megabytes** — for example, `50` means 50 MB. The minimum enforced size is 1 MB.

- **Content:** size value (`<int>` optionally followed by `K`, `M`, or `G`)
- **Default:** 50 MB

### `MaximumLogFileCount`

Maximum number of rotated log files to keep. Older files beyond this count are
deleted. The minimum is 2.

- **Content:** positive integer (count)
- **Default:** `10`

## Ignored Elements

The following elements are **ignored by the engine** — do not use them:

- **`<RegistrationKey>`** — part of the `<General>` DTD content model, but ignored
  and not read. Licensing is handled by the machine activation system, not by
  `config.xml`. After the activation flow completes, the resulting activation code
  is written to a **`.activation` file in the same directory as `config.xml`** —
  it is not stored in `config.xml` or in the Windows registry. The application
  starts normally whether or not `<RegistrationKey>` is present, and any value is
  ignored.
- **`<SpoolDirectory>`** — not part of the `<General>` DTD content model and has
  no effect; the spool path is fixed.

## Example

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
