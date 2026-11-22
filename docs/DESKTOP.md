# Brutal desktop isolation and acceptance

Brutal uses the same local app identity and bridge discovery as the earlier Open Pen builds, so the installed app can access existing preferences, recovery data and credentials. The macOS beta runs as `Brutal.app`.

The identity table describes the current app. The executed checks below record the October 29, 2026 configuration and provider-callback work.

## Identity

| Surface                              | Fork setting                                         |
| ------------------------------------ | ---------------------------------------------------- |
| Product/window/PWA name              | Brutal                                             |
| Tauri bundle identifier              | `dev.jpoindexter.openpen`                            |
| Native test bundle identifier        | `dev.jpoindexter.openpen.native-test`                |
| OS link scheme                       | `openpen://`                                         |
| Keychain service                     | `dev.jpoindexter.openpen.credentials`                |
| MCP default HTTP port                | `7610`                                               |
| macOS MCP discovery/socket directory | `~/Library/Application Support/Open Pen/`            |
| Windows MCP directory                | `%LOCALAPPDATA%\Open Pen\`                           |
| Linux MCP directory                  | `$XDG_RUNTIME_DIR/openpen/`, otherwise `~/.openpen/` |

The app passes its computed discovery and socket paths explicitly to the MCP process. On Linux, app-managed MCP uses the home-directory fallback. `OPENPENCIL_MCP_DISCOVERY_PATH`, `OPENPENCIL_MCP_SOCKET`, and `PORT` remain supported overrides. A separately installed upstream MCP client must receive the fork discovery path to connect to this fork. Installing the fork globally under upstream executable names can replace those executables; use a local build/path when co-installing.

Internal `@open-pencil/*` package imports, Rust crate and development binary names and document-chat `openpencil://node/...` reference syntax remain compatible. Chat references do not register an OS protocol. Cloud, collaboration and generated Storybook links use the fork OS scheme. Existing MIT licensing, upstream authorship and attribution are retained.

No original app files or keychain entries were migrated or modified. The native capability file retains existing sensitive-file deny rules, adds the fork discovery files to those denies, and permits read access only to the fork discovery locations.

## macOS beta

Build the Apple-silicon candidate with `bun run build:macos-beta`. The local Tauri configuration uses ad hoc signing. A distribution candidate uses Developer ID signing and Apple notarization, with the ticket stapled to `Brutal.app`. The beta ZIP includes the app and its license notices. See [Tauri macOS signing](https://v2.tauri.app/distribute/sign/macos/).

Verify the ZIP checksum and Gatekeeper assessment after extraction. Use a clean macOS login for launch, editing, Save and reopen, recovery, and the bundled MCP bridge. Keep the previous trusted app available for rollback. The shared bundle identity carries preferences and credentials forward, so close the previous app before opening Brutal.

Publish the signed ZIP and `SHA256SUMS.txt` as a prerelease at
[`brutal-sh/open-pen-feedback`](https://github.com/brutal-sh/open-pen-feedback/releases).
Verify the uploaded ZIP's SHA-256 against the candidate before publishing, then download
it from the public release and check the digest again. Link the approved release from
[Brutal Help](https://brutal.sh/help/getting-started/#download).

## Updates

The Apple-silicon beta build checks the [Brutal update feed](https://brutal.sh/download/mac-updater.json).
The window shows the release summary, opens the matching GitHub release, and installs the signed app.
Install Beta 10 manually once if you have a previous beta. Use **Brutal → Check for Updates…** for later betas.

### Release a Mac beta update

1. Advance the version in `desktop/tauri.macos-beta.json` and build with `bun run build:macos-beta`.
2. Developer ID-sign and notarize the app. Staple and validate the ticket before assembling both the manual ZIP and the updater archive.
3. Archive the stapled `Brutal.app` with `bsdtar -czf "Brutal-$version-macOS-arm64.app.tar.gz" -C "$bundle_directory" Brutal.app`.
4. Sign that archive with the Brutal updater key using `bun run tauri signer sign --app-version "$version" "$archive"`. Set `TAURI_SIGNING_PRIVATE_KEY_PATH` to the encrypted key and supply its password through `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` only for the signing command.
5. Put `release-notes.md`, the archive, and its `.sig` in the release directory. Run `bun tools/release/release-packages/src/native/brutal-beta-manifest.ts "$release_directory"` from the repo root to produce `latest.json`.
6. Test checking, opening Full release notes, installing and restarting from an older updater-enabled build in a disposable location. Publish the ZIP, archive, signature, manifest, and checksums on the [feedback repository](https://github.com/brutal-sh/open-pen-feedback/releases).
7. Verify the public archive and checksum, then deploy `latest.json` at `/download/mac-updater.json` with the website’s download links for the same release. The deployment lets the feed and download links change together.

The encrypted updater key is managed outside the checkout. On the release Mac its password is stored in the
`sh.brutal.release.updater` Keychain item. The app contains the public key and requires the signature to name
the advertised app version. Preserve recoverable custody of the private key and password before changing release machines.
[Tauri updater signing requirements](https://v2.tauri.app/plugin/updater/#signing-updates)

## Provider callbacks

OpenRouter native sign-in now acquires a loopback-only listener on an OS-assigned port before opening the system browser. Its callback is `http://localhost:<port>/auth/callback`. The existing PKCE exchange, per-attempt state validation, bounded request parsing, cancellation and listener cleanup remain in the flow. No hosted upstream relay receives the native callback. The browser popup flow remains separate.

The existing ChatGPT listener commands are reused with an optional provider argument; omitting it preserves ChatGPT's required port `1455`. A busy ChatGPT port is still reported as unavailable. No external provider's authentication or usage rules are bypassed. [OpenRouter documents localhost callbacks on arbitrary ports and PKCE](https://openrouter.ai/docs/guides/overview/auth/oauth).

## Executed checks

Bun `1.4.2` executed **68 focused tests, 0 failures**:

- 42 tests: updater scheduling/check behavior, OpenRouter PKCE and loopback IPC validation, shared sign-in lifecycle, MCP startup/error handling, discovery/socket paths.
- 26 tests: Cloud link contracts and app parsing, document links, Storybook-generated source links and exports.

Formatting checks passed for the changed OAuth, MCP spawning and Vite configuration files. These tests exercise local logic, temporary paths, mocked Tauri IPC and export output. They do not establish a signed native app launch, keychain access, installed URL-handler registration, or a live provider authorization/code exchange.

## Remaining runtime proof

- Generate native icons and build the fork. Run `cargo test --manifest-path desktop/Cargo.toml network::oauth::tests`, which includes a real local TCP callback/response/closure test with synthetic code and state.
- Use a separate macOS login for the signed candidate. Verify `openpen://` routing, MCP discovery and authentication, and document opening.
- Exercise OpenRouter sign-in with an explicitly chosen account and verify cancellation, retry, returned identity and authorized editor request. No live provider login or credential access was performed for these changes.
- Verify manual update failure wording in the native app and that startup performs no upstream update request.

These are acceptance gaps, not completion claims. Full feature parity is tracked separately in [PARITY.md](PARITY.md).
