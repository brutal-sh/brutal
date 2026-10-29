# Open Pen

Owner: Jason. Started 2026-10-29. Target: independent local-first alternative to Pen, with feature parity except subscription/licensing machinery. User explicitly requires continued work until parity, not a starter-editor completion claim.

## Constraints
- Original implementation or appropriately licensed open-source dependencies; no proprietary code/assets, bypasses, credentials, or service impersonation.
- Private GitHub repository and private Trello board track all work.
- Keep /Applications/Pen.app and its active design task unchanged.
- Improve the stack where evidence supports it; reuse existing mature editor capabilities before building new ones.
- Core editing needs no subscription. External hosted AI may still cost money; local models are an independent option.
- User selected existing Codex or Claude CLI login for real AI testing. Do not copy credentials or assume permission for separate paid provider accounts.

## Done evidence
Every row in docs/FEATURES.md has an implemented equivalent and an executed behavioral acceptance check, or an explicitly user-approved exclusion. A build, mock, static inspection, roadmap, or one working slice does not establish parity.

## First executable slice
Create shapes and text → edit and arrange → undo/redo → save → reopen → verify identical content → export SVG. Reject unsupported/invalid files without overwriting current work. Then close the remaining feature matrix in dependency order.

## Risks and evidence
Observed installed Pen 1.2.21 is an ARM64 Electron application. Hopper launcher inspection and ASAR inventory are static evidence. Public docs report broad capabilities, not actual verified parity. Demand/market not relevant to this personal tool decision. Usability, compatibility, performance and provider support need runtime evidence. Native packaging and cross-application file fidelity remain unverified.
