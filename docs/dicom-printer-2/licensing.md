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

### Method 1: Using the Control Application

1. **Launch Control Application**
   ```
   Start Menu → Flux Inc → DICOM Printer 2 → Control Application
   ```

2. **Navigate to Licensing Tab**
   Click the "Licensing" or "Activation" tab

3. **Generate Request Code**
   - Click "Generate Request Code"
   - Request code is displayed and copied to clipboard
   - Example: `XXXX-XXXX-XXXX-XXXX`

4. **Obtain Activation Code**
   - Visit Flux Inc activation portal
   - Enter request code
   - Receive activation code
   - OR contact Flux Inc support with request code

5. **Enter Activation Code**
   - Click "Enter Activation Code"
   - Paste or type activation code
   - Click "Activate"

6. **Verify Activation**
   - License status changes to "Active"
   - Validity period is displayed
   - Service continues with full functionality

### Method 2: Using Command Line

1. **Generate Activation Data**
   ```cmd
   cd "C:\Program Files (x86)\Flux Inc\DICOM Printer 2"
   DicomPrinterService.exe --activation-data
   ```

   Output:
   ```
   Request Code: XXXX-XXXX-XXXX-XXXX
   ```

2. **Get Activation URL**
   ```cmd
   DicomPrinterService.exe --get-activation-url
   ```

   Output:
   ```
   https://activation.fluxinc.ca/activate?request=XXXX-XXXX-XXXX-XXXX&product=DicomPrinter2
   ```

3. **Open URL in Browser**
   - Copy URL and open in web browser
   - Complete online activation process
   - Receive activation code

4. **Apply Activation Code**
   - Option A: Use Control Application to enter code
   - Option B: Manually edit `config.xml`:
     ```xml
     <General>
       <RegistrationKey>YOUR-ACTIVATION-CODE-HERE</RegistrationKey>
     </General>
     ```
   - Restart the service

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

### Validity Period

Licenses are typically valid for:
- 1 year (standard)
- 3 years (extended)
- Perpetual (special arrangements)

Check validity period in:
- Control Application licensing tab
- Configuration file `<ValidityPeriod>` setting
- Service logs during startup

### Checking Expiration

**Control Application:**
```
Licensing Tab → Days Remaining
```

**Configuration File:**
```xml
<General>
  <ValidityPeriod>365</ValidityPeriod>
</General>
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

## Configuration File

Activation status is stored in `config.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <General>
    <RegistrationKey>XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX</RegistrationKey>
    <ValidityPeriod>365</ValidityPeriod>
  </General>
</DicomPrinter>
```

**Location:** `%ProgramData%\Flux Inc\DICOM Printer 2\config\config.xml`

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
- Verify activation code is correctly entered
- Check config.xml for corrupted RegistrationKey
- Remove RegistrationKey temporarily to run in trial mode
- Contact Flux Inc for valid activation code

## License Management Best Practices

1. **Record activation codes** - Store activation codes securely
2. **Monitor expiration** - Set reminders before licenses expire
3. **Plan for renewal** - Contact Flux Inc well before expiration
4. **Backup config.xml** - Keep backup of activated configuration
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
- [Control Application](control-app.md)
- [Command-Line Options](command-line.md)
- [Configuration](configuration.md)
- [Support](support.md)
