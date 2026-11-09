# Menu catalog ownership candidate

Updated: 2026-11-09. [MOD-13](https://trello.com/c/dqmI6X9G) remains Verify.
Source candidate: `c6c86dae5` (published to the private draft PR with exact blob/head readback).
This is a declaration split, not current Pen design or native-delivery acceptance.

The original 621-line `src/app/shell/menu/schema.ts` becomes 106 physical lines,
retaining the shared types, ordered schema assembly, Help and application entries.
Three cohesive catalogs own file/settings (118 lines), view preferences (120), and
editing/selection/text/arrangement (296). Nonblank/noncomment counts are 85,113,118,292.
The catalog back-imports are type-only and erase from runtime JavaScript. Existing
callers/public names remain unchanged; no forwarding-only shim or generic factory is added.
Settings retains one declaration, with the original File-item spread/application-item reference.

Executed controls: complete before/after runtime projections are byte-identical for seven
groups, 143 unique commands,four application items, shortcut/native projections and both native
artifact strings. Regeneration leaves `desktop/generated/{menu,app-menu}.json` unchanged.
All 24 menu/action/generator-owner tests pass with 86 assertions; the smaller original
11-test/32-assertion control passes before and after. The normal build, source/Vue/test/tool
types and architecture checks pass. An independent reviewer repeats the runtime comparison,
checks original/current exports, erased imports, settings semantics and actual artifact bytes.

Browser evidence remains mixed. Before: 13 pass, one failed, two unrun. After: eight pass, two
failed, six unrun. Both fail while the page-navigation driver clicks a row hidden in Layers.
Only the after run additionally stalls on an unstable/detached Commands submenu before its
Move-to-page assertion. Neither regression nor pre-existing flake is established for that
second failure. No timeout,retry,skip,baseline or global error filter is changed.

The two bounded blockers are [TEST-PAGE-NAV](https://trello.com/c/NIjUHghm) and
[STAB-COMMAND-MENU](https://trello.com/c/6WTOPIdh), now explicit MOD-13 dependencies.
The independent mixed WebKit reliability gate remains separate. Raw before/after results,
original source, failed contexts and check logs are retained in ignored
`local-evidence/menu-schema-2026-11-09/`.

Native JSON equality does not qualify actual native input, persistence, current Pen menu
membership or geometry. The installed reference is now 1.2.22; its [update inventory](pen-feature-reference/update-1.2.22-2026-11-09.md)
separates SVG/menu changes from this behavior-preserving refactor. Unrelated icon WIP remains
outside this unit. The full combined gate, native typing, clean delivery and full parity stay open.
