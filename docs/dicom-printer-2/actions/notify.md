# Notify Actions

Notify actions send notifications to external systems, enabling integration with alerting, monitoring, and workflow management systems.

## Relationship to Run Actions

**Important:** The `Notify` action extends the `Run` action class. This means that Notify actions inherit all configuration options available to Run actions, including:

- `<Command>` - The executable or script to run
- `<Arguments>` - Command-line arguments
- `<Timeout>` - Execution timeout in milliseconds
- `<Input>` - DICOM tag values to pass as input
- `<Output>` - DICOM tags to populate from output
- `<LauncherPortNumber>` - Port for plugin launcher communication
- `type` attribute - Execution type (`Console` or `Interactive`)
- `resolveHostNameAutomatically` attribute - Automatic hostname resolution

The key difference is that Notify actions include an additional `<Message>` element for notification content.

**Source:** `src/DicomPrinter/Notify.hpp:7` (class inheritance), `Notify.cpp:75-150` (parsing implementation)

## Basic Syntax

```xml
<Notify name="ActionName">
  <Message>Notification message with %1 placeholders</Message>
  <Input tag="0010,0020"/> <!-- Patient ID -->
  <Timeout>30000</Timeout> <!-- Optional, milliseconds -->
</Notify>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

## Required Attributes

### `name`
Unique identifier for this action.

## Required Elements

### `<Message>`
The notification message content. Supports placeholder substitution using `%1`, `%2`, etc., which are replaced with values from corresponding `<Input>` tags.

**Type:** String
**Format:** Text with optional placeholders (`%1`, `%2`, ...)

```xml
<Message>Patient %1 processed successfully at %2</Message>
<Input tag="0010,0020"/> <!-- %1 = Patient ID -->
<Input tag="0008,0020"/> <!-- %2 = Study Date -->
```

**Validation:** The number of placeholders in the Message must match the number of `<Input>` tags, otherwise the action is considered invalid.

**Source:** `src/DicomPrinter/Notify.cpp:94-97` (parsing), `Notify.cpp:53-73` (validation)

## Optional Elements

All optional elements from [Run Actions](run.md) are supported, including:

### `<Timeout>`
Maximum execution time in milliseconds.

**Type:** Integer
**Default:** 60000 (60 seconds)

```xml
<Timeout>30000</Timeout>
```

### `<Input>`
DICOM tags whose values will be substituted into the Message placeholders.

**Attributes:**
- `tag` (Required) - DICOM tag in format `(group,element)` or `group,element`

```xml
<Input tag="0010,0020"/> <!-- Patient ID -->
<Input tag="0010,0010"/> <!-- Patient Name -->
```

Input tags are processed in order and replace `%1`, `%2`, etc. in the Message.

## Common Attributes

## Error Handling Recommendations

Notifications are typically non-critical operations. When using Notify actions in workflows, consider:

```xml
<Perform action="SendAlert" onError="Ignore"/>
```

Setting `onError="Ignore"` ensures that notification failures don't stop critical workflow operations. The failure will be logged but processing continues.

## Use Cases

### Success Notifications

Notify when a job completes successfully:

```xml
<Actions>
  <Store name="SendToPACS">
    <ConnectionParameters>
      <PeerAETitle>PACS</PeerAETitle>
      <MyAETitle>PRINTER</MyAETitle>
      <Host>192.168.1.100</Host>
      <Port>104</Port>
    </ConnectionParameters>
  </Store>

  <Notify name="NotifySuccess">
    <Message>Patient %1 successfully stored to PACS</Message>
    <Input tag="0010,0020"/> <!-- Patient ID -->
  </Notify>
</Actions>

<Workflow>
  <Perform action="SendToPACS"/>

  <If field="STORE_SUCCEEDED" tag="SendToPACS" value="true">
    <Perform action="NotifySuccess"/>
  </If>
</Workflow>
```

### Failure Notifications

Notify when a critical operation fails:

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="false">
    <!-- No patient match - send alert -->
    <Perform action="NotifyNoMatch"/>
    <Suspend/>
  </If>
</Workflow>
```

### Status Notifications

Notify at various workflow stages:

```xml
<Workflow>
  <Perform action="NotifyJobStarted"/>

  <Perform action="ProcessImage"/>
  <Perform action="SendToPACS"/>

  <Perform action="NotifyJobCompleted"/>
</Workflow>
```

## Integration Patterns

### Email Notifications

Send email alerts for important events:

```xml
<Notify name="EmailAlert">
  <!-- Email notification configuration -->
</Notify>
```

### HTTP Webhooks

POST notifications to web services:

```xml
<Notify name="WebhookNotify">
  <!-- Webhook URL and payload configuration -->
</Notify>
```

### Database Logging

Log events to a database:

```xml
<Notify name="LogToDatabase">
  <!-- Database connection and query configuration -->
</Notify>
```

### File-Based Notifications

Write notification data to files:

```xml
<Notify name="WriteStatusFile">
  <!-- File path and content configuration -->
</Notify>
```

## Workflow Examples

### Comprehensive Notification Strategy

```xml
<Actions>
  <!-- Parse and query -->
  <ParseJobFileName name="GetPatientID">
    <Pattern>(\d+)_.*\.pdf</Pattern>
    <DcmTag tag="0010,0020" group="1"/>
  </ParseJobFileName>

  <Query name="FindPatient" type="Worklist"
         calledAE="RIS" callingAE="PRINTER"
         host="192.168.1.200" port="104">
    <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
  </Query>

  <!-- Store to PACS -->
  <Store name="SendToPACS"
         calledAE="PACS" callingAE="PRINTER"
         host="192.168.1.100" port="104"/>

  <!-- Notifications -->
  <Notify name="NotifyStart">
    <Message>Processing job for patient %1</Message>
    <Input tag="0010,0020"/> <!-- Patient ID -->
  </Notify>

  <Notify name="NotifyNoMatch">
    <Message>Patient %1 not found in worklist</Message>
    <Input tag="0010,0020"/> <!-- Patient ID -->
  </Notify>

  <Notify name="NotifySuccess">
    <Message>Patient %1 successfully processed and stored</Message>
    <Input tag="0010,0020"/> <!-- Patient ID -->
  </Notify>

  <Notify name="NotifyFailure">
    <Message>Failed to process patient %1</Message>
    <Input tag="0010,0020"/> <!-- Patient ID -->
  </Notify>
</Actions>

<Workflow>
  <!-- Notify job started -->
  <Perform action="NotifyStart"/>

  <Perform action="GetPatientID"/>
  <Perform action="FindPatient"/>

  <If field="QUERY_FOUND" value="false">
    <!-- Patient not found -->
    <Perform action="NotifyNoMatch"/>
    <Suspend/>
  </If>

  <If field="QUERY_FOUND" value="true">
    <!-- Process and store -->
    <Perform action="SendToPACS"/>

    <If field="STORE_SUCCEEDED" tag="SendToPACS" value="true">
      <!-- Success -->
      <Perform action="NotifySuccess"/>
    </If>

    <If field="STORE_SUCCEEDED" tag="SendToPACS" value="false">
      <!-- Failure -->
      <Perform action="NotifyFailure"/>
    </If>
  </If>
</Workflow>
```

### Alert on Exceptions

```xml
<Workflow>
  <Perform action="ProcessNormally"/>

  <If field="EXCEPTION_OCCURRED" value="true">
    <Perform action="NotifyException"/>
    <Suspend/>
  </If>
</Workflow>
```

### Periodic Status Updates

```xml
<Workflow>
  <Perform action="NotifyProcessingStarted"/>
  <Perform action="QueryWorklist"/>
  <Perform action="NotifyQueryComplete"/>
  <Perform action="SendToPACS"/>
  <Perform action="NotifyStoreComplete"/>
</Workflow>
```

## Best Practices

### Non-Critical Notifications

Always configure notifications with `onError="Ignore"` in the workflow:

Action definition:
```xml
<Notify name="SendAlert">
  <!-- Configuration -->
</Notify>
```

Workflow with error handling:
```xml
<Perform action="SendAlert" onError="Ignore"/>
```

This ensures that notification failures don't disrupt critical workflow operations.

### Meaningful Notification Content

Include relevant context in notifications:

- Patient ID
- Study date
- Action being performed
- Success/failure status
- Error messages (for failures)

### Rate Limiting

Be mindful of notification frequency in high-volume environments to avoid overwhelming notification systems.

### Notification Filtering

Only send notifications for significant events:
- Critical failures
- Exceptional conditions requiring attention
- Important milestones
- Completion of long-running operations

## Alternative Notification Methods

If Notify actions don't meet your requirements, consider:

### Run Actions with Scripts

Use Run actions to execute custom notification scripts:

```xml
<Run name="CustomNotify" type="Console">
  <Command>C:\Scripts\notify.bat</Command>
  <Arguments>
    --patient "#{PatientID}"
    --status "success"
    --message "Job completed successfully"
  </Arguments>
</Run>
```

### Log File Monitoring

Configure external tools to monitor DICOM Printer 2 log files for specific patterns and trigger notifications.

### Database Triggers

Use Run actions to update database records, then configure database triggers to send notifications.

## Example: Multi-Channel Notification

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DicomPrinter SYSTEM "config.dtd">
<DicomPrinter>
  <Actions>
    <!-- Processing actions -->
    <Query name="FindPatient" type="Worklist"
           calledAE="RIS" callingAE="PRINTER"
           host="192.168.1.200" port="104">
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <Store name="SendToPACS"
           calledAE="PACS" callingAE="PRINTER"
           host="192.168.1.100" port="104"/>

    <!-- Notification actions -->
    <Notify name="EmailNotifyNoMatch">
      <!-- Email configuration for no patient match -->
    </Notify>

    <Notify name="WebhookNotifySuccess">
      <!-- Webhook configuration for success -->
    </Notify>

    <Run name="LogToDatabase" type="Console">
      <Command>C:\Scripts\log_event.exe</Command>
      <Arguments>
        --patient "#{PatientID}"
        --event "job_completed"
        --timestamp "#{Date} #{Time}"
      </Arguments>
    </Run>
  </Actions>

  <Workflow>
    <Perform action="FindPatient"/>

    <If field="QUERY_FOUND" value="false">
      <!-- No match - notify via email -->
      <Perform action="EmailNotifyNoMatch"/>
      <Suspend/>
    </If>

    <If field="QUERY_FOUND" value="true">
      <Perform action="SendToPACS"/>

      <If field="STORE_SUCCEEDED" tag="SendToPACS" value="true">
        <!-- Success - notify via webhook and database -->
        <Perform action="WebhookNotifySuccess"/>
        <Perform action="LogToDatabase"/>
      </If>
    </If>
  </Workflow>
</DicomPrinter>
```

## Related Topics

- [Actions Overview](index.md)
- [Run Actions (Plugins)](run.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
- [Workflow Control Nodes](../workflow/control-nodes.md)
- [Logging](../logs.md)
