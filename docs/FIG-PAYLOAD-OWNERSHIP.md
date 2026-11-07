# FIG raw payload export ownership

2026-11-07. MOD-17 is an extraction candidate. Live Figma validation and the saved-text
visual-control disposition remain open; the remaining exporter belongs to MOD-20.

The existing `node-change/export/` domain gains `raw-payload.ts` with 312 physical
lines (233 nonblank, noncomment lines). `node.ts` decreases from 1,017 to 712 lines.
The extracted concern materializes retained blobs and variable references, normalizes
unsupported alignment values, and merges raw fields under the existing authored-field
precedence. It preserves paint alpha splits, effect asset references, shared blob-cache
identity, and the edited/reflowed path-text exclusions.

Twenty declarations move verbatim; only the two helpers called by the coordinator
gain internal exports. The remaining declarations, order and both public runtime
export sets are unchanged. The instance-payload path and final node serializer retain
their existing call sites and shared context. No new package entry, dependency,
generic wrapper, renderer or compatibility spelling is introduced.

## Whole saved-archive controls

Each control materializes the complete archive through the public FIG reader and
exports through Core. It renames an actual exportable layer and asserts that name
in the saved records, preventing an unchanged archive from qualifying the check.
The first probe mistakenly chooses the parentless Document frame; the assertion
rejects it before any baseline is saved. The corrected selection excludes parentless,
canvas, internal and shared-style nodes. That failed probe and corrected source are
retained; it does not establish a product export defect.

| Fixture | Saved records | Blob hashes | Images | Interpreted nodes |
| --- | ---: | ---: | ---: | ---: |
| gold-preview | 883 | 540 | 3 | 888 |
| circle-text | 8 | 104 | 0 | 6 |
| variable-override-precedence | 36 | 29 | 0 | 42 |

Every decoded record, blob hash and image hash compares equal before and after.
Whole saved-archive interpreted digests also report zero differences and zero
unresolved assignments, properties, bindings and components for all three fixtures.
The ZIP files are not byte-identical: entry comparison finds only `meta.json`
changed, and its sole changed field is `exported_at`. These are writer-preservation
controls, not proof that an original archive had no unsupported conversion or that
Figma accepts the output.

## Owner and browser controls

The unchanged exporter baseline reuses the preceding MOD-16 candidate's FIG/IO/Kiwi
quick receipt: 761 passes, 17,364 assertions, 189 files. Its exporter source is retained
before this extraction. The new candidate passes the same 761 cases. Large-fixture
heavy files are outside this run. The two Core saved-archive patch files separately
pass 26 cases and 1,292 assertions before and after.

The immediately preceding browser receipt is also the unchanged-source baseline:
four English FIG warning import/edit/save/reopen journeys pass across both themes
and engines. Wrapped text passes its two-line assertion but fails its old screenshot.
MOD-16's actual before/after images match exactly. The MOD-17 run retains the same
four passes and same failed image in 30,576ms. Its actual wrapped-text PNG has the
same SHA-256 as that baseline, with zero changed pixels; both frozen source hashes
match after the run. Complete results, traces and captures are archived before
another browser run. The inherited visual failure is not waived.

Independent source review finds no concrete defect and verifies the retained payload
region, public boundary, cache identity and saved-archive controls. This is read-only
review, not an independent native or live Figma test. The normal build, source/Vue
types, FIG package/test types and architecture pass. The build retains unrelated
icon work, so it does not qualify a clean packaged release.
Formatting, documentation/changelog, package metadata/exports/contents, Publint and
ATTW checks pass. ZIP entry sets and metadata keys compare equal as well; the only
changed metadata value is the observed export timestamp.
The full app shard subsequently passes 1,955 tests across 339 files in 21.76s,
with 12,444 assertions. This integration control includes both FIG extractions;
it does not waive the failed visual control or qualify native/Figma delivery.

The coordinator remains above the review threshold. The expanded candidate adds
one runtime file (3,613 total; twelve still above 600). No size exception or complete
exporter acceptance is inferred. Actual Figma round trips required by the owning
guide and [VERIFY-FIG-WRAP-VISUAL](https://trello.com/c/e7tkTmrw) remain separate gates.
Source publication and remaining checks are recorded after execution. User documents,
profiles, credentials, recovery, the installed app and unrelated work remain preserved.

Tracking: [MOD-17](https://trello.com/c/uGL3MDSH),
[remaining exporter](https://trello.com/c/BGyM2T9o), [FIG text](FIG-TEXT-OWNERSHIP.md),
[modularity](MODULARITY.md), [PRD](PRD.md), [task index](TASKS.md).
