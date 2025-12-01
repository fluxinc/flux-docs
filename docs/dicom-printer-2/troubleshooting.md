# Troubleshooting

This guide covers common issues and their solutions for DICOM Printer 2.

## Service Issues

### Service Won't Start

**Symptoms:**
- Service fails to start
- Error message in Event Viewer
- Status remains "Stopped"

**Common Causes and Solutions:**

1. **Configuration Error**
   - Check log file for XML parsing errors
   - Validate config.xml syntax
   - Ensure DTD validation passes
   - Solution: Fix configuration errors and restart

2. **Invalid License**
   - Check license activation status
   - Verify activation code in config.xml
   - Solution: See [Licensing and Activation](licensing.md)

3. **Port Already in Use**
   - Another application using required ports
   - Solution: Identify and stop conflicting service, or change DICOM ports in configuration

4. **File Permissions**
   - Service account lacks permissions
   - Cannot access configuration or data directories
   - Solution: Grant appropriate permissions to service account

### Service Stops Unexpectedly

**Symptoms:**
- Service runs then stops
- No obvious error messages
- Event Viewer shows service termination

**Solutions:**
1. Check logs for errors immediately before stop
2. Review Windows Event Viewer → Application log
3. Verify license hasn't expired
4. Check available disk space
5. Monitor system resources (CPU, memory)

### Service Runs but Doesn't Process Jobs

**Symptoms:**
- Service status shows "Running"
- Print jobs or files not processed
- No activity in logs

**Solutions:**
1. Verify `CheckingInterval` is reasonable (e.g., 5000 ms)
2. Check queue directory exists and is accessible
3. Verify printer driver is correctly installed
4. For Drop Monitor: Verify drop folder path is correct
5. Check logs for errors during job detection

## Connection Issues

### Cannot Connect to PACS

**Symptoms:**
- Store actions fail with connection errors
- "Connection refused" or "Network unreachable" in logs
- Timeout errors

**Solutions:**

1. **Network Connectivity**
   - Ping PACS server: `ping 192.168.1.100`
   - Check firewall rules
   - Verify network cable/WiFi connection

2. **PACS Configuration**
   - Verify PACS IP address and port
   - Confirm PACS is running
   - Check PACS AE Title configuration
   - Ensure DICOM Printer 2 AE Title is registered in PACS

3. **DICOM Configuration**
   - Verify `calledAE` matches PACS AE Title
   - Verify `callingAE` is registered on PACS
   - Check host and port are correct
   - Increase log verbosity to DEBUG to see DICOM protocol details

### Query Actions Find No Results

**Symptoms:**
- Query completes successfully
- `QUERY_FOUND` returns false
- Expected patient data not retrieved

**Solutions:**

1. **Query Criteria**
   - Verify patient ID is correct
   - Check date range placeholders
   - Ensure query tags match available data
   - Use DEBUG logging to see actual query sent

2. **Worklist Configuration**
   - Confirm worklist server is correct
   - Verify scheduled procedure step date is correct
   - Check if worklist entry exists for patient

3. **Character Encoding**
   - Ensure patient names with special characters are handled correctly
   - Check DICOM character set configuration

## Workflow Issues

### Jobs Suspended Indefinitely

**Symptoms:**
- Jobs enter suspended state
- Jobs don't automatically resume
- Queue builds up

**Common Causes:**

1. **No Patient Match**
   - Query finds no worklist entry
   - Solution: Add patient to worklist or manually resume with correct data

2. **Multiple Matches**
   - Query returns multiple patients (QUERY_PARTIAL)
   - Solution: Review and select correct patient, then resume

3. **Validation Failure**
   - Required fields missing
   - Solution: Add missing data and resume job

**Solutions:**
- Review suspended jobs in queue directory
- Check logs to identify suspension reason
- Use Control Application to manually resume after fixing issue

### Jobs Discarded Unexpectedly

**Symptoms:**
- Jobs disappear from queue
- No PACS storage or output generated
- Logs show job processing started but not completed

**Solutions:**
1. Check workflow for `<Discard/>` nodes
2. Review conditional logic that might trigger discard
3. Add logging before discard nodes to identify cause
4. Consider using `<Suspend/>` instead for debugging

## License Issues

### Invalid Activation Code

**Symptoms:**
- Error: "Invalid activation code"
- License state shows unlicensed
- Service may run in limited mode

**Solutions:**
1. Verify activation code was entered correctly
2. Ensure no extra spaces or characters
3. Regenerate request code and obtain new activation code
4. Contact Flux Inc support if issue persists

### License Expired

**Symptoms:**
- Service stops processing
- "License expired" message in logs
- License state shows expired

**Solutions:**
1. Contact Flux Inc for license renewal
2. Enter new activation code
3. Restart service

## Configuration Issues

### XML Syntax Errors

**Symptoms:**
- Service won't start
- Log shows "Failed to parse configuration"
- XML parsing error messages

**Solutions:**
1. Open config.xml in XML-aware editor
2. Check for:
   - Unclosed tags
   - Missing quotes on attributes
   - Invalid characters
   - Incorrect nesting
3. Use XML validator or DTD validation
4. Restore from backup if corrupted

### Actions Not Executing

**Symptoms:**
- Workflow appears to skip actions
- Expected operations don't occur
- No errors in logs

**Solutions:**
1. Verify action is referenced in `<Workflow>` section
2. Check action `name` attribute matches `<Perform action="name"/>` exactly
3. Ensure action is inside appropriate conditional block
4. Increase log verbosity to DETAILED to see workflow execution

## Performance Issues

### Slow Job Processing

**Symptoms:**
- Jobs take longer than expected to process
- Large gaps between workflow steps in logs
- System feels sluggish

**Solutions:**
1. **Check System Resources**
   - Monitor CPU usage
   - Check available memory
   - Verify adequate disk space
   - Review disk I/O performance

2. **Optimize Configuration**
   - Reduce image processing operations
   - Disable unnecessary actions
   - Reduce query complexity
   - Consider compression impact on CPU

3. **Network Performance**
   - Check network latency to PACS
   - Verify network bandwidth
   - Consider local network congestion

### Large Log Files

**Symptoms:**
- Log files consume excessive disk space
- Slow log file access
- Frequent rotation

**Solutions:**
1. Reduce log verbosity (use STANDARD instead of DEBUG)
2. Decrease `MaximumLogFileSize`
3. Decrease `MaximumLogFileCount`
4. Implement log cleanup script
5. Monitor and archive old log files

## Print Driver Issues

### Printer Not Appearing in Windows

**Symptoms:**
- "DICOM Printer 2" not in Devices and Printers
- Cannot print to DICOM Printer 2
- Applications don't show printer

**Solutions:**
1. Verify service is running
2. Reinstall using Inno Setup installer
3. Check Windows print spooler service is running
4. Review installation logs for driver installation errors

### Print Jobs Not Reaching Service

**Symptoms:**
- Print job sent from application
- Job doesn't appear in DICOM Printer 2 queue
- No activity in service logs

**Solutions:**
1. Check Windows print spooler for stuck jobs
2. Verify queue directory is accessible
3. Restart print spooler service
4. Restart DICOM Printer 2 service

## Debugging Steps

### Systematic Troubleshooting

1. **Reproduce the Issue**
   - Identify exact steps to reproduce
   - Note any error messages

2. **Check Service Status**
   - Verify service is running
   - Check license is valid

3. **Review Logs**
   - Set verbosity to DETAILED or DEBUG
   - Reproduce issue
   - Review logs for errors

4. **Isolate the Problem**
   - Test with minimal configuration
   - Disable non-essential actions
   - Test DICOM connectivity separately

5. **Verify Configuration**
   - Validate XML syntax
   - Check all referenced actions exist
   - Verify network addresses and ports

6. **Test Components**
   - Test Query actions separately
   - Test Store actions with known-good PACS
   - Verify workflow logic with simple test case

## Getting Help

If you cannot resolve the issue:

1. **Gather Information:**
   - DICOM Printer 2 version
   - Windows version
   - Relevant log excerpts (set to DEBUG)
   - Configuration file (sanitize sensitive data)
   - Steps to reproduce

2. **Contact Support:**
   - Email: support@fluxinc.ca
   - Include all gathered information
   - Describe troubleshooting steps already attempted

See [Support](support.md) for contact information.

## Related Topics

- [Logging](logs.md)
- [Configuration](configuration.md)
- [Starting and Stopping the Service](starting-and-stopping.md)
- [Licensing and Activation](licensing.md)
- [Support](support.md)
