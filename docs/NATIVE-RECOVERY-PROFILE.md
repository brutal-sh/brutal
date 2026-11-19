# Isolated native recovery acceptance

Current qualification: **bounded Executed** for TEST-RECOVERY-NATIVE-PROFILE after the fresh corrected-store three-process journey and independent review below. The earlier A/B failure and historical same-profile observations remain versioned; the [namespace prerequisite](NATIVE-STORE-ISOLATION.md) is separately qualified. The test-host correction does not migrate or clear normal document/recovery stores or credentials.

The original four profile criteria are satisfied within their isolated native-test scope. Actual OS panel/refusal/retry results are separately recorded in [native recovery panels](NATIVE-RECOVERY-PANELS.md); corresponding current Pen states, normal-installed delivery and full FILE-07/08 acceptance remain open. The normal-app UI incident and preference-preservation boundary remain in the isolation report.

## Historical same-profile receipt

FILE-07 remains Verify. On 2026-11-12, the rebuilt isolated host executes the complete three-process existing-file recovery journey below. This accepts the bounded test-profile persistence criterion; OS picker delivery, external-file permissions, read-only behavior, automatic backup debounce, normal installed-app delivery and matched Pen recovery states remain open.

The implementation is test-only and lives in the owned qualification checkout. Run these commands only against a freshly rebuilt isolated host and after Computer Use observes the visible desktop; the helper also checks document visibility. The normal installed app is separate.

## Profile boundary

The `native-test` Cargo feature retains the existing separate application identifier, in-memory credentials and default incognito main WebView. Only an explicit `--open-pen-native-test-profile=/absolute/marker` argument can enable persistence. Normal builds refuse that reserved argument before initializing an application, so a mistakenly selected normal debug executable cannot fall through to the user profile.

The marker must be `recovery-profile.json` in the same private, canonical, direct temporary-directory child used by the runner's MCP route. Root and marker must be regular, owner-private paths; symlinks, unexpected fields, invalid versions, oversized markers and zero store identities are refused. Configuration is validated before mutation. The supported persistence platform is macOS 14 or newer; unsupported platforms refuse explicit persistence while retaining ordinary ephemeral tests.

The marker owns a fresh 16-byte WebKit store identifier and private `profile-data` root. Tauri's app-directory override does not relocate the WebKit store: that store is OS-managed. Temporary-directory removal does not remove it. This runner deliberately retains its own marker, identity and store; it never enumerates or deletes other stores.

The readback command exists only in native-test builds and only answers the main WebView. It checks the actual active configuration, store identity and resolved app-data root before returning PID, executable and profile paths. The Node guard compares those values to its fresh marker, checks the live OS executable and exactly one matching profile argument, then rechecks immediately before interruption. It never kills by app name or port. Successful close and crash paths verify that the previous validated PID exited before another process opens the same store. If the identity readback itself fails during launch, only the service cleanup can run: there is no validated PID to wait on. That failure-cleanup boundary remains unexecuted; the runner aborts rather than relaunching or deleting the profile. No guaranteed startup-failure cleanup is claimed.

## Executed controls

- Native-test Rust library: 120 passed, zero failed/ignored. Normal-feature Rust library: 88 passed, zero failed/ignored. These execute parser, path, permissions, configuration, SDK-context and identity-refusal contracts; they do not build or display a WebView.
- POSIX ownership controls: five passed, including real disposable child processes with valid, absent, duplicate and different profile arguments. All owned children exit before fixture cleanup. Windows skips these `ps` controls.
- Both test compilation boundaries pass. The native boundary explicitly loads its canonical vendor-derived Window declaration before the service's incompatible transitive declaration. No global vendor cache or native permission is changed.
- The complete repository check exits zero, including zero duplicate-code clones. The separate native-test build succeeds; this compiles the WebView host but does not launch it.
- Ten touched TypeScript owners pass strict 300 code lines/file, 50/function, complexity 10, four parameters and depth four.

Private evidence lives under `local-evidence/claude-brand-review-2026-11-11/native-{profile-qualified-rust,production-qualified-rust,process-ownership-qualified,restart-native-types-qualified,restart-strict-qualified}.*`. Earlier red controls and rejected intermediate type checks are retained separately.

The current host includes the custom-font guard, discard alert and renderer ownership extraction. Its SHA-256 is `7dca50c64622079d01099aa620beb496de4ffb55d2432e489e36a61048385739`; the exact 50-file native/renderer source freeze is retained in `native-recovery-final-source.json`. The earlier compiled-host receipt remains historical. The only delta from the earlier native runtime/helper qualification is rustfmt module ordering; fresh native-test/normal Rust runs again pass120/88 cases, and the rebuilt final host repeats the complete three-process journey.

The current native journey passes with three distinct verified PIDs, one persistent test-owned store and unchanged original source until explicit Save. Native Restore and WebDriver Save succeed; independent decoding finds both 64 × 64 rectangles. The third launch has no recovery offer or stale backup and executes Duplicate/Undo. Guarded teardown returns before the success receipt is written. Private receipts: `native-recovery-final-{build.log,journey.log,journey.json,source.json}`.

The same host also passes twelve native document changes, original-layer preservation, P3/sRGB changes and resizing with at most three no-error contexts. Saved native screenshots independently contain exact red/gray center pixels; see `renderer-native-resources/verification.json`. These are synthetic native controls, not full matched Pen visuals.

## Original native journey

After Computer Use observes an unlocked desktop, build only the isolated host:

```sh
bun run build:native-test
```

Run the standalone session helper explicitly, outside the canonical WDIO runner so no outer session shares its route or store:

```sh
bun tests/helpers/tauri/restart/run.ts
```

The runner creates a fresh private profile and synthetic external `.pen` file. First launch opens that source through native startup arguments, confirms local-file autosave is off, creates an editable second rectangle and explicitly persists recovery. It hashes the backup and checks unchanged original bytes, interrupts only the verified owned PID, and starts a second process on the same profile. Restore uses the public dialog; the source must remain unchanged until explicit Save. The written source is independently parsed and both 64 by 64 rectangles checked. A clean close and third distinct PID must reopen that source, show no recovery offer, retain no stale backup, and support Duplicate/Undo. A successful receipt is written only after the whole journey and teardown return.

This is a native file association, recovery, Save and process-persistence control. Shape creation and snapshot timing use existing editor methods; the Save/Duplicate/Undo keys use WebDriver. It does not establish physical pointer/keyboard acceptance, automatic backup debounce, OS chooser interactions, normal-installed-app behavior, power-loss durability or actual Pen visual/functionality parity. Those FILE-07 criteria remain open after this bounded runner passes.

Owned Rust formatting passes. The whole-repository `cargo fmt --check` retains a separate pre-existing assertion-wrap difference in `desktop/src/agents/lookup.rs`; that unrelated source is unchanged. The original failed format receipt is retained.

## Fresh corrected-store journey — 2026-11-12

Current source `6bb36166a` plus the compact pane-header candidate builds the separate native-test host. Its raw executable hashes `5add27fc65cb3cb8e5be7d1805afd02b80f7a4b3200c559620cc697765e9b915`. The canonical three-process runner exits zero with PIDs95877/95896/95913 on one fresh, actual persistent WebKit store. Original bytes remain unchanged until explicit Save; independent public decoding verifies two64×64rectangles at0,0/120,120. Third reopening has no recovery offer or backup and executes Duplicate/Undo. The receipt follows guarded teardown.

Independent review maps the original four Done criteria to this execution and retained checks for unchanged owners: all69native/config source hashes and the six restart helpers match current HEAD. The corrected namespace prerequisite is bounded Executed. This restores TEST-RECOVERY-NATIVE-PROFILE to bounded Executed; prior same-profile results do not regain the disproved cross-profile claim. Private evidence: `local-evidence/native-recovery-reentry-2026-11-12/{formal-profile-receipt.json,formal-profile.log,native-source-freeze.json,independent-formal-review.json}`.

Real native OS picker/refusal/retry outcomes now have separate [panel evidence](NATIVE-RECOVERY-PANELS.md). Neither result accepts normal-installed recovery, physical input, power-loss durability or matched current Pen recovery states.

## Automatic backup through a native edit — 2026-11-19

The three-process runner now uses the visible Layers panel and the Duplicate shortcut on an existing-file fixture with source autosave off. The first process starts with no backup. It waits for the automatic backup without forcing a flush, verifies the file still contains the original bytes, and stops only that verified test process. The second process opens the actual Recovery dialog on the same isolated WebKit store, finds the exact backup digest, and restores both layers while the source bytes remain unchanged. After the dialog closes and the restored document receives focus, Save writes two editable 64 × 64 rectangles and removes the backup. A third distinct process reopens the saved file without a new recovery offer, then exercises Duplicate and Undo.

This run used the Mac test executable built from `0610afcbe`. The earlier attempt reached Restore, but an embedded-driver Save shortcut issued before waiting for dialog dismissal and document focus left the original file and backup intact. The retained result does not establish a failure after focus returns. The successful run waits for those observable states. Private receipts are under `local-evidence/native-auto-backup-2026-11-19/`. FILE-07 remains in Verify for the normal-installed and reference recovery criteria. The old Cancel-to-Home report remains unclassified.

## Normal-feature macOS recovery after process loss — 2026-11-19

A separate macOS bundle built from `e9f221ef7` uses the default Cargo
features and a fresh application identifier. The build override changes
the product name and identifier and omits the usual file and deep-link
registrations for this copy. The bundled executable has SHA-256
`433347e986a05db0654d23caa16c39739f0a4b9f0ef451c3c9716654ec416d21`.
Strict local signature verification passes. The runtime opens a new
WebKit recovery database under its own identifier. The original app
closes normally from Home before the test to release its local bridge.

A physical Command-D duplicates the only 64 × 100 red rectangle in an
owned existing `.pen` file. Automatic persistence adds two recovery
records and one blob. The dirty tab and backup are verified before
interrupting only the isolated app process. The original source
checksum and the recovery digests match after process loss and relaunch.

The real startup dialog offers Restore for the owned file. Restore
reopens two editable layers and keeps the original source checksum.
File → Save writes both rectangles and removes the recovery records and
blob. A third process opens the saved file with both layers, identical
saved bytes and an empty recovery store.

The first interruption guard stopped on a File changed dialog. The
source checksum matched the original, and the filesystem change time
was newer than its modification time. Ignore kept the dirty edit and
backup intact. The triggering event was unobserved. The original
installed app relaunched normally, showed its two existing recovery
offers, and returned to Home after dismissal. Its executable, four
recovery records and two blobs matched the initial digests.

The first build stopped on Vite configuration resolution. Retrying
with installed Node 24 completed the same build commands. Logs, app
hashes, state transitions and owned output are retained privately in
`local-evidence/normal-recovery-restart-2026-11-19/`. This verifies the
process-loss path on the isolated normal-feature bundle. Process loss on
the installed identity and the corresponding Pen recovery-state matrix
remain open on FILE-07.

## macOS bundle replacement and rollback — 2026-11-19

Two arm64 v0.16.0 builds use the normal app features and the same
disposable bundle ID, `dev.jpoindexter.openpen.packageqa20261119`. The
shared build override changes the product name and bundle ID and removes
file and deep-link registrations. Both bundles pass strict local ad-hoc
signature verification. The test ran on macOS 27.3 (26C5047e).

| Test bundle | Source | Executable SHA-256 | ZIP SHA-256 |
| --- | --- | --- | --- |
| Baseline | `7b72a75baba210ee6bc42a7e104186ded9f95af8` | `6c7c2ecd3e1648b0ac166ce313757baefd567d3254dd9487c8f53940268e6c16` | `430132fc72191777a4883e20cb049a275749e3b24f26d2578385ca021f8eb58f` |
| Candidate | `a30883a181d1c2e4b00b14f5c007c53577f97858` | `350bc71a19512bbd995a6354ab8633acf858a89617190e207c2bc062b7c17ab1` | `7278d2b80f10b14967355739960ae4197e1e6c6e09789d17f2a2fe681acea7d0` |

1. Extract the baseline ZIP into a private test install directory. Start
   from Home and open a synthetic existing `.pen` file. Duplicate its
   rectangle and Save. Open a second synthetic file and duplicate its
   rectangle. The automatic backup adds two records and one blob, and
   the second source still matches its original checksum. Interrupt the
   confirmed test process. The backup digests match after interruption.
2. Move the old bundle aside and extract the candidate at the same
   install path. Launch and Restore the second file. Duplicate the two
   recovered layers and select **Close and Keep Backup**. A normal quit
   and new process shows the startup recovery offer. Dismiss the offer
   and open the original file to restore the four dirty layers directly.
   Both source checksums match their expected values. Quit and keep the
   backup again.
3. Replace the candidate with the preserved baseline bundle at the same
   path. Its signature and executable hash match the original baseline.
   Launch, Restore and Save the four recovered layers. Decode the output
   to check four distinct 83 × 57 rectangle IDs and the original name
   and color. Reopen that file and the earlier saved file in the app.
   The backup is empty after Save and after Quit.

The initial baseline launch with the document passed at startup stalled
with its synchronous file-watcher registration on the main thread. The
successful transition starts at Home and uses copies in a dedicated
temporary folder. A separate candidate launch opens the initial file at
its original path, shows its one editable layer, and quits normally.
This candidate check uses the already initialized disposable profile.

The regular installation has the same running process and executable
checksum. All four normal recovery records and both blobs retain their
original digests. The private receipts are in
`local-evidence/macos-package-transition-2026-11-19/`. This establishes
manual bundle replacement, restart and rollback with the disposable
identifier. The real release identifier, updater delivery, clean-machine
trust, and remaining installed-identity and Pen recovery criteria are
open. Both packages report the same version.
