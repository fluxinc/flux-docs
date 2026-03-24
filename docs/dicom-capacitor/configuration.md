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

The following optional non-YAML configuration files can further customize queue behavior:
- **`sop-class-priorities.txt`** - Optional SOP Class UID priority list. The first non-comment line has the highest priority, the last has the lowest priority, and the special `default` line sets the priority for any SOP class not explicitly listed. If the file contains only `default`, queue processing remains FIFO with no SOP-based prioritization.

All configuration files should be placed in the DICOM Capacitor directory. By default this is at:
- **Windows**: `%ProgramData%\Flux Inc\DICOM Capacitor\`
- **macOS/Linux**: `/var/lib/dicom-capacitor/data/`

The directory path can be specified using the `--path` [command line option](command-line.md) or setting `cachePath` in the `config.yml` [settings file](config.md).
