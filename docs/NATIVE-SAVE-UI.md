# Native Save and Save As feedback

FILE-NATIVE-SAVE-UI owns this bounded correction. Actual installed Pen 1.2.23 is the current reference; its earlier 1.2.22 receipts remain historical evidence. Full FILE-07/08, the normal installed journey and complete visual parity remain separate.

## Behavior and ownership

- Save As supplies the existing picker with a format-specific title and retains its filters, suggested name and cancellation behavior.
- On macOS, the repository-local MIT rfd 0.16.0 patch changes only the Save panel title setter from `setMessage` to `setTitle`. The former inserts an extra heading. The corrected real sheet has title `Save .pen file as…` and the standard filename label `Save As:`. Open panels, alerts, filters, selected paths and filesystem scope handling retain their upstream implementation. See `desktop/vendor/rfd/OPEN-PEN-PATCH.md` and its preserved license.
- The existing app theme owner also sets the native app appearance from the main window only. The updater keeps its restricted capability and does not issue this command. Dark and Light remain explicit; Auto passes null to the platform to follow the system. The main webview receives only the native appearance permission; filesystem and process permissions stay unchanged.
- An observed native `Permission denied (os error 13)` write failure produces one own-branded native critical alert with the filename and File → Save As guidance. The original cause remains attached, and existing diagnostic metadata is preserved. Other write failures and browser file-handle failures keep their previous feedback.
- If the native alert itself fails, the document owns persistent guidance through the shared alert-dialog UI. Its OK button receives focus; OK or Escape dismisses it. It does not expire as a toast.
- A failed or canceled save retains dirty edits and its recovery copy. Only a successful write marks the document saved and performs its existing recovery cleanup. Storage and revision sequencing retain their existing owners.

## Executed evidence

Private evidence is retained under `local-evidence/native-save-ui-2026-11-13/`; vendor extraction and private test controls are not product assets.

| Path | Executed result | Limit |
| --- | --- | --- |
| `native-unlocked-current/pen-*` | Actual Pen 1.2.23 About, Save As, explicit Cancel, separate copy, refused write and writable retry. | Pen normalizes the initial owned fixture before explicit copy; preservation uses the recorded normalized baseline. One alert dismissal happened between tool calls, so no automated dismissal is claimed there. |
| `native-unlocked-current/native-primary-receipt.json` | Initial Open Pen native primary alert, canceled Save As, source/backup preservation and retry. | Predates the macOS title placement and native appearance corrections. |
| `native-denied-current/native-fallback-receipt.json` | Real read-only write plus private `dialog:deny-message` reaches fallback, retains dirty content and exact recovery digest, remains visible for 21,947 ms, dismisses with actual OK and retries successfully. | Private denial is never shipped. Escape is executed in mounted browser tests; native Escape remains unexecuted. |
| `native-appearance-current/native-primary-appearance-receipt.json` | Combined candidate runs real Restore, initial Cancel, explicitly targeted copy, edit, native critical permission alert, actual OK and successful retry. Original bytes remain intact; backup clears after success. | Unexpected intermediate sheet transitions and writes to uniquely named files in older owned directories remain recorded, not counted as intended-target success. |
| `native-main-guard-current/native-main-guard-receipt.json` | Current guarded candidate repeats the full Restore/cancel/intended-copy/edit/refusal/actual-OK/retry sequence with exact original and recovery-digest comparisons; the native picker remains dark and correctly titled. | Main-window-only appearance guard is included; normal installed and physical updater lifecycle remain separate. |
| Earlier `native-appearance-current` host `5c778…` | Native Save As is dark under Dark, light under Light, and light under Auto on the current light system. Both title and standard filename label remain correct. | No OS preference was changed; a live system theme switch under Auto is not accepted by this run. |

The earlier appearance host is `5c778179f824f5406f7ebe76daca54cabfd71980d6cf59b5d9f736552fb607d5`. The current main-window-guard host is `729ee1477a18a2970f7ce95a346cb5377ae577a1c493e83179025d5e95e17bc7`; its 80 recorded source/dependency files remain unchanged throughout the current native sequence. All owned hosts exit; deliberately restricted test targets return to 0600 with 0700 parent directories. The normal installed executable remains `9ec1498b73954a54dbb561097b476dabdc24e7756ec8a52ce9f2b4f1616527f0`.

## Qualification boundaries

Owner tests cover cancellation, native write refusal/retry, generic failures, browser file handles, storage and saved-version/recovery sequencing. Mounted Chromium/WebKit tests cover persistent fallback, focused OK, explicit dismissal and retained dirty content/recovery bytes. These tests seed the failed-alert boundary; they do not substitute for the separately executed native filesystem and alert paths.

Native critical-alert captures expose valid accessibility labels but sometimes contain blank JPEGs. This evidence accepts the observed native message and actual dismissal; it does not establish matched critical-alert pixels. The native picker comparisons establish title placement and appearance, not every remembered folder or panel expansion state. A collapsed versus expanded native picker is recorded as a control state, not assumed to be a product default defect.

The initial one-shot native alert interception attempt did not install because the Tauri invoke function is immutable. It is retained as a failed control and earns no fallback acceptance. The later deny-only isolated capability supplies the actual fallback evidence without changing production commands or weakening security.

The earlier combined full check fails on tooling test timeouts and remains retained. All 11 current browser cases pass, including a focused real-updater-entry/official-SDK-mocks test of the main versus updater boundary; restoring the old unguarded condition reproduces two failures. Two pre-existing appearance cases now open Settings through its current shortcut instead of a removed toolbar selector. Current 44 owner tests, strict 300/50/10/4/4 and the complete repository check pass with zero clones. The earlier failed full run and isolated 115-case tooling success remain retained; no timeout or runner change is made. FILE-NATIVE-SAVE-UI is Verify for matched critical-alert pixels, and REF-04 continues as the sole Building card. No full parity, normal-installed Save UI, TCC, other-platform or public-beta acceptance follows from these bounded receipts.

## Normal installed delivery — 2026-11-13

The earlier installed `9ec149` statements above describe the pre-delivery state. [Normal Save delivery](NATIVE-SAVE-DELIVERY.md) records the subsequently installed production executable `db4e528cde05dfb808f7ee6ace1877b1f6faa99ecb3975640b2d47deec011199` and its actual Cancel/copy/edit/refusal/OK/retry/reopen sequence, with original workspace and older recovery data preserved. This closes only the separate delivery slice; matched critical-alert pixels, broader recovery and beta acceptance remain open. REF-04 has separately completed its bounded catalog criterion.

## Native capture and preservation recheck — 2026-11-17

The same installed `db4e528c` runs actual Open, explicitly targeted Save As, a layer duplication, read-only Save refusal, native OK, writable retry and clean tab close. The source stays unchanged. All six recovery records and three blobs match across refusal; successful Save removes only the owned two records and one blob, leaving the older four records and two blobs exact. The public Core reader independently verifies one source rectangle and two saved-copy rectangles. No older recovery offer is restored or discarded. Receipts are in `local-evidence/native-alert-pixels-2026-11-17/`.

REA's exact parent-window capture now contains the visible native critical alert, warning icon, own-branded filename/guidance and OK; the alert-only Computer Use capture remains blank. The Open Pen raster is dark, 1280×800, with a watcher-conflict dialog behind it. The existing Pen process, whose on-disk bundle is 1.2.23, supplies a light, 1496×933 parent raster with its native permission alert. These are useful observed pixels, but their theme, viewport and backdrop do not match, so they do not close the remaining visual criterion.

Jason authorizes temporary Pen Light→Dark→Light comparison. Both Dark attempts show the alert in Computer Use, but the later REA rasters omit it; these remain failed alert-capture controls. The owned files remain exact during refusal, permissions return to their recorded modes, writable Save persists the test edits, the clean owned tabs close, and the original document and Light appearance return. No automated alert dismissal is claimed where fresh state shows the alert already gone. Pen's Save As normalizes its saved copy to version 2.22; its owned source remains version 2.21 with the original bytes. No app source or installed executable changes in this recheck.

FILE-NATIVE-SAVE-UI stays Verify. Matched critical-alert appearance, live OS Auto-theme transitions, updater lifecycle, broader recovery and the combined beta journey remain separate acceptance gates. Historical suite results above are not a new full-check claim.
