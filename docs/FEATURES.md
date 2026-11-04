# Pen feature documentation

The complete current documentation inventory is [the Pen feature catalog](pen-feature-reference/README.md): 152 requirements across all 23 official chapter pages plus the landing page, retrieved 2026-10-30.

- [Feature requirements and observable acceptance](pen-feature-reference/README.md)
- [Structured requirements and implementation evidence](pen-feature-reference/features.json)
- [All source pages, 240 headings and snapshot hashes](pen-feature-reference/sources.json)
- [89 documented shortcut bindings](pen-feature-reference/shortcuts.md)
- [CLI options and public MCP contracts](pen-feature-reference/command-contract.md)
- [Serialized field families](pen-feature-reference/format-fields.md)
- [Named icon controls, export evidence and remaining gaps](ICON-PARITY.md)

The reference is [official Pen documentation](https://docs.pen.dev/) together with the running `/Applications/Pen.app` 1.2.21. OpenPencil is the MIT implementation base. Its upstream feature descriptions and tests do not determine parity.

The inventory distinguishes documented behavior from executed acceptance. No complete requirement is accepted yet; partial evidence links identify narrower journeys already exercised. See [the native screen/menu ledger](PARITY-STATE-MATRIX.md), [execution log](ACCEPTANCE.md), [menu comparison](MENU-PARITY.md) and [reference provenance](PEN-REFERENCE.md).

Subscriptions, vendor activation and vendor account gates are outside the target. Open Pen still needs independent working equivalents for applicable provider, sharing and workspace capabilities. Third-party credentials/costs are separate from editor licensing.

Documentation coverage does not establish full product coverage: undocumented menus, platform differences, error states and dynamic layouts still require comparison against the installed application.

The ongoing [snapshot export acceptance](SNAPSHOT-PARITY.md) adds observed native behavior beyond the documentation catalog and distinguishes model, browser and native delivered-state evidence.

The [File-guide acceptance](GUIDES-PARITY.md) records the actual code-export dialog, Figma information toast and CLI documentation action, with independent Open Pen routes and explicit client/visual/CLI gaps.

The [Script acceptance](SCRIPT-PARITY.md) records scalar input, worker, history, native source-watch and first-save/reopen evidence. Component references, variables/themes, gallery, JS snapshot dependencies, headless generation and exact remaining visual states stay open.
