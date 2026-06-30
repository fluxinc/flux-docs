# Connection Parameters

The `<ConnectionParameters>` block defines the DICOM network association settings used to reach a remote SCP. It is shared by the [Print](actions/print.md), [Store](actions/store.md), and [Query](actions/query.md) actions: each of those actions contains exactly one `<ConnectionParameters>` element describing the remote peer and the local calling identity.

**Element names are case-sensitive.** Use the exact PascalCase shown below — a mis-cased tag (for example `<peeraetitle>`) is not recognized.

## Basic Syntax

```xml
<ConnectionParameters>
  <PeerAeTitle>PACS_AE</PeerAeTitle>
  <Host>192.168.1.50</Host>
  <Port>104</Port>
  <MyAeTitle>DICOM_PRINTER</MyAeTitle>
  <MaxPdu>16384</MaxPdu>
  <BlockingMode>BLOCKING</BlockingMode>
  <AssociationTimeout>30</AssociationTimeout>
  <DimseTimeout>-1</DimseTimeout>
</ConnectionParameters>
```

## Required Elements

### `PeerAeTitle`
The AE Title of the remote DICOM peer (the SCP this action connects to). No default — must be set.

### `Host`
The hostname or IP address of the remote DICOM peer. No default — must be set.

### `Port`
The TCP port number of the remote DICOM peer, typically `104` or `11112`. No default. A non-numeric value is a hard configuration load failure.

## Optional Elements

### `MyAeTitle`
The calling AE Title — the identity DICOM Printer 2 presents to the remote peer.

**Default:** `DICOM_PRINTER`

### `MaxPdu`
Maximum PDU (protocol data unit) size in bytes negotiated for the association.

**Default:** `16384`

An invalid value falls back to the default (a warning is logged).

### `BlockingMode`
Network I/O mode for the association.

**Valid Values:** `BLOCKING`, `NONBLOCKING` (exact uppercase)
**Default:** `BLOCKING`

### `AssociationTimeout`
Time in seconds to wait when establishing the association.

**Default:** `30`

Use `-1` for an infinite timeout.

### `DimseTimeout`
Time in seconds to wait for a DIMSE message response on an established association.

**Default:** `-1` (infinite)

Use `-1` for an infinite timeout.

## Example

A minimal block needs only the three required elements; the rest take their defaults:

```xml
<Store name="SendToPACS">
  <ConnectionParameters>
    <PeerAeTitle>PACS_SERVER</PeerAeTitle>
    <Host>192.168.1.100</Host>
    <Port>104</Port>
  </ConnectionParameters>
</Store>
```

## Related Topics

- [Print Actions](actions/print.md)
- [Store Actions](actions/store.md)
- [Query Actions](actions/query.md)
