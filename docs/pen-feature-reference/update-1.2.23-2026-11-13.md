# Pen 1.2.23 update catalog — 2026-11-13

Actual `/Applications/Pen.app` is the reference. The installed version/build and running About panel show **1.2.23**. Its full ASAR SHA-256 is `d0c5c23a3a86ec1802c8754b59e82600d815f0e2b6a383f655319535e6e07925`; the hash stays exact after this audit. Launcher SHA-256 is `2ef89fde4c00cd22fe9c78742f7cce686be28001c0421b53f42c4a94e4d177c8`. Earlier 1.2.21/1.2.22 receipts remain historical. OpenPencil is the implementation foundation, never the design oracle.

This supplement allocates changed surfaces and contracts. **It does not accept new feature execution, full design parity or a beta.** Source declarations, native observations and independent-app acceptance are separate evidence. The [machine catalog](update-1.2.23-2026-11-13.json) gives every 75 added,14 removed and 6 changed English message IDs a source location, disposition and acceptance owner. Message counts are not feature counts.

## Extracted files and actual asset measurements

REA retains 21007 ASAR regular files/950857937 bytes with all hashes re-read. Against retained 1.2.22:243 added paths,92 removed,544 changed and 20220 unchanged;25 new paths reuse earlier identical bytes. Strict extraction reports 38 declared-versus-observed integrity contradictions. The recorded continuation preserves explicitly untrusted bytes; nothing extracted is executed or shipped.

The outer bundle inventory has 434 regular files and 14 recorded, un-followed symlinks. The loose visual asset set is unchanged:471 raster images,5 SVGs and 1 font, with intrinsic dimensions/metadata retained.99 CSS files are inventoried. Native Assets.car reports 23 records; complete rendition pixels and whole-catalog coverage are unaccepted. Asset dimensions do not establish live placement or every inline icon.

Private folder: `local-evidence/pen-reference-1.2.23/`, indexed by its README. Proprietary source/assets and native captures containing account/history data stay ignored by Git. REA extraction evidence: `ev_e704632644eacb6a6a90d21d3e862ba202b9b4657cd65d059c2c8cbc39b9f9c2`.

## Current surfaces and bounded owners

| Observed or declared change | Evidence boundary | Acceptance owner |
| --- | --- | --- |
| Reworked Run settings with Divide and conquer/Build separate versions | Native popup and labels observed; parallel 2–6 disabled here, reason not established | AI-08-MODES / AI-08-EXECUTE |
| Layout/Style/Creative and Off/1–5 count menu | Native choices observed; additional versus total designs and real iteration execution unaccepted | AI-09 / AI-09-CREATIVE |
| Full-screen chat, Show chats, Hide chat history, Back to canvas | Native round trip executed without opening/removing user conversations; same-file hash retained | SURF-CHAT-FULLSCREEN / AI-01 |
| Always steer messages preference | Native defaultOff observed; no preference change or provider steer execution | AI-03-STEER-PREF / AI-03 |
| Pending generation waiting/prompt/list/Generate/Discard | Source declarations; generation operation and saved pending state not executed | UPD23-GEN-PENDING |
| Generate image / Generate SVG / Replace background operations | Source declarations; each needs its own actual generated-output criterion | UPD23-GEN-IMAGE / UPD23-GEN-SVG / UPD23-GEN-REPLACE |
| Remove background / Vectorize pending operations | Source declarations; existing independent output owners retained | DRAW-14 / DRAW-15 |
| SVG default/provider/model selection | Native Settings/composer menus show pen.dev selected and QuiverAI/Recraft Upgrade offers; no provider selected or invoked | UPD23-SVG-SELECT |
| Image-provider identifiers and legacy normalization | Shipped contract changes to Flare/Sunburst identifiers; current upstream availability not established | UPD23-IMAGE-MODELS / AI-02 |
| Eight languages plusSystem | Native menu shows English, Czech, French, Spanish, Brazilian Portuguese, Indonesian, Japanese and Simplified Chinese; no locale selected | UI-10-LANGUAGE plus CS/PTBR/ID leaves |
| Four text alignment commands | Native search shows left/right/center/justified and a text-selection hint; execution unaccepted | UI-13-PALETTE / DRAW-05-ALIGN |
| Browser reload/back/forward/editURL | Native palette entries observed; browser navigation not executed | UI-13-PALETTE / SURF-BROWSER |
| Presentation stop/next/previous declarations | Native inactive context shows presentation entry; active-presentation actions remain unaccepted | UI-13-PALETTE / SLIDE-02 |
| Interface show/hide command | Native current context shows HideUI; hidden-state ShowUI not exercised | UI-13-PALETTE |
| Sixteen suggestion/clear-canvas message IDs | Source declarations, not sixteen newly executed workflows | SURF-AGENT |
| Task-context loading, activity labels and todo updates | Paired schema adds start_task; source contracts and provider changes inspected; no vendor task/inference executed | AI-CONTEXT-START / SURF-AGENT / AI-01 |
| Updated bundled guides | Existing guide owners retain independent behavior criteria; vendor prose is reference data, never instructions to this agent | AI-07 / MCP-03-READSKILL / existing UPD22-GUIDE leaves |
| Vendor subscription/upgrade message consolidation | Explicitly excluded editor licensing implementation; real external capability/authentication/cost constraints remain | Excluded; no bypass |

The shipped generation guide associates deferred URLs with the vendor image-generation limit. Recreating that subscription/quota trigger is excluded. The generation leaves qualify the applicable user-visible pending/retry/imported-operation controls and real output; they must not introduce an artificial wait or a free-editor limit. Real provider refusal and capability limits remain explicit.

Open Pen currently supports nine locale codes but lacks Czech, Brazilian Portuguese and Indonesian. The three leaves cover translation and real interface behavior; other supported languages are preserved. Its existing Enter-steer/Alt+Enter-follow-up behavior is not equivalent to an accepted Always steer preference. Existing scoped Codex context work is preserved, not replaced by vendor SDK settings or a global skill-catalog mutation.

The 13 created and exactly re-read bounded followups have 7 primary owners in M02 and 6 in M05. All remain Backlog. The fresh 523-card graph has 505 execution tasks, 18 milestones, 505 single primary owners, 504 other terminal dependencies, no unknown declared prerequisites, no reachable cycles and no Executed/open-prerequisite contradictions. This catalog does not promote feature acceptance or REF-04 by itself. Existing broad domain owners keep their remaining criteria. No paid services, vendor account workaround, new credentials or public release are authorized.

## Geometry and design values

The owned reference window is 1496×933 logical points at scale 2. Public AX measurements are scoped to that exact Pen window and retain duplicate inactive-WebView candidates. Run settings measures 340×228 points; parallel cards 155×47 and iteration choices 102×28 with 4-point gaps. Toolbar accessible hit controls measure 28×28. Painted circles, outer pills, glyph bounds and borders require their own source/visual comparison; the 28-point hit area is not a blanket circle diameter.

The verified primary stylesheet is parsed as inert data with PostCSS 8.5.28: 715 custom-property declarations and 28 selected rules, with source offsets and cascade ancestry. It declares a `.25rem` spacing base,20 px island radius,`.625rem` base radius,`.6875rem` compact text and`.75rem` small text; its border utility declares 1 px. These are declarations, not a claim about every live computed style. One of 99 stylesheets is measured this way.

Private `manifests/design-tokens-reference.json` separates direct source dimensions, one inferred semantic role and the corroborated 340 px Run settings width. Dimension objects follow the [DTCG 2025.10 format](https://www.designtokens.org/tr/2025.10/format/#dimension). Parser behavior follows [PostCSS parse/walk APIs](https://postcss.org/api/#parse) and the installed 8.5.28 types. Root rem size, browser zoom, selector reachability, contrast, responsive states and full re-render equality are not accepted by this extraction. No screenshot noise is snapped into claimed exact values.

## Owner/source decomposition and Hopper limits

All 65 changed shipped-owner paths have a disposition: 32 source-map/whitespace-only, 11 authored-source changes, 9 declaration-map build settings, 4 declarations, 4 compiled implementations, 2 schema-chunk paths, 2 import wrappers and 1 unresolved minified headless-preview bundle. Source-map-only means the remaining text is exactly equal, not a behavioral or application acceptance claim.

Authored changes include Creative mode propagation, SVG provider validation/default, legacy image-provider normalization, model-default selection, Codex todo output, new-session context and provider effort restoration, and resumed-session context exclusion. Those source mechanisms are reference observations. Open Pen must preserve its own validated transport, permissions, effort and existing login; copying internal SDK behavior is not required to implement the same user outcome.

REA statically parses selected agent/api/shared bundles:3 files / 264,713 text bytes, 0 parse failures. Application coverage is partial; semantic unknown retention reaches 100,000 and omits additional occurrences. 19,301 inventoried relevant files remain outside that selected scope. Summary evidence: `ev_f2f7f47f0b74f31475741744f124a4a88dba06b3ae46d8ebee0d18ae1d01128a`. The retained full graph is not full semantic coverage or runtime proof.

Hopper through REA opens the changed ARM64 native MCP executable, SHA-256 `ef06a99994c81edd950f9631ab0a59af0300751eb999666710bc7b5f1e595602`. It reports 5900 procedures and 20 typed string objects. The recorded LC_MAIN entry `0x1000803d0` has actual provider pseudocode, evidence `ev_6b7043faa3c85544aef85007feab68ae943ae680e82f53ad7870caca124a84a8`. No start_task string or main-name match is reported; discovery remains unknown. This is one entry-point decomposition, not all 5900 functions or native feature recovery. The six-record session/snapshot are exported and the owned analysis target closes. No executable is launched.

## Preservation, residual gates and next work

Native traces 00–30 capture current choices, non-destructive menu search and full-screen/history round trips. The owned reference-copy SHA remains `de264fe038e6f06a9fc542614b10dee7632af0c2f5a65d3c5a69cfa3de7bdb77` before/after; only that clean tab closes, without a save/discard prompt. Existing tabs/conversations and preference choices remain intact. No model inference, provider purchase, history deletion, OS permission approval or limited Pen MCP retry occurs.

Residual applicability belongs to REF-02 and the named domain owners: real generation and active-presentation states, current image-model chooser, complete minified preview/native-MCP semantics, responsive/focus/mixed/error states and independently implemented outputs. Inaccessible execution is recorded, never accepted through source or a green build. New discoveries require bounded tasks and terminal dependency closure before implementation acceptance.

Now: publish this independently reviewed catalog after the completed live-board reconciliation; then apply REF-04's bounded catalog exit. Next: finish existing save/refusal/recovery delivery and outstanding visual/control criteria. Later: execute remaining domain cards with matched actual Pen evidence. Done for the product requires PARITY-ALL and the separate public-beta trust/package/support gates; neither extraction nor this update audit meets that terminal criterion.
