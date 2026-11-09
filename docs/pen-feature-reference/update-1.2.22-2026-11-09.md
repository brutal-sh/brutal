# Installed Pen 1.2.22 update catalog

Updated: 2026-11-09. Source: actual `/Applications/Pen.app`, inspected/extracted with REA, plus read-only native UI observations. The preserved 1.2.21 reference is unchanged. This catalog accepts neither full semantic completeness nor Open Pen feature parity.

## Verified extraction

Installed plist and running About both report **1.2.22**. ASAR SHA-256:
`1c6d0129dc9dda08f2f0da5dde23aa8cc52df11858fec1e35cd3bd2647bcf407`.
REA extraction evidence: `ev_91ee022d75cee8e844941c6805f837db4a1381c642f4161e6c7374c6aa4af617`.

All 20,856 copied archive files (857,386,333 bytes) and all 20,800 preserved old archive files rehash correctly, independently repeated. Exact path delta: 59 added, 120 changed at the same path, three removed, 20,677 unchanged. That is 182 changed path records including removals, not 182 new features. The [complete path ledger](update-1.2.22-files-2026-11-09.json) retains old/new hashes and explicit domain/residual dispositions for every changed path. Internal `node_modules/@ha/*` owners are included; the raw inventory’s `firstParty` field is only an out/package path heuristic.

The extraction completed but its response exceeded REA’s 10 MiB MCP delivery budget. Its retained complete Evidence was exported to disk; extraction was not repeated. 38 integrity mismatches are preserved as observed-untrusted. Both versions have the same 38 mismatch paths, with all 38 observed hashes changed. Signing/packaging cause and executable equivalence are unproven; copied provider binaries were not executed.

All 432 current regular files outside the archive are also copied and hash-verified, with 14 symlinks recorded without following them. The [bundle ledger](update-1.2.22-bundle-2026-11-09.json) compares the 181 outer files retained previously: 136 unchanged, 45 changed, and 251 current files without retained old bytes. Those 251 are unbaselined, not 251 new features/files. Unpacked mirrors overlap the archive extraction, so the two inventories must not be summed as unique app content. Copies total 944,945,261 bytes outside the archive; the entire reference payload has 21,288 regular-file copies.

## Additions and changed surfaces

The [machine-readable catalog](update-1.2.22-2026-11-09.json) has 31 bounded findings, exact versioned source hashes/lines (renderer columns where needed), card allocations and remaining acceptance. New labels, declarations, guide documents, actual UI availability and service-specific changes are distinguished.

| Finding | Change | Evidence class / task allocation |
| --- | --- | --- |
| UPD22-01 | Four explicit interface locales plus System | UI-observed; [UI-10-LANGUAGE](https://trello.com/c/2nCgZnj8/369-ui-10-language-match-language-selection-and-system-fallback). |
| UPD22-02 | SVG in native export and execute Export | UI-observed; [IO-13-EXPORT](https://trello.com/c/6XfIejZR/376-io-13-export-match-svg-file-and-multi-selection-output), [IO-13-CLIPBOARD](https://trello.com/c/EqlS8NXr/377-io-13-clipboard-deliver-selection-svg-through-the-native-clipboard), [CLI-04-SVG](https://trello.com/c/xmz1m9jf/378-cli-04-svg-export-explicit-svg-from-the-independent-cli). |
| UPD22-03 | Removed native design-to-code guide entry | changed-menu; [MENU-FILE](https://trello.com/c/WGWi4KGG/134-menu-file-file-and-recent-export-submenus-menu-parity). |
| UPD22-04 | Schema 2.22 sticky-note shape | changed-serialization; [FMT-09-DRIFT](https://trello.com/c/eZXKvRhb/386-fmt-09-drift-qualify-current-schema-changes-against-pinned221), [DRAW-16-AUTHOR](https://trello.com/c/Tg89QoKD/370-draw-16-author-match-note-creation-text-and-color-editing). |
| UPD22-05 | Sticky-note Send to Agent surface | changed-renderer; [DRAW-16-SEND](https://trello.com/c/NFU4Am1a/371-draw-16-send-send-selected-note-text-to-the-intended-agent), [SURF-TOOLS-STICKY](https://trello.com/c/pTyOIc5U/122-surf-tools-sticky-sticky-surface-visual-and-interaction-states). |
| UPD22-06 | Competitive research guide | new-bundled-guide; [UPD22-GUIDE-COMPETE](https://trello.com/c/f3xegAZL/414-upd22-guide-compete-competitive-research-guide). |
| UPD22-07 | Recruiting profile comparison guide | new-bundled-guide; [UPD22-GUIDE-RECRUIT](https://trello.com/c/wHIF8NR6/415-upd22-guide-recruit-recruiting-profile-comparison-guide). |
| UPD22-08 | Website sitemap guide | new-bundled-guide; [UPD22-GUIDE-SITEMAP](https://trello.com/c/tHaexdJ1/416-upd22-guide-sitemap-website-sitemap-guide). |
| UPD22-09 | Travel planning guide | new-bundled-guide; [UPD22-GUIDE-TRAVEL](https://trello.com/c/gIR9UQcj/417-upd22-guide-travel-travel-planning-guide). |
| UPD22-10 | Responsive website reflow guide | new-bundled-guide; [UPD22-GUIDE-RESPONSIVE](https://trello.com/c/0Qkmap7m/418-upd22-guide-responsive-responsive-website-reflow-guide). |
| UPD22-11 | Stacked entrances and scroll reveals guide | new-bundled-guide; [UPD22-GUIDE-ANIMATIONS](https://trello.com/c/SUNGrRuI/419-upd22-guide-animations-stacked-entrances-and-scroll-reveals-guide). |
| UPD22-12 | Website implementation and canvas/site iteration guide | new-guide-reference; [UPD22-GUIDE-WEBSITE](https://trello.com/c/joNq51wt/420-upd22-guide-website-website-implementation-and-canvas-site-iteration-guide). |
| UPD22-13 | Whiteboard workflow revision and example | changed-guide-reference; [AI-07](https://trello.com/c/drOvPVmM/222-ai-07-skills), [MCP-03-READSKILL](https://trello.com/c/py0nmCOL/59-mcp-03-readskill-readskill-public-tool-contract). |
| UPD22-14 | Snapshot/cloud share-kind conversion | packaged-contract; [UPD22-CLOUD-CONVERT](https://trello.com/c/Qs6ElOzD/421-upd22-cloud-convert-snapshot-cloud-share-kind-conversion). |
| UPD22-15 | Cloud document resolution and edit capabilities | packaged-contract; [UPD22-CLOUD-ACCESS](https://trello.com/c/z0j57bU7/422-upd22-cloud-access-cloud-document-resolution-and-edit-capabilities). |
| UPD22-16 | Workspace cloud catalog and Shared with me | packaged-contract; [UPD22-CLOUD-CATALOG](https://trello.com/c/mIJtuvZK/423-upd22-cloud-catalog-workspace-cloud-catalog-and-shared-with-me). |
| UPD22-17 | Web editor one-time session handoff | packaged-contract; [UPD22-CLOUD-HANDOFF](https://trello.com/c/RvEbQ35g/424-upd22-cloud-handoff-web-editor-one-time-session-handoff). |
| UPD22-18 | Live share refresh and document provider | packaged-implementation; [UPD22-CLOUD-LIVE](https://trello.com/c/4RazN4kT/425-upd22-cloud-live-live-share-refresh-and-document-provider). |
| UPD22-19 | Native browser box-model and layout overlays | packaged-implementation; [UPD22-BROWSER-OVERLAY](https://trello.com/c/cKWrFiKG/426-upd22-browser-overlay-native-browser-box-model-and-layout-overlays). |
| UPD22-20 | Browser per-side spacing copy surface | changed-renderer; [UPD22-BROWSER-SPACING](https://trello.com/c/jCASBuX9/427-upd22-browser-spacing-browser-per-side-spacing-copy-surface). |
| UPD22-21 | Browser second-press input interception | packaged-implementation; [UPD22-BROWSER-SECOND](https://trello.com/c/z6FwQjSA/428-upd22-browser-second-browser-second-press-input-interception). |
| UPD22-22 | URI-first tool document targeting | changed-contract; [MCP-05](https://trello.com/c/Emr6EgtS/64-mcp-05-document-targeting), [MCP-03-EXECUTE](https://trello.com/c/hN4jl4nX/61-mcp-03-execute-execute-public-tool-contract). |
| UPD22-23 | Internal Codex save-tool availability | changed-provider-gate; [MCP-06-SAVE](https://trello.com/c/PpBoc7BY/382-mcp-06-save-match-save-tool-availability-and-document-targeting). |
| UPD22-24 | Model-result feedback controls and retraction | packaged-implementation; [UPD22-AI-FEEDBACK](https://trello.com/c/ngJgAska/429-upd22-ai-feedback-model-result-feedback-controls-and-retraction). |
| UPD22-25 | Hosted inference payload compression and older-image omission | vendor-service-change; [AUTH-05-ADVANCED](https://trello.com/c/Xv3V4jV7/385-auth-05-advanced-match-custom-provider-limits-and-completion-options). |
| UPD22-26 | Hosted title model and legacy aliases | vendor-service-change; [AUTH-06](https://trello.com/c/3ATZT3BQ/55-auth-06-connection-lifecycle). |
| UPD22-27 | Bundled kit classification replaces description field | changed-metadata; [FILE-02](https://trello.com/c/J8UZort9/69-file-02-dashboard-categories). |
| UPD22-28 | Tab hover/focus and CSS utility changes | changed-styles; [SURF-HOME](https://trello.com/c/KY4RY62U/102-surf-home-home-tabs-search-and-import-composer-layout), [SURF-NATIVE](https://trello.com/c/RIrbEFXN/118-surf-native-native-package-dock-and-window-chrome), [MENU-BRAND](https://trello.com/c/iW2YpYWO/143-menu-brand-top-left-brand-popup-menu-parity). |
| UPD22-29 | Hosted payment-failure presentation | vendor-billing-copy; Vendor billing excluded; catalog only. |
| UPD22-30 | Copy selection as SVG command | new-renderer-command; [IO-13-CLIPBOARD](https://trello.com/c/EqlS8NXr/377-io-13-clipboard-deliver-selection-svg-through-the-native-clipboard). |
| UPD22-31 | Chat command label renames | changed-menu-copy; [SURF-AGENT](https://trello.com/c/odtTtoGR/103-surf-agent-agent-composer-layout-and-focus-states), [UI-13-PALETTE](https://trello.com/c/81hEAPER/368-ui-13-palette-match-command-search-states-and-execution). |

Six newly registered built-in guides cover competitive research, recruiting profiles, sitemaps, travel, responsive websites and stacked animation. A seventh new website-code guide is linked by the packaged skill index; a whiteboard example is supporting guidance. Their inclusion does not prove native slash discovery or successful agent output. The native home slash probes did not expose the guide popup. The empty composer and Recents were restored without submitting a request.

The cloud entries are shipped API/provider/poller contracts, with renderer sync-status copy. They do not establish an enabled backend or visible full cloud-editing workflow. Inference compression/image omission, hosted model aliases and hosted feedback remain provider-specific. This inventory does not authorize adopting vendor hosts, silently dropping CLI context, sending conversation feedback or restoring excluded subscription/licensing behavior.

## Design resources and native observations

All 477 loose visual resources are measured: 471 raster images, five SVGs, one font; 99 CSS files and zero metadata parse errors. All previously measured loose visuals retain their hashes. The native CAR remains 23 records but seven rendition digests change; those are separate from the loose files and are not declared visually identical. CAR/symlink discovery coverage remains explicitly unknown.

CSS parsing retains 2,820 rules (previously 2,809), 710 custom-property declaration occurrences, 69 added/58 removed selector-context keys and one changed root/theme declaration group. That group removes six utility variables; retained root values do not change. Utility additions alone do not prove component geometry or accessibility. Inline icons/dynamic layouts can live in JavaScript, and system/network fonts are outside this bundled-font inventory. Intrinsic asset sizes are not rendered control bounds. Exact CSS and measured file dimensions remain in the private extraction folder; no noisy screenshot values are substituted for shipped declarations.

The shipped renderer has 2,241 unique message IDs across 2,341 descriptor occurrences. 266 message IDs use English text not equal to an old string literal; many are parameterization/localization changes rather than new features. Actual UI-owner anchors are recorded instead of earlier embedded translation tables.

Native observation covers running About, all six native menu trees (including File→SVG), General settings, the System/English/Czech/Japanese/Simplified-Chinese choices, Home and the same five design kits. Five retained captures are inspected. Menus have complete accessibility captures; screenshots while native menus held focus were unavailable. No language preference, account, recovery, user document, provider or share was changed.

## Files and remaining checks

Raw extraction: `local-evidence/pen-reference-1.2.22/app-asar/`; outer bundle resources/unpacked mirrors: `bundle-resources/`; native/framework copies and plist: `bundle-native/`; manifests/diffs/measurements: `manifests/` and `source-diffs/`; native observations: `native/`. All are ignored local evidence. Proprietary source/assets and private UI captures are not committed or uploaded.

The raw 182-path ledger includes 25 package/dependency files, 77 internal-package files, 15 desktop sources/entries, 15 renderer/style files, 12 guide files and 38 opaque native digest changes. These are file-domain tags, not a claim that every binary/bundled semantic change has been recovered. Unknown semantics remain explicit under [REF-03](https://trello.com/c/l9y1fz5C/413-ref-03-catalog-installed-pen-1222-update).

New workflows receive 16 narrow applicability-first cards; existing language, SVG, note, targeting, save-gate, menu and other cards are reused. Cloud entries each separate conversion, access, catalog, handoff or live refresh. Each card requires actual applicability evidence before independent implementation and executed acceptance. Historical 1.2.21 receipts retain their original scope; future current-reference checks record 1.2.22 explicitly. Schema upgrade/migration remains gated by FMT-09 rather than silently replacing old document data.

The subsequent [Note control](../NOTE-REFERENCE-CONTROL.md) first executes default/custom
color, sizing/content-growth and raster-export probes through the actual document tools,
retaining the initial unsaved state and placement disagreement. Its later native reference
follow-up observes preset/custom hex fields, text/history and Save As/Close/FileOpen for
the named fixture; reopened frame RGBA bytes match exactly. The reopened bounds report Y24,
while the earlier Y74 cause stays unknown. Open Pen Note interchange, migration, remaining
native states and full parity remain unqualified.

No full workflow, undisplayed screen/menu state, native clipboard, note migration, SVG fidelity, cloud backend, agent guide result or full Pen parity is accepted by this extraction.

The subsequent [REA/Hopper native pass](native-1.2.22-2026-11-09.md) classifies 39
retained native deltas and exports 5,897 provider procedure artifacts. It isolates actual
code changes in the MCP helper, corroborates URI/save findings and retains the Go/Hopper
coverage gaps explicitly. It does not convert packaged declarations into runtime acceptance.
