# Color-slider label containment

Updated: 2026-11-17. [UI-COLOR-SLIDER-LABELS](https://trello.com/c/MeJ2EoyA)
owns the bounded browser layout repair. Native, actual-Pen and full picker acceptance
remain with [SURF-PAINT-COLOR](https://trello.com/c/uvzWdHMR).

The shared 28px label lane lets HSL, HSB and OKHCL labels run into the slider track.
The candidate uses the existing 80px width token and permits word wrapping as a
fallback. The font size, 264px popover and 56px number fields remain unchanged;
the regular track becomes 88px. Compact formats retain hidden labels and number
fields and 240px tracks.

## Executed evidence

Eight cases cover English/Russian, both themes and Chromium/WebKit. They produce
24 inspected HSL/HSB/OKHCL captures and 96 visible rows. The original layout has
72 strictly positive lane overruns, including 60 over 0.1px; the other 12 are Alpha
overruns of about 0.09px. The final layout has strictly zero overruns, one line per
label and at least 2.73px remaining in the longest lane. Visible and accessible
input labels agree.

The first capture attempt fails on an incorrect test selector and untranslated
menu lookup. The corrected harness uses the actual control anatomy and localized
menu and stays byte-identical across baseline, intermediate and final runs. The
intermediate 64px lane wraps Russian saturation; the final 80px lane contains it.
All failed and intermediate receipts remain retained.

The first functional cohort passes 38/40: two OKHCL lightness pointer checks fail.
An independent 28-case diagnostic preserves every assertion and proves that the
old helper, despite its drag name, only clicks. On the shorter track that click
lands on the current thumb and correctly retains its value. Old-layout clicks and
final-layout actual drags pass the original assertions in both engines.

The canonical test now uses a real thumb down/move/up gesture. The final strict
check also exposes a pre-existing HSB callback complexity of 17; its five repeated
RGB expectations share a precisely typed local helper instead. Reverse expansion
recovers the original expressions, and every non-null guard remains. Fixtures,
test names, ratios and assertion semantics are unchanged. The final cohort
passes 40/40, 20 per engine, with zero skips, retries, flaky cases or runner errors.
It covers channel pointer edits, gradient keyboard controls, compact formats and
published numeric history/invalid/cancel controls. Compact geometry remains intact.
The first diagnostic launch uses old Bun 1.2.13 and stops before any case; the
unchanged cohort executes with required Bun 1.4.2.

Independent review inspects all 24 final captures, recomputes metrics/results and
records the helper correction. Root separately reviews that test-only change.
The complete repository check, production build and 437 Vue owner tests with
1,906 assertions pass. Temporary specs are archived privately and removed.

## Limits

Browser checks are internal engineering evidence for the desktop app. They do not
qualify a hosted browser edition, native pointer delivery, installed-app appearance,
actual Pen matching, every locale, other picker contexts or screen-reader behavior.
Parent/native criteria remain open.

Private source identities, failures, traces, captures, geometry and review remain in
`local-evidence/color-slider-labels-2026-11-17/`. Private screenshots, temporary specs
and binaries are excluded from publication.
