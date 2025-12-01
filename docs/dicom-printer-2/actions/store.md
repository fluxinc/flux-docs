# Store Actions

Store actions send DICOM objects to remote PACS systems or storage nodes using the DICOM C-STORE operation.

## Basic Syntax

```xml
<Store name="ActionName">
  <ConnectionParameters>
    <PeerAETitle>RemoteAE</PeerAETitle>
    <MyAETitle>LocalAE</MyAETitle>
    <Host>hostname</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <Compression type="CompressionType"/>
  <ColorMode mode="ColorType"/>
</Store>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

## Required Attributes

### `name`
Unique identifier for this action.

## Required Elements

### `ConnectionParameters`
Network connection settings for the remote DICOM server. Must contain the following nested elements:

#### `PeerAETitle`
The AE Title of the remote DICOM storage server (PACS).

#### `MyAETitle`
The AE Title of DICOM Printer 2 (this application).

#### `Host`
The hostname or IP address of the remote DICOM storage server.

#### `Port`
The TCP port number of the remote DICOM storage server (typically 104 or 11112).

## Optional Elements

### `Compression`
Specifies the compression algorithm to apply before sending.

**Attribute:** `type`
**Valid Values:** `RLE`, `JPEG_Lossless`, `JPEG_Lossy`
**Default:** None (uncompressed)

```xml
<Store name="SendToPACS">
  <Compression type="JPEG_Lossless"/>
  <ConnectionParameters>...</ConnectionParameters>
</Store>
```

**Note:** If the `<Compression>` element is omitted, images are sent uncompressed with the default transfer syntax.

**Compression Types:**

#### `RLE`
RLE (Run-Length Encoding) lossless compression.

```xml
<Compression type="RLE"/>
```

Best for:
- Images with large areas of solid color
- Binary images
- Fast compression/decompression required

#### `JPEG_Lossless`
JPEG lossless compression (1.2.840.10008.1.2.4.70).

```xml
<Compression type="JPEG_Lossless"/>
```

Best for:
- Medical images requiring no quality loss
- Smaller file sizes than RLE
- Widely supported by PACS systems

#### `JPEG_Lossy`
JPEG lossy compression with configurable quality.

```xml
<Compression type="JPEG_Lossy"/>
```

Best for:
- Non-diagnostic images
- Maximum compression ratios
- Scanned documents or secondary captures where slight quality loss is acceptable

**Warning:** Lossy compression may not be appropriate for diagnostic images. Verify compliance with local regulations and policies.

### `ColorMode`
Specifies the color mode for image conversion.

**Attribute:** `mode`
**Valid Values:** `RGB`, `Monochrome8`, `Monochrome12`
**Default:** Preserves original color mode

```xml
<ColorMode mode="Monochrome8"/>
```

**Color Modes:**

#### `RGB`
24-bit color RGB images.

```xml
<ColorMode mode="RGB"/>
```

#### `Monochrome8`
8-bit grayscale images (256 gray levels).

```xml
<ColorMode mode="Monochrome8"/>
```

Best for:
- Standard grayscale images
- Compatibility with older PACS systems
- Smaller file sizes

#### `Monochrome12`
12-bit grayscale images (4096 gray levels).

```xml
<ColorMode mode="Monochrome12"/>
```

Best for:
- High dynamic range medical images
- CT, MR, CR, DR modalities
- Maximum grayscale precision

## Storage Classes

Store actions automatically select the appropriate SOP Class based on the DICOM object type:

- **Encapsulated PDF Storage** - For PDF documents (1.2.840.10008.5.1.4.1.1.104.1)
- **Secondary Capture Image Storage** - For image-based print jobs (1.2.840.10008.5.1.4.1.1.7)

## Basic Example

Send uncompressed images to a PACS:

```xml
<Store name="SendToPACS">
  <ConnectionParameters>
    <PeerAETitle>PACS_SERVER</PeerAETitle>
    <MyAETitle>DICOM_PRINTER</MyAETitle>
    <Host>192.168.1.100</Host>
    <Port>104</Port>
  </ConnectionParameters>
</Store>
```

Use in workflow with error handling:
```xml
<Perform action="SendToPACS" onError="Hold"/>
```

## Compression Examples

### JPEG Lossless Compression

```xml
<Store name="SendCompressed">
  <ConnectionParameters>
    <PeerAETitle>PACS_ARCHIVE</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>pacs.hospital.local</Host>
    <Port>11112</Port>
  </ConnectionParameters>
  <Compression type="JPEG_Lossless"/>
</Store>
```

### RLE Compression with Grayscale Conversion

```xml
<Store name="SendGrayscaleRLE">
  <ConnectionParameters>
    <PeerAETitle>PACS_SERVER</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.100</Host>
    <Port>104</Port>
  </ConnectionParameters>
  <Compression type="RLE"/>
  <ColorMode mode="Monochrome8"/>
</Store>
```

## Multiple Storage Destinations

You can define multiple Store actions to send to different destinations:

```xml
<Actions>
  <!-- Primary PACS -->
  <Store name="SendToPrimaryPACS">
    <ConnectionParameters>
      <PeerAETitle>PACS_PRIMARY</PeerAETitle>
      <MyAETitle>PRINTER</MyAETitle>
      <Host>192.168.1.100</Host>
      <Port>104</Port>
    </ConnectionParameters>
    <Compression type="JPEG_Lossless"/>
  </Store>

  <!-- Backup archive -->
  <Store name="SendToBackupArchive">
    <ConnectionParameters>
      <PeerAETitle>PACS_BACKUP</PeerAETitle>
      <MyAETitle>PRINTER</MyAETitle>
      <Host>192.168.1.200</Host>
      <Port>104</Port>
    </ConnectionParameters>
    <Compression type="RLE"/>
  </Store>

  <!-- Film printer -->
  <Store name="SendToFilm">
    <ConnectionParameters>
      <PeerAETitle>FILM_PRINTER</PeerAETitle>
      <MyAETitle>PRINTER</MyAETitle>
      <Host>192.168.1.50</Host>
      <Port>104</Port>
    </ConnectionParameters>
    <ColorMode mode="Monochrome12"/>
  </Store>
</Actions>

<Workflow>
  <!-- Primary PACS - retry on failure -->
  <Perform action="SendToPrimaryPACS" onError="Hold"/>

  <!-- Backup - ignore failures -->
  <Perform action="SendToBackupArchive" onError="Ignore"/>

  <!-- Film printer - ignore failures -->
  <Perform action="SendToFilm" onError="Ignore"/>
</Workflow>
```

## Conditional Storage

Use workflow conditionals to route to different destinations based on data:

```xml
<Workflow>
  <Perform action="FindPatient"/>

  <If field="QUERY_FOUND" value="true">
    <!-- Patient matched - send to primary PACS -->
    <Perform action="SendToPrimaryPACS"/>
  </If>

  <If field="QUERY_FOUND" value="false">
    <!-- No patient match - send to holding area -->
    <Perform action="SendToHoldingPACS"/>
  </If>
</Workflow>
```

## Error Handling

Error handling is configured on `<Perform>` nodes in the workflow, not on the Store action itself.

### Retry on Network Failures

Action definition:
```xml
<Store name="SendWithRetry">
  <ConnectionParameters>
    <PeerAETitle>PACS_SERVER</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.100</Host>
    <Port>104</Port>
  </ConnectionParameters>
</Store>
```

Workflow with retry:
```xml
<Perform action="SendWithRetry" onError="Hold"/>
```

With `onError="Hold"`, failed stores are retried after the `SuspensionTime` interval.

### Discard on Permanent Failures

Action definition:
```xml
<Store name="SendOrDiscard">
  <ConnectionParameters>
    <PeerAETitle>OPTIONAL_ARCHIVE</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.200</Host>
    <Port>104</Port>
  </ConnectionParameters>
</Store>
```

Workflow with discard:
```xml
<Perform action="SendOrDiscard" onError="Discard"/>
```

### Ignore Optional Destinations

Action definition:
```xml
<Store name="SendOptional">
  <ConnectionParameters>
    <PeerAETitle>OPTIONAL_PACS</PeerAETitle>
    <MyAETitle>PRINTER</MyAETitle>
    <Host>192.168.1.150</Host>
    <Port>104</Port>
  </ConnectionParameters>
</Store>
```

Workflow with ignore:
```xml
<Perform action="SendOptional" onError="Ignore"/>
```

## Checking Store Success

Use workflow conditionals to check if a store operation succeeded:

```xml
<Workflow>
  <Perform action="SendToPACS"/>

  <If field="STORE_SUCCEEDED" tag="SendToPACS" value="true">
    <!-- Store succeeded -->
    <Perform action="NotifySuccess"/>
  </If>

  <If field="STORE_SUCCEEDED" tag="SendToPACS" value="false">
    <!-- Store failed -->
    <Perform action="NotifyFailure"/>
  </If>
</Workflow>
```

## Complete Example

Complete configuration with query, tag setting, and multiple store destinations:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <!-- Query for patient data -->
    <Query name="FindPatient" type="Worklist">
      <ConnectionParameters>
        <PeerAETitle>RIS</PeerAETitle>
        <MyAETitle>PRINTER</MyAETitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <!-- Set metadata -->
    <SetTag name="SetMetadata">
      <DcmTag tag="0008,0020">#{Date}</DcmTag>
      <DcmTag tag="0008,0080" value="Medical Center"/>
    </SetTag>

    <!-- Primary PACS with compression -->
    <Store name="SendToPrimaryPACS">
      <ConnectionParameters>
        <PeerAETitle>PACS_PRIMARY</PeerAETitle>
        <MyAETitle>DICOM_PRINTER</MyAETitle>
        <Host>pacs.hospital.local</Host>
        <Port>11112</Port>
      </ConnectionParameters>
      <Compression type="JPEG_Lossless"/>
    </Store>

    <!-- Backup without compression -->
    <Store name="SendToBackup">
      <ConnectionParameters>
        <PeerAETitle>PACS_BACKUP</PeerAETitle>
        <MyAETitle>DICOM_PRINTER</MyAETitle>
        <Host>backup.hospital.local</Host>
        <Port>11112</Port>
      </ConnectionParameters>
    </Store>
  </Actions>

  <Workflow>
    <!-- Find patient with retry on failure -->
    <Perform action="FindPatient" onError="Hold"/>

    <If field="QUERY_FOUND" value="true">
      <Perform action="SetMetadata"/>

      <!-- Primary PACS - critical, retry on failure -->
      <Perform action="SendToPrimaryPACS" onError="Hold"/>

      <!-- Backup - optional, ignore failures -->
      <Perform action="SendToBackup" onError="Ignore"/>
    </If>
  </Workflow>
</DicomPrinter>
```

## Performance Considerations

- **Compression** reduces network bandwidth but increases CPU usage
- **JPEG Lossless** provides good compression with moderate CPU usage
- **RLE** is fastest but provides less compression
- **JPEG Lossy** provides maximum compression but may not be suitable for diagnostic images

## Related Topics

- [Actions Overview](index.md)
- [Query Actions](query.md)
- [Print Actions](print.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
