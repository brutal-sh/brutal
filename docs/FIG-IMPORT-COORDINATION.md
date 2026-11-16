# FIG importer coordination

MOD-19 is Verify. The remaining importer is separated into private domain modules while retaining the existing public node-change entry. MOD-16 remains Verify: its required live Figma acceptance is not cleared by the present source or this software qualification.

The coordinator at `69770e716` was 1,155 physical lines. It is now 110 lines; the seven private modules range from 64 to 295 lines. They own identity, geometry, layout, vector/text-path conversion, component properties, source/raw payload preservation and node-property assembly. Current callers remain the document materializer, instance materializer and generated sticky/connector/shape-with-text converters.

The extraction preserves public exports, conversion order, defaults, source-versus-occurrence metadata, embedded blob-marker compatibility, error handling and untouched-record archive behavior. It adds no dependency or parser and changes no rendering rule. Required third-party and serialized compatibility identities remain intact.

Executed qualification:

- All 12 changed source/test files pass strict 300 code lines / 50 function lines / 10 complexity / 4 parameters / 4 nesting depth, without new waivers.
- At the frozen software qualification, the complete repository check passes with zero clones and production build passes. Runtime hashes remain unchanged throughout that qualification.
- FIG/Kiwi/import and Core FIG owner cohorts pass 1,095 cases and 132,791 assertions, including original-byte preservation, edited export/reopen, glyph blobs, variables and worker paths.
- Seven whole-archive comparisons cover 870,186 nodes with zero differences; every capture file is byte-identical. Fixture bytes and unresolved counts remain unchanged. Five smaller complete graph/source-metadata captures and public export keys also match before/after.
- Ten actual Chromium/WebKit cases pass with no skips, retries or flaky outcomes. They retain the original history, saved-file reopen, lazy-page worker checks and saved/reopened text pixel matcher.
- Separate read-only adversarial review checks the extraction, assertion/workflow/deadline preservation, runtime/test hashes and actual final result records. No unresolved finding remains in that bounded review.

The first browser cohort retains nine live cloud-discovery CORS failures. Five unchanged-source controls reproduce that failure. A test-only route now fulfills exactly the discovery endpoint using the existing Cloud contract fixture; no other errors, import operations or graph/file behavior are mocked. Review catches an initial hook on the wrong page; the retained intermediate run has nine passes and that one CORS failure. The corrected existing isolated-page setup applies the route before navigation, and its actual request/response appears in the final trace. No assertion, timeout, retry, pixel threshold or baseline changes.

The first strict scratch graph capture without unresolved callbacks also retains an existing missing-target override refusal. The full comparison uses the canonical digest tool's explicit unresolved callbacks and records those counts. It does not globally suppress errors or claim that every archive has no unresolved source semantics.

Preservation receipts match all 6,558 built files and 3,236 scoped inputs before/after the final browser run, plus all 17 protected files/modes and four named artifacts. The pending wrapping documentation, original user inputs, installed app and protected isolated binaries are retained.

Private evidence is under `local-evidence/fig-import-coordination-2026-11-16/`: qualification and freeze manifests, original failures, complete archive captures, browser JSON/traces, source/caller inventory and independent review receipts.

The publication recheck retains a failed complete check at its tooling-test stage:
standalone bridge version verification and a brand warm-cache timeout fail while
their sources match the parent commit. Both isolated cohorts then pass all 20
cases with unchanged timeouts; the canonical combined tooling cohort also passes,
and the final duplicate gate finds zero clones. This does not establish the cause
or repair of the first failure, or a successful return from that complete check.
Strict checks and final documentation checks pass. The package rebuild changes five
ignored declaration files; all 3,236 scoped inputs and the other 6,553 built files
remain byte-exact. No generated declaration or private receipt is committed.
Publication receipts are in `local-evidence/importer-publication-2026-11-16/`.

Still unaccepted: MOD-16 prerequisites, live Figma round trip of this extraction, its new native delivery, normal installed delivery, complete unit/browser suites, all milestone exits, public beta readiness and whole design/functionality parity. The earlier native URI Save/recovery qualification remains pinned to `d73451a34`; it is not rerun or promoted by this extraction. MOD-20 now reviews the remaining exporter while its MOD-17 gate stays open. Actual Pen remains the design/functionality reference; OpenPencil supplies implementation foundations only.
