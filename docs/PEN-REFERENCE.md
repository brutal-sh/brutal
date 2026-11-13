# Parity reference and implementation base

The product reference is the installed `/Applications/Pen.app` **1.2.23**, bundle identifier `dev.pencil.desktop`. Its internal Pencil naming is unrelated to the MIT OpenPencil codebase used as Open Pen's implementation base.

The independent build is `/Applications/Open Pen.app`, bundle identifier `dev.jpoindexter.openpen`. Existing `open-pencil` package names and the `openpencil` Playwright project name refer to implementation/test infrastructure; they do not make OpenPencil the parity target.

Pen's UI and observed behavior govern acceptance. Inherited implementation tests are regression checks. A passing Figma/OpenPencil contract or a successful build does not establish a Pen screen/menu match. Defaults or inherited controls that differ from observed Pen remain gaps in `PARITY-STATE-MATRIX.md`.

Current versioned update: [Pen1.2.23 catalog](pen-feature-reference/update-1.2.23-2026-11-13.md). The private1.2.23folder contains the current REA extraction, dimensions, CSS/native measurements and Hopper MCP entry analysis, with explicit coverage limits. The1.2.21archive below remains historical evidence.

## Private shipped-reference archive

`local-evidence/pen-reference-1.2.21/` contains a complete REA regular-file extraction of Pen's ASAR plus application/framework resources. It is ignored by Git; proprietary bytes are reference-only and are not distributed with Open Pen.

The extraction contains20,800 ASAR files, verified individually against REA's observed-byte hashes;20,981 regular files including native resources;471 raster image measurements;5 SVG measurements;1 bundled font's metrics;99 CSS files; and22 native catalog renditions plus the catalog record. Its README documents the native catalog coverage limit, integrity metadata contradictions and distinction between intrinsic asset size and live layout.

Source archive SHA-256: `6020b5d71f5b701ef3a523f7e612a24d3d0ff18f151c5d5e705689ca65a6219a`.

REA extraction evidence: `ev_5f56f580b215e59f26feb986505ba7205ba42c7ec2ffa7099b532ed622541c22`. Native catalog evidence: `ev_7a3ec8d7e6093a780e38fa999a145e6374311735488270d0b0f5201a9e4a7f8c`.

`local-evidence/pen-design-extraction/` retains the earlier CSS/component measurements and the Hopper native inspection snapshot. Hopper inspected the native launcher; the Electron editor's design comes from the shipped web assets and observed running Pen UI.

The full reference folder does not close visual acceptance. Dynamic layout, system/network fonts, inline icons, every screen/menu state and executed interactions still need comparison against Pen itself.

## Running icon inspector observation, 2026-11-04

REA observes the already-running owned legacy-icon fixture in Pen, binding the native launcher
through the Hopper provider. Launcher SHA-256 is `d6047dd37f301aa0a5cc8185b1034a5dc669bb4ae797cf9dba4ad6ee0a026f30`.
The selected window's screenshot is1496×933, SHA-256
`dcbbe428ae86402d457270ce4dcef0d66ab759600b07782083b908b084d23f03`.
Evidence: `ev_973bff3e0f26becc022b1347cc25e7894074be5813cc1de2b6aecb40670dd6da`.

The screenshot confirms the selected icon's section order and absence of frame-only controls.
The400-node accessibility tree is truncated and includes hidden tab views, so it does not
qualify the active inspector's labels, focus or editable values. No reference interaction or
deep launcher analysis occurs in this observation. The evidence bundle and original screenshot
are retained privately under `local-evidence/icon-toolbar-focus-2026-11-04/`; the REA target is
closed afterward. Reference document content and application state are unchanged.
