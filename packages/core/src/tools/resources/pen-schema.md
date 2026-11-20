# Brutal document format

Brutal reads supported `.pen` JSON through its validated document reader and
writes `.pen` or native `.fig` documents through the shared document service.
Preserve the original when an unsupported version or feature is refused.

A small owned `.pen` document can contain a fixed free-layout frame and a block:

```json
{
  "version": "2.22",
  "children": [
    {
      "type": "frame",
      "id": "owned-frame",
      "name": "Owned reference",
      "width": 240,
      "height": 160,
      "layout": "none",
      "fill": "#FFFFFF",
      "children": [
        {
          "type": "rectangle",
          "id": "owned-block",
          "name": "Owned square",
          "x": 24,
          "y": 24,
          "width": 64,
          "height": 64,
          "fill": "#2563EB"
        }
      ]
    }
  ]
}
```

File schema versions and desktop app versions are different identifiers. Inspect
the reader's current supported contract instead of substituting an app version.

Use frames to contain layers. Specify `layout: "none"` for intentional absolute
artwork; frames with omitted layout use horizontal layout. Supported auto-layout
directions, gap and padding determine child positions. Numeric dimensions fix an
axis; `fit_content` expresses Hug and `fill_container` expresses Fill, with an
optional numeric fallback in parentheses. Omitted, bare and explicit fallbacks
are distinct authored inputs; do not rewrite them as if they were interchangeable.

IDs identify nodes; refs, variables, themes and assets require their corresponding
definitions. Use the shared import/export service so validation, layout, resource
loading and loss-prevention checks run. Do not remove unknown source content to
force an import, or overwrite the only original after a refusal.
