# Open Pen product requirements

Decision owner: Jason Poindexter. Implementation and evidence owner: Codex.
Updated: 2026-11-09. Status: active; full design and functionality parity is not achieved.

## Product outcome

Open Pen is an independent local design app built on the MIT OpenPencil foundation.
Jason should be able to use the workflows available in installed Pen 1.2.22 with the same
interaction and visual behavior, without editor subscriptions or license activation.
Open Pen uses its own name and visual identity. Required engine and third-party attribution
remain accessible. This identity difference is intentional; it does not waive layout or behavior parity.

The active parity goal remains intact. This PRD adds explicit requirements for maintainable
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
delta against installed Pen 1.2.21 or record specific newer-only evidence before changing
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

The fresh board contains 414 bounded execution tasks and 17 milestones. Every one of the
164 catalog requirements and 22 native ledger rows is allocated; allocation is not acceptance.
[Task index](TASKS.md) records the live-board states and dependencies.

| Horizon               | Outcome                                                                                                      | Evidence checkpoint                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Now | Qualify the 2.22 reader prerequisite (FMT-09-DRIFT) | The actual Pen-saved SVG fixture fails at `/version`; admit unchanged supported shapes with explicit unsupported-data and future-version guards, then execute the real import path. |
| Next | Continue SVG export parity (IO-13-EXPORT, Verify) | Actual reference exports text paths and a ZIP for multiple selections; current app exports live text and a combined SVG. Retain these concrete gaps and the format dependency. |
| Then                  | Stabilize document switching and finish unaccepted icon, module and feature/screen tasks in dependency order | Each card has relevant owner tests, visual/native checks and a commit/evidence link before Executed; dependent renderer/input work waits for STAB-GPU. |
| Release qualification | Deliver private beta, then complete the full parity gate                                                     | Clean normal build, install/restart/recovery and core journey; declared beta limitations. Later, no required parity state remains unaccepted.          |

No fixed completion date is claimed. Re-estimate after the stability and branding tasks using
observed task throughput and the remaining acceptance work, including native/platform checks.

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
- Next review: after the portal client-label journeys and menu-schema modularization.
  Codex will update counts, evidence and dependencies from fresh results.
- Open: remaining lifecycle/reliability states beyond the bounded canvas criterion, zero-to-positive icon redraw, exact glyph pixels,
  runtime resize and bindings, remaining native screens/menus and non-macOS qualification.
- Open: mixed-script export bounds, local-font picker acceptance and delayed CJK repaint
  acceptance. Exact original-versus-refactor controls reproduce the same failures; the
  [font ownership record](FONT-OWNERSHIP.md) retains scope and separate task links.
- Open: shipping destination, external hosting and release signing/notarization. Jason owns
  those choices when a concrete release candidate is ready; implementation continues meanwhile.

The [tracking index](TRACKING.md), [feature catalog](FEATURES.md), [screen/menu ledger](PARITY-STATE-MATRIX.md)
and [task index](TASKS.md) are the reviewable sources of scope. The active goal is not complete.

[REF-03](https://trello.com/c/l9y1fz5C/413-ref-03-catalog-installed-pen-1222-update) has bounded Executed inventory evidence at
`cc33e07c9`: exact extracted/outer bytes, versioned findings, independent review and live-board
allocation are published. This does not accept the new workflows, opaque binary semantics
or full current-reference parity. FMT-09-DRIFT is the sole Building task; the Commands causal gate stays unaccepted in Verify.

[TEST-PAGE-NAV](https://trello.com/c/NIjUHghm) has bounded Executed driver evidence at
`3bf51b270`: the real Layers-tab interaction reveals the page row, and all five palette
journeys plus eleven menu controls pass once without retries. [Control record](PAGE-NAVIGATION-CONTROL.md)
preserves the original failures and separate Commands/native/Pen limits.

The [PEN text round-trip record](PEN-TEXT-ROUNDTRIP.md) adds two narrow repair tasks
for first-import metrics and weight serialization. Their own-field and actual-native-Pen
controls do not accept full typography, SVG or schema migration; FMT-09-DRIFT remains the
active broader qualification task.
