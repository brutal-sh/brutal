# Canvas fixture background control

[TEST-CANVAS-LIGHT-PAGE](https://trello.com/c/ZEokfEY1) qualifies test setup only.
Production page colors, saved formats and the installed app do not change.

`CanvasHelper` promises a light page for a new empty canvas fixture. Its stale
comparison required all RGB channels to equal `0x1e / 255`, while the actual app
starts a dark page at `#18181B`. The MOD-01 original/candidate controls retain ten
failed canvas snapshots with identical output. Inspected blur-image corners are
light in the original expected image and dark in the actual image; this alone does
not classify every pixel difference.

## Failure and correction

The first new control executes the actual app default, then `waitForInit()`:
Chromium and WebKit each fail the intended light-page assertion. Ten other cases
pass, including actual app dark/light themes, custom/translucent backgrounds,
nonempty editable history and multiple pages.

The helper now uses public canonical dark/light colors and matches all four RGBA
channels. Independent review identifies an additional failure: an edited page can
be empty again, so recoloring and marking it saved would erase its dirty state.
Actual draw/delete and draw/Undo controls fail in both engines before the guard
correction. The helper now refuses dirty pages and existing undo or redo history
before any mutation. Both tests subsequently retain exact state and restore their
shape through Undo or Redo.

The initial three-file candidate and 34 passing cases are superseded by this
reviewed candidate. Its first static run is deliberately interrupted with exit143
before the dependent recovery run starts; that partial log is not a passing gate. A subsequent
full check stops at two type-only imports from the package root; they are corrected
to the public primitives export, and the complete test-type check then passes.
That failed run also never starts its dependent recovery sequence. The final
corrected source is frozen separately and receives a new validation run.

## Gesture and fixture ownership

The final candidate removes the initial rest-tuple workaround. Ordinary drag and
marquee retain four coordinates; the four custom-step callers use `dragBetween`
with two canonical points and their original 20/12/12/12 step counts. Marquee keeps
its additional render wait. No subclass override is bypassed.

Existing auto-layout scene preparation moves to the established click-depth
scene/driver owners. Frame/first/optional-first-label/second/second-label order,
viewport reset differences, layout/selection/render order and assertions remain
unchanged. Resize setup moves to a private function in the same spec. All nine
touched TypeScript modules meet strict 300/50/10/4/4 without suppressions.

## Current evidence and limits

The corrected final browser run passes all 50 cases in 81.580 seconds, without retry, skip or
flaky case. It includes all ten original canvas snapshots without updates or
threshold changes; fresh/custom/translucent/nonempty/multiple/edited-empty page
controls in Chromium and WebKit; actual app themes; drag, marquee, resize,
auto-layout and connector interactions. Independent source review finds no
remaining actionable defect. All nine frozen executed source hashes match.

The complete final static gate exits zero, including source/test types and zero
duplicate-code clones. The final recovery cohort passes all 19 cases in 139.950
seconds (17 Chromium and two named WebKit), without retry, skip or flaky case.
The process-loss case retains three distinct owned PIDs and the same fresh
persistent profile; Restore/Save and third-process editable reopening execute.
All nine corrected source hashes match after both runs. Renderer production
hashes remain identical to MOD-01. The last full unit receipt retains
10,155 passes, one skip and the separate strict Note failure at 12,792 channels.
Notes, native filesystem/restart behavior, actual Pen parity and beta acceptance
are not qualified by these fixture controls. Native access remains blocked by the
locked Mac.

Private receipts: `local-evidence/claude-brand-review-2026-11-11/canvas-fixture-*`.
