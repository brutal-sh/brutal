# Recovery browser tooling qualification

Updated: 2026-11-11. [TEST-RECOVERY-CHROMIUM](https://trello.com/c/ldFspoJ6) owns this bounded runtime-tooling change. FILE-RECOVERY-LOCAL retains feature acceptance.

Playwright 1.63.0’s bundled Chromium revision 1243 terminates during file-capability recovery across reload. Two macOS reports record EXC_BREAKPOINT/SIGTRAP; headed Chromium and a reduced recovery-store control also fail. These are actual browser terminations, not passing recovery results. A temporary system-Chrome 157 contrast passes the same two controls; its channel override is restored byte-for-byte.

The tooling upgrade changes only @playwright/test, playwright and playwright-core to 1.65.0 in the manifest/lockfile. The official bundled Chromium revision 1254 reports version 158.0.8127.18. Corresponding WebKit is installed for the existing two-engine controls. The canonical config, servers/profiles, security settings, assertions, references, retries and timeouts remain unchanged.

With the default new browser and no override, both real-handle capability and editor backup/reload/restore controls pass. Ten existing Chromium/named WebKit draft, save, autosave, cancellation, history and reopening cases also pass. Test/tool types, manifest formatting and critical-dependency audit pass. Independent tooling review finds no unrelated dependency or policy change. The subsequent recovery-feature qualification runs the complete static gate successfully; its original failed receipts remain historical.

At tooling-only source b4e0aaf52, these runs include the separately retained, uncommitted recovery feature candidate. Its contextual source/test hashes are archived; this tooling publication does not publish or accept that feature. In particular, review identifies an unexecuted delayed-Save-As scheduling gap. Explicit Save/Save As, cleanup, native panels, physical restart, exact Pen UI and full parity remain open.

[Chromium issue 569219196](https://issues.chromium.org/issues/569219196) reports an IndexedDB/FileSystemHandle tab-close crash. It corroborates a relevant upstream failure class; the exact shared root cause or fixed version is not established here. No browser safety check is disabled.

Private evidence: local-evidence/claude-brand-review-2026-11-11/recovery-engine-{before.json,context-hashes.json,qualification.json,default.json,legacy-browser.json}, file-local-headless-crashes.json and the retained headed/system-Chrome controls. No normal application, user profile, credentials, recovery or protected icon work is changed.

The subsequent complete recovery-feature static run reaches workspace consistency and rejects two generator manifests still declaring Playwright 1.63.0. Their declarations and corresponding lockfile workspace entries are aligned to 1.65.0; this correction does not change resolved browser packages, configuration or acceptance thresholds. The original failed full-gate receipt is retained; the final complete rerun exits zero, including zero duplicate-code clones. No resolved dependency changes follow from aligning these declarations.
