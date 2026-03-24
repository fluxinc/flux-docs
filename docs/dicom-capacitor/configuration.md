# Configuration Files

DICOM Capacitor uses YAML configuration files to define its behavior.
The following configuration files are required:
- **`config.yml`** - Main service configuration settings
- **`nodes.yml`** - Network node definitions for DICOM endpoints

The following configuration files are used by [filters](filters/index.md) (create only the ones you need):
- **`routings.yml`** - Required by the [route](filters/route) filter
- **`mutations.yml`** - Required by the [mutate](filters/mutate) filter
- **`sortings.yml`** - Required by the [sort](filters/sort) filter
- **`lua.yml`** - Required by the [Lua](filters/lua) filter

Queue prioritization is configured inside `nodes.yml`, not in a separate file:
- **`SopClassPriorities`** - Optional ordered SOP Class UID list on `NodeRole: Storage` nodes. Earlier entries have higher queue priority, `default` marks where unlisted SOP classes should fall, and omitting the property keeps FIFO behavior for that destination. See [nodes.yml / SopClassPriorities](nodes.md#sopclasspriorities).

This is intended for per-destination queue scheduling, such as making urgent or lightweight image classes arrive before lower-value backlog. It does not replace `sortings.yml`, which is still used for ordering within the same priority class.

All configuration files should be placed in the DICOM Capacitor directory. By default this is at:
- **Windows**: `%ProgramData%\Flux Inc\DICOM Capacitor\`
- **macOS/Linux**: `/var/lib/dicom-capacitor/data/`

The directory path can be specified using the `--path` [command line option](command-line.md) or setting `cachePath` in the `config.yml` [settings file](config.md).
