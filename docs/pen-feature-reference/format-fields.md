# Serialized feature checklist

Source: [official .pen schema](https://docs.pen.dev/for-developers/the-pen-format), retrieved 2026-10-30. Published `Document.version` is `2.21`; the installed acceptance target remains Pen 1.2.21. This is a field-family checklist, not a copied schema or a claim of supported Open Pen input. Current support/rejection rules live in [the parser documentation](../../packages/pen/README.md).

For every applicable field: compare default, explicit value, variable binding, edit/Undo, save/reopen and rendered export. Unsupported input must be rejected before lossy conversion or writing. A parser accepting a field does not establish editor/rendering parity.

| Family | Fields / variants requiring coverage |
| --- | --- |
| Document | version, children, imports/relative aliases, variables, themes |
| Common entity | id, name, context, reusable, theme, enabled, opacity, flipX/Y, layoutPosition, metadata, rotation, x/y |
| Size | width/height; fixed, fit_content/fill_container with optional fallback |
| Layout | none/horizontal/vertical, gap, layoutIncludeStroke, scalar/pair/four-sided padding, justifyContent including space_between/space_around, alignItems |
| Paint common | enabled, blendMode, ordered fill arrays |
| Color | hex alpha and variable references |
| Gradient | linear/radial/angular, opacity, center, size, rotation, colors/stop positions |
| Image | URL, opacity, cover/contain/stretch, affine crop transform |
| Mesh | rows/columns, vertex colors, point positions and four Bezier handles |
| Shader paint | relative/URL source, opacity, uniforms, resolution/time directives |
| Stroke | paints, scalar/per-side thickness, butt/round/square caps, miter/bevel/round joins, inner/center/outer alignment |
| Effects | ordered blur/background_blur/shadow/shader; enabled, radius, inner/outer, offset, blur, color, blendMode, uniforms |
| Rectangle/frame | cornerRadius scalar/four values; frame children/layout/clip/placeholder/slot |
| Ellipse | innerRadius, startAngle, positive/negative sweepAngle |
| Polygon | polygonCount, cornerRadius |
| Path | geometry, viewBox, nonzero/evenodd fillRule |
| Text style | fontFamily, fontSize, fontWeight, letterSpacing, fontStyle, underline, lineHeight, horizontal/vertical alignment, strikethrough, href |
| Text | content, auto/fixed-width/fixed-width-height growth |
| Group | children and effects |
| Note/Prompt/Context | content, sizing and text style; Prompt model |
| Icon | library, icon, weight, fill, effects and sizing |
| Script | scriptUri, inputs, clip and sizing |
| Browser | url, deviceId, zoom, scrollX/Y, cornerRadius, stroke/effects and sizing |
| Ref | origin reference, root overrides, nested descendant paths, complete replacement, children replacement |
| Slot | false or suggested component IDs; instance-owned inserted content |
| Variables | boolean/color/number/string, aliases, theme-qualified value arrays |
| Theme resolution | first axis value default; last satisfied variable value; inheritance/override |
| Blend values | normal, darken, multiply, linearBurn, colorBurn, light, screen, linearDodge, colorDodge, overlay, softLight, hardLight, difference, exclusion, hue, saturation, color, luminosity |
| Shader inputs | number, boolean, color/string, vec2/3/4 and sampler; object/background sources; typed variables |

Numeric details, angle conventions, crop matrices and resource resolution must be taken from the versioned reference and tested with independent fixtures. Preserve original files before conversion; do not infer compatibility from common property names.
