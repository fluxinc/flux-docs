# nodes.yml

The `nodes.yml` file is a list of nodes that DICOM Capacitor will use to send and receive DICOM data.

## Example Node Definition

A node is defined as follows, e.g., for a Storage SCP node:

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

## Node Properties

- **`AeTitle`** (default: `DESTINATION`) - The AE Title that is used when initiating associations with this node. In the example above, clients that wish to send DICOM data to this node should use the *Called* AE Title `STORE_SCP`.

  Capacitor will respond affirmatively to any C-ECHO and C-Store association intended for this AE Title, as well as this AE title prefixed with `config.yml/aeTitlePrefix`.

- **`Aliases`** (optional, default: `[]`) - A YAML array of aliases that DICOM Capacitor will use to identify the node. In the example above, associations intended for the `PACS` will be delivered to `STORE_SCP` instead.

  Capacitor will respond affirmatively to any C-ECHO and C-Store association intended for these aliases.

- **`HostName`** (default: `127.0.0.1`) - The IP address or hostname of the node.

- **`Port`** (default: `104`) - The port that the node is listening on.

- **`TransferSyntax`** (default: ``) - The transfer syntax that Capacitor will use when sending data to this node. If this value is not provided, Capacitor will use the transfer syntax of the incoming image, or the value defined in `config.yml/defaultTransferSyntax` if set.

  Accepted values are the same as those in [config.yml/defaultTransferSyntax](config.md#settings).

- **`NodeRole`** (default: `Storage`) - The role of the node.
  - `Storage` - The node is a Storage SCP, and Capacitor will relay data to it
  - `QueryRetrieve` - The node is a Query/Retrieve SCP, and Capacitor will relay queries to it
  - `Worklist` - The node is a Worklist SCP, and Capacitor will relay queries to it, and cache (and mutate) the results
  - `StorageCommitSCP` - The node is a Storage Commitment SCP, and Capacitor will relay requests to it
  - `StorageCommitSCU` - The node is a Storage Commitment SCU, and Capacitor will relay requests to it

  Specific roles may require and allow additional configuration in `config.yml`, `nodes.yml`, and `mutations.yml`.

- **`BatchSize`** (default: ``) - The number of DICOM images to process in a single batch. Any value other than blank overrides the value set in `config.yml/batchSize` for only this node.

- **`MinimumLineSpeed`** (default: ``) - The minimum transmission speed, in KB/s, that DICOM Capacitor will use to determine if a storage operation has failed. This value overrides the `config.yml/minimumLineSpeed` setting for this node.

- **`ProcessSchedule`** (default: ``) - A YAML array of time ranges that DICOM Capacitor will use to determine when to process data for this node.

- **`ProcessNetworks`** (default: ``) - A YAML array of CIDR ranges DICOM Capacitor will compare against all local network adapters to determine when to process data for this node.

  **Examples**:
  ```yaml
  ProcessSchedule:
    - 00:00 - 23:59
  ProcessNetworks:
    - 192.168.100.4 / 255.255.255.0  # requires specific subnet using mask
    - 192.168.100.0                  # requires specific subnet address
    - 192.168.100.4                  # requires specific ip address (no mask)
  ```
