# SVG selection delivery control

Reference: actual Pen 1.2.22, observed 2026-11-09.
[IO-13-EXPORT](https://trello.com/c/6XfIejZR) remains Verify behind FMT-09-DRIFT;
[MENU-FILE](https://trello.com/c/WGWi4KGG) remains unaccepted.

The earlier owned native reference exports one selected frame directly as a 240 × 160
SVG. Two selected frames produce `export.zip`, containing their separately named
240 × 160 and 120 × 80 SVGs. Brutal instead exports one combined 440 × 160 SVG.
The original native outputs and browser capture are retained under
`local-evidence/svg-parity-2026-11-09/`.

The root cause is the app's selection dispatcher: it always passes all selected IDs as
one target. Its existing batch exporter already renders separate targets before saving,
bundles files into one ZIP, sanitizes archive paths and disambiguates duplicate names.
The candidate routes only multi-object SVG selection through that owner. Single SVG,
other formats and explicit combined-selection export requests retain their existing paths.
The native menu declaration and generated artifact also add SVG after PDF, matching the
observed current-reference export submenu. No installed app is replaced.

Three new owner controls cover two different object sizes, colliding names, unchanged
selection, scale-independent dimensions and direct single-file output. Before the change,
one passes and two fail because the delivered file is `Export.svg`. Afterward, all
31 document-export/menu owner tests pass with 94 assertions across six files.
Normal build, source/Vue/test types and architecture checks pass.

The initial canonical Chromium browser run retains 15 passing existing export workflows
and one failed new test: its exact locator uses catalog capitalization instead of the
rendered “Export selection…” label. The trace and accessibility snapshot preserve that
diagnostic failure; it is not counted as executed SVG delivery. The corrected control
uses the observed label and runs through the visible File menu and actual downloads.

The corrected canonical run executes the new File-menu workflow in Chromium and WebKit:
both download a two-entry ZIP with separate 240 × 160 and 120 × 80 SVGs, retain selection,
then download the first object directly with bytes identical to its ZIP entry. Each runs
once without retries. The full two-browser run has 30 passes, one existing WebKit
export-settings test failure and one later serial test unrun. The failed test finds the
page at “Loading” with no active store. Its cause is unclassified, not waived as unrelated.

Paired isolated controls run all 15 existing export cases in WebKit with the published
original dispatcher/menu artifacts and then the candidate: both pass (21.3 / 21.8 seconds).
The candidate files are restored byte-exactly afterward. These isolated passes do not
explain or accept the failed broader run, nor close the mixed WebKit stability gate.

This document does not accept native menu delivery, a complete SVG visual comparison, outlined
text, raster/fallback paints, Note interchange, clipboard output or full format parity.
Pen's same-name ZIP basename and nested/ancestor selections remain unobserved. Existing
batch naming is retained rather than presented as measured reference behavior.

Private candidate receipts, original failures and complete browser artifacts are retained
in `local-evidence/svg-selection-2026-11-09/`. No vendor source or assets are published.
