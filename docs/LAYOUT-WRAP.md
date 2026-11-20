# Rotated layout wrapping

Updated 2026-11-13. LAYOUT-WRAP is Verify and remains unaccepted. Actual Pen 1.2.23 is the reference;
OpenPencil is the implementation foundation. This is bounded command evidence, not
full layout, menu or native acceptance.

## Matched native reference

Two independently authored 80 × 60 rectangles have rotation 90° and raw x positions
0 and 120. Identical input bytes are opened separately in actual Pen and normal
Brutal. Native child positions are 0, −80 before wrapping; stored coordinates
and inspector positions are different representations.

| Phase | Actual Pen 1.2.23 | Installed Brutal `db4e528c` |
| --- | --- | --- |
| Add flex, gap 60 | 180 × 80, horizontal, Hug Width, fixed height | 220 × 80, same sizing modes |
| Explicit Save As, before closing | 180 × 80 | 220 × 80 |
| Clean close and native reopen | 60 × 80 | 220 × 80 |

Pen saves the wrapper width omitted and child heights as bare `fill_container`.
Brutal saves `fit_content(220)` and `fill_container(80)`. Its reader currently
reconstructs the reference file at 220 × 80. This import discrepancy is open.
A separate fresh-identity reference control starts at 60 × 80, becomes 221 × 80
when Gap changes from 60 to 61, saves at 221 × 80 and reopens at 61 × 80. The
subsequent Undo/Redo attempt does not establish reference gap-history behavior.

The reference phase change is observed; it does not justify changing all rotated
Yoga layout or dropping saved fallbacks. Native screenshots are color-managed;
retained scanline hue bounds are diagnostics, not accepted pixel comparisons.

## Candidate command change

The candidate keeps the initial wrapper's measured primary extent after its Fill
children are laid out. It reflows the containing layouts with that extent held
Fixed, then restores Hug sizing. Subsequent normal edits still recalculate the
children and wrapper. Undo restores captured geometry, sizing, order and selection.
Only the owned wrapper and its containing layouts are reflowed; unrelated page
subtrees are not traversed.

Negative controls reproduce 220 instead of 180, a nested parent sized from the
wrong extent, and an unrelated Hug frame changing width from 100 to 50. The final
87 affected tests cover those boundaries plus generic wrapping, overlapping layers,
layout-mode history, Notes, slots, instances and existing .pen layout/sizing.
The browser journey imports `tests/fixtures/pen-rotated-flex-wrap.pen`, byte-identical
to the independently authored input used in both native apps (SHA-256
`eb75649b4865b1868383504bb5b4971575fa0e30a215e8bf208e74984510220d`).
It executes actual Add flex, Undo/Redo and Gap editing in Chromium and named WebKit. Its strict canvas crop includes the
complete wrapper and overflowing children; inspector dimensions are asserted
separately. Session avatars are outside the crop. These are regression baselines,
not matched Pen pixel acceptance. The full repository check also passes, including
types, architecture, security and zero reported code clones.

The complete canonical unit run records 10,204 passes, one skip and one failure:
the existing strict Core Note reference mismatch of 12,792 channels. The broader
browser caller cohort records 25 passes and three failures: Note export differs
by 1,083 channels, and both existing layout-panel baselines expect width 217
instead of the current 221. Guarded original-HEAD wrap controls reproduce all
three; their actual PNGs are byte-identical to the candidate outputs. The Core
Note failure also reproduces at the original wrap runtime. Candidate source is
restored byte-exact. No baseline, tolerance or assertion is relaxed, and neither
broader suite is green. Those failures retain their existing owners.

The isolated native-test binary `5b19ef31` executes the synthetic internal-graph
fixture: Add flex 180 × 80, Hug Width, menu-event Undo/Redo, and a single-click Gap
edit to 221 × 80. Initial double-click input does not open the editor; no product
or driver change is inferred. Visible captures retain the wrapper and overflowing
blue/green children. Existing native Note Fill sizing, Hug/save/Recents and recovery
readiness controls also pass on that same binary. These are isolated WebView
receipts, not physical OS-menu, production-profile or matched Pen pixel proof.

The final native spec is aligned to the exact same `.pen` bytes as the reference
and browser. Two subsequent runs stop at the unchanged hidden-window readiness
guard before fixture setup; the standalone failure refutes assigning this only
to browser-test overlap. The unchanged host control also stops at the same guard, before its own fixture.
Native retries stop until desktop availability changes. Keep the earlier synthetic
receipts distinct from this unaccepted exact-file native path. No normal-candidate delivery or save/reopen parity is claimed. The installed
normal app remains `db4e528c`. The Mac locks before the final clean reference
Gap tab can close; that test-owned tab remains open and clean. The original
workspace, owned inputs and older recovery copies are retained.

## Remaining acceptance

- Resolve omitted-width/bare-Fill import behavior with bounded reference controls.
- Verify candidate native Add flex, history, Save As and clean reopen against Pen.
- Complete rotated, reflected and nested selection cases, menus and matched visuals.
- Preserve the original documents, recovery data, unrelated work and strict checks.

Private receipts and failed controls are retained under
`local-evidence/wrap-current-reference-2026-11-13/`. The native comparison, gap
control and saved-model comparison receipts distinguish each phase. Passing
lower-layer checks do not close the card or any milestone.
