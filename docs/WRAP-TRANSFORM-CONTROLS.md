# Wrapping transform controls

LAYOUT-WRAP remains unaccepted. Current Group/Frame wrapping and ungrouping preserve their
tested world geometry; the separate Add flex layout reference discrepancy still requires
current Pen/native observation. No production geometry change is made from these controls.

Nine composed Core checks exercise rotated, reflected and nested transformed parents. They
wrap two oppositely transformed selections, including a nested descendant, while observing
the ancestor and unrelated sibling corners. Group and Frame commands retain all observed
corners through two Undo/Redo cycles, restore the original parent stack on Undo, and retain
the wrapped child/parent order and corners through the actual public Core `.pen` writer and
reader. Ungroup retains the resulting stack, nested corners and Undo/Redo behavior. The
existing six-decimal transform comparison policy is reused; no Pen raster threshold changes.

The final owner cohort passes96tests/3,716assertions across15files, including the9new checks.
Strict300/50/10/4/4 and canonical test-type checks pass. This is engine/history/format evidence,
not native menu, keyboard, chooser, disk durability, restart or current-reference acceptance.

Separate read-only review confirms the test/diagnostic scopes, retained hashes and editor
cleanup, with no actionable defect. The complete canonical `bun run check` subsequently passes
with zero duplicate clones. These checks support publishing the test coverage and investigation;
they do not close LAYOUT-WRAP or justify changing production flex geometry.

## Separate rotated flex state

The retained actual Pen1.2.21 facts describe two80×60rectangles, rotation90, at x0/120 and y0.
Its initial Add flex result reports180×80 with gap60; its post-Save As native observation
reports60×80, with an80×80child and another child outside. Its saved `.pen` omits wrapper
width and retains child width80, rotation90 and Fill Height. These are separate, inconsistent
dated observations; neither is silently promoted to the current1.2.22 reference.

A new read-only controlled diagnostic independently authors that input through public Core
IO and executes Brutal's actual Add flex command. Current Brutal resolves220×80/gap60,
returns to the original80×60children on Undo, and returns to220×80on Redo and `.pen` reread.
Reading the untouched dated vendor save also resolves220×80here. This quantifies the open
difference; it does not establish which current Pen state is authoritative or justify a global
Yoga/renderer/rotation correction. The retained vendor file's hash is unchanged afterward.

Actual Pen is still1.2.22 with its previously verified unchanged archive. Native UI is locked
and its MCP account limit is not retried or bypassed. Required re-entry is to observe the same
owned rotated input before wrapping, after settled wrapping, after Save As and after reopening
in current Pen, keeping inspector values, saved model, child bounds and rendered state distinct.
Then repeat the matching Brutal native menu/keyboard/Undo/Redo/save/reopen path. The original
LAYOUT-WRAP criteria remain binding; Group/Frame controls do not close the flex or native gates.

Private evidence: `local-evidence/wrap-transforms-2026-11-12/`, including first/final owner logs,
source digests, the current flex diagnostic and independent output. The dated reference remains
under `local-evidence/pen-multi-layout-reference-2026-11-03/`. User source files, recovery,
profiles, credentials, installed app and protected icon work are preserved.
