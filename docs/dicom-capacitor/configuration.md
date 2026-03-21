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

All configuration files should be placed in the DICOM Capacitor directory. By default this is at:
- **Windows**: `%ProgramData%\Flux Inc\DICOM Capacitor\`
- **macOS/Linux**: `/var/lib/dicom-capacitor/data/`

The directory path can be specified using the `--path` [command line option](command-line.md) or setting `cachePath` in the `config.yml` [settings file](config.md).