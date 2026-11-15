# Execute design work in Open Pen

Use the installed MCP tool list or CLI tool help as the argument contract. The
current independent tool set includes `get_current_page`, `get_selection`,
`get_node`, `create_shape`, `update_node` and other document operations. A separate
Pen-compatible `execute` facade is not established by those existing names.

In an interactive CLI session, calls contain literal data:

```text
read_skill({ path: "pen-schema.md" })
get_current_page()
get_selection()
create_shape({ type: "RECTANGLE", name: "Owned square", x: 24, y: 24, width: 64, height: 64 })
```

Use the created node's returned ID in subsequent calls. Do not guess IDs or select
another document merely because the intended target disappeared. In connected
sessions, the CLI pins the document/page and refuses incompatible or stale app
identities. A read-only resource call does not grant editing permission.

Headless interactive sessions write only on explicit `save()`. Exiting with
`exit()`, EOF or interruption does not implicitly save unsaved edits. Connected
sessions edit the live document; use the documented save/history controls and
inspect the exact target before retrying a failed operation.

Use `render` for supported design JSX, not React DOM output. Use only APIs exposed
by the chosen execution environment. Existing explicit `eval` is code execution,
not a sandbox and not a substitute for a missing validated tool.

After a mutation, inspect geometry, contents, order and history. Decode exported
images independently when output matters. Save and reopen an owned copy before
claiming persistence; a successful build or tool return is insufficient.
