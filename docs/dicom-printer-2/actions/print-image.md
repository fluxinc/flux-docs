# PrintImage Action

The `PrintImage` action overlays an image — a logo, stamp, or watermark — onto a job's page. It composites the supplied image into a rectangle you position and size as percentages of the page, honoring the source image's transparency so a semi-transparent PNG reads as a true watermark.

## Basic Syntax

```xml
<PrintImage name="ActionName">
  <ImagePath>C:\dp2\logo.png</ImagePath>
  <X>80</X>
  <Y>2</Y>
  <Width>18</Width>
  <Height>10</Height>
  <Aspect>keep</Aspect>
</PrintImage>
```

**Note:** Error handling (`onError`) is configured on `<Perform>` nodes in the workflow, not on the action definition. See [Actions Overview](index.md#error-handling-workflow-level) for details.

## Elements

| Element | Required | Values | Description |
|---|---|---|---|
| `<ImagePath>` | Yes | file path | Path to the overlay image. PNG, JPG, and BMP are supported. An alpha channel is honored, so a transparent PNG composites as a watermark. |
| `<X>` | Yes | 0–100 | Left edge of the overlay rectangle, as a percentage of page width. Origin is top-left. |
| `<Y>` | Yes | 0–100 | Top edge of the overlay rectangle, as a percentage of page height. Origin is top-left. |
| `<Width>` | Yes | 0–100 | Width of the overlay rectangle, as a percentage of page width. |
| `<Height>` | Yes | 0–100 | Height of the overlay rectangle, as a percentage of page height. |
| `<Aspect>` | Yes | `keep` \| `ignore` | Aspect-ratio handling. Always specify this element. |

### Percentage-based placement

`X`, `Y`, `Width`, and `Height` are **percentages (0–100) of the page dimensions**, not pixels, so the same action positions the overlay consistently regardless of page resolution. The origin is the top-left corner.

The rectangle must stay within the page: **`X + Width` must be ≤ 100 and `Y + Height` must be ≤ 100**.

### `<Aspect>`

Controls how the image fills the rectangle.

```xml
<Aspect>keep</Aspect>   <!-- Preserve the image's aspect ratio -->
<Aspect>ignore</Aspect> <!-- Stretch to fill the rectangle exactly -->
```

- `keep` — the image is scaled to fit inside the rectangle while preserving its original proportions.
- `ignore` — the image is stretched to fill the rectangle exactly, which may distort it.

Do not omit `<Aspect>`. DP2 does not initialize the value unless the element is
present.

## Scope

`PrintImage` currently overlays the **first page** of a job.

## Example

Place a logo in the top-right corner of the page, occupying an 18% × 10% rectangle and preserving its aspect ratio:

```xml
<ActionsList>
  <PrintImage name="Watermark">
    <ImagePath>C:\dp2\logo.png</ImagePath>
    <X>80</X>
    <Y>2</Y>
    <Width>18</Width>
    <Height>10</Height>
    <Aspect>keep</Aspect>
  </PrintImage>

  <Store name="SendToPACS">
    <ConnectionParameters>
      <PeerAeTitle>PACS</PeerAeTitle>
      <MyAeTitle>PRINTER</MyAeTitle>
      <Host>192.168.1.100</Host>
      <Port>104</Port>
    </ConnectionParameters>
  </Store>
</ActionsList>

<Workflow>
  <Perform action="Watermark"/>
  <Perform action="SendToPACS"/>
</Workflow>
```

## Related Topics

- [Actions Overview](index.md)
- [Print Actions](print.md)
- [Image Manipulation Actions](image-manipulation.md)
- [Store Actions](store.md)
