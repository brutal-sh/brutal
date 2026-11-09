# Commands menu investigation

Updated: 2026-11-09. [STAB-COMMAND-MENU](https://trello.com/c/6WTOPIdh) remains
unaccepted in Verify. [MOD-13](https://trello.com/c/dqmI6X9G) also remains Verify.
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
