# Drop Monitor


### 10.1. Overview

The DICOM Printer Drop Monitor is a companion Windows service (`DICOMPrinterDropMonitorService`) that watches a designated folder for incoming files (images, PDFs, DICOM files) and automatically converts and injects them into the DP2 processing queue. It is distributed as a separate installer and runs alongside the main DP2 service.

### 10.2. How It Works

1. Files are placed (or moved/renamed) into the monitored drop folder.
2. The Drop Monitor detects the new file, waits briefly to ensure the file is fully written, then processes it.
3. For PDF files, it can optionally convert pages to PNG images (if `<ConvertToPNG>` is enabled) or create montage images.
4. The processed file is staged in a temporary directory and then injected into the DP2 `queue/` directory as a job file.
5. DP2 picks up the job file and processes it through the configured workflow.

Subfolders within the drop folder are supported. When a file is found in a subfolder, the job name is prefixed with the subfolder path using a configurable path separator (default `/`).

### 10.3. Configuration

The Drop Monitor reads its settings from the same `config.xml` used by DP2, inside a `<DropMonitor>` element at the top level of `<DicomPrinterConfig>`:

```xml
<DicomPrinterConfig>
  <!-- ... ActionsList, Workflow, etc. ... -->
  <DropMonitor>
    <Path>C:\DICOM\drop</Path>
    <ConvertToPNG>false</ConvertToPNG>
    <PdfConversionTimeoutMs>5000</PdfConversionTimeoutMs>
    <PathSeparator>/</PathSeparator>
  </DropMonitor>
</DicomPrinterConfig>
```

| Setting | Default | Description |
|---|---|---|
| `Path` | `<CommonBasePath>/drop` | The folder to monitor for incoming files. |
| `ConvertToPNG` | `false` | When `true`, PDF pages are converted to PNG images before injection. |
| `Montage` | `false` | When `true` (and `ConvertToPNG` is also true), creates a single montage image from all PDF pages. |
| `PdfConversionTimeoutMs` | `5000` | Maximum time in milliseconds to wait for a PDF-to-image conversion to complete. Increase this for large or complex PDFs. |
| `PathSeparator` | `/` | The separator character used to join subfolder names into the job name prefix. |
| `RetryIntervalSeconds` | `5` | How long to wait before retrying a failed file. |
| `MaxRetryAttempts` | `3` | Maximum number of retry attempts for a failed file before giving up. |
| `Layout` | `raw` | The layout format for generated job files. |
| `LineEndings` | `unix` | Line ending style for generated text files (`unix` or `windows`). |
| `MetadataEncoding` | `utf-8` | Character encoding for PDF metadata extraction. |
| `MetadataOutputFormat` | `plaintext` | Format for extracted metadata (`plaintext` or `base64`). |
| `TextFileEncoding` | `utf-8` | Character encoding for generated text (job) files. |

### 10.4. Drop Monitor Service Management

The Drop Monitor is installed and managed as a separate Windows service:

```
DICOMPrinterDropMonitorService.exe --install    — Install the service
sc start DICOMPrinterDropMonitorService         — Start the service
sc stop DICOMPrinterDropMonitorService          — Stop the service
```

The service logs to `<CommonBasePath>/log/dicom_printer_drop_monitor_service.log`.

### 10.5. Troubleshooting the Drop Monitor

- **Files not being picked up.** Verify the `<Path>` setting points to the correct folder. The Drop Monitor also handles files that are moved (renamed) into the folder, so atomic move operations are supported.
- **PDF conversion timeout.** If large PDFs fail to process, increase `<PdfConversionTimeoutMs>`. The default of 5000 ms may be insufficient for documents with many pages or complex graphics.
- **Uppercase file extensions.** As of v2.4.12, the Drop Monitor accepts uppercase extensions (e.g., `.PDF`, `.DCM`). Earlier versions may silently ignore such files.
- **Retry failures.** After `MaxRetryAttempts` failures, the file is abandoned. Check the Drop Monitor log for error details. Common causes include file permission problems or corrupted input files.
