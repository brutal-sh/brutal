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
