# Open Pen desktop isolation and acceptance

2026-10-29. This records the independent fork configuration and focused checks. It does not establish native launch, authenticated provider login, or full Pen feature parity.

## Identity

| Surface                              | Fork setting                                         |
| ------------------------------------ | ---------------------------------------------------- |
| Product/window/PWA name              | Open Pen                                             |
| Tauri bundle identifier              | `dev.jpoindexter.openpen`                            |
| Native test bundle identifier        | `dev.jpoindexter.openpen.native-test`                |
| macOS signing                        | Local ad hoc (`signingIdentity: "-"`)                |
| OS link scheme                       | `openpen://`                                         |
| Keychain service                     | `dev.jpoindexter.openpen.credentials`                |
| MCP default HTTP port                | `7610`                                               |
| macOS MCP discovery/socket directory | `~/Library/Application Support/Open Pen/`            |
| Windows MCP directory                | `%LOCALAPPDATA%\Open Pen\`                           |
| Linux MCP directory                  | `$XDG_RUNTIME_DIR/openpen/`, otherwise `~/.openpen/` |

The app passes its computed discovery and socket paths explicitly to the MCP process. On Linux, app-managed MCP uses the home-directory fallback. `OPENPENCIL_MCP_DISCOVERY_PATH`, `OPENPENCIL_MCP_SOCKET`, and `PORT` remain supported overrides. A separately installed upstream MCP client must receive the fork discovery path to connect to this fork. Installing the fork globally under upstream executable names can replace those executables; use a local build/path when co-installing.

Internal `@open-pencil/*` package imports, Rust crate/binary names and document-chat `openpencil://node/...` reference syntax remain compatible. Chat references do not register an OS protocol. Cloud, collaboration and generated Storybook links use the fork OS scheme. Existing MIT licensing, upstream authorship and attribution are retained.

No original app files or keychain entries were migrated or modified. The native capability file retains existing sensitive-file deny rules, adds the fork discovery files to those denies, and permits read access only to the fork discovery locations.

## Updates

The fork has no update-feed endpoints and does not generate upstream update artifacts. Vite derives the startup-update flag from the endpoint configuration, including embedded app builds. Startup checks are disabled; manually requesting an update follows the existing failure-reporting path because no feed is configured. Signed-update validation remains enabled; the retained upstream public key is inert without an endpoint. Configuring a fork release channel later requires its own signing key and explicit endpoints.

Ad hoc signing is suitable for local execution and is not Apple notarization or distribution approval. See [Tauri macOS signing](https://v2.tauri.app/distribute/sign/macos/) and [signed updater requirements](https://v2.tauri.app/plugin/updater/).

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
- Launch the built Open Pen beside the original app; verify separate app storage/keychain namespace, `openpen://` routing, MCP discovery/auth and document opening. Do not overwrite the original installation.
- Exercise OpenRouter sign-in with an explicitly chosen account and verify cancellation, retry, returned identity and authorized editor request. No live provider login or credential access was performed for these changes.
- Verify manual update failure wording in the native app and that startup performs no upstream update request.

These are acceptance gaps, not completion claims. Full feature parity is tracked separately in [PARITY.md](PARITY.md).
