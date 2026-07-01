# Reference: the `<Workflow>` engine

`<Workflow>` runs once per job, top-to-bottom. Children (any number, in document order):
`Perform | If | Switch | Update | Suspend | Discard`. Tag values set by actions persist for
the whole job. Execution **stops immediately** once the job becomes Held, Suspended, or
Discarded — so order matters.

## Job outcomes

| state | set by | workflow | files | retry |
|---|---|---|---|---|
| **Hold** | `onError="Hold"` (and the default) | stops | kept (parked) | no — manual intervention |
| **Ignore** | `onError="Ignore"` | continues | — | — |
| **Suspend** | `onError="Suspend"` or `<Suspend>` | stops | kept | yes — re-queued after `SuspensionTime` min, resumes at `resumeAction` |
| **Discard** | `onError="Discard"` or `<Discard/>` | stops | **deleted** | no |

A job that finishes neither held nor suspended has its files deleted (normal cleanup). Jobs
older than `ValidityPeriod` days are dropped.

## `<Perform>`

```xml
<Perform action="QueryWorklist" onError="Suspend" />
```
- `action` (required): name of an action in `<ActionsList>`. An **unknown name is a silent
  no-op** (warning only) — not a load error. Validate to catch typos.
- `onError`: `Hold` (default) | `Ignore` | `Suspend` | `Discard`, applied when the action fails.
- Advanced: a `<Perform>` may wrap an inline `<Query>` whose elements **override** the named
  query for this one call (the named action isn't mutated); and `defaultQuery="OtherQuery"`
  lets a `Manual` query borrow another query's connection on resume.

## `<If>` / `<Statements>` / `<Else>`

```xml
<If field="QUERY_FOUND" value="1">
  <Statements> <Perform action="StoreToPACS" onError="Suspend" /> </Statements>
  <Else> <Suspend resumeAction="QueryWorklist" maxRetries="10" /> </Else>
</If>
```

Recognized `field` values (the complete set):

| field | value to test | comparison |
|---|---|---|
| `QUERY_FOUND` | `1`/`0` | last query returned ≥1 result |
| `QUERY_PARTIAL` | `1`/`0` | last query returned >1 (ambiguous) |
| `STORE_SUCCEEDED` | `1`/`0` | last Store succeeded |
| `TAG_VALUE(gggg,eeee)` | a **regex** | tag value match (unanchored, partial) |
| `CLIENT_HOST_NAME` | exact string | originating host name |
| `PRINTED_FILE_NAME` | exact string | the job/print file name |

- **Only `TAG_VALUE` is a regex** (and it is *unanchored*: `value="SMITH"` matches anything
  containing SMITH — anchor with `^SMITH$` for exact). Detect an empty/absent tag with
  `value="^$"`; require any value with `value="\S"`.
- All other fields are exact string equality. `caseSensitive="false"` (default true) is supported
  though undocumented.
- An unknown `field` is a **load error** (unlike a bad action name).
- `QUERY_FOUND="1"` means ≥1 result, **not** exactly one. Standard idiom: if `QUERY_FOUND`,
  then nested `if QUERY_PARTIAL` → run a `Manual` query so an operator disambiguates.

## `<Switch>`

```xml
<Switch field="CLIENT_HOST_NAME">
  <Case value="ER-PC">     <Perform action="StoreToER" />  </Case>
  <Case value="RADIOLOGY"> <Perform action="StoreToRad" /> </Case>
  <Default>                <Perform action="StoreToPACS" /> </Default>
</Switch>
```
- `field` is **only** `CLIENT_HOST_NAME` or `PRINTED_FILE_NAME`.
- Matching is **exact string equality** — no wildcards/regex. First matching `<Case>` wins;
  `<Default>` runs if none match. For pattern routing, use nested `<If field="TAG_VALUE(...)">`.

## `<Suspend resumeAction="…" maxRetries="…"/>` (empty tag)

- `resumeAction` (required): action to resume at after re-queue.
- `maxRetries` (optional int): retry budget, persisted per-job. **Omit = retry forever.** When
  the budget is exhausted, the node **falls through to the next workflow node** instead of
  suspending — put a `ManualMatch` or a `Save`-to-error directory right after it.
- The `onError` attribute on `<Suspend>` is in the DTD but **ignored**.
- Resumed jobs skip Suspend/Discard nodes they already passed.

## `<Discard/>` (empty tag)

Deletes the job immediately. Ignored for an already-resumed job.

## `<Update action="…" type="Print">` (advanced, rare)

Mutates a named **Print** action's attributes in the running service's in-memory config.
The change persists for later jobs until service restart or config reload; it is not limited
to the current job and does not edit `config.xml`. `type` is required and **only `Print`
is implemented** (any other value is a load error). Body is a Print action body
(film/image-box attrs, PrintMode, ConnectionParameters, …) merged into the target.

## Canonical workflow: Worklist → store, with manual fallback and retry

```xml
<Workflow>
  <Perform action="ParseAccession" onError="Hold" />
  <Perform action="QueryWorklist" onError="Suspend" />
  <If field="QUERY_FOUND" value="1">
    <Statements>
      <If field="QUERY_PARTIAL" value="1">
        <Statements><Perform action="ManualMatch" /></Statements>
      </If>
      <Perform action="StoreToPACS" onError="Suspend" />
    </Statements>
    <Else>
      <Suspend resumeAction="QueryWorklist" maxRetries="10" />
      <Perform action="ManualMatch" />   <!-- reached only after retries are exhausted -->
    </Else>
  </If>
</Workflow>
```
