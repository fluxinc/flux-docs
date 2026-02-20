# DICOM Printer 2

DICOM Printer 2 (DP2) is a Windows-based document and image processing engine that converts PDFs and images into DICOM format and delivers them to PACS systems or DICOM film printers. It runs as a Windows service and processes jobs through a customizable XML-configured workflow.

Jobs arrive from two sources: a **Windows printer driver** (print from any application) or a **Drop Monitor service** that watches folders for incoming PDF and image files.

## What it does

- **DICOM conversion** — Converts PDFs and images into Encapsulated PDF Storage or Secondary Capture SOP classes
- **Worklist integration** — Queries a DICOM worklist (MWL) to automatically populate patient and study metadata
- **PACS delivery** — Sends completed DICOM objects to one or more PACS via C-STORE
- **Film printing** — Sends to DICOM film printers using the Basic Grayscale or Color Print Management service
- **Tag manipulation** — Sets, copies, or derives DICOM tag values using placeholders and conditional logic
- **Image processing** — Trim, rotate, and resize images before encoding
- **Workflow automation** — XML-configured action sequences with `If`/`Switch` conditional branching, suspend/resume, and plugin support

## Architecture

DP2 is made up of three components:

| Component | Role |
|---|---|
| **DicomPrinter.exe** | Main processing service — runs the workflow engine |
| **Drop Monitor** | Watches configured folders; converts and injects PDFs and images as jobs |
| **Control Application** | GUI tool for configuration, licensing, and monitoring |

See [Architecture & Design](architecture.md) for a detailed walkthrough of the job lifecycle, application modes, and DICOM service interactions.

## Getting started

- [Installation](installation.md)
- [Command-Line Options](command-line.md)
- [Configuration Reference](config.md)
- [Placeholders](placeholders.md)

## DICOM compliance

DP2 implements DICOM 3.0 as a Service Class User (SCU) for C-FIND, C-STORE, and Print. See the [DICOM Conformance Statement](conformance.md) for supported SOP classes, transfer syntaxes, and AE specifications.
