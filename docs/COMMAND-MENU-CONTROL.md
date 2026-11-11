# Commands menu investigation

Updated: 2026-11-12. [STAB-COMMAND-MENU](https://trello.com/c/6WTOPIdh) remains
Verify and unaccepted. [MOD-13](https://trello.com/c/dqmI6X9G) also remains Verify.
No production fix is made by this investigation.

The retained post-extraction failure resolves the Commands trigger, waits for element
stability, then finds it detached. It times out before the Move-to-page disabled
assertion. The original report has no causal trace; schema/artifact equality does not
establish either a regression or a fixture/environment cause.

Executed controls use the canonical configuration, existing 15-second case limit, single
worker and normal pointer/keyboard interactions. The same five palette and eleven menu
cases run with temporary scoped focus/pointer instrumentation and Playwright traces:

| Source control           | Result                                           | Duration     |
| ------------------------ | ------------------------------------------------ | ------------ |
| Current extracted schema | 16 passed; no unexpected, skipped or flaky cases | 31.8 seconds |
| Original unsplit schema  | 16 passed; no unexpected, skipped or flaky cases | 31.7 seconds |

An isolated current Move-to-page case also passes. The paired runs use the same test
sequence, page-driver repair, dependency patch, animation policy and event probe. The
original control changes only the schema back to its retained pre-extraction bytes.
Both schema and test are restored byte-exactly afterward. No builds or source edits
run concurrently with either browser sequence.

Each of the eleven menu cases retains focus-call stacks, focus/pointer/key events,
outside-layer events, menu state/removal observations and its full Playwright trace.
The probe restores the native focus method, listeners and observer in `afterEach` and
is removed from the source tree. These passing traces do not contain the original
failure; they cannot explain its dismissal cause. The bounded original failure and
all new artifacts remain in ignored local evidence:

- `local-evidence/menu-schema-2026-11-09/` — original reports and failed contexts.
- `local-evidence/commands-detachment-2026-11-09/` — isolated and paired reports,
  full moved test-results, temporary probe, event histories and restoration assertions.

No forced clicks, added retries, changed timeouts, skipped cases, animation changes,
error filtering or snapshot baseline changes are used. Passing reruns do not waive
criteria one/two of the stability card. Actual Pen geometry, native input and mixed
WebKit reliability remain separate gates.

Re-entry: retain this probe for the first reproducing pointer sequence and identify the
actual close event/call stack before changing an owner. In the meantime SVG output is
an independently actionable current-reference unit; the unresolved menu gate continues
to block MOD-13 and terminal parity acceptance.

## Reproducing WebKit recovery controls — 2026-11-12

The storage Home candidate's seventeen-case cohort records sixteen passes and one failure: the recovered-draft WebKit journey stalls while pointer-opening the unstable Commands submenu trigger. All three storage cases pass. Restoring the exact original `0faffb642` WorkspaceView and StorageSettingsPanel source, keeping helpers/configuration/assertions/timeouts unchanged and starting fresh canonical servers, makes both WebKit draft journeys fail: the first in Commands pointer stability and the second in the File submenu. They are related failure observations at different steps, not proof of a common cause.

Both candidate runtime files are restored byte-exactly, and all thirteen frozen source/control hashes match. Independent read-only review verifies baseline identity, restoration and the reported failures. This is not a demonstrated storage-runtime regression, a repair, a stable/full-cohort result or full recovery/native acceptance. The bounded storage child is accepted separately; this required menu failure remains open.

Private receipts: `local-evidence/claude-brand-review-2026-11-11/storage-home-{browser-cohort.json,webkit-baseline.json,webkit-baseline-context.json,frozen-final.json,baseline-review.txt}` and corresponding logs/error contexts. Re-entry uses the retained `local-evidence/commands-detachment-2026-11-09/current-prefix/instrumented-menu.ts` probe; add bounded frame/geometry/animation observations to distinguish a moving target from absent frame progress before changing a menu owner.

## Bounded probe follow-up — 2026-11-12

The instrumented two-case recovery run fails before the probe is installed: one case has no automatic backup and the other has no recovery dialog. It captures no menu cause. A separate minimal cold pointer sequence opens Commands and File successfully in 7.79 seconds, retaining 79 events and 26 frame samples. This is one passing cold control, not recovery/menu stability acceptance. Both temporary test versions are removed and the original spec is restored byte-exactly to HEAD. No production menu change is made.

Private receipts: `local-evidence/claude-brand-review-2026-11-11/menu-{recovery,minimal}-*`. The next reproducing recovery probe must install before the failing setup/reload phase; a passing cold menu trace does not waive the failing recovered sequence.
