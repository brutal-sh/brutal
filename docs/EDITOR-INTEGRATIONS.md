# Editor integrations

Brutal exposes its active document through a local authenticated MCP server. The setup below connects an editor’s agent to that server; it does not install a visual `.pen` custom editor. Matching Pen’s Cursor/VS Code visual extensions remains an open feature.

Start Brutal, open the intended document, then open Settings → MCP. If the server needs installation, follow [local runtime setup](LOCAL-RUNTIME.md). Wait for Running and copy the displayed endpoint. Use that endpoint rather than assuming a port: another process can occupy the default.

Keep authentication enabled. On macOS the running bridge’s private discovery file is `~/Library/Application Support/Open Pen/mcp.json`; its `authToken` is the bearer credential. Read that file locally when configuring a client. Do not paste the token into chat, screenshots, a shared workspace file or source control. A server restart can replace it; update the client if authentication then fails. This guide and the Help menu never read or transmit that credential.

## Cursor

Merge an `open-pen` entry into your user-local `~/.cursor/mcp.json`, preserving the existing `mcpServers` entries. Replace the two placeholders locally:

```json
{
  "mcpServers": {
    "open-pen": {
      "url": "<endpoint copied from Brutal Settings>",
      "headers": { "Authorization": "Bearer <local authToken>" }
    }
  }
}
```

Check the server’s tool list in Cursor before requesting changes. First ask it to inspect the active document, then request a small editable shape and check the result and Undo in Brutal. Follow [Cursor’s MCP documentation](https://prod.cursor.com/docs/mcp) for client configuration and connection errors.

## VS Code

For the local agent harness, open its user-profile `mcp.json` from the MCP configuration controls and merge an `open-pen` HTTP server into that profile’s `servers` object. Preserve other entries. Keep the bearer token in your private user configuration rather than a shared `.vscode/mcp.json`, and exclude that credential-bearing configuration from Settings Sync:

```json
{
  "servers": {
    "open-pen": {
      "type": "http",
      "url": "<endpoint copied from Brutal Settings>",
      "headers": { "Authorization": "Bearer <local authToken>" }
    }
  }
}
```

Start the server from VS Code’s MCP controls and inspect its tools. Run the same inspect → create → canvas check → Undo journey. Other agent harnesses can use different configuration formats; use the [VS Code MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration) and [server setup guide](https://code.visualstudio.com/docs/agent-customization/mcp-servers) for the selected harness.

## Verification boundary

Client configuration formats were checked against official documentation on 2026-10-31. The app’s menu → documentation destinations and local-server status are tested separately. These instructions have not yet been executed end to end in Cursor or VS Code. The existing native Codex login → editable rectangle → Undo result is recorded in [local runtime setup](LOCAL-RUNTIME.md); it does not establish either editor integration.
