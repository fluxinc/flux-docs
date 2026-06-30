# Configuration Reference

A DICOM Printer 2 configuration is a single `config.xml` with three required
sections — `<General>`, `<ActionsList>`, and `<Workflow>` — plus an optional
`<DropMonitor>`. This page is the map; each element links to its own reference.

::: tip Author it with AI
The [AI Config Assistant](./config-assistant.md) is an installable agent skill that
writes and edits `config.xml` for you and knows every element below.
:::

## Document structure

```xml
<?xml version="1.0" encoding="utf-8"?>
<DicomPrinterConfig>
  <General> ... </General>           <!-- program-wide settings -->
  <ActionsList> ... </ActionsList>   <!-- named, reusable actions -->
  <Workflow> ... </Workflow>         <!-- ordered execution + control flow -->
  <DropMonitor> ... </DropMonitor>   <!-- optional: watched-folder ingestion -->
</DicomPrinterConfig>
```

Actions are **declared** in `<ActionsList>`, each with a unique `name`, and then
**run** in order by `<Perform>` inside `<Workflow>`, which adds conditional and
retry logic. Every action operates on the same job dataset, so a value set by one
action (a parsed tag, a query result) is visible to every later action — order
matters.

For getting started, file locations, validation, and editing, see
[Configuration](./configuration.md).

## Program-wide settings

| Element | Purpose |
|---|---|
| [General Settings](./general-settings.md) | Spool interval, suspension/retry timing, log verbosity and rotation, job validity |
| [Connection Parameters](./connection-parameters.md) | AE titles, host, port, and timeouts — shared by Print, Store, and Query |

## Actions

Declared in `<ActionsList>`; invoked from `<Workflow>` by `name`.

| Action | Purpose |
|---|---|
| [Query](./actions/query.md) · [Query Attributes](./actions/query-attributes.md) | C-FIND a Modality Worklist / PACS and copy matched tags into the job |
| [Store](./actions/store.md) | Send the job to a Storage SCP (PACS) |
| [Save](./actions/save.md) | Write the job to local disk |
| [Print](./actions/print.md) | Send to a DICOM film/paper printer |
| [PrintText](./actions/print-text.md) | Burn text onto every page |
| [PrintImage](./actions/print-image.md) | Overlay an image or watermark |
| [Parse](./actions/parse.md) | Extract tags from the job's filename or text via regex |
| [SetTag](./actions/settag.md) · [SetSequence](./actions/setsequence.md) | Set a tag / build a DICOM sequence |
| [Image Manipulation](./actions/image-manipulation.md) | Trim, Resize, Rotate, AutoRotateText, MergeJob |
| [Run (Plugins)](./actions/run.md) | Launch an external script/plugin, passing tags in and out |
| [Notify](./actions/notify.md) | Show the operator a message |

## Workflow

| Element | Purpose |
|---|---|
| [Workflow overview](./workflow/) | How the workflow executes a job |
| [Conditional Nodes](./workflow/conditional-nodes.md) | `<If>` and `<Switch>` |
| [Control Nodes](./workflow/control-nodes.md) | `<Perform>`, `<Suspend>`, `<Discard>`, `<Update>` |
| [Placeholders](./placeholders.md) | `#{...}` tag and date placeholders used in values |

## Ingestion

| Element | Purpose |
|---|---|
| [Drop Monitor](./drop-monitor.md) | Watched-folder ingestion of PDFs, images, and text |

## Conventions

- **Tag references** accept a DICOM dictionary keyword or a numeric tag —
  `(0008,0050)`, `00080050`, and `AccessionNumber` all refer to the same tag.
- **Enumerated attribute values** (e.g. `Compression type="rle"` and `type="RLE"`
  are equivalent) are case-insensitive,
  but **element names are not** — use the exact element names shown on each page.
- **Licensing/activation** is handled by the activation flow and stored in a
  `.activation` file beside `config.xml`; it is not configured in `config.xml`
  (`<RegistrationKey>` is inert and ignored). See
  [Licensing and Activation](./licensing.md).
