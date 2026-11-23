# Brutal desktop isolation and acceptance

Brutal uses the same local app identity and bridge discovery as the earlier Open Pen builds, so the installed app can access existing preferences, recovery data and credentials. The macOS beta runs as `Brutal.app`.

The identity table describes the current app. The executed checks below record the October 29, 2026 configuration and provider-callback work.

## Identity

| Surface                              | Fork setting                                         |
| ------------------------------------ | ---------------------------------------------------- |
| Product/window/PWA name              | Brutal                                               |
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

Find signed beta ZIPs, release notes, and checksums under [Brutal Releases](https://github.com/brutal-sh/brutal-feedback/releases). Follow [Brutal Help](https://brutal.sh/help/getting-started/#download) to install and verify a build. Use the [public feedback repository](https://github.com/brutal-sh/brutal-feedback/issues) to report issues.

## Updates

The distributed Apple-silicon beta uses the [Brutal update feed](https://brutal.sh/download/mac-updater.json) and installs signed updates. Install from the ZIP once if you have Beta 9 or earlier. From Beta 10 onward choose **Brutal → Check for Updates…**. In a developer build, Vite derives the startup-update flag from the configured endpoint.

### Usage stats

The distributed Beta 16 has usage sharing off. A beta that offers **Share stats** asks after welcome and sends usage stats only after consent. Change the choice in **Settings → Privacy**. Review the [public disclosure](https://brutal.sh/help/privacy/#what-is-sent) and the [candidate build and signed verification steps](https://github.com/jpoindexter/open-pen/blob/codex/brutal-telemetry/docs/DESKTOP.md#opt-in-usage-stats-in-a-mac-beta).

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
- Verify manual update failure wording in a developer build without an endpoint and confirm it makes no startup update request.

These are acceptance gaps, not completion claims. Full feature parity is tracked separately in [PARITY.md](PARITY.md).
