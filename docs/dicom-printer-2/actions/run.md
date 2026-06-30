# Run Actions

Run actions launch an external program from a workflow. Use them when a script
or plugin needs to inspect job context, return DICOM attribute values, or ask a
user for interactive input.

Run does not use input-file or output-file placeholders. The plugin contract is:

- `<Arguments>` passes literal command-line arguments.
- `<Input>` sends selected DICOM attribute values to stdin.
- `<Output>` reads stdout lines back into selected DICOM attributes.
- Console plugins can read current job artifact paths from environment variables.

There are no Run-specific input-file, output-file, or output-path placeholders,
and DICOM Printer 2 does not adopt an output file path produced by a plugin.

## Basic Syntax

```xml
<Run name="ActionName" type="Console">
  <Command>C:\Tools\Plugin.exe</Command>
  <Arguments>--mode|prod</Arguments>
  <Input tag="(0010,0020)" />
  <Output tag="(0010,0010)" />
  <Timeout>30000</Timeout>
</Run>
```

Run actions are defined in `<ActionsList>` and invoked from the workflow with
`<Perform>`.

```xml
<Workflow>
  <Perform action="ActionName" onError="Hold" />
</Workflow>
```

`onError` belongs on the workflow `<Perform>` node, not on the `<Run>` action.

## Attributes

### `name`

Unique action name used by `<Perform action="...">`.

### `type`

Plugin execution mode.

| Value | Behavior |
|---|---|
| `Console` | Runs a background process directly. |
| `Interactive` | Sends a launch request to the plugin launcher so a GUI can run in a user session. |

### `resolveHostNameAutomatically`

Optional. Applies only to `type="Interactive"`.

When set to `true`, DICOM Printer 2 resolves the originating client host and asks
the plugin launcher on that client to display the interactive plugin there. When
omitted or `false`, the plugin launcher is contacted on the server side.

```xml
<Run name="RemoteReview" type="Interactive" resolveHostNameAutomatically="true">
  <Command>C:\Tools\Reviewer.exe</Command>
  <Timeout>600000</Timeout>
</Run>
```

## Elements

### `<Command>`

Required. Path to the executable or script to launch.

```xml
<Command>C:\Tools\LookupPatient.exe</Command>
```

Use a full path for production configurations. Relative paths depend on the
runtime working directory and are easier to break during service installation or
operator troubleshooting.

### `<Arguments>`

Optional. Literal command-line arguments.

Arguments are pipe-delimited, not space-delimited. DICOM Printer 2 splits the
text on `|` and passes each segment as one argv element. Spaces inside a segment
are preserved.

```xml
<Arguments>--mode|prod|--label|Needs review</Arguments>
```

This produces:

```text
argv[1] = --mode
argv[2] = prod
argv[3] = --label
argv[4] = Needs review
```

`<Arguments>` does not expand DICOM tag placeholders, date placeholders, or file
placeholders. To pass DICOM attribute values, use `<Input>`. To access job files,
use the environment variables available to Console plugins.

### `<Timeout>`

Optional. Maximum time in milliseconds for each process phase.

```xml
<Timeout>30000</Timeout>
```

If omitted or invalid, the default is `3000` milliseconds.

Recommended values:

| Use case | Suggested value |
|---|---:|
| Quick metadata lookup | `5000` |
| Normal local script | `30000` |
| Long image/text processing | `300000` |
| Human interactive review | `600000` |

### `<LauncherPortNumber>`

Deprecated. Present in the schema for compatibility, but ignored by DICOM
Printer 2. Do not use it in new configurations.

## Input And Output

`<Input>` and `<Output>` are a positional, line-oriented stdin/stdout protocol
for DICOM attribute values. They are not file I/O settings.

### `<Input>`

Each `<Input>` element names one DICOM attribute. DICOM Printer 2 writes that
attribute's current value to the plugin's stdin, one line per `<Input>`, in the
same order as the configuration.

```xml
<Input tag="(0010,0020)" />
<Input tag="(0008,0050)" />
```

For the example above, the plugin receives:

```text
stdin line 1 = Patient ID value
stdin line 2 = Accession Number value
```

If a value is missing, a blank line is still written so the line positions stay
stable.

### `<Output>`

Each `<Output>` element names one DICOM attribute to set from the plugin's
stdout. DICOM Printer 2 reads plain stdout lines in declaration order. It does
not parse `key=value`, `tag=value`, JSON, XML, or filenames.

```xml
<Output tag="(0010,0010)" />
<Output tag="(0020,000E)" type="Unique" />
```

`Run` launches the plugin once. The output `type` only controls how stdout lines
are mapped after that one process exits:

| Type | Behavior |
|---|---|
| `Global` | Consumes one stdout line and sets the value on the job-level dataset. This is the default. |
| `Unique` | Consumes one stdout line per image in the job and sets the value on each per-image dataset. It does not run the plugin once per image. |

Outputs are read only when the plugin exits with code `0`. Carriage returns from
CRLF output are stripped.

### Positional Example

```xml
<Run name="LookupPatient" type="Console">
  <Command>C:\DP2\plugins\LookupPatient.exe</Command>
  <Arguments>--database|prod</Arguments>
  <Input tag="(0010,0020)" />
  <Input tag="(0008,0050)" />
  <Output tag="(0010,0010)" />
  <Output tag="(0020,000D)" />
  <Timeout>30000</Timeout>
</Run>
```

DICOM Printer 2 writes the input values:

```text
123456
ACC-9988
```

The plugin writes the output values:

```text
DOE^JANE
1.2.840.113619.2.55.3.604688433.781.1716902782.467
```

DICOM Printer 2 then sets Patient Name from stdout line 1 and Study Instance UID
from stdout line 2.

### Unique Output Example

The plugin is still launched once. For a two-image job:

```xml
<Run name="AssignSeries" type="Console">
  <Command>C:\DP2\plugins\AssignSeries.exe</Command>
  <Input tag="(0020,000D)" />
  <Output tag="(0020,000E)" type="Unique" />
  <Output tag="(0008,103E)" />
</Run>
```

The plugin must print one line for each image before the global output line:

```text
1.2.840.example.series.1
1.2.840.example.series.2
Processed Series
```

## Console Plugin Environment

Console plugins receive environment variables that point to the current job
artifacts. These are the only file paths the Run action provides automatically.

| Variable | Value |
|---|---|
| `CLIENT_HOST_NAME` | Host that originated the job. |
| `CLIENT_USER_NAME` | User that originated the job. |
| `CONTENTS_FILE` | Path to the job contents/text artifact. |
| `NOFILES` | Number of image files in the job. |
| `FILE1` through `FILEn` | Paths to the image files for the job, one-based. |
| `ProgramData` | All-users application data directory. |

These paths are job artifacts, not `#{...}` placeholders. If a plugin needs to
inspect the current image files, read `NOFILES` and `FILE1` through `FILEn` from
the process environment.

```python
import os
import sys

patient_id = sys.stdin.readline().rstrip("\n")
image_count = int(os.environ.get("NOFILES", "0"))
first_image = os.environ.get("FILE1")

# Compute values from stdin and environment, then return DICOM attribute values.
print("DOE^JANE")
print("1.2.840.example.study")
sys.exit(0)
```

Matching configuration:

```xml
<Run name="LookupFromArtifact" type="Console">
  <Command>C:\DP2\plugins\LookupFromArtifact.exe</Command>
  <Input tag="(0010,0020)" />
  <Output tag="(0010,0010)" />
  <Output tag="(0020,000D)" />
</Run>
```

## Interactive Plugins

Interactive plugins use the same argument, stdin, stdout, and exit-code contract
as Console plugins, but the process is launched through the plugin launcher so a
GUI can appear in a user session.

```xml
<Run name="ManualMetadataReview" type="Interactive">
  <Command>C:\DP2\plugins\MetadataReview.exe</Command>
  <Arguments>--mode|review</Arguments>
  <Input tag="(0010,0020)" />
  <Input tag="(0010,0010)" />
  <Output tag="(0009,1001)" />
  <Timeout>600000</Timeout>
</Run>
```

Use `type="Interactive"` only for plugins that need a visible UI. Background
scripts should use `type="Console"`.

## Exit Codes

The plugin exit code controls workflow behavior.

| Exit code | Meaning |
|---:|---|
| `0` | Success. `<Output>` stdout lines are read. |
| `-1` | Error. The action fails and stderr is logged. |
| `-2` | Discard. The job is discarded and `onError` is not triggered. |
| `-3` | Suspend. The job is suspended and resumes at this action later. |

Any other non-zero exit code is treated as failure. Output values are read only
for exit code `0`.

## Common Patterns

### Metadata Lookup

```xml
<Run name="LookupAccession" type="Console">
  <Command>C:\DP2\plugins\LookupAccession.exe</Command>
  <Input tag="(0008,0050)" />
  <Output tag="(0010,0010)" />
  <Output tag="(0010,0020)" />
  <Output tag="(0020,000D)" />
  <Timeout>30000</Timeout>
</Run>
```

### External Validation

```xml
<Run name="ValidateStudy" type="Console">
  <Command>C:\DP2\plugins\ValidateStudy.exe</Command>
  <Arguments>--ruleset|prod</Arguments>
  <Input tag="(0010,0020)" />
  <Input tag="(0008,0050)" />
  <Output tag="(0009,1001)" />
  <Timeout>30000</Timeout>
</Run>
```

The plugin prints a status value, such as `PASS` or `FAIL`, which can be used by
later workflow conditions.

```xml
<If field="TAG_VALUE(0009,1001)" value="^FAIL$">
  <Statements>
    <Perform action="ManualMetadataReview" />
  </Statements>
</If>
```

### Optional Plugin Step

```xml
<ActionsList>
  <Run name="OptionalAudit" type="Console">
    <Command>C:\DP2\plugins\Audit.exe</Command>
    <Input tag="(0010,0020)" />
    <Timeout>5000</Timeout>
  </Run>
</ActionsList>

<Workflow>
  <Perform action="OptionalAudit" onError="Ignore" />
</Workflow>
```

## Troubleshooting

| Symptom | Check |
|---|---|
| Plugin receives the literal text `#{PatientID}` | Do not use placeholders in `<Arguments>`. Add `<Input tag="(0010,0020)" />` and read stdin. |
| Plugin cannot find an input file | Read `NOFILES` and `FILE1` through `FILEn` from the environment in a Console plugin. |
| Output tag stays blank | Confirm the plugin exits with code `0` and prints enough stdout lines in `<Output>` order. |
| `Unique` output is shifted | Print one line per image for every `type="Unique"` output before printing the next output value. |
| Interactive plugin never appears | Confirm PluginsLauncher is running in the target user session and use `type="Interactive"`. |
| Workflow does not use a generated file | Run does not consume generated output paths. Return DICOM attribute values through `<Output>` or update job artifacts deliberately inside the plugin. |
