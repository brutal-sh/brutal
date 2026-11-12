# Native recovered-file reference, 2026-11-12

Reference: actual `/Applications/Pen.app` 1.2.22. Fresh REA desktop inspection and a separate full-content ASAR SHA-256 confirm the existing reference identity, `1c6d0129dc9dda08f2f0da5dde23aa8cc52df11858fec1e35cd3bd2647bcf407`. REA's directory metadata digest does not hash every file byte. All UI observations below use Computer Use against that actual app.

## Observed screens and menus

Home exposes Recents, Drafts and Design Systems. The Drafts card menu contains Open, Reveal in Finder, Rename and Delete Draft. Opening the menu does not execute rename or deletion.

The native File menu exposes New File, Open, Open Recent, Home, image/SVG/Figma import, selection export, snapshot export, the Figma import guide, CLI installation, Save, Save As and Close Tab. Selection export lists PDF, SVG, PNG, JPEG and WebP. Menu enumeration does not accept those operations.

## Executed recovered-file round trip

The current isolated Open Pen native host recovers and explicitly saves a synthetic existing `.pen` file after verified process interruption. A retained copy of that output is opened through Pen's actual native Open panel. Pen draws both rectangles; its Layers/inspector reports:

| Layer              | Position | Dimensions | Solid fill |
| ------------------ | -------- | ---------- | ---------- |
| Existing rectangle | 0, 0     | 64 × 64    | `#2563EB`  |
| Rectangle 1        | 120, 120 | 64 × 64    | `#D9D9D9`  |

Pen's native Save As panel writes `pen-written-roundtrip.pen` beside the owned input. The input hash remains unchanged. Open Pen's built public `IORegistry.readDocument` reads the Pen-written file and preserves both names, types, geometry and fill color/opacity/visibility exactly. No vendor implementation or reference asset is copied into production.

## Acceptance boundary

This executes one small interoperability path and records reachable menus. It does not exercise Pen crash recovery, deletion, rename, denied permissions, read-only files, picker cancellation, automatic backup debounce, the normal installed Open Pen app, physical input or matched recovery-dialog visuals. FILE-07/08 remain Verify. The older intermittent Cancel timeout is retained separately.

The paired [machine record](recovery-1.2.22-2026-11-12.json) links private receipts by relative evidence path. Those raw source files, screenshots and native logs remain private.

## Fresh native panel comparison

The settled active editor opens the current three-rectangle recovered copy. An initial inactive old WebView's agent-days notice is not a current editor access block; no notice dismissal, MCP retry or workaround occurs. Native Save As cancellation preserves both source hashes; separate-copy Save As succeeds. An owned read-only copy refuses a four-rectangle edit through a native critical alert with Save As guidance. Exact prior permissions restore, OK dismisses the alert, and explicit Save retry writes four rectangles and clears Edited. Only the clean owned tab closes.

The format-specific Save As title and actionable native alert differ from the own current generic title/raw diagnostic toast. [FILE-NATIVE-SAVE-UI](https://trello.com/c/ysa9PnRd) owns those measured states. Native AX supports this label/state comparison; the retained alert screenshot is blank and does not establish matched pixels. Public Core decoding preserves names/geometry/solid-paint values; raw NORMAL-versus-omitted blend declarations differ under the same unchanged SrcOver/no-isolation default. No byte identity or new raster pass is inferred. Private receipts: `local-evidence/native-recovery-reentry-2026-11-12/current/`.
