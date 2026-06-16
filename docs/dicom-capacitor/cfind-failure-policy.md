# C-FIND Failure Policy

## What it is

When Capacitor proxies a Query/Retrieve or Modality Worklist C-FIND, an
upstream PACS can return pending responses followed by a terminal failure such
as `Processing failure`. Historically, Capacitor converted that upstream
terminal failure into a downstream `Success`, often with an empty result set.
That kept older clients working but hid the actual upstream rejection.

`CFindFailureBehavior` is a per-node setting that keeps the legacy behavior by
default and allows selected nodes to propagate genuine upstream terminal
failures to callers.

## Configuration

Set `CFindFailureBehavior` on the upstream node in `nodes.yml`:

```yaml
- AeTitle: CPSI_PACS_SERVER
  NodeRole: QueryRetrieve
  HostName: 10.0.0.5
  Port: 104
  CFindFailureBehavior: legacy_success

- AeTitle: RIS_WORKLIST
  NodeRole: Worklist
  HostName: 10.0.0.6
  Port: 104
  CFindFailureBehavior: propagate
```

| Value | Meaning |
|---|---|
| `legacy_success` | Convert genuine upstream terminal failures to downstream `Success`. This is the default. |
| `propagate` | Forward the upstream terminal failure status to the caller. |
| `legacy`, `empty_success`, `legacy_empty` | Aliases for `legacy_success`. |

Unset values default to `legacy_success`. Invalid values never fail config
load; Capacitor logs a warning and uses `legacy_success`.

There is no global setting. Configure only the nodes whose callers can handle
propagated C-FIND failures.

## Behavior

| Situation | Downstream result |
|---|---|
| Upstream returns `Pending` responses then terminal `Success` | Pending datasets, then `Success`. |
| Upstream returns terminal `Success` with no matches | `Success` with no datasets. |
| Upstream returns terminal non-success and behavior is `legacy_success` | Any collected pending datasets, then `Success`. |
| Upstream returns terminal non-success and behavior is `propagate` | Any collected pending datasets, then the exact upstream terminal status. |
| Upstream connection/transport fails or no terminal response is observed (QR) | Local failure regardless of behavior: `ProcessingFailure`. |
| Upstream connection/transport fails or no terminal response is observed (Worklist) | `QueryRetrieveUnableToProcess` **only when there are no usable cached results**. A populated modality-owned cache is still served as `Pending` datasets then `Success` (stale-cache fallback), regardless of behavior. |
| Worklist fresh cache hit | Cached results, then `Success`; no upstream query means no failure policy decision. |

The distinction between a genuine upstream terminal failure and a local
transport/no-terminal failure is intentional. `legacy_success` only preserves
compatibility for a PACS response that was actually received. It does not hide
network, association, timeout, or other local failures where Capacitor cannot
honestly claim that the C-FIND completed upstream.

For Worklist specifically, a *transport* failure does not discard a populated
modality-owned cache: previously-cached worklist items are still served (with
`Success`) so a transient upstream blip does not blank the modality's worklist.
The worklist returns `QueryRetrieveUnableToProcess` only when the upstream
refresh failed and there are no cached results to serve. This stale-cache
fallback is independent of `CFindFailureBehavior`, which governs only the
response to a *genuine upstream terminal failure*.

## Policy Logging

Capacitor logs a PHI-free policy line only when it receives a genuine upstream
terminal non-success status:

```text
C-FIND upstream terminal failure family=qr upstream=CPSI_PACS_SERVER status="Processing failure [0x0110]" behavior=propagate action=propagated forwardedPending=2
```

The line is `Info` when propagating and `Warn` when converting to legacy
success. Successful queries, Worklist cache hits, and local transport failures
do not emit policy lines.

Status text is produced through the same redacted status formatter used by
[Redacted C-FIND Logging](./redacted-cfind-logging); no DICOM identifier
values are logged.

## Relationship to Redacted C-FIND Logging

`redactedCFindLogging` is diagnostic visibility: it shows PHI-safe query shape
and upstream statuses. `CFindFailureBehavior` is caller-visible behavior: it
controls the final status Capacitor sends back downstream.

The failure policy works whether or not redacted C-FIND logging is enabled.
Enable both when diagnosing a rejected query so the support log shows the query
shape, upstream terminal status, and the policy decision Capacitor applied.
