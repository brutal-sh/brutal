# Agent command cards and Codex skill context

The 2026-11-11 screenshots report two separate problems. The square eventually appears,
so the skill-budget warning does not establish a canvas failure. Long shell-command labels
also escape their tool-card border and push the disclosure chevron out of view.

## Command-card containment

The shared tool-card name used `shrink-0`. A shell command can be much longer than a tool
name, so the label cannot fit beside the status, summary and chevron. The owning theme now
allows shrinking and applies an ellipsis. Typography stays unchanged. The existing tooltip
shows the full clipped title; expanding still exposes the input and output.

The long-command and grouped-command stories use synthetic paths. A diagnostic run retains
the original 320px failure: the title extends 206.6 CSS pixels beyond its button. Candidate
240/320/480px dark/light cases retain the 13px font, stay inside the card, reveal the full hover
title and expose command input through keyboard expansion. Fourteen existing/new story
states pass render/play/axe checks. These checks do not establish installed delivery or full
Agent/Pen visual parity.

## Codex skill-catalog scope

Codex ACP inherits the user's installed skills. The local catalog contains 1,263 entries and
about 444,658 name/description characters. A real read-only turn through ACP 2.5.0 and its
bundled Codex 0.165.0 reproduces the overflow warning with 814 entries omitted.

Open Pen's Codex child receives `CODEX_CONFIG` with `skills.include_instructions=false`.
The native command retains all other inherited JSON keys, including skill overrides; invalid
objects fail without echoing their content. Other ACP agents retain their environment.
Global configuration, login, installed skills, permissions and the user's instructions are
not edited. The adapter's [runtime options](https://github.com/zed-industries/codex-acp#runtime-options)
document the process-local configuration mechanism.

This suppresses **all automatic skill-catalog injection for that child**, including repository
and plugin catalogs. It does not preserve automatic global skill selection. Explicit skill
invocation remains supported, and Open Pen already inlines a skill the user runs in its prompt.
Codex's [version-pinned extension](https://github.com/openai/codex/blob/rust-v0.165.0/codex-rs/ext/skills/src/extension.rs)
handles explicit skill mentions separately from automatic catalog instructions.

The scoped real read-only ACP turn returns READY without the warning or tool calls.
A separate discovery probe retains all 1,263 enabled entries; discovery alone does not prove
automatic selection. Three Rust merge/refusal cases and eight process cases cover settings
retention, safe refusal, Windows dispatch, other agents, streams and close/error buffering.

## Remaining acceptance

A guarded native-test turn through the existing CLI login creates exactly one 160×100 red
rectangle at (100,100), verifies it, then document Undo removes it. Its transcript contains no
skill-budget warning. A separate real turn follows instructions composed by Open Pen's actual
`appendSkillContext` helper and returns the synthetic skill marker with zero tool calls.
The native WebView renders the long title with a 233px clipped label, 493px natural text width,
a visible chevron and the original 13px font.

The normal optimized app is installed and its signature verified. Its binary SHA-256 is
`79dd048532dbe97ae74c904b226a840371827cd3e2f393b7fa872c53e9287aa0`.
The actual app launches and retains the saved workspace in Recents. Earlier attempts meet a
protected prompt-app restriction and a locked Mac; neither gate is bypassed. After the user
reports the Mac open, CUA reopens the dated saved workspace and selects the original “draw a
square” transcript from conversation history. Its Rg and Cat titles end with an ellipsis inside
their bordered cards; status circles and disclosure chevrons remain visible. Expanding Rg
shows the complete original command in Input; collapsing restores containment. The original
charcoal square and historical warning remain. No permission or recovery prompt is visible
in this readback, and no permission setting changes. The saved archived session explicitly
cannot resume here; new chat remains available. This does not accept every long-title status
combination or the complete Agent surface.
Historical warning messages remain in chat history; the scoped catalog applies to new sessions.

Full repository `bun run check` passes, including literal zero duplicate clones. The bounded
AI/ACP/skills selection passes 181 tests/427 assertions; Rust configuration tests pass all three
cases. The new command is main-editor-only; no filesystem/shell capabilities are expanded.
Readonly review finds no concrete defect. All 203 currently accessible admin repositories have
Actions disabled; two additionally discovered admin repos are disabled with zero active/queued
runs. Source/full product parity remains separate.

The test-only WebView/MCP routing guards remain enabled; user documents and credentials are
not test fixtures. Private receipts live in `local-evidence/skills-budget-2026-11-11/`.

Tracking: [tool titles](https://trello.com/c/oF2pQf45),
[Codex context](https://trello.com/c/l0cEsoYm). The parent Skills and Agent-surface tasks remain open.

## Remaining-state qualification — 2026-11-12

The current Chromium/WebKit display matrix passes 76 cases without retries or skips: six
long-title states at 240/480px in dark/light themes, plus all seven preexisting stories in
both themes and engines. Pending, streaming source, error, individual Undone and grouped
Undone states retain contained header children, semantic status and the applicable disclosure
control. Clipped names retain the original 13px font, full hover title and keyboard-accessible
input. Pending calls without source intentionally remain disabled; this policy is unchanged.
The nine runtime component, theme, token and display-helper files remain byte-identical to
the original published containment fix. No new production styling or behavior is introduced.

Two further actual-app journeys execute production Core render through the real chat
transport with a controlled model response. A test-only stream alias supplies the long visible
name, retaining the call ID and all input/output/metadata; it runs no shell command and never
injects an Undone marker. Canvas keyboard Undo removes the real edit and the individual card
then shows Undone; Redo restores the edit and clears that marker. Both engines retain header
containment and inspectable input. This closes the earlier review gap between a supplied story
marker and whole-reply reversion. Separate review checks raw results, embedded trace source,
both Undo images and the fixture boundary, finding no actionable defect. A formatter-only
line wrap is recorded separately from the executed helper hash.

These controls supplement the dated native and normal-installed readbacks above; they do not
represent fresh native status-matrix or live-provider execution. The bounded tool-title task
can close on that combined evidence. The parent Agent surface and full parity stay open.
Current private receipts: `local-evidence/chat-title-states-2026-11-12/` and
`local-evidence/chat-title-history-2026-11-12/`. Initial ambiguous-locator failures and the empty
focused selection remain retained as test-probe failures, not hidden passing runs.

The pre-update unsaved workspace is saved as a dated local `.fig` copy (31,645 bytes; ZIP
integrity checked). Chat storage is backed up separately with all 45 files across three app-profile locations
have private backups; none change during bundle replacement. Both historical recovery blobs
remain byte-identical after launch. The previous app bundle is retained for rollback. No
Restore/Discard action, Keychain export or global Codex configuration change is performed.
