# Parity reference and implementation base

The product reference is the installed `/Applications/Pen.app` **1.2.21**, bundle identifier `dev.pencil.desktop`. Its internal Pencil naming is unrelated to the MIT OpenPencil codebase used as Open Pen's implementation base.

The independent build is `/Applications/Open Pen.app`, bundle identifier `dev.jpoindexter.openpen`. Existing `open-pencil` package names and the `openpencil` Playwright project name refer to implementation/test infrastructure; they do not make OpenPencil the parity target.

Pen's UI and observed behavior govern acceptance. Inherited implementation tests are regression checks. A passing Figma/OpenPencil contract or a successful build does not establish a Pen screen/menu match. Defaults or inherited controls that differ from observed Pen remain gaps in `PARITY-STATE-MATRIX.md`.

## Private shipped-reference archive

`local-evidence/pen-reference-1.2.21/` contains a complete REA regular-file extraction of Pen's ASAR plus application/framework resources. It is ignored by Git; proprietary bytes are reference-only and are not distributed with Open Pen.

The extraction contains20,800 ASAR files, verified individually against REA's observed-byte hashes;20,981 regular files including native resources;471 raster image measurements;5 SVG measurements;1 bundled font's metrics;99 CSS files; and22 native catalog renditions plus the catalog record. Its README documents the native catalog coverage limit, integrity metadata contradictions and distinction between intrinsic asset size and live layout.

Source archive SHA-256: `6020b5d71f5b701ef3a523f7e612a24d3d0ff18f151c5d5e705689ca65a6219a`.

REA extraction evidence: `ev_5f56f580b215e59f26feb986505ba7205ba42c7ec2ffa7099b532ed622541c22`. Native catalog evidence: `ev_7a3ec8d7e6093a780e38fa999a145e6374311735488270d0b0f5201a9e4a7f8c`.

`local-evidence/pen-design-extraction/` retains the earlier CSS/component measurements and the Hopper native inspection snapshot. Hopper inspected the native launcher; the Electron editor's design comes from the shipped web assets and observed running Pen UI.

The full reference folder does not close visual acceptance. Dynamic layout, system/network fonts, inline icons, every screen/menu state and executed interactions still need comparison against Pen itself.
