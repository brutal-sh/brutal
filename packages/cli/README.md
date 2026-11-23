# Brutal CLI

Inspect and export design files from the terminal, or connect to a document open in Brutal.
Use the private Brutal checkout and the Bun version pinned in its root `package.json`.

```sh
bun install --frozen-lockfile
bun run build:packages
bun run brutal --help
bun run brutal info path/to/design.pen
```

Inspection commands support `--json` for automation. For a live document, open Brutal and
confirm the local server is running in **Settings → MCP**. Run
`bun run brutal documents list` to check that the CLI can see the app.

The checkout still accepts the legacy `bun open-pencil` command.

- [Brutal CLI setup](https://brutal.sh/help/#cli)
- [Report an issue](https://github.com/brutal-sh/brutal-feedback/issues/new/choose)

MIT License.
