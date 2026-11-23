# Brutal MCP

Connect an MCP client to documents in the running Brutal editor. The Apple-silicon Mac beta
includes the HTTP server. In Brutal, open **Settings → MCP → Local server** and use the endpoint
and authentication details shown there. Bun is required only for the checkout commands below.

```sh
bun run brutal-mcp --help
bun run brutal-mcp-http --help
```

The stdio bridge uses discovery for the running app. On macOS and Linux it prefers a private
Unix socket, with a loopback TCP fallback. Use the app's connection details for Streamable HTTP.
The client sends an initialize request and keeps the returned `Mcp-Session-Id` for its session.

- [Brutal MCP and client setup](https://brutal.sh/help/#mcp)
- [Report an issue](https://github.com/brutal-sh/brutal-feedback/issues/new/choose)

MIT License.
