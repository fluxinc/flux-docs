# Settings Reference

This page provides a complete reference of all general configuration settings available in DICOM Printer 2.

All settings are configured in the `<General>` section of the `config.xml` file:

```xml
<DicomPrinter>
  <General>
    <CheckingInterval>5000</CheckingInterval>
    <SuspensionTime>60000</SuspensionTime>
    <!-- other settings -->
  </General>
</DicomPrinter>
```

## Settings

### CheckingInterval

**Type:** Integer (milliseconds)
**Default:** `1000` (1 second)

The interval in milliseconds between checks for new print jobs in the queue directory.

**Example:**
```xml
<CheckingInterval>1000</CheckingInterval>
```

This setting controls how frequently the service scans the queue directory for new jobs. A lower value provides faster response to new print jobs but increases CPU usage. A higher value reduces CPU usage but increases latency.

### MaximumLogFileCount

**Type:** Integer
**Default:** `10`

The maximum number of log files to retain. When this limit is reached, the oldest log file is deleted when a new one is created.

**Example:**
```xml
<MaximumLogFileCount>10</MaximumLogFileCount>
```

Log files are rotated when they reach the `MaximumLogFileSize`. This setting determines how many rotated log files are kept.

### MaximumLogFileSize

**Type:** Integer (bytes) or String with suffix (K, M, G)
**Default:** `52428800` (50 MB)

The maximum size for a single log file before rotation occurs. Can be specified as bytes or with K/M/G suffix.

**Example:**
```xml
<!-- Specify in bytes -->
<MaximumLogFileSize>52428800</MaximumLogFileSize>

<!-- Or use suffixes (no suffix defaults to M) -->
<MaximumLogFileSize>50M</MaximumLogFileSize>
<MaximumLogFileSize>50</MaximumLogFileSize>  <!-- defaults to MB -->
<MaximumLogFileSize>100M</MaximumLogFileSize>
<MaximumLogFileSize>1G</MaximumLogFileSize>
```

When the log file reaches this size, it is renamed with a timestamp and a new log file is created. Common values:
- `10M` or `10485760` - 10 MB
- `50M` or `52428800` - 50 MB (default)
- `100M` or `104857600` - 100 MB

### RegistrationKey

**Type:** String
**Default:** None (empty)

The activation code provided by Flux Inc to license the software.

**Example:**
```xml
<RegistrationKey>XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX</RegistrationKey>
```

This value is typically set through the Control Application or during the activation process. See [Licensing and Activation](licensing.md) for more information.

### SuspensionTime

**Type:** Integer (minutes)
**Default:** `15` (15 minutes)

The time in minutes that a job is suspended before retrying after a failed action configured with `onError="Hold"`.

**Example:**
```xml
<SuspensionTime>15</SuspensionTime>
```

When an action fails and is configured to hold the job on error, the job is suspended for this duration before being retried. Common values:
- `1` - 1 minute
- `5` - 5 minutes
- `15` - 15 minutes (default)
- `30` - 30 minutes
- `60` - 1 hour

### ValidityPeriod

**Type:** Integer (days)
**Default:** `5`

The number of days that a job remains valid before it is considered expired and discarded.

**Example:**
```xml
<ValidityPeriod>5</ValidityPeriod>
```

Jobs older than this number of days will be automatically discarded during processing. This prevents very old jobs from accumulating in the queue.

### Verbosity

**Type:** Integer
**Default:** `35` (STANDARD level)

Controls the level of detail in log file output. Higher values provide more detailed logging.

**Example:**
```xml
<Verbosity>35</Verbosity>
```

**Verbosity Levels:**

The verbosity value controls how deep into nested operations logging will occur. Common values:

- **0-10** - SILENT - Minimal to no logging output
- **15-25** - MINIMAL - Only critical errors and warnings
- **30-40** - STANDARD - Normal operations and errors (recommended for production, default: 35)
- **45-60** - DETAILED - Verbose operational details
- **65+** - DEBUG - Full debugging information including DICOM protocol messages

Higher values provide more detailed logging but generate significantly larger log files. Use values above 60 for troubleshooting DICOM communication issues.

## Configuration Example

Complete example of the General section:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <General>
    <CheckingInterval>1000</CheckingInterval>
    <SuspensionTime>15</SuspensionTime>
    <Verbosity>35</Verbosity>
    <ValidityPeriod>5</ValidityPeriod>
    <RegistrationKey>XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX</RegistrationKey>
    <MaximumLogFileSize>50M</MaximumLogFileSize>
    <MaximumLogFileCount>10</MaximumLogFileCount>
  </General>
</DicomPrinter>
```

## Related Topics

- [Configuration Overview](configuration.md)
- [Logging](logs.md)
- [Licensing and Activation](licensing.md)
