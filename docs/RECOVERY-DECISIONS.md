# Recovery decisions and unrelated-work isolation

[FILE-08](https://trello.com/c/ZHvzXqoN) remains open for native/reference acceptance. Its current browser control uses two distinct draft backups in a fresh runner context. This is a decision-isolation check, not acceptance of the full native or Pen-reference matrix.

| Decision on target draft | Required target outcome | Required unrelated outcome |
| --- | --- | --- |
| Save | Parse the actual download and verify the target rectangle; remove only its backup. | Exact original backup digest, reload retention, restored geometry and editable Duplicate/Undo. |
| Save As | Parse the actual download and verify the target rectangle; remove only its backup. | Exact original backup digest, reload retention, restored geometry and editable Duplicate/Undo. |
| Cancel dirty close | Target tab stays selected and both backup digests remain unchanged. | Original backup survives reload and restores editable content. |
| Close recovery offer | Both backup digests remain unchanged; the offer returns after reload. | Original backup survives reload and restores editable content. |
| Discard target recovery | Only the target row and its backup are removed. | Original backup survives reload and restores editable content. |

The public canvas input creates the target's 123 by 76 rectangle and the unrelated draft's 91 by 53 rectangle. Distinct fixture names identify their rows. Existing `persistRecoveryNow` accelerates fixture setup after each actual edit; automatic backup debounce is covered separately and is not inferred from this control. The test binds the unrelated digest before any decision, checks the whole remaining digest set and then parses/restores actual content, so row labels or counts alone cannot pass it.

Save and Save As deliberately use the browser download fallback. The picker is temporarily disabled in the fresh test page, the filename prompt is accepted, actual downloaded bytes are parsed by Core IO, and the original picker is restored in `finally`. These results will not establish OS Save panels, writable external-file source association, read-only filesystem behavior or native process persistence. Existing-file browser controls retain those separate bounded OPFS contracts.

The canonical Chromium and named WebKit projects run with one worker and zero retries. The original 15-second case budget and all byte/content assertions remain unchanged. The initial ambiguous New design fixture is retained: both Home and the tab bar provide that accessible name, so the corrected fixture uses the existing tab-bar integration boundary. The next control records four passes and six deadline failures while both automatic fixture timers consumed the case budget. No product defect or fix is inferred from those incomplete controls.

Executed candidate: all ten cases pass in 76.225 seconds, five in Chromium and five in the named WebKit project, with zero skipped, unexpected or flaky cases and zero retries. Both touched TypeScript owners pass strict 300/50/10/4/4 limits and test type checking. Independent source review finds no actionable issue. This accepts only the two-draft browser decision-isolation contract; FILE-08, native recovery, full parity and beta acceptance remain open. Actual Pen remains version 1.2.22 with unchanged archive hash; matched visual/focus/disabled/loading/error states await accessible native UI.

Source owners: `tests/e2e/app/recovery/decisions.webkit.spec.ts` and `tests/helpers/document/recovery/decisions.ts`. Retained private logs, JSON reports and artifacts: `local-evidence/claude-brand-review-2026-11-11/recovery-decisions-{first,scoped,seeded,qualified}.*` and matching artifact directories.

The first ten-case green control is retained before an architecture rejection of the helper filename. The helper moves byte-for-byte into the required `recovery/` domain folder; its caller import is updated, and the final moved source passes all ten cases again in 76.225 seconds before publication. Architecture, strict owner limits, test types and final documentation checks pass. No rule is waived.
