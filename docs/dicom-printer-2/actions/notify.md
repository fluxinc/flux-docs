# Notify Actions

`Notify` displays an interactive message through DICOM Printer 2's plugin launcher.
Use it for operator-visible alerts, confirmations, and status messages inside a
workflow. It does not send email, post webhooks, write files, update databases, or
return DICOM tag values.

For external integrations, use a [`Run`](run.md) action and pass DICOM values to
the script through `<Input>`/stdin.

## Supported Elements

A `Notify` action accepts only these child elements:

| Element | Required | Purpose |
|---|---:|---|
| `<Message>` | Yes | Message text shown to the user |
| `<Input>` | No | DICOM tag values substituted into `%1`, `%2`, and later placeholders |
| `<Timeout>` | No | Message expiration in milliseconds |

`Notify` does not support `<Command>`, `<Arguments>`, `<Output>`, or
`<LauncherPortNumber>`. Adding unsupported elements causes the action to be
rejected when the configuration loads.

Do not set `type` or `resolveHostNameAutomatically` on `Notify`. Runtime behavior
is fixed: `Notify` is an interactive launcher message and does not have a console
mode or output channel.

## Basic Syntax

```xml
<Notify name="WarnNoMatch">
  <Message>No worklist match for patient %1, accession %2.</Message>
  <Input tag="0010,0020"/>
  <Input tag="0008,0050"/>
  <Timeout>30000</Timeout>
</Notify>
```

Error handling is configured on `<Perform>` nodes in the workflow, not on the
action definition. See [Actions Overview](index.md#error-handling-workflow-level)
for details.

## Attributes

### `name`

Unique identifier used by `<Perform action="..."/>`.

## Message

`<Message>` is required. It may include positional placeholders:

```xml
<Message>Patient %1 processed successfully at %2.</Message>
<Input tag="0010,0020"/>
<Input tag="0008,0030"/>
```

The number of `%N` placeholders must equal the number of `<Input>` elements. If
the counts differ, the action is invalid and the configuration fails to load.

Placeholders are positional:

| Placeholder | Filled from |
|---|---|
| `%1` | First `<Input>` |
| `%2` | Second `<Input>` |
| `%3` | Third `<Input>` |

## Input

Each `<Input>` reads one DICOM tag from the current job and supplies it to the
matching message placeholder.

```xml
<Input tag="0010,0020"/>
<Input tag="0010,0010"/>
```

The `tag` attribute accepts normal DICOM tag references such as `0010,0020` or
`(0010,0020)`.

## Timeout

`<Timeout>` is optional and is specified in milliseconds. If omitted, the default
timeout is 3000 ms.

```xml
<Timeout>30000</Timeout>
```

## Workflow Examples

### Alert When a Query Finds No Match

```xml
<ActionsList>
  <Query name="FindPatient" type="Worklist">
    <ConnectionParameters>
      <PeerAeTitle>RIS</PeerAeTitle>
      <MyAeTitle>PRINTER</MyAeTitle>
      <Host>192.168.1.200</Host>
      <Port>104</Port>
    </ConnectionParameters>
    <DcmTag tag="0010,0020">#{PatientID}</DcmTag>
  </Query>

  <Notify name="WarnNoMatch">
    <Message>No worklist match for patient %1.</Message>
    <Input tag="0010,0020"/>
    <Timeout>30000</Timeout>
  </Notify>
</ActionsList>

<Workflow>
  <Perform action="FindPatient"/>

  <If field="QUERY_FOUND" value="0">
    <Statements>
      <Perform action="WarnNoMatch" onError="Ignore"/>
      <Suspend resumeAction="FindPatient"/>
    </Statements>
  </If>
</Workflow>
```

### Status Message After Store

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

  <Notify name="StoreComplete">
    <Message>Stored patient %1 to PACS.</Message>
    <Input tag="0010,0020"/>
  </Notify>
</ActionsList>

<Workflow>
  <Perform action="SendToPACS"/>

  <If field="STORE_SUCCEEDED" value="1">
    <Statements>
      <Perform action="StoreComplete" onError="Ignore"/>
    </Statements>
  </If>
</Workflow>
```

## External Notifications

Use `Run` for email, webhook, database, or file-based integrations. `Run` launches
a script once, writes each `<Input>` value to stdin in declaration order, and can
read tag values back from stdout through `<Output>` if needed.

```xml
<Run name="PostNoMatchWebhook" type="Console">
  <Command>C:\Scripts\post-no-match-webhook.exe</Command>
  <Arguments>--event|no-match</Arguments>
  <Input tag="0010,0020"/>
  <Input tag="0008,0050"/>
  <Timeout>30000</Timeout>
</Run>
```

The script should read patient ID from stdin line 1 and accession number from
stdin line 2. Do not put DICOM placeholders in `<Arguments>`; arguments are
literal.

## Recommendations

- Use `onError="Ignore"` for non-critical operator alerts so a failed message
  does not stop the main workflow.
- Keep messages short and actionable.
- Include only the DICOM identifiers an operator needs to understand the alert.
- Avoid noisy progress messages in high-volume workflows.

## Troubleshooting

| Symptom | Check |
|---|---|
| Configuration fails to load | The number of `%N` placeholders must match the number of `<Input>` elements |
| Unsupported element error | Remove `<Command>`, `<Arguments>`, `<Output>`, or `<LauncherPortNumber>` from the `Notify` action |
| No message appears | Confirm the plugin launcher is running in the user's desktop session |
| Need email/webhook/database/file output | Use a `Run` action instead of `Notify` |

## Related Topics

- [Actions Overview](index.md)
- [Run Actions (Plugins)](run.md)
- [Workflow Conditional Nodes](../workflow/conditional-nodes.md)
- [Workflow Control Nodes](../workflow/control-nodes.md)
