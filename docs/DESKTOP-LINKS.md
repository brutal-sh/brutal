# Desktop setup links and keyboard activation

2026-11-07. Bounded browser paths execute below; native installation and
the branding milestone remain open. Actual Pen 1.2.21 remains the parity reference.

## Destination and ownership

The shared desktop setup URL points to the private Open Pen repository's existing
`Run this fork` instructions. Authorized GitHub readback confirms the repository is
private, its default branch is `feat/open-pen`, and its README includes the actual
Tauri development command and explicitly states there is no published installer.
Access requires repository authorization. A browser fixture's popup response does
not establish live authenticated GitHub-page rendering or successful installation.

The four callers are guided AI setup, the model-provider chooser, MCP settings and
collaboration room actions. The last supplies both waiting-room and Share-popover
links. Their shared constant changes once; the room story uses the same constant.
The English and eight translated catalogs retain their keys and interpolation
contracts, with labels describing desktop setup rather than an unavailable download.
Provider endpoints, package/protocol/storage IDs and license attribution retain their
existing owners. The installed Open Pen app and user data are untouched.

## Observed failures and smallest repairs

The corrected five-case state probe passes three settings paths and finds two room
failures: Enter on a focused waiting-room link produces no popup, and the German
Share footer measures 391px of content inside a 288px popover. The global shortcut
guard recognizes native buttons but intercepts native-link Enter activation.

The shared guard now recognizes unmodified Enter/NumpadEnter on an HTML anchor with
an href, using the existing composed event path. All three callers use that guard.
Button Enter/NumpadEnter/Space and canvas Space behavior retain their contracts;
there is no synthetic click or individual-link keyboard workaround.

The Share footer permits wrapping within its existing width and groups the separator
with the following setup link. Initial screenshot review rejects an orphan separator
on a line of its own in Polish and Russian. Font sizes, popover width, link semantics
and Leave behavior retain their owners. The grouping refinement has a separate final
run and visual review; the earlier passing overflow check alone does not qualify it.

## Executed controls and limits

| Receipt | Observed result | Qualification |
| --- | --- | --- |
| Initial wrong-state probe | Two passes, two failures. | Unreachable rooms have no setup links; development MCP has a real host. Correct fixtures are required. |
| Corrected state probe | Three passes, two room failures. | Preserves the actual Enter failure and measured overflow before repair. |
| First repair probe | Four passes, one invalid postcondition. | Waiting-room Leave correctly returns Home; expecting a canvas is a test error. |
| Broad 69-case run | 67 passes, two failures in the new button test. | The shared fixture retains a prior text edit, so R does not arm Rectangle. All 36 room cases and the other 31 cases pass. |
| Isolated focused controls | 14 passes across Chromium/WebKit. | Fresh standard page preserves the existing text/menu controls and executes native button keys plus canvas pan/restore. |
| Production settings controls | Six passes across Chromium/WebKit. | All three settings links activate, including production MCP's unsupported-host guidance, while the selected design remains unchanged. |

Development MCP is a negative control: its actual host exposes Restart and no desktop
setup link. Production preview has no Vite client and exposes the positive setup
branch. The preview HTML/module hashes match the built distribution; its owned
process is stopped afterward. This uses the canonical local-reuse configuration for
functional checking, not screenshot-baseline comparison.

Room controls cover nine locales, waiting and sharing in both engines. They check
the exact destination, real Enter/NumpadEnter popup, retained room/design state,
Leave, no horizontal overflow and existing browser/network error checks. Local
relay and provider stand-ins keep the fixture independent of external services.
The 64 captures from passing cases are inspected; the source screenshots, review
coordinates, hashes, traces and failed receipts remain in ignored local evidence.
They qualify these labels and affected layout, not all surrounding Pen geometry.

The normal worktree build, source/Vue/shared-test types, architecture and owned lint
pass. The full app shard passes 1,955 tests across 339 files with 12,560 assertions;
the earlier 12,576 total belongs to its separate retained receipt.
The worktree build includes retained unrelated icon work and is not a clean release.

The final grouped-footer run passes all 36 room cases in 175,338ms under unchanged
15-second case limits. Its 18 Share captures are inspected in both engines: labels
and Leave remain visible, the separator stays with its link, and every measured
popover has no horizontal overflow. The 29 frozen source hashes match after the run.
The normal build is repeated for the grouping refinement; all six production
settings cases then pass in 18,211ms against that distribution. Their 29 source
hashes also match. Source/Vue/shared-test types, architecture, scoped formatting,
documentation and changelog checks pass. An initial typing command targets a
nonexistent `tests/tsconfig.json`; the canonical `check:test-types` command passes.
Both final runs' complete results, traces, captures and source freezes are archived.
The owned preview process and temporary sleep assertions are absent after exit.

The final evidence qualifies the desktop-link and shared-keyboard task paths.
Scoped source/evidence is published in private commit `4df71f1fb`; the own remote
and draft PR head match and Actions stays disabled. Both bounded cards are Executed.

No timing limit, retry, skip, screenshot baseline, provider credential, native
installation or global error filter changes. Native OS keyboard delivery, physical
input, independent native-speaker review and full branding/parity remain unaccepted.

Tracking: [desktop links](https://trello.com/c/Xc3zTZLF),
[shared keyboard guard](https://trello.com/c/zdRSOywB), [task index](TASKS.md),
[branding](BRANDING.md), [PRD](PRD.md).
