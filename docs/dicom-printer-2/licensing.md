# Licensing and Activation

DICOM Printer 2 uses a license-based activation system to enable full functionality.

## License System Overview

DICOM Printer 2 requires a valid license to operate. The licensing system uses:
- **Request Code** - Unique code generated from your system
- **Activation Code** - License key provided by Flux Inc
- **Validity Period** - Duration for which the license is valid

## License States

### Unlicensed

The software is installed but not activated.

**Behavior:**
- Service runs in trial or limited mode
- May have feature restrictions or time limitations
- Displays warnings about unlicensed state

### Active

The software is properly licensed and activated.

**Behavior:**
- Full functionality enabled
- No restrictions or warnings
- Valid until expiration date

### Expired

The license validity period has ended.

**Behavior:**
- Similar to unlicensed state
- Service may stop processing
- Requires license renewal

### Invalid

The activation code is invalid or corrupted.

**Behavior:**
- Service fails to start
- Error messages in logs
- Requires valid activation code

## Activation Process

### Method 1: Using the DICOM Printer Console

1. **Launch the Console**
   ```
   Start Menu → Flux Inc → DICOM Printer 2 → DICOM Printer Console
   ```

2. **Open Manage → Activate**
   Click the gear icon in the top bar to open Manage, then click **Activate**. The Console resolves the installed activator via `/api/admin/activate-info` and launches it.

3. **Complete activation in the wizard**
   The activator opens the activation page in the default web browser, displays the hardware request code, and polls the licensing server in the background until activation succeeds.

4. **Verify activation**
   The Console Manage pane reflects the new licensed state once the activator reports success.

### Method 2: Using Command Line

1. **Launch the interactive activation wizard**
   ```cmd
   cd "C:\Program Files (x86)\Flux Inc\DICOM Printer 2"
   DicomPrinter.exe --activate
   ```
   The wizard opens the activation page in the default browser, displays the request code, and polls until activation completes. Requires an interactive console session (not Session 0).

2. **Inspect current activation data**
   ```cmd
   DicomPrinter.exe --activation-data
   ```
   Emits an XML document containing the hardware `RequestCode` and the stored `ActivationCode`.

3. **Print the machine-specific activation URL**
   ```cmd
   DicomPrinter.exe --get-activation-url
   ```
   Outputs a URL like `https://store.fluxinc.ca/activate?request=...` that you can paste into a browser on another machine to complete activation.

4. **Complete activation offline**
   On a machine without internet access, use `DicomPrinter.exe --get-activation-url` to obtain the machine-specific activation URL, open it in a browser on another machine to retrieve the activation code, then run `DicomPrinter.exe --activate` and supply that code. The activation code is written to the `.activation` file in the same directory as `config.xml`; you do not hand-edit `config.xml` to license the product.

## Activation Code Format

Activation codes are formatted as:
```
XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
```

**Important:**
- Activation codes are case-insensitive
- Include all dashes when entering
- Copy and paste to avoid typos
- One activation code per installation

## License Validity

### Checking Expiration

**DICOM Printer Console:**
```
Manage → Activate (shows current activation state and days remaining)
```

**Service Logs:**
```
License valid for 123 days
```

### Renewal

Before license expires:
1. Contact Flux Inc for renewal
2. Receive new activation code
3. Enter new activation code (same process as initial activation)
4. Validity period is extended

## Request Code Generation

Request codes are generated from:
- System hardware identifiers
- MAC addresses
- Disk serial numbers
- Other system-specific data

**Important:**
- Request code changes if hardware changes significantly
- Same request code for same system
- Re-activation required after major hardware changes

## Where the Activation Code Is Stored

You do not hand-edit `config.xml` to license the product. When activation succeeds, the app stores the activation code in a file named `.activation`, located in the **same directory as `config.xml`**.

**Location:** `%ProgramData%\Flux Inc\DICOM Printer 2\config\.activation`
(alongside `%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml`)

The activation code is **not** stored in the Windows registry, and it is **not** placed into `config.xml`.

> **Note:** A legacy `<RegistrationKey>` element may appear inside `config.xml`. It is inert and ignored — it plays no part in current activation. Editing or removing it has no effect on licensing.

## Troubleshooting

### Invalid Activation Code

**Symptoms:**
- Error: "Invalid activation code"
- License state remains unlicensed

**Causes:**
- Typo in activation code
- Wrong activation code for this system
- Corrupted activation code

**Solutions:**
- Double-check activation code
- Copy and paste instead of manual entry
- Regenerate request code and get new activation code
- Contact Flux Inc support

### License Expired

**Symptoms:**
- Service stops processing
- Warning: "License expired"
- License state shows as expired

**Solutions:**
- Contact Flux Inc for license renewal
- Enter new activation code
- Restart service

### Request Code Changed

**Symptoms:**
- Previously activated system now shows as unlicensed
- Error: "License invalid for this system"

**Causes:**
- Significant hardware changes
- System reinstallation
- Virtual machine migration

**Solutions:**
- Generate new request code
- Contact Flux Inc with:
  - Old activation code
  - New request code
  - Explanation of change
- Receive new activation code for new configuration

### Service Won't Start with Invalid License

**Symptoms:**
- Service fails to start
- Error in logs: "License check failed"

**Solutions:**
- Re-run activation (`DicomPrinter.exe --activate`) to obtain a fresh activation code
- Inspect the stored activation with `DicomPrinter.exe --activation-data`
- If the `.activation` file is corrupted, delete it (it sits next to `config.xml`) to fall back to trial mode, then re-activate
- Contact Flux Inc for a valid activation code

## License Management Best Practices

1. **Record activation codes** - Store activation codes securely
2. **Monitor expiration** - Set reminders before licenses expire
3. **Plan for renewal** - Contact Flux Inc well before expiration
4. **Backup the `.activation` file** - Keep a backup of the activated `.activation` file (stored next to `config.xml`)
5. **Document hardware** - Record hardware configuration for reference
6. **Test after hardware changes** - Verify licensing after system changes

## Activation Support

For activation assistance:

**Email:** support@fluxinc.ca

**Include:**
- Request code
- Description of issue
- DICOM Printer 2 version
- Error messages (if any)

**Response Time:**
- Typically within 1 business day
- Expedited support available

## License Types

Flux Inc offers various license types:

- **Standard** - Single installation, annual renewal
- **Multi-site** - Multiple installations, volume pricing
- **Enterprise** - Site license with special terms
- **Development** - For testing and development purposes

Contact Flux Inc for licensing options and pricing.

## Related Topics

- [Installation](installation.md)
- [DICOM Printer Console](control-app.md)
- [Command-Line Options](command-line.md)
- [Configuration](configuration.md)
- [Support](support.md)
