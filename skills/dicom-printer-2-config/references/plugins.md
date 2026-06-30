# Reference: Run / Notify — external script & plugin I/O contract

`<Run>` launches an external program and exchanges DICOM tag values with it. `<Notify>`
shows the user a message. Both live in `<ActionsList>` and are invoked by `<Perform>`.

This is the contract any external script (in any language) must follow.

## `<Run>`

| element/attr | values | default | notes |
|---|---|---|---|
| `name` (attr) | string | — | id used by `<Perform>` |
| `type` (attr) | `Console` \| `Interactive` | **Console** | anything but exactly `Interactive` → Console |
| `resolveHostNameAutomatically` (attr) | bool | false | Interactive + **remote** jobs only |
| `<Command>` | path to exe/script | — (**required**) | relative to the install dir; must exist or the action fails |
| `<Arguments>` | string | "" | **literal pipe `\|`-separated** argv; no placeholder expansion |
| `<Timeout>` | int ms | 3000 | per phase (start / write / finish) |
| `<Input tag="(gggg,eeee)"/>` | tag ref | — | **order-significant**; one stdin line each |
| `<Output tag="…" type="Global\|Unique"/>` | tag ref | type=Global | **order-significant**; one stdout line each (Unique = one *per image*) |
| `<LauncherPortNumber>` | int | — | **ignored by the engine** — omit it |

### Console contract (the common case)

The engine runs the command directly via QProcess.

**Environment variables** set for the child:

| var | value |
|---|---|
| `CLIENT_HOST_NAME` | originating host |
| `CLIENT_USER_NAME` | originating user |
| `CONTENTS_FILE` | absolute path to the job contents/text artifact |
| `NOFILES` | number of image files in the job |
| `FILE1` … `FILEn` | absolute path to each image file (1-based) |
| `ProgramData` | all-users app-data dir |

**Input → stdin:** each `<Input>` tag's current value is written on its own line,
`\n`-terminated, in declaration order. A missing tag still writes a blank line (order preserved).
Tag values are **not** passed as command-line arguments — only `<Arguments>` are.
`<Arguments>` are literal argv entries; do not invent input-file/output-file
placeholders for `Run`.

**Output ← stdout:** the engine reads stdout line-by-line in `<Output>` declaration order.
It is purely **positional** — the Nth line sets the Nth `<Output>` tag. **Not** `KEY=VALUE`,
**not** `tag=value`. `\r` is stripped (CRLF-safe).

- `type="Global"` (default): consumes **one** line; sets the tag on the whole job.
- `type="Unique"`: consumes **`NOFILES` lines** (one per image); sets the tag per-image.

**Exit code drives job control:**

| code | meaning |
|---|---|
| `0` | success — outputs are read |
| `-1` | error — action fails; stderr is logged |
| `-2` | discard the job (action "succeeds") |
| `-3` | suspend the job (resume at this action) |

Outputs are read **only on exit 0**.

### Worked example

```xml
<Run name="GetUids" type="Console">
  <Command>plugins\GetUids.exe</Command>
  <Arguments>--mode|prod</Arguments>            <!-- argv = ["--mode","prod"] -->
  <Input  tag="(0020,000D)" />                  <!-- StudyInstanceUID → stdin line 1 -->
  <Input  tag="(0008,0050)" />                  <!-- AccessionNumber  → stdin line 2 -->
  <Output tag="(0020,000E)" type="Unique" />    <!-- SeriesInstanceUID, one line PER IMAGE -->
  <Output tag="(0008,103E)" type="Global" />    <!-- SeriesDescription, one line -->
  <Timeout>3000</Timeout>
</Run>
```

For a **2-image** job the engine writes to stdin:
```
1.2.840.113619.2.55.3.123456789      <- StudyInstanceUID (Input 1)
ACC0001                              <- AccessionNumber  (Input 2)
```
and the program must print to stdout, then `exit(0)`:
```
1.2.840...image1                     <- SeriesInstanceUID for image 1  (Unique)
1.2.840...image2                     <- SeriesInstanceUID for image 2  (Unique)
Reformatted Series                   <- SeriesDescription              (Global)
```

Conforming POSIX shell skeleton:
```sh
#!/bin/sh
read STUDY_UID         # stdin line 1
read ACCESSION         # stdin line 2
# ... compute ...
echo "$SERIES_UID_1"   # Unique: one line per image ($NOFILES total)
echo "$SERIES_UID_2"
echo "Reformatted Series"   # Global: one line
exit 0                 # -1 fail, -2 discard, -3 suspend
```

### Interactive

`type="Interactive"` is for plugins that show a GUI. The engine runs as a service and can't
draw on a desktop, so it forwards a launch request over TCP to **PluginsLauncher** running in
the user's session (port discovered automatically from the ports database — `<LauncherPortNumber>`
is ignored). The stdin/stdout/exit-code protocol is identical to Console. Requires PluginsLauncher
to be running in that session, or the action fails ("no port registered for user"). For remote
jobs, set `resolveHostNameAutomatically="true"` to reach the client host.

## `<Notify>` — display a message, returns nothing

Always Interactive. Children: `<Message>` (**required**), `<Timeout>` (ms, default 3000),
`<Input tag="…"/>`.

**Rule:** the message uses `%1 %2 …` placeholders, and the count of `%N` tokens **must equal**
the number of `<Input>` tags, or the action fails to load. Input values fill the placeholders.
No `<Output>`, `<Command>`, or `<Arguments>`.

```xml
<Notify name="WarnUser">
  <Message>Stored study for %1 (ID %2).</Message>
  <Input tag="(0010,0010)" />   <!-- → %1 -->
  <Input tag="(0010,0020)" />   <!-- → %2 -->
</Notify>
```

## Bundled plugins (their fixed contracts)

| plugin | type | args / stdin / stdout |
|---|---|---|
| `QueryPlugin` | Console | args: `MY_AE PEER_AE HOST PORT TIMEOUT TYPE [auto] TAG…`; stdin: Accession, Modality, PatientName, PatientID, StudyDate, RefPhysician, StationAE, StationName; stdout: one value per requested TAG |
| `GeneralInputPlugin` | Interactive | args = field captions; stdin = initial values; stdout = edited values (one line each) |
| `GeneralSelectPlugin` | Interactive | args: `Label Target1 [Target2…]`; stdout: 1 line → chosen destination → `(1001,1000)` |
| `MessageBoxPlugin` / `PrintDocumentPlugin` | — | args: `Message`; no tag I/O |
| `GrowlPlugin` | — | args: `MESSAGE [TITLE] [TYPE] [COUNT]`; no output |

## Gotchas

- **Arguments are pipe-delimited.** `<Arguments>a b|c</Arguments>` → `["a b","c"]`.
- **Arguments are literal.** DICOM values go through `<Input>`/stdin; Console file
  artifacts come from environment variables.
- **Output is positional, not key=value.** Emit the bare value on the right line.
- **`Unique` eats one stdout line per image** (`NOFILES`); emit too few and later tags go unset.
- **Outputs are read only on exit 0.**
- **Run does not adopt generated output paths.** Return DICOM attribute values via
  `<Output>`, or update job artifacts deliberately inside the plugin.
- **GUI plugins must be `type="Interactive"`** or they hang headless in the service session.
- **`<LauncherPortNumber>` does nothing.** **`<Notify>` `%N` count must equal `<Input>` count.**
