# Pen 2.22 reader control

Updated: 2026-11-09. [FMT-09-DRIFT](https://trello.com/c/eZXKvRhb) is Building;
[IO-13-EXPORT](https://trello.com/c/6XfIejZR) remains Verify behind that prerequisite.
Neither full format parity nor Note migration is accepted.

The installed/running reference is Pen 1.2.22. A new disposable document contains two
frames with explicit geometry, rounded inside stroke, clipped translucent ellipse,
triangle and Inter text. Pen's native Save As produces the owned 2.22 source. Its native
File → SVG path saves a single file; selecting both frames saves `export.zip` with one
named SVG per frame. Native single-file bytes equal the tool export. Tool exports at
scale one/four are byte-identical, and text is represented by paths.

Open Pen's actual browser FileOpen initially rejects that source at `/version`, explaining
that the reader targets 2.21. This preserves the original source. The current-reference
update therefore establishes an import prerequisite, rather than merely a new label.

The bounded candidate admits versions through 2.22 for existing supported node shapes.
The measured public-schema delta leaves those shapes unchanged: Note adds `color` and
loses TextStyle inheritance; Prompt/Context leave published unions. Those node types
remain explicitly refused by this package, before graph creation. The writer stays at
2.21. No user file, source version, profile or recovery record is rewritten by this change.
The compatibility checks do not detect every unknown property or establish full fidelity.

Owner regressions fail before the change (19 pass/four fail), then all 23 compatibility
cases pass with 42 assertions. They retain future-version rejection, existing legacy
content and exact unsupported-node diagnostics with source objects unchanged. All 274
PEN-package cases pass with 888 assertions; this also runs unrelated icon work without
accepting or including it in this candidate. Independent review confirms the narrow
schema delta, pre-build refusal, unchanged writer and bounded claims.

The same actual reference file then imports successfully through browser FileOpen and
exports through the visible File submenu. The temporary capture case passes in 3.9
seconds and is restored byte-exactly afterward. Earlier diagnostic selector mistakes
and the original version failure remain retained; they are not counted as app passes.
All browser controls retain the normal 15-second limit and real error reporting.

The exported artifacts show concrete remaining SVG differences:

| Selection   | Pen 1.2.22                   | Current Open Pen               |
| ----------- | ---------------------------- | ------------------------------ |
| First frame | 240 × 160 SVG, text paths    | 240 × 160 SVG, live text/tspan |
| Both frames | ZIP with two named SVG files | One combined 440 × 160 SVG     |

These are structural observations, not a completed visual comparison. Fallback paints,
image embedding, trusted native delivery/cancellation, persistence/history, Note data,
older Prompt/Context preservation and full format acceptance remain unexecuted/open.
The older 2.21 reference receipts remain versioned. No proprietary implementation or
assets are shipped by this control.

Private artifacts: `local-evidence/svg-parity-2026-11-09/` retains the actual owned source,
reference screenshots/SVG/ZIP outputs, source/tool observations, red/green and complete
owner logs, original/failed/successful browser traces and app-exported SVGs. The native
reference test document is saved/closed and Pen is restored to Home/Recents. Existing
user documents are not edited.
