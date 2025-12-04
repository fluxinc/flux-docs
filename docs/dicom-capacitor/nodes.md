# Nodes

The `nodes.yml` file is a list of nodes that DICOM Capacitor will use to send and receive DICOM data.

## Example Configuration

```yaml
---
- AeTitle: STORE_SCP
  Aliases:
    - PACS
  HostName: 127.0.0.1
  Port: 104
  TransferSyntax:
  NodeRole: Storage
  BatchSize: 0
  MinimumLineSpeed: 0
  ProcessSchedule:
    - 00:00 - 23:59
  ProcessNetworks:
    - 192.168.100.4 / 255.255.255.0
```

---

## AeTitle

- Type: `string`
- Default: `DESTINATION`

The AE Title that is used when initiating associations with this node. In the example above, clients that wish to send DICOM data to this node should use the *Called* AE Title `STORE_SCP`.

Capacitor will respond affirmatively to any C-ECHO and C-Store association intended for this AE Title, as well as this AE title prefixed with `config.yml/aeTitlePrefix`.

## Aliases

- Type: `string[]`
- Default: `[]`
- Optional

A YAML array of aliases that DICOM Capacitor will use to identify the node. In the example above, associations intended for the `PACS` will be delivered to `STORE_SCP` instead.

Capacitor will respond affirmatively to any C-ECHO and C-Store association intended for these aliases.

## BatchSize

- Type: `number`
- Default: `""` (inherits from config.yml)
- Optional

The number of DICOM images to process in a single batch. Any value other than blank overrides the value set in `config.yml/batchSize` for only this node.

## HostName

- Type: `string`
- Default: `127.0.0.1`

The IP address or hostname of the node.

## Impersonate

- Type: `boolean`
- Default: `false`
- Optional

When enabled, DICOM Capacitor will assume the AE Title of the original calling client when making outbound requests to this node, instead of using the `myAeTitle` from `config.yml`.

This is useful when the destination node needs to know the original source of the data. For example:
- A PACS that uses the calling AE Title for routing or access control
- A worklist server that filters results based on the requesting modality
- Systems that log or track data by the originating AE Title

**Example**:
```yaml
- AeTitle: PACS
  HostName: 192.168.1.100
  Port: 104
  Impersonate: true  # PACS will see the original modality's AE Title
```

When `Impersonate` is `false` (default), all outbound requests use the AE Title defined in `config.yml/myAeTitle`.

## MinimumLineSpeed

- Type: `number`
- Default: `""` (inherits from config.yml)
- Optional

The minimum transmission speed, in KB/s, that DICOM Capacitor will use to determine if a storage operation has failed. This value overrides the `config.yml/minimumLineSpeed` setting for this node.

## NodeRole

- Type: `string`
- Default: `Storage`

The role of the node.

Accepted values:
- `Storage` - The node is a Storage SCP, and Capacitor will relay data to it
- `QueryRetrieve` - The node is a Query/Retrieve SCP, and Capacitor will relay queries to it
- `Worklist` - The node is a Worklist SCP, and Capacitor will relay queries to it, and cache (and mutate) the results
- `StorageCommitSCP` - The node is a Storage Commitment SCP, and Capacitor will relay requests to it
- `StorageCommitSCU` - The node is a Storage Commitment SCU, and Capacitor will relay requests to it

Specific roles may require and allow additional configuration in `config.yml`, `nodes.yml`, and `mutations.yml`.

## Port

- Type: `number`
- Default: `104`

The port that the node is listening on.

## Priority

- Type: `number`
- Default: `0`
- Optional

The DICOM priority level for operations with this node. This affects the priority field in DICOM messages.

Accepted values:
- `0` - Medium priority (default)
- `1` - High priority
- `2` - Low priority

## ProcessDelay

- Type: `number`
- Default: `""` (inherits from config.yml)
- Optional

The number of milliseconds to delay delivery of prepared studies for this specific node. This overrides the global `config.yml/processDelay` setting.

This is part of the "Adaptive Study Delivery Window" system. See [config.yml/processDelay](config.md#processdelay) for more details.

**Example**:
```yaml
- AeTitle: PACS
  HostName: 192.168.1.100
  Port: 104
  ProcessDelay: 30000  # Wait 30 seconds before delivery to this node
```

## ProcessNetworks

- Type: `string[]`
- Default: `[]`
- Optional

A YAML array of CIDR ranges DICOM Capacitor will compare against all local network adapters to determine when to process data for this node.

**Example**:
```yaml
ProcessNetworks:
  - 192.168.100.4 / 255.255.255.0  # requires specific subnet using mask
  - 192.168.100.0                  # requires specific subnet address
  - 192.168.100.4                  # requires specific ip address (no mask)
```

## ProcessSchedule

- Type: `string[]`
- Default: `[]`
- Optional

A YAML array of time ranges that DICOM Capacitor will use to determine when to process data for this node.

**Example**:
```yaml
ProcessSchedule:
  - 00:00 - 23:59
  - 13:30 - 17:00
```

## TransferSyntax

- Type: `string`
- Default: `""` (inherits from incoming image or config.yml)
- Optional

The transfer syntax that Capacitor will use when sending data to this node. If this value is not provided, Capacitor will use the transfer syntax of the incoming image, or the value defined in `config.yml/defaultTransferSyntax` if set.

Accepted values are the same as those in [config.yml/defaultTransferSyntax](config.md#defaulttransfersyntax).
