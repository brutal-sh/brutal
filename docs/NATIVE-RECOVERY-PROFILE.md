# Isolated native recovery acceptance

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

## Executed native journey

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
