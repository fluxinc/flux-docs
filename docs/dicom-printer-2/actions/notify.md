# Notify Actions

Notify actions send notifications to external systems, enabling integration with alerting, monitoring, and workflow management systems.

## Supported Elements

A `Notify` action accepts **only** the following child elements:

- `<Message>` (required) - The notification message content
- `<Timeout>` - Notification timeout in milliseconds
- `<Input>` - DICOM tag values substituted into the message placeholders

Notify does **not** support `<Command>`, `<Arguments>`, `<Output>`, or `<LauncherPortNumber>`, and it has no `type` or `resolveHostNameAutomatically` choice. Adding any unsupported element causes the action to be rejected at config load time.

A Notify action is **always Interactive**: it is routed through the PluginsLauncher to display a tray/dialog message in the user's desktop session, and it never returns DICOM tag values.

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

## Optional Elements

### `<Timeout>`
Maximum time in milliseconds the notification waits before timing out.

**Type:** Integer
**Default:** 3000 (3 seconds)

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
<ActionsList>
  <Store name="SendToPACS">
    <ConnectionParameters>
      <PeerAeTitle>PACS</PeerAeTitle>
      <MyAeTitle>PRINTER</MyAeTitle>
      <Host>192.168.1.100</Host>
      <Port>104</Port>
    </ConnectionParameters>
  </Store>

  <Notify name="NotifySuccess">
    <Message>Patient %1 successfully stored to PACS</Message>
    <Input tag="0010,0020"/> <!-- Patient ID -->
  </Notify>
</ActionsList>

<Workflow>
  <Perform action="SendToPACS"/>

  <If field="STORE_SUCCEEDED" value="1">
    <Statements>
      <Perform action="NotifySuccess"/>
    </Statements>
  </If>
</Workflow>
```

### Failure Notifications

Notify when a critical operation fails:

```xml
<Workflow>
  <Perform action="QueryWorklist"/>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <!-- No patient match - send alert -->
      <Perform action="NotifyNoMatch"/>
      <Suspend resumeAction="QueryWorklist"/>
    </Statements>
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
<ActionsList>
  <!-- Parse and query -->
  <ParseJobFileName name="GetPatientID">
    <DcmTag tag="0010,0020">(\d+)_.*\.pdf</DcmTag>
  </ParseJobFileName>

  <Query name="FindPatient" type="Worklist">
    <ConnectionParameters>
      <PeerAeTitle>RIS</PeerAeTitle>
      <MyAeTitle>PRINTER</MyAeTitle>
      <Host>192.168.1.200</Host>
      <Port>104</Port>
    </ConnectionParameters>
    <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
  </Query>

  <!-- Store to PACS -->
  <Store name="SendToPACS">
    <ConnectionParameters>
      <PeerAeTitle>PACS</PeerAeTitle>
      <MyAeTitle>PRINTER</MyAeTitle>
      <Host>192.168.1.100</Host>
      <Port>104</Port>
    </ConnectionParameters>
  </Store>

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
</ActionsList>

<Workflow>
  <!-- Notify job started -->
  <Perform action="NotifyStart"/>

  <Perform action="GetPatientID"/>
  <Perform action="FindPatient"/>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <!-- Patient not found -->
      <Perform action="NotifyNoMatch"/>
      <Suspend resumeAction="FindPatient"/>
    </Statements>
  </If>

  <If field="QUERY_FOUND" value="1">
    <Statements>
      <!-- Process and store -->
      <Perform action="SendToPACS"/>

      <If field="STORE_SUCCEEDED" value="1">
        <Statements>
          <!-- Success -->
          <Perform action="NotifySuccess"/>
        </Statements>
      </If>

      <If field="STORE_SUCCEEDED" value="0">
        <Statements>
          <!-- Failure -->
          <Perform action="NotifyFailure"/>
        </Statements>
      </If>
    </Statements>
  </If>
</Workflow>
```

### Alert on Exceptions

```xml
<Workflow>
  <Perform action="StoreToPACS" onError="Ignore"/>

  <!-- STORE_SUCCEEDED reflects the most recent Store; notify + retry on failure -->
  <If field="STORE_SUCCEEDED" value="0">
    <Statements>
      <Perform action="NotifyException"/>
      <Suspend resumeAction="StoreToPACS"/>
    </Statements>
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
<!DOCTYPE DicomPrinterConfig SYSTEM "config.dtd">
<DicomPrinterConfig>
  <ActionsList>
    <!-- Processing actions -->
    <Query name="FindPatient" type="Worklist">
      <ConnectionParameters>
        <PeerAeTitle>RIS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.200</Host>
        <Port>104</Port>
      </ConnectionParameters>
      <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
    </Query>

    <Store name="SendToPACS">
      <ConnectionParameters>
        <PeerAeTitle>PACS</PeerAeTitle>
        <MyAeTitle>PRINTER</MyAeTitle>
        <Host>192.168.1.100</Host>
        <Port>104</Port>
      </ConnectionParameters>
    </Store>

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
        --timestamp "#{Date}"
      </Arguments>
    </Run>
  </ActionsList>

  <Workflow>
    <Perform action="FindPatient"/>

    <If field="QUERY_FOUND" value="0">
      <Statements>
        <!-- No match - notify via email -->
        <Perform action="EmailNotifyNoMatch"/>
        <Suspend resumeAction="FindPatient"/>
      </Statements>
    </If>

    <If field="QUERY_FOUND" value="1">
      <Statements>
        <Perform action="SendToPACS"/>

        <If field="STORE_SUCCEEDED" value="1">
          <Statements>
            <!-- Success - notify via webhook and database -->
            <Perform action="WebhookNotifySuccess"/>
            <Perform action="LogToDatabase"/>
          </Statements>
        </If>
      </Statements>
    </If>
  </Workflow>
</DicomPrinterConfig>
```

## Related Topics

- [Actions Overview](index.md)
- [Run Actions (Plugins)](run.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
- [Workflow Control Nodes](../workflow/control-nodes.md)
- [Logging](../logs.md)
