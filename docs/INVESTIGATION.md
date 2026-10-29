# Pen 1.2.21 investigation — 2026-10-29

## Executed inspection
- `/Applications/Pen.app/Contents/Info.plist`: version 1.2.21, bundle dev.pencil.desktop, Electron launcher, .pen document association.
- REA open_binary with provider_id=hopper and binary_overview: ARM64 Mach-O, 52,688 bytes, 9 procedures, 4 segments. SHA-256 d6047dd37f301aa0a5cc8185b1034a5dc669bb4ae797cf9dba4ad6ee0a026f30. Overview evidence ev_b82b98cf7abf81638de62688adc64038cb70ff3c801507c4ca77ec7f3f8afd6c.
- REA ASAR inventory: 20,801 file occurrences, 2,857 directories; SHA-256 6020b5d71f5b701ef3a523f7e612a24d3d0ff18f151c5d5e705689ca65a6219a. Parent evidence ev_f45d757785ba79f03bbd2a2500da4a604415d5eb274e6d702a7a5a839565a6bd. 38 integrity contradictions retained as observed-untrusted; cause unknown.
- Passive native accessibility observation: existing active design work, layers/slides/components/libraries, tools, variables, browser pane, AI session and account menu. No edits to that session.
- REA sessions closed after local evidence export.

## Limits
Hopper examined the native launcher, not the editor's JavaScript semantics. ASAR inventory is not decompilation or runtime coverage. Active user work prevented disruptive reference-app experiments. No proprietary code/assets were copied into the implementation; no activation or subscription logic was patched. Raw evidence stays in ignored local-evidence/.

## Build foundation
[OpenPencil](https://github.com/open-pencil/open-pencil), MIT, upstream commit 24461adec7073312d460d76f08f069de18e4fb78. Preserved license and source history. Capabilities are candidate reuse until exercised. The independent custom SVG spike is parked in ignored local evidence; it is not production code.
