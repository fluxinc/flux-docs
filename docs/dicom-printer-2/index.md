# DICOM Printer 2 by Flux Inc

## Overview

DICOM Printer 2 is a virtual DICOM printer that converts Windows print jobs into DICOM format for integration with PACS systems or DICOM film printers. It enables any Windows application to send documents, reports, PDFs, and images directly to PACS storage or DICOM-compliant film printers without requiring DICOM-specific software.

DICOM Printer 2 appears as a standard Windows printer but processes print jobs through a customizable workflow that converts documents into DICOM Secondary Capture or Encapsulated PDF format. The system can automatically link patient data through DICOM worklist queries, apply image transformations, and route output to multiple DICOM destinations.

## General Features

- **Universal Printing**: Print from any Windows application directly to PACS or DICOM film printers
- **Document Conversion**: Converts PDFs and images into DICOM format (Encapsulated PDF Storage, Secondary Capture)
- **Automatic Patient Matching**: Links patient data through DICOM worklist queries
- **Flexible Output**: Send to PACS storage, DICOM film printers, or create DICOM CDs
- **True-Size Film Printing**: Accurate sizing on DICOM-compliant film printers
- **Drop Monitor Integration**: Process files from watched directories with PDF and image conversion

DICOM Printer 2 is designed to be:

- **Integrated**: Works seamlessly with existing Windows applications and DICOM infrastructure
- **Flexible**: Customizable workflow automation with conditional logic and data transformation
- **Reliable**: Windows service architecture with automatic error recovery and job queuing

## Technical Features

- **Workflow-based**: XML-configured processing rules with conditional logic
- **Multi-component**: Main service, Control application, and Drop Monitor service
- **Patient Data Integration**: DICOM worklist query support for automatic patient matching
- **Image Processing**: Built-in image manipulation (trim, rotate, resize)
- **Plugin Architecture**: Extensible through custom console and GUI plugins
- **Comprehensive Logging**: Detailed event logging with configurable verbosity

## Copyright

DICOM Printer 2 is a product of Flux Inc. All rights reserved.
