# Pen.app parity acceptance

The target is `/Applications/Pen.app` 1.2.21. The user explicitly requires 1:1 **functionality and design**, excluding subscription/licensing gates. Functional substitutes and a similar-looking editor do not satisfy that criterion. Independent implementation and Open Pen identification remain; no proprietary implementation or artwork is copied into this repository.

Reference: the user-supplied screenshot dated 2026-10-29 23:59:28, retained privately in ignored `local-evidence/pen-reference-user.png`, and passive inspection of the installed app. The user's open Pen document is active; inspection must preserve it.

## Current state

The initial OpenPencil shell failed the visual requirement. The replacement shell now uses a left Agent panel with a separate composer, mode navigation, a vertical tool rail, rounded document/action/zoom controls and a selection inspector overlay. These are implemented controls, not a static mockup. Exact state-by-state design acceptance is still open.

The acceptance unit is a **state + action + result**. A source implementation, build, unit test, screenshot or adjacent check alone cannot close it. Each row requires a reference observation, the corresponding implementation state, a visual comparison at matched viewport/scale, and an executed interaction.

| State/workflow | Design acceptance | Function acceptance |
| --- | --- | --- |
| Agent, history and separate composer | Open: typography, dimensions, sessions/model controls | Navigation executed; native login chat-to-canvas pending |
| Layers, selection and inspector | Open: exact tree and property layout | Draw/select, inspector preserving canvas bounds, duplicate/undo executed |
| Tool rail and flyouts | Open: exact order, all actions, active/hover/focus states | Vertical keyboard navigation and shape menu viewport bounds executed; latest order needs rerun |
| Document tabs and menus | Open: exact document menu states | New/close tabs executed; new menu route and Save/Save As rerun pending |
| Slides | Open: thumbnails, slide management and presentation design | Raster slide navigation executed; full management parity open |
| Components/libraries | Open | Existing engine capability; complete `.pen` slots/imported library compatibility remains open |
| Canvas/navigation | Open: default palette, rulers and zoom behavior | Drawing, directional zoom, 100% reset and undo executed; cross-app gestures pending |
| Embedded browser, desktop/phone | Open: right dock proportions and toolbar | Separate native preview navigation/capture passed; embedding implementation and rerun in progress |
| File interoperability | Open: file/error dialogs | Supported `.pen` import/edit/save/export tests executed; unsupported constructs explicitly refuse rather than lose data |
| AI-generated edits | Open: streaming/tool states and permissions | Existing Codex login generated a real `.pen` document and rendered; native ACP editor operation pending |
| Menus, dialogs, empty/loading/error states | Open | Requires dedicated state inventory and executed checks |

## Preserved scope

Outcome: independent Pen equivalent without app subscription/licensing gates.

Now: close the visible shell mismatch and execute native embedded browser and existing-login agent workflows.

Next: compare editor states, then implement remaining `.pen` slots/libraries, persistent scripts, browser reproduction, custom graphics, sharing snapshots and background removal.

Later: full cross-app document/interaction fixtures and integrated release acceptance.

Re-entry: inspect this ledger, `docs/ACCEPTANCE.md`, current Git status and running agents before editing. Preserve the user's later correction over the original foundation plan.

Done: all feature/state entries have executed functional evidence and matched visual evidence, with remaining differences confined to explicitly excluded subscription/licensing gates. This condition has **not** been reached.
