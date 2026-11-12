# Open Pen product requirements

Decision owner: Jason Poindexter. Implementation and evidence owner: Codex.
Updated: 2026-11-12. Status: active; full design and functionality parity is not achieved.

## Product outcome

Open Pen is an independent local design app built on the MIT OpenPencil foundation.
Jason should be able to use the workflows available in installed Pen 1.2.22 with the same
interaction and visual behavior, without editor subscriptions or license activation.
Open Pen uses its own name and visual identity. Required engine and third-party attribution
remain accessible. This identity difference is intentional; it does not waive layout or behavior parity.

The full parity target remains intact. This PRD adds explicit requirements for maintainable
modules, complete Open Pen branding and an executable Trello backlog.

## Problem and evidence

- Reported: Jason repeatedly finds mismatched menus, control sizes, borders and screens.
- Observed: the implementation already uses OpenPencil. Rebuilding another editor foundation
  would discard working document, rendering, layout and history systems.
- Observed: the initial board audit finds 15 broad cards and stale descriptions, before the
  execution-card reconciliation. No feature workstream is fully accepted.
- Initially observed: 152 documented requirements across 23 chapters are recorded in the
  [feature catalog](pen-feature-reference/README.md), with a 2026-10-30 snapshot. The official
  [documentation index](https://docs.pen.dev/) is rechecked on 2026-11-06. The installed reference
  reported 1.2.21 on that date. Documentation coverage does not prove runtime coverage.
- Refreshed: all historical/current documentation routes are fetched on 2026-11-06. The
  catalog now has 164 requirements, including 12 unaccepted documentary deltas. At that refresh, documented
  schema 2.22 differed from the then-installed archive’s 2.21. Applicability-first
  tasks preserve the pinned target; see the [refresh](pen-feature-reference/refresh-2026-11-06.md).
- Refreshed on 2026-11-09: REA and the running About panel confirm Pen 1.2.22. The
  [update catalog](pen-feature-reference/update-1.2.22-2026-11-09.md) records 31 bounded
  additions/changes/service findings and all 182 changed file paths. Six registered guides,
  website-code guidance, locale/menu changes, note/schema changes, SVG, browser inspection,
  URI targeting, feedback and cloud contracts have explicit dispositions. Historical 1.2.21
  receipts stay versioned; current-reference checks use 1.2.22. Static inventory does not accept
  backend availability, workflow behavior or schema migration.
- Native Note qualification on 2026-11-09 separately measures plain reusable Notes,
  direct and nested refs, explicit/equal overrides, component detachment and the
  differing actions offered on prototype refs versus resolved instance copies.
  Creating a reusable Note ref and Fill sizing remain distinct unaccepted contracts.
  Five narrow [Note tasks](TASKS.md) retain separate persistence, UI and strict raster
  checks; [reference control](NOTE-REFERENCE-CONTROL.md) records the observations.
- Observed: the current 2026-11-06 source-size audit counts 2,935 runtime files across the app, Core,
  Vue SDK, Scene Graph and native shell. Median size is 65 physical lines; 2,762 are at most
  300 lines and 12 exceed 600: one has a reviewed model-contract exception, 11 remain open.
  Counts include canvas, font and graph candidates without accepting their pending native behavior.
  The font and graph dispositions remain open even though both owners are below 600 lines. See [modularity](MODULARITY.md). The five-root count is retained as historical scope. The
  [expanded inventory](RUNTIME-PACKAGES.md) qualifies 3,607 code files across twenty owners,
  including sixteen runtime packages and explicit public/alias helpers. Fourteen code files
  and nine data/declaration files exceed 600; new FIG/schema follow-ups and the translated
  catalog family have explicit cards. Inventory acceptance does not qualify those dispositions.
  The subsequent PEN-adapter extraction adds two focused code files (3,609 total), reduces
  code files above 600 to thirteen, and has bounded owner/browser/native acceptance.
  The tab-ownership candidate adds two more files (3,611 total) and reduces code files
  above 600 to twelve; native tab acceptance remains open. Both original and extracted
  full app shards initially retain the same three failures, allocated to two narrow repair
  tasks. Their [bounded test-control repairs](APP-TEST-CONTROLS.md) subsequently pass the
  full app shard: 1,955 tests across 339 files, without application source changes.
  The FIG text-import candidate adds one owner (3,612 code files; twelve still above 600),
  preserves 761 owner tests and two whole-archive digests, and remains Verify for its retained
  visual-control failure and required live Figma round trip. The raw-payload export candidate
  adds one more owner (3,613 files; twelve still above 600) and retains three complete
  saved-archive controls, 761 owner tests and 26 Core patch tests, with the same open gates.
  The [wire-schema disposition](KIWI-SCHEMA-OWNERSHIP.md) separately executes an owned
  declaration exception with full parser/binary/table checks and 43 Kiwi tests; runtime
  code counts and schema bytes remain unchanged.
- Initially observed: inherited web marks, localized product names, diagnostics labels and a native
  microphone explanation still identify the app as OpenPencil. The original violet Open Pen
  app-icon master already exists.
- Executed afterward: [own-brand asset and diagnostics checks](BRANDING.md) qualify generated
  artwork and selected real support/error paths. Localized copy, native identity and full
  branding acceptance remain open.
- Observed: repeated document changes exhaust WebKit's context budget with eager context loss.
  The [canvas reuse candidate](CANVAS-LIFECYCLE.md) passes browser resource and pixel checks;
  now has bounded browser/native resource acceptance. A later native graph/text batch
  stops at hidden-window guards with a freshly confirmed locked desktop; those criteria
  remain open.
  Four-pane checks also expose toolbar/inspector overlap blocking Close controls; a separate
  bounded task records that defect. Zero-size icon preservation remains unpublished/unaccepted.

## User journey

Open the app, create or recover a design, draw and edit it, use the inspector and menus, ask an
existing authorized Codex or Claude CLI session to make an edit, undo it, save, close and reopen.
Optional libraries, Scripts, browser import, exports, slides and sharing must retain their
dependencies and recover clearly from cancellation or failure. Local editing requires no
vendor account. Hosted inference and other external services retain their own costs and credentials.

## Requirements

| ID     | Required outcome      | Acceptance                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRD-01 | Complete traceability | Every catalog requirement, native surface/menu row, known residual bug, branding task and oversized-module review maps to a specific Trello task. No orphan requirement or unverified completed task.                                                                                                                                                                                                       |
| PRD-02 | Own product identity  | Boot, Home, editor, settings, dialogs, menus, app icons, favicon/PWA assets and app-owned log/support exports identify Open Pen. Explicit license credits, compatible APIs, package IDs and truthful external-provider names are exceptions, documented by purpose.                                                                                                                                         |
| PRD-03 | Maintainable modules  | Preserve existing package ownership and public exports. Separate responsibilities when touching large feature modules; keep typical controls/helpers focused around 50–200 lines and feature modules around 200–300 where useful. Review every runtime file above 600 lines; extract cohesive domains or record a specific declaration/catalog exception. Line counts alone do not prove good architecture. |
| PRD-04 | Behavioral parity     | Every applicable catalog requirement and undocumented native action executes through the real app. Verify history, persistence, cancellation, failure and read-only/mixed states where relevant. A build or unit test alone does not close a user workflow.                                                                                                                                                 |
| PRD-05 | Visual parity         | Compare the same fixture, viewport, scale, theme and control state against actual Pen. Check geometry, borders, radii, type, glyphs and interaction states. Record raw image differences and remaining gaps; do not bless a mismatch by updating a baseline.                                                                                                                                                |
| PRD-06 | Data integrity        | Preserve documents, references, resources, paints, variables, instances and recovery state. Refuse unsupported conversion with a clear diagnosis rather than silently losing data. Use disposable fixtures for destructive-path checks.                                                                                                                                                                     |
| PRD-07 | Native delivery       | Qualify native menu, keyboard, pointer, file-panel, clipboard, Dock and restart paths separately from DOM/API automation. Packaging must preserve profile, credentials, recovery and source compatibility.                                                                                                                                                                                                  |
| PRD-08 | Sustainable tracking  | One observable outcome per execution card, with source/owner, dependencies and a concrete Done check. Broad workstreams are milestones. Limit Building to one active implementation card and Ready to three next actions whose dependencies are accepted or absent.                                                                                                                                         |
| PRD-09 | Honest release gate   | Beta is a usable private release with explicit residual limits and no known data-loss, startup, save/recovery or core-editing blocker. Beta does not mean 100% parity. Full parity requires every applicable visual and functional gate accepted.                                                                                                                                                           |

## Scope and constraints

Retain all original 152 documented requirements and the native screen/menu ledger. The
2026-11-06 refresh adds 12 documentary deltas, for 164 allocated requirements. Qualify each
delta against installed Pen 1.2.22, preserving historical 1.2.21 receipts, or record specific newer-only evidence before changing
implementation scope; do not silently upgrade schema or discard older node data. Split requirements
that cover separate providers, platforms, tools or inspector domains into smaller tasks. Add
newly observed states to the same traceability map before implementing them. Existing evidence
is retained as a starting point; its scope must be checked before reuse.

Use actual `/Applications/Pen.app`, measurements and official documentation as the reference.
Use OpenPencil as the implementation foundation. Do not include proprietary Pen code/assets,
copy credentials, bypass vendor activation or route requests through a paid vendor backend.
Preserve the Open Pen installation and user data during isolated tests. GitHub remains private,
the PR stays draft and Actions stays disabled. [Current fixture delivery](CHECKOUT.md) uses
the private fork endpoint with verified downloads; upstream attribution remains. No public
deployment, release or merge is authorized.

Do not rename compatibility protocols or package imports merely to remove a spelling from
source. Do not rename an external provider as if Open Pen operates it. Do not split cohesive
types/catalogs into arbitrary microfiles or weaken validation to reduce line counts.

## Delivery sequence

The historical [complete audit](BOARD-AUDIT-2026-11-11.md) reconciles 461 execution tasks and 18 real milestone gates; the current 489-task index includes later bounded findings. The installed reference is rechecked as Pen 1.2.22 with unchanged archive identity; the earlier complete outer-file comparison and old 1.2.21 receipts remain dated evidence. All 164 catalog requirements and 22 native rows have allocated acceptance work. That coverage is not full acceptance.

| Horizon          | Outcome                                                         | Evidence checkpoint                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Now              | UI-SPLIT-HEADER: keep resized narrow headers usable             | Real12%splitter resizing at1280×800 leaves about78px per narrow header; both engines/both edges reproduce controls beyond their border before coordinate clicks. Repair the compact header while preserving the published stable gutters and wide layout. LAYOUT-WRAP stays Verify:96structure/transform/IO controls pass, but current Pen flex/native states remain unresolved.                                             |
| Next             | Finish existing-file decision and normal/native/reference gates | Fresh native three-process recovery and real Save As Cancel execute with exact source/backup/path readback. Valid intended-target Save As, native refusal/retry and remaining reference/normal-installed criteria stay open. Twenty unchanged sequential Cancel traces provide negative evidence without diagnosing the original Home-state transition. FILE-07/08 retain normal installed, native and matched Pen criteria. |
| Later            | Complete every remaining domain and parity gate                 | Follow the [milestones](MILESTONES.md) and task dependencies, including FMT-09-DRIFT before IO-13-EXPORT; keep all applicable feature/platform obligations.                                                                                                                                                                                                                                                                  |
| Public readiness | Prepare an exact candidate for an explicit owner decision       | BETA-01 stays private-core qualification. Public readiness separately requires PARITY-ALL and REL trust/package/support artifacts. No public publication is authorized.                                                                                                                                                                                                                                                      |

Keep one Building card and at most three Ready cards. Reuse implemented code and qualified receipts before adding code or duplicating tests. Dates remain uncommitted; review the forecast after the next three accepted cards using observed elapsed work and remaining gates, not task counts.

## Four risks

| Risk        | Current evidence                                                                            | Response and owner                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Value       | Jason needs the familiar Pen workflow and rejects approximations                            | Preserve the requested reference and prioritize visible mismatches. Jason owns changes to the product target.                                     |
| Usability   | Menus, borders and some states still differ                                                 | Pair each visual task with an actual reference capture and a real interaction check. Codex owns evidence.                                         |
| Feasibility | Mature foundation exists; GPU lifecycle, file edges and platform delivery remain incomplete | Fix shared causes, preserve validation and use bounded native fixtures. Codex owns reproduction and implementation.                               |
| Viability   | Private local app; no new hosting budget or public release is authorized                    | Keep local editing independent, reuse existing CLI login, keep Actions off and avoid new paid services. Jason owns spending/deployment decisions. |

## Done evidence and control loop

A task goes Backlog → Ready → Building → Verify → Executed. A dependency may keep it in
Backlog; elapsed time is never approval. Executed requires the task's actual acceptance path,
a named result, commit/artifact and stated limitations. A milestone closes only when all its
applicable child tasks and integration checks are accepted. Historical comments remain history.

Before switching tasks, record current outcome, last verified result, failure/blocker and exact
re-entry action. Review the board at each completed card, after a meaningful interruption and
when new evidence changes scope. Reconcile new requirements before creating more work.
The 1.2.22 supplement adds 16 applicability-first workflow cards and REF-03, reusing existing
language, SVG, note, targeting and save gates. Hosted subscriptions/licensing stay excluded.
Current-reference comparisons record the new version; historical card wording and Executed
receipts preserve their original scope and do not establish newer-reference acceptance.

Track allocated requirements versus total, verified states versus required states, unresolved
data-integrity/stability failures, oversized-module dispositions and remaining own-brand hits.
Coverage and passing-test counts are separate from parity completion. No aggregate parity
percentage is reported until its denominator and acceptance evidence are complete.

## Decisions and unresolved gates

- 2026-11-06 — Jason requests both visible branding/logos and app-owned log names replaced.
- 2026-11-06 — Jason requests explicit modularization goals, a PRD and smaller complete Trello tasks.
- 2026-11-06 — Keep the full parity objective active; preserve broad cards as milestones and
  add traceable execution tasks rather than dropping unfinished work.
- Next review: after the next three accepted cards, a new independent failure or an installed-reference change.
  Codex refreshes counts, evidence, dependencies and forecast confidence from observed results.
- Open: remaining lifecycle/reliability states beyond the bounded canvas criterion, zero-to-positive icon redraw, exact glyph pixels,
  runtime resize and bindings, remaining native screens/menus and non-macOS qualification.
- Open: mixed-script export bounds, local-font picker acceptance and delayed CJK repaint
  acceptance. Exact original-versus-refactor controls reproduce the same failures; the
  [font ownership record](FONT-OWNERSHIP.md) retains scope and separate task links.
- Open: shipping destination, external hosting and release signing/notarization. Jason owns
  those choices when a concrete release candidate is ready; implementation continues meanwhile.

The [tracking index](TRACKING.md), [feature catalog](FEATURES.md), [screen/menu ledger](PARITY-STATE-MATRIX.md)
and [task index](TASKS.md) are the reviewable sources of scope. Full parity is not accepted.

[REF-03](https://trello.com/c/l9y1fz5C/413-ref-03-catalog-installed-pen-1222-update) has bounded Executed inventory evidence at
`cc33e07c9`: exact extracted/outer bytes, versioned findings, independent review and live-board
allocation are published. This does not accept the new workflows, opaque binary semantics
or full current-reference parity. At that inventory handoff, FMT-09-DRIFT was the sole Building task; the Commands causal gate stays unaccepted in Verify.

[TEST-PAGE-NAV](https://trello.com/c/NIjUHghm) has bounded Executed driver evidence at
`3bf51b270`: the real Layers-tab interaction reveals the page row, and all five palette
journeys plus eleven menu controls pass once without retries. [Control record](PAGE-NAVIGATION-CONTROL.md)
preserves the original failures and separate Commands/native/Pen limits.

The [PEN text round-trip record](PEN-TEXT-ROUNDTRIP.md) adds two narrow repair tasks
for first-import metrics and weight serialization. Their own-field and actual-native-Pen
controls do not accept full typography, SVG or schema migration; FMT-09-DRIFT remains the
active broader qualification task.

The [native type control](NATIVE-TEST-TYPE-CONTROL.md) subsequently clears the full native compilation boundary and executes 22 fresh-process native cases. The failed retained-app sequence is separate from this bounded typing repair. MOD-RECT subsequently executes its bounded canonical-type criterion. The complete clean check reaches five duplication groups at its final gate; MOD-DUPES-AUTH subsequently executes its bounded shared-validator criterion; MOD-DUPES-STORIES and the independently discovered A11Y-SIGNIN-CONTRAST subsequently execute their bounded fixture/readability criteria; MOD-DUPES-SCRIPT subsequently executes its bounded rendering-ownership criterion, including one fresh native save/reopen/source-watch case; MOD-DUPES-PAINT subsequently executes its bounded format-ownership criterion; MOD-DUPES-GENERATED subsequently executes its bounded traversal criterion; VERIFY-DUPES-ZERO subsequently executes its strict exit-policy criterion with an entire clean combined check. STAB-NATIVE-SEQUENCE remains unaccepted; full native retained-session behavior remains unaccepted. The five Note qualification cards and full design/functionality parity remain open; current scheduling is in TASKS.md and the live board.

The subsequent [engine contract controls](ENGINE-TEST-CONTROLS.md) execute CLI
manifest refusal without prose coupling, exact unit-file selection and renderer
Surface disposal assertions. Complete CLI and render shards pass their bounded
criteria; the historical full-unit failure remains retained. Native retained
behavior and strict Note pixels still require acceptance. TASKS.md and the live
board retain the full terminal dependency set.

The [app acceptance controls](APP-TEST-CONTROLS.md) preserve original/current
failures and execute the shader request, startup-toast and library publication
repairs. Source `18a464656` retains stored revision integrity while excluding
runtime text measurement from publishable edits; source save/reopen and offline
instance workflows pass in Chromium and WebKit. The complete app shard passes
1,964 cases. The [native retained-session record](NATIVE-RETAINED-SEQUENCE.md)
keeps intermittent menu-focus/window loss open. Full unit, strict Note raster,
exact remaining visual states and full Pen parity are not accepted by these
bounded controls. Current scheduling is in TASKS.md and the live board.

The [native driver control](NATIVE-DRIVER-MULTIWEBVIEW.md) adds one narrow repair
task after actual original-image discovery checks: a browser child makes the
embedded driver omit the still-live editor. STAB-NATIVE-DRIVER-CHILD is bounded Executed;
the retained-session parent remains Verify. This is not a product crash finding or
acceptance of the separate intermittent menu-focus behavior. The complete task
index now has 436 execution tasks, with all 435 others required by PARITY-ALL.

The paired native-test driver/companion candidate builds and executes two durable
macOS child/discovery/true-close controls. The broader retained run still fails
seven of 14 specs (18 passing cases, nine failures), starting with editor readiness
after reload. No NoWindow response appears. WebDriver Enter and trusted OS input
remain separate open gates. See NATIVE-DRIVER-MULTIWEBVIEW.md for exact evidence.

Earlier scheduling after source `954f68b8a` passes the complete clean check:
driver repair Verify; broader native-sequence parent Building. The current
reference remains actual Pen 1.2.22 with historical 1.2.21 evidence preserved.

Current native qualification: runner source `a4f9462b4` isolates the driver port
and blocks fixtures unless the process returns the exact run directory and MCP
port. The rebuilt baseline executes the standard retained 15-spec/28-case
sequence in 58 seconds without manual Raise, weakened assertions or deadlines.
Its exact source tree passes the complete clean quality gate with zero clones.
A same-payload owned bundle separately executes native Return navigation and
More-menu zoom feedback, bound to the live process and run route. The macOS
STAB-NATIVE-HOST scope is Executed; STAB-NATIVE-SEQUENCE stays Verify because
not every historical intermittent cause is classified. Earlier failed, rejected
and narrower controls remain evidence. The sole Building task is
[STAB-BROWSER-BACKDROP-FIXED](https://trello.com/c/j6yjFgIw), split from SURF-BROWSER
for exact fractional fixed-device geometry. The complete index has 440 execution
rows and 437 terminal dependencies. Strict Note raster, full native reliability,
remaining platforms and design/functionality requirements stay open.

Latest geometry qualification: `d5b8cc1b1` passes the complete clean quality gate,
11 focused unit cases, paired native dimension regressions at Phone and Tablet,
and four unchanged full capture controls. Its earlier mixed 16-spec run passes 12 specs
and 25 cases, with four specs/five cases failing in history availability, focus
and reload-address paths. These remain on the retained-sequence parent. Actual
Pen menu behavior is observed on the controlled local page, but the viewport is
not matched, so exact visual acceptance remains open. The numerical implementation
and the remaining limits are recorded in
[BROWSER-FIXED-BACKDROP.md](BROWSER-FIXED-BACKDROP.md).

Subsequently, the unchanged canonical 16-spec sequence at `5ef81a295` passes all
30 cases in 66 reported seconds. The historical failure causes remain unknown,
so STAB-NATIVE-SEQUENCE stays Verify. CUA cannot capture the actual Pen window
in the follow-up; matched-reference visual acceptance remains open. These
controls make no product or fixture repair and do not accept full native parity.

The subsequent [Note Fill follow-up](NOTE-FILL.md) implements measured fixed-parent
and root fallback behavior, retains authored size separately from intrinsic text height,
and separates layout/control responsibilities. Its browser and native acceptance paths
cover field editing, history, save/reopen and read-only refusal. The full Note feature
remains open for exact reference pixels, Hug-parent qualification and unsupported linked
replacement structures; these bounded paths do not change the terminal parity criterion.

## Current delivery sequence — 2026-11-12

Existing-file backup creation, browser process-loss/decision controls and the persistent Discard error repair remain accepted only on their bounded criteria. Their original failures are preserved in [recovery ownership](RECOVERY-OWNERS.md). Full FILE-07/08 acceptance remains open.

MOD-05 publishes at `c199e42e5`: nine strict renderer owners preserve public exports, 110 sorted descriptors, twenty recorded-oracle PNGs and actual native twelve-document/P3/resize behavior. [The renderer report](RENDERER-OWNERS.md) retains the original resource/P3 failures and links the subsequent bounded resource-fixture qualification; strict P3 remains open.

TEST-RECOVERY-NATIVE-PROFILE publishes at `1a15b7763`: a fresh final host completes interruption, Restore, explicit Save, clean third-process reopening and Duplicate/Undo on one owned persistent profile. Actual Pen 1.2.22 opens the recovered file, measures both 64 × 64 layers and saves a separate copy whose names/geometry/fills Open Pen's public reader preserves. This does not accept normal installed-app recovery, native chooser/permission/read-only paths, automatic debounce, trusted physical input or matched Pen recovery states.

TEST-RECOVERY-FIXTURE-LIFECYCLE publishes at `9a676814d`: twenty Cancel repetitions and the complete twenty-case recovery cohort pass with unchanged assertions and separate existing setup/test budgets. This test-lifetime qualification does not classify or repair the older Home-state observation; its investigation resumes below. TEST-GPU-DARK-FIXTURE publishes at `46a7e4f73`, with 24 resource/helper/theme controls and byte-identical original snapshots. TEST-P3-EXACT publishes at `2debd3365`: historical WebKit reproduces original PNGs exactly, while current/historical versioned controls pass 12/six cases with snapshot writing disabled. TEST-FIG-PAGE-PANEL is bounded Executed at d646976ce for the independently reproduced fixture failure. FILE-EXTERNAL-DIRTY is bounded Executed at ae1736779 after 34 affected browser cases, nine post-move stable cases, strict 21 owners, full static zero clones and rebuilt isolated-native three-process recovery. FILE-RECOVERY-CANCEL is the sole Building card for the original unclassified Home-state timeout; passing repeats are not repair.

The current 503-card index comprises 485 execution tasks and 18 milestones, with 484 other-terminal dependencies, complete primary ownership and all 164 catalog requirements allocated. Those counts are not parity percentages. Full static passes with zero clones; full unit execution retains the unchanged Note failure alongside 10,172 passes and one platform skip. The earlier native-panel attempt stops at the visibility guard while locked. Desktop access has returned: actual Pen retains original clean/dirty layers after owned external replacements; no conflict dialog is observed in that bounded check. The changed shared-I/O runtime has rebuilt isolated-native qualification. Native panel Restore/Save As cancellation/success and automatic backup after real Cmd-D execute on the separate bundle; the Mac locks before read-only Save/refusal/retry, and post-Cancel internal source-path readback remains open. Owned permissions/state restore before teardown; the normal app remains separate. The normal installed app and protected work remain unchanged. Full design/functionality parity and public beta remain open.
