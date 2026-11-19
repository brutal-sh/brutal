# Local desktop AI runtime

Open Pen's macOS/Linux developer installer builds a standalone MCP canvas bridge under `~/.local/share/openpen/runtime`. Normal launch does not load bridge code from the checkout. Packaging the companion inside the `.app` remains unimplemented; setup still requires the checkout and its dependencies. Bun 1.4.2 is the tested build runtime.

With Node.js, npm, and Bun available, run these commands from the Open Pen checkout:

```sh
bun run build:packages
bun run setup:local-runtime
```

The installer pins the official `@agentclientprotocol/codex-acp` adapter to version `2.5.0` under `~/.local/share/openpen/agents`. It creates `~/.local/bin/codex-acp` pointing to that adapter. The separate `~/.local/bin/openpen-mcp-http` link points to a verified standalone executable in the owned runtime directory.

Before activation, the candidate must report the package version and pass an authenticated health check in a disposable directory. The installer verifies its copied SHA256, then atomically switches only the exact legacy checkout link or a hash-verified previously installed bridge. Old binaries remain available. Existing foreign files, links, modified binaries, or unowned runtime directories cause refusal. Package install scripts are disabled.

The former checkout link failed when launched from Finder: macOS attributed the child process's protected-file access to Open Pen, and Node blocked before opening its listener. The standalone build embeds schema text and uses CSS Tree's supported static distribution to include its JSON data. It requires no broader filesystem permission.

The desktop app already searches `~/.local/bin`, including normal Finder launches. No shell profile change or test-only PATH override is required. The adapter uses the user's ordinary Codex configuration; the installer does not access or copy login credentials.

```sh
codex-acp --version
openpen-mcp-http --version
```

The fork uses `openpen-mcp-http` exclusively. Installing the upstream `@open-pencil/mcp` package is not a substitute, and the app no longer offers that installation. Preserve the upstream executable if it is already installed for another application.

After setup, restart Open Pen, select Codex in AI settings, and verify its account and canvas connection. On October 30, 2026, the normal installed app completed the real Home prompt → Codex → editable red rectangle → Undo workflow using the existing login and this standalone bridge. This establishes that bounded workflow; it does not qualify every agent, tool, or platform. A successful version or health command alone is insufficient evidence.

On November 19, 2026, the regular installed build from `7b72a75ba` reported connected after **Check again**. The existing Codex login created one editable red rectangle in a disposable document. With canvas focus, the native keyboard shortcuts removed and restored the layer through Undo and Redo. Save wrote a single 96 × 64 rectangle at (100, 100) with fill `#FF0000`. Closing and reopening the file restored the layer and preserved the saved checksum. The installed build ran with a healthy bridge. Recovery from an unavailable bridge was verified separately with an isolated Mac build from `0610afcbe`.

The same installed build also completed the [Describe recovery check](https://trello.com/c/of0mQo8W) on 19 November. The agent first called Describe with empty arguments. The expanded tool error directed it to find a node ID. The agent then called Get Page Tree and successfully described the returned target, which appeared as the owned layer in the tool result. The disposable source retained its checksum, and the clean tab closed. The two focused Describe and stock-photo test files passed all 13 tests.

The [stock-photo fallback](https://trello.com/c/HUgrREF3) executed in the installed Mac app with Pexels and Unsplash both unconfigured. The stock tool returned guidance to keep the placeholder. Codex continued the design by adding a separate rectangle. Save and reopen retained the original placeholder's ID, geometry and solid fill alongside the new rectangle.

A separate regression reproduced Pexels staying active after its key was removed, even with Unsplash still configured. The correction removes cleared providers from the session. The isolated Mac build exercised adding and removing disposable keys through Settings, then called the actual local MCP stock tool after both services showed as unconfigured. It returned the same guidance and left the original layer and source bytes unchanged. The 39 focused tests cover provider selection and image application with controlled provider fixtures.

If the model reports that its canvas tools are unreachable, use **Check again**. The app checks its bridge before connecting the agent and restarts an unresponsive bridge it started. In earlier builds, go to **Settings → MCP → Restart MCP server**, then open the model settings and check again.
