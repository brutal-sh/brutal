# FIG exporter coordination

MOD-20 separates the remaining exporter responsibilities after the raw-payload extraction. The coordinator retains record sequencing and child traversal; private owners handle sibling order keys, variable modes, component properties, instance payloads, geometry and shared visual fields. Existing raw-payload, assignment, generated-frame, text, stroke and override owners remain in use.

## Public compatibility decision

On 17 November 2026, Jason delegates selection between preserving the existing public API with one named parameter-count exception and a breaking options-object migration. The chosen approach preserves `sceneNodeToKiwiWithContext(source, parentGuid, childIndex, localIdCounter, context)`, its runtime arity of five, and the five-argument `SceneNodeToKiwiContext.sceneNodeToKiwi` callback. The public barrel and callers keep their existing contracts.

Only that existing exported function has a local `max-params` exception. All other changed functions retain four parameters or fewer; the 300-line file, 50-line function, complexity ten and depth-four limits remain required. There is no global rule change, whole-file size exemption, rest-parameter evasion or reflective arity adjustment. Revisit the exception only as an explicitly versioned public API migration.

## Preservation requirements

- Keep the sibling-order cache keyed by the original context and retain linear sibling processing.
- Preserve GUID allocation, raw/authored precedence, parameter-map merging, slot references, explicit empty-value clearing and instance-override callbacks.
- Preserve geometry pairing, invalid uniform-scale refusal, serialization call order, plugin-data mutation on the temporary node copy and generated-frame child policy.
- Compare all public exports and runtime arities, complete decoded saved-archive records/blobs/images, relevant owner suites and actual browser edit/save/reopen. Native and live Figma evidence remain separate requirements.

The original coordinator is 712 physical lines at SHA-256 `abb901b9701cd6e019096504b939d481e8a3b9756469497dedee146bfae82077`. Initial software controls are retained privately under `local-evidence/fig-export-coordination-2026-11-16/`; current results must stay tied to their exact candidate. MOD-17/live Figma, native delivery, failed reference controls and full MOD-20 acceptance remain open until their actual criteria execute.

## Executed software qualification — 2026-11-17

The coordinator is 182 physical lines; its six private owners range from 42 to 265. All seven modules pass the remaining strict limits, with only the named public parameter-count exception. All 123 public export types and runtime arities match the baseline, including the positional entry's arity of five. Independent source review checks all 30 original functions: 25 bodies and both module-level cache/set initializers are unchanged, and the decomposed functions retain their guards and sequencing. No runtime import cycle is found in the reviewed owners.

The FIG owner suite passes 333 cases and 2,101 assertions. The canonical FIG cohort, including its heavy fixtures, passes 792 cases and 120,418 assertions with no skips; it includes the FIG owner suite. The separate Core export/instance cohort passes 92 cases and 1,652 assertions. These are named cohorts, not a summed unique-test count.

Three actual export/edit/read controls compare all 883, 8 and 36 decoded records, blob hashes and image hashes with their before baselines. ZIP member names and order also match; the only changed member is `meta.json`, whose only changed key is `exported_at`. This demonstrates preservation relative to the previous exporter, not full fidelity of every original Figma archive.

Five canonical browser cases pass without skips or retries: English variable import/edit/FIG save/reopen in Dark and Light across Chromium and WebKit, plus the existing Chromium wrapped-text save/reopen screenshot matcher. No image or threshold changes. The seven runtime hashes remain exact through these checks. The complete repository check passes with zero duplicate-code groups, and the production web build passes. Neither substitutes for a newly built native app or live Figma.

Private receipts include `runtime-candidate.json`, both public-contract dictionaries, strict/type/owner logs, before/after saved archives, `archive-entry-comparison.json`, `browser-summary.json`, complete-check/build logs and independent review. MOD-20 remains unaccepted for its actual Figma/native and prerequisite gates; the broader reference, recovery and beta criteria are unchanged.
