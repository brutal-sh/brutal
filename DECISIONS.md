# Decisions

## 2026-10-29 — Independent implementation
Use public behavior/specifications and appropriately licensed open-source code. Installed binaries are inspection targets only. Keep raw evidence local and excluded from GitHub.

## 2026-10-29 — Full parity terminal condition
User clarified that a first slice is not the stopping point. Track all known features and unknowns; continue authorized units until parity or a genuine blocker requiring input/external state.

## 2026-10-29 — Evaluate reuse before locking stack
A React/TypeScript/SVG proof slice was proposed, but full parity requires evaluating existing mature open-source editors first. Do not lock a small custom renderer before this comparison.

## 2026-10-29 — Reuse OpenPencil
Select the MIT OpenPencil codebase at 24461adec7073312d460d76f08f069de18e4fb78: Vue 3, Skia CanvasKit, Yoga, Tauri v2, existing file codecs, AI/MCP and tests. This replaces the proposed custom SVG engine. Preserve upstream history and legal notices. Existing code is not evidence of parity; validate and close remaining .pen-specific gaps. Optional upstream Cloud excluded from the local build through its supported build flag. Upstream workflows disabled in this new private GitHub repository to avoid accidental publishing/deployment.
