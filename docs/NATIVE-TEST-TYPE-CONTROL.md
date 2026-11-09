# Native test type boundary

Observed: 2026-11-09. This qualifies [VERIFY-NATIVE-TYPES](https://trello.com/c/Pia1lPfu), not full native delivery or Pen parity.

## Repair and executed checks

The former native configuration cannot resolve the app aliases used by its hand-maintained store declaration. With library declaration checking skipped, method results lose useful types while the facade also omits real methods and makes required node fields optional. The original direct compiler reports 67 errors across eight native test files.

The native configuration now inherits the root aliases and canonical app/environment/package globals. Native-only declarations retain the vendor-derived optional Tauri global; `window.openPencil` and its editor store come from the app's owning declarations. The duplicate NativeTestStore and NativeTestNode shapes are removed. Existing callback-only WebDriver calls specify their empty argument tuple, Rect imports its owning primitives entry, and initialized closures retain existing nullable guards. No runtime assertion, timeout, retry, profile isolation or app behavior is changed.

Executed results:

- The complete, unfiltered `bun run check:native-test` exits zero; all 38 shared-workspace native spec files are included. The published candidate has 37 tracked specs; the unrelated untracked icon probe is excluded.
- Source/Vue types, general test types and architecture checks exit zero.
- Fresh-process native runs execute 22 passing cases across ten specs: picker 1, overlays 4, preferences 1, preview 7, reload 1, screenshot 2, viewport 1, Script persistence 1, Note components 1 and browser history 3.
- Independent read-only review finds no actionable static defect in the nine-file repair. This does not establish runtime completeness.

## Retained failed sequence

The initial 12-spec invocation reuses one test app across workers. Its history reload case times out; later import navigation and overlay/picker readiness fail in that retained process. Execution is interrupted during preferences. Later scheduled specs are not counted as executed, and the batch remains failed.

All ten selected specs subsequently pass from fresh processes, including the three history cases together. This separates the observations but does not establish a test-only, environment or product cause. [STAB-NATIVE-SEQUENCE](https://trello.com/c/bQp0Q9x6) owns minimization, causal controls and successful mixed-session acceptance. The related browser-engine mixed-workflow card stays separate until a shared cause is demonstrated.

The test-only application identifier, incognito WebView and process-memory credentials remain unchanged. User documents, production profiles and recovery are not cleared.

## Publication checks and limits

The combined shared-workspace check advances beyond native typing through dependency/audit checks, then fails secret scanning. Its ten findings are in the untracked Graphify stat-index cache: each matched value is verified against Graphify's current path-salted file-content digest. No scanner exception or suppression is added. A clean candidate checkout excludes that local generated cache and the unrelated icon changes; its combined-check result is recorded separately.

Private receipts are retained under `local-evidence/note-sizing-components-2026-11-09/`: `native-types-canonical-third.log`, `native-types-{source,general,architecture}-check.log`, the failed `native-types-runtime-first.log`, `native-types-picker-cold.log`, `native-types-cold-receipts.json`, per-spec cold logs, `full-check-native-types-candidate.log` and redacted secret classification. No raw vendor source, pseudocode, local cache or private UI evidence is published.

The full native suite, retained-app reliability, strict Note raster differences and all remaining Pen screens/features remain unaccepted. No production installation, merge or release occurs.

## Canonical rectangle follow-up

Clean candidate `960b3ec1e` passes the native compiler and unchanged secret scan, then fails the duplicate-shape gate on private Box in stroke outlines and PreviewBounds in the browser dock. [MOD-RECT](https://trello.com/c/OJdXzRFc) replaces both with Rect from Scene Graph's public primitives entry in `1306f6cf2`; the complete caller search finds no outside PreviewBounds consumer, and Box is private.

Both edited files emit byte-identical JavaScript to their originals. The unchanged shape checker passes, and the exact two owner paths execute 13 tests with 52 assertions. The first Bun command without explicit relative paths also discovers the comparison checkout; its 26-pass/four-file result is preserved with that limit. Independent review finds no concrete ownership, caller or emitted-code defect. The combined clean-candidate result remains a separate gate.

## Final clean combined-check result

The complete clean check of `1306f6cf2` exits one at its final unchanged `test:dupes` gate: five groups and 39 duplicated lines. Every preceding command passes, including source/Vue/native/general types, dependency audit, secrets, type shapes, architecture, documentation and tool checks/tests. This is a red combined-check result, not an all-green candidate.

The separate remaining owners are:

- [MOD-DUPES-AUTH](https://trello.com/c/rHuSzPNP): Share the validated OAuth loopback outcome contract.
- [MOD-DUPES-STORIES](https://trello.com/c/puywggSM): Reuse the unreachable agent connection fixture.
- [MOD-DUPES-SCRIPT](https://trello.com/c/W3z3nbdP): Share Script render target capture.
- [MOD-DUPES-PAINT](https://trello.com/c/3S2nu6UI): Share PEN mesh-point projection.
- [MOD-DUPES-GENERATED](https://trello.com/c/bUTrlzXd): Reuse visible generated-output traversal.

No checker threshold, exclusion or assertion is changed. MOD-RECT satisfies its bounded criterion with these independent later failures recorded. Its exact 13 owner cases and the earlier 22 native cases remain scoped receipts, not full unit/browser/native acceptance. `canonical-rect-clean-full-check.log` retains the complete failed command; `native-types-final-board.json` retains the complete current board allocation.

## Shared native callback validation follow-up

`cf9d319cf` moves the byte-identical ChatGPT/OpenRouter native loopback outcome initializers to the shared sign-in schema owner. The native callback bodies and provider-specific URL restriction are unchanged. Both callers import the owning schema directly; the broader browser callback mismatch outcome stays separate. The new validator tests cover native results and malformed or non-native outcomes.

Exact owner selections execute 39 tests with 93 assertions across nine files in the shared workspace and clean checkout. Source/Vue/general/native types, architecture, the clean normal bundle build, staged secret scan and bounded independent review pass. The first fixture typing failure is corrected with literal cases and retained as an earlier failed receipt. No browser login, live account, credential or real OAuth flow is exercised or accepted.

Both unchanged scoped duplication checks now report four other groups and 31 lines; the auth group is absent. The last complete clean combined check remains the prior red result at five groups. MOD-DUPES-AUTH meets its bounded criterion; MOD-DUPES-STORIES becomes Building. Private receipts use the `dupes-auth-` prefix under the same evidence folder, including the exact owner, final types, clean build and clean duplicate logs; `dupes-auth-final-board.json` retains the current complete allocation. Full combined-check and full native/Pen parity acceptance remain open.
