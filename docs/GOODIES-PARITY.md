# Goodies reference and acceptance

Reference: installed `/Applications/Pen.app`1.2.21, inspected through native accessibility, screenshots and synthetic documents on2026-11-01/02. OpenPencil is the implementation base, not the reference. Proprietary artwork and prompt text stay private and are not shipped.

## Screens and entry points

The top-bar gift button opens Goodies on Featured. An empty Script's Script Gallery button opens it on Scripts. The Shader Gallery entry opens it on Shaders. The dialog has Featured, Styles, Design Systems, Scripts and Shaders sections plus Close. At1496×932 logical pixels it is1464×800 at16,66; its header is56px tall and its card grid reaches1248px with24px gaps. Other viewport sizes and light-theme states remain unaccepted.

| Screen | Observed content and actions | Independent state |
| --- | --- | --- |
| Featured |12 style previews,13 shader groups, six design-system documents and ten Scripts, with More buttons for the longer sections. | Open. |
| Styles |88 named style cards; Landing page, Web App and Mobile App preview toggles. Cards expose Copy to Agent and an `.md` label. | Open. |
| Design Systems |Demo File, Halo, Hero UI, Lunaris, Nitro and Shadcn UI, each exposing Open Document and a `.pen` label. | Open; Demo File opening is observed below, while independent opening, other documents and error/persistence variants remain unaccepted. |
| Scripts |Eleven cards with Insert to Canvas and `.js` labels; dimensions/defaults are recorded in [Script evidence](SCRIPT-PARITY.md). | Partial: independent MIT examples, generated previews, insertion/history/input/save/reopen/conversion and named Snapshot transfer execute. Exact artwork, remaining visual states and general native Snapshot delivery remain open. |
| Shaders |The earlier native inventory records75 groups and375 examples, five per group. A group exposes Use Shader Example, Add Shader Fill, Apply Shader Effect and Copy Fill. See [paint controls](pen-feature-reference/paint-controls.md). | Open as a gallery workflow. Existing independent shader fills/strokes are narrower than these actions. |

## Style selection

The native Styles screen exposes all88 cards while Landing page is selected. Selecting Web App changes their preview descriptions while retaining the style names. Mobile App is present; its rendered variants were not qualified in this pass. The first card is Aerial Gravitas - Carbon Frost; the last is Zigzag Bold Split - Violet Bloom.

Selecting the first style closes Goodies and places the style name/content token in the unsent agent composer. It does not automatically send a request. The independent probe was removed and the composer returned to its empty placeholder. Agent receipt, generated output, repeated-style selection, replacing existing composer content, undo, keyboard/focus behavior and the complete preview artwork remain open. No vendor prompt text was copied into the implementation.

## Design-system opening

Selecting Demo File closes Goodies and opens a new `pencil-demo.pen` tab in a fresh Pen-managed local document folder. MCP inspection of that opened document reports14 top-level frames and no reusable components. Closing this untouched inspection tab returns to the previous diagnostic reference. This establishes the named reference action only; it does not qualify independent template delivery, the other five cards, repeated insertion, missing resources, persistence or failures.

## Remaining workflow criteria

- Compare every section's initial, scrolled, hover, keyboard, close/reopen and adaptive state against Pen.
- Exercise Featured More navigation and each category-specific entry point.
- Verify style-to-composer behavior using independently authored guidance, with existing text/attachments preserved.
- Qualify document opening and each shader action on synthetic selections, including empty/read-only and cancelled/error cases.
- Keep gallery membership, screenshot observations, independent implementation and executed acceptance distinct. No Goodies or whole-product parity claim follows from this inventory.
