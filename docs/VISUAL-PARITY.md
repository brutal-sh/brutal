# Pen.app parity acceptance

The target is `/Applications/Pen.app` 1.2.21. The user explicitly requires 1:1 **functionality and design**, excluding subscription/licensing gates. Functional substitutes and a similar-looking editor do not satisfy that criterion. Independent implementation and Open Pen identification remain; no proprietary implementation or artwork is copied into this repository.

Reference: the user-supplied screenshot dated 2026-10-29 23:59:28, retained privately in ignored `local-evidence/pen-reference-user.png`, and passive inspection of the installed app. The user's open Pen document is active; inspection must preserve it.

## Current state

The initial OpenPencil shell failed the visual requirement. The replacement shell now uses a left Agent panel with a separate composer, mode navigation, a vertical tool rail, rounded document/action/zoom controls and a selection inspector overlay. These are implemented controls, not a static mockup. Exact state-by-state design acceptance is still open.

The acceptance unit is a **state + action + result**. A source implementation, build, unit test, screenshot or adjacent check alone cannot close it. Each row requires a reference observation, the corresponding implementation state, a visual comparison at matched viewport/scale, and an executed interaction.

| State/workflow | Design acceptance | Function acceptance |
| --- | --- | --- |
| Agent, history and separate composer | Open: typography, dimensions, sessions/model controls | Navigation executed; native Codex submission failed before creating a node; diagnosis active |
| Layers, selection and inspector | Open: exact tree and property layout | Draw/select, inspector preserving canvas bounds, duplicate/undo executed |
| Tool rail and flyouts | Open: exact order, all actions, active/hover/focus states | Vertical keyboard navigation and shape menu viewport bounds executed; latest order and controls rerun passed |
| Document tabs and menus | Open: exact document menu states | New/close tabs executed; new menu route and Save/Save As rerun passed; twenty-tab overflow and both inactive-close paths passed on build4 |
| Slides | Open: thumbnails, slide management and presentation design | Raster slide navigation executed; full management parity open |
| Components/libraries | Open | Existing engine capability; complete `.pen` slots/imported library compatibility remains open |
| Canvas/navigation | Open: default palette, rulers and zoom behavior | Drawing, directional zoom, 100% reset and undo executed; cross-app gestures pending |
| Embedded browser, desktop/phone | Open: right dock proportions and toolbar | Two clean native tests passed main-window child bounds/resize, navigation, captured pixels, placement/Undo, close and IPC denial; exact dock styling still open |
| File interoperability | Open: file/error dialogs | Supported `.pen` import/edit/save/export tests executed; unsupported constructs explicitly refuse rather than lose data |
| AI-generated edits | Open: streaming/tool states and permissions | Existing Codex login generated a real `.pen` document and rendered; native ACP submission produced Retry and zero nodes; diagnosis active |
| Menus, dialogs, empty/loading/error states | Open | Requires dedicated state inventory and executed checks |

## Preserved scope

Outcome: independent Pen equivalent without app subscription/licensing gates.

Now: close the visible shell mismatch and execute native embedded browser and existing-login agent workflows.

Next: compare editor states, then implement remaining `.pen` slots/libraries, persistent scripts, browser reproduction, custom graphics, sharing snapshots and background removal.

Later: full cross-app document/interaction fixtures and integrated release acceptance.

Re-entry: inspect this ledger, `docs/ACCEPTANCE.md`, current Git status and running agents before editing. Preserve the user's later correction over the original foundation plan.

Done: all feature/state entries have executed functional evidence and matched visual evidence, with remaining differences confined to explicitly excluded subscription/licensing gates. This condition has **not** been reached.

## Direct design extraction — 2026-10-30

The user corrected oversized circles and missing borders, and explicitly requested extraction from the installed app. Selected packaged design declarations were read using the existing REA ASAR inventory. The private stylesheet and source digest remain in ignored `local-evidence/pen-design-extraction/`; only measured values are recorded in `pen-design-tokens.json`.

Confirmed packaged values: tool buttons28px (previously32), icons16px, gaps4px, inner padding4px, rail radius20px, toolbutton radius16px, 1px island rim `#a0b2cc21`, no island shadow. Menu body12px and shortcut11px, minimumwidth128px, radius6px. Dark canvas`#18181b` and island`#27272a`. The rail uses a layout border and3px padding to reproduce the original inset rim plus4px padding without increasing its36px outside width.

These declarations are source evidence; completed rendering/state comparison is still required. REA's attempted passive native observation timed out at45seconds and is not treated as proof.
