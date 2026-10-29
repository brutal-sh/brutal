# Execution evidence

Full parity is open. A source implementation, unit check, build, and user workflow establish different things. This ledger records only observed outcomes and the scope of each observation.

## 2026-10-29

| Behavior/check | Result | Limit |
| --- | --- | --- |
| GitHub repository privacy and push | Private status verified with GitHub CLI; branch `feat/open-pen` pushed. | No packaged release. |
| Trello setup | Private board and four workflow lists created; fourteen workstream cards. | Workstream cards are not completion evidence. |
| Package build and Vite production bundle | Executed successfully. | Does not prove application behavior. |
| Canvas and interchange UI | 28 browser checks passed across the main run (27) and corrected notification-locator rerun (1): shapes, movement, deletion, undo, option-drag duplicate, export controls/files, document/image drops, supported `.pen` edit, unsupported `.pen` rejection preserving original unsaved tab. Manual recovery/duplicate/undo also observed. | Production Chromium bundle, not all tools/platforms or exact Pen equivalence. Logs: `browser-current.log`, `pen-guard-ui-stable.log`. |
| `.pen` format | 214 package/Core tests passed, including supported rendering fixtures, export/re-read, gradients, embedded images, variables/themes and linked/nested instances. CLI `.pen` export/reopen produced byte-identical PNG for the controlled fixture. | Documented unsupported semantics still refuse import/export. Latest two loss-refusal fixes passed package checks but postdate the browser snapshot. |
| `.pen` Save/Save As | Actual browser file-drop → edit → Save download → Save As download; downloaded `.pen` bytes parsed and edited child preserved. Included in three-workflow production run. Autosave/storage/refusal behavior covered by targeted unit tests. | Native OS picker/write journey not yet executed. Save remains `.fig` for new documents and remote storage. |
| Presentation | Two browser workflows passed: real PNG pixel/dimension check, arrows/Home/End/buttons, slide selection, empty page, Escape/close focus return, exact document/selection/viewport unchanged. | Uses a 96vh dialog; OS fullscreen and full Pen presentation parity still open. |
| Fork identity/OAuth internals | 68 focused tests passed; eight Rust OAuth tests passed, including a real loopback TCP callback and listener shutdown. | Actual OpenRouter authorization and complete co-install behavior pending. |
| Production browser MCP startup | Ten service tests passed; production browser suite no longer emits a failed localhost probe. | Native MCP/ACP runtime needs separate execution. |
| Codex login and generation | `codex login status` confirmed ChatGPT login. An ephemeral read-only Codex CLI run generated a synthetic `.pen`; parsed geometry/text assertions passed and CLI rendered the expected 640 × 360 PNG, visually inspected. | This is CLI generation and render, not native ACP tool editing. No credentials copied; user explicitly approved existing Codex/Claude CLI login. Evidence: `ai-smoke/`. |
| Native browser implementation | Separate-window baseline: two actual native E2E tests passed navigation/back/forward/reload, 390px viewport, WebKit PNG pixels, capture into image layer and Undo, and remote IPC denial; four Rust policy tests passed. | Separate-window UI fails the Pen design target. Embedded right-dock replacement is being tested; no embedded acceptance claim yet. |
| Type checks | Project test type check passed after the current Save/presentation/browser additions. | Does not establish runtime correctness. |
| First canonical browser suite | Three startup failures, 19 tests not run. | Cold development boot exceeded hooks. Fresh reload later reached editor; cold startup remains a performance acceptance gap. |
| Broad unit suite | Interrupted after fixture failures and resource-contention timeouts; no overall pass. All eleven LFS fixtures restored with exact hash/size and clean-filter verification; 69 distinct focused fixture checks passed across reruns. | Remaining broad failures need triage. Avoid concurrent unbounded test/build load. |

Local logs and static REA evidence are kept in ignored `local-evidence/`. Do not upload extracted proprietary artifacts. The parity matrix describes the initial source baseline; subsequent implementation needs its own executed evidence here.

## Next acceptance path

Native preview/capture/placement → native Save/reopen → real ACP chat/tool edits with approved Codex login. Continue format gaps (slots/libraries/non-frame components, rich text/custom graphics), persistent script workflows, snapshot sharing, and hosted-operation equivalents. Every matrix category still needs an explicit parity verdict.

## User correction and visual-shell work, 2026-10-30

Acceptance is 1:1 **functionality and design**, not feature availability alone. See [visual acceptance ledger](VISUAL-PARITY.md). Initial OpenPencil shell failed the visual target.

- Executed: immutable browser build2 passed five workflow tests: panel switching, sidebar collapse/restore preserving the active panel, Variables dialog, vertical keyboard tools/flyout placement, Rectangle drawing, inspector without canvas movement, zoom, duplicate/undo; presentation navigation and empty state; `.pen` open/edit/Save/Save As with downloaded files reparsed. Screenshot `local-evidence/workspace-shell-build-2/workspace-dark.png` captures actual default canvas before the test helper changes its background.
- Executed: 183 focused format/save/presentation/MCP tests passed with562 assertions. Nine page-background checks passed, including imported backgrounds remaining intact. Save transactions now share a queue; race regressions cover retargeting and autosave overlap.
- Code path/newer than browser build2: Main menu moved to the Open Pen brand control, rail ellipsis now opens the actual command palette, and hidden sidebar navigation avoids duplicate tab IDs. These changes require a further browser rerun.
- Full visual comparison, native ACP chat-to-canvas and complete Pen feature coverage remain open. No parity completion claim.
