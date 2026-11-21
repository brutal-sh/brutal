---
title: Controlling the App
description: Open, save, switch, and close documents, undo and redo, change settings, and call any editor tool in the running app from the CLI.
---

# Controlling the App

While the desktop app is running, the CLI drives it over the same automation bridge as the [MCP server](/programmable/mcp-server). Headless `interactive` sessions and file-backed `tool call` run locally; the other commands on this page need the running app.

## Headless interactive sessions

Keep a local document open while calling editor tools:

```sh
openpencil interactive -o design.pen
openpencil interactive -i existing.pen -o edited.fig
```

The output path is required and must end in `.brut`, `.pen`, or `.fig`. Enter one call per line:

```js
create_shape({ type: 'RECTANGLE', name: 'Square', x: 12, y: 34, width: 64, height: 64 })
get_page_tree()
export_image({ format: 'PNG' })
save()
exit()
```

Run `openpencil tool list` and `openpencil tool describe <name>` to discover the
available tools and argument schemas. Tool results are JSON; image exports return
encoded image data. Arguments can contain data literals, including unquoted keys,
strings, arrays and nested objects. Command syntax does not evaluate expressions.
The existing `eval` tool executes its code string when explicitly invoked.

Only `save()` writes the document. Exit, end-of-input and interruption leave the
last saved output unchanged. A refused write retains live edits for retry. Failed
tool calls restore their document state and report an error; the shell can accept
another command, and a session containing errors exits with a nonzero status.
Input files and their local resources remain unchanged when saving a copy; `.pen`
output embeds supported images so the saved copy can move to another folder.

This command uses the existing editor tool names. Pen's `execute`, `read_skill`
and `get_style` contracts have separate acceptance work.

## Connected interactive sessions

Read the open documents, then connect to a specific tab:

```sh
openpencil documents list --json
openpencil interactive --app desktop --document-id tab-123 --page-id 0:1
openpencil interactive -a desktop -i designs/landing.pen -o designs/copy.pen
```

Without an input path or document ID, the session selects the one active document.
Use a matching updated Brutal app: a bridge that does not advertise unique
document identities is refused before opening a file or applying an edit.
An input path opens that file; it cannot be combined with a document ID. The first
JSON response identifies the connected document and page. Later tab or page
switches do not change that target. A closed target or changed app connection
requires a new session; commands never fall back to the newly active document.

Use the same tool calls, plus `undo()`, `redo()`, `save()` and `exit()`. The output
path is optional: `save()` writes to it when supplied, or uses the app's existing
writable source. An unsaved document needs an explicit output path. File access
follows the app bridge's configured root and permissions; automation never opens
a Save dialog.

Tools edit the app's live document. Exit, EOF and interruption leave those edits
in the app and perform no additional save or discard. App history and failure
semantics apply: a failed structural/script operation can leave an undoable
partial edit. Inspect the result and use `undo()` when appropriate. Errors keep
the session's exit status nonzero, even after a later successful explicit retry.
Application errors and invalid replies do not trigger command replay.

## Documents

Each open tab is a document with a stable ID. List them, then pass `--document-id` (and `--page-id`) to aim a command at a background tab without switching to it:

```sh
openpencil documents list --json
openpencil tree --document-id tab-123 --page-id 0:1
```

Open, create, save, and close documents:

```sh
openpencil documents open designs/landing.fig      # opens in a new tab
openpencil documents new --path designs/draft.fig  # empty document, saved to the path
openpencil documents save --document-id tab-123
openpencil documents save --document-id tab-123 --path designs/copy.fig
openpencil documents close --document-id tab-123
openpencil documents close --document-id tab-123 --save      # or --discard
```

Relative paths resolve against the shell's working directory. These commands never open a dialog in the app, because nobody may be there to answer it. Closing a document with unsaved changes fails unless you pass `--save` or `--discard`, and saving a document that has never been saved needs `--path`. Each command prints the document and page it acted on; with `--json` it prints `{ "result", "target" }`, so a script can read the new document's ID from `target.documentId`.

To bring a tab to the front, optionally on a specific page:

```sh
openpencil documents activate tab-123 --page-id 0:4
```

## Undo and redo

Step back through changes made through the CLI and MCP, like **Edit → Undo** and **Edit → Redo**:

```sh
openpencil undo --document-id tab-123
openpencil redo --document-id tab-123 --json
```

```json
{
  "result": { "applied": true, "label": "Set opacity", "scope": "document" },
  "target": {
    "documentId": "tab-123",
    "documentName": "Landing",
    "pageId": "0:1",
    "pageName": "Page 1"
  }
}
```

When there is nothing to undo or redo, the command says so and `result.applied` is `false`.

The editor has one history, shared by you and every automation client, so **Edit → Undo** in the app steps back through any change, newest first. Automation is narrower: `undo` and `redo` only act on a step that the CLI or MCP made, and only while it is the newest one. If the newest change was made in the editor, the command fails and leaves it alone, so an agent can't revert your work. They also fail while the document is in vector edit mode, whose history belongs to the editing session.

Each CLI or MCP command that edits the document is one undo step. An `eval` script is recorded against its target page: if it switches `figma.currentPage` and edits another page, those edits are not part of the undo step.

## Settings

Read and change editor settings by dotted key:

```sh
openpencil settings get
openpencil settings get appearance.theme
openpencil settings set appearance.theme light
openpencil settings set editing.snapping.pixelGrid false
openpencil settings set chat.maxAgentSteps 100
```

Values are read as JSON when they parse (`false`, `100`, `"auto"`) and as plain strings otherwise. Invalid keys and values are rejected without changing anything.

| Key                          | Values                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appearance.theme`           | `dark`, `light`, `auto`                                                                                                                                                   |
| `appearance.language`        | `en`, `de`, `es`, `fr`, `it`, `ja`, `pl`, `ru`, `zh-CN`                                                                                                                   |
| `appearance.animations`      | `system`, `off`                                                                                                                                                           |
| `appearance.accent`          | JSON object: `{"kind":"preset","preset":"green"}` with `blue`, `purple`, `pink`, `red`, `orange`, `yellow`, `green`, `graphite`, or `{"kind":"custom","color":"#FF6600"}` |
| `editing.snapping.geometry`  | `true`, `false`                                                                                                                                                           |
| `editing.snapping.objects`   | `true`, `false`                                                                                                                                                           |
| `editing.snapping.pixelGrid` | `true`, `false`                                                                                                                                                           |
| `rendering.canvasMode`       | `retained`, `tiled` (applies after a reload)                                                                                                                              |
| `recovery.enabled`           | `true`, `false`                                                                                                                                                           |
| `chat.reasoningDisplay`      | `collapsed`, `while-thinking`, `expanded`                                                                                                                                 |
| `chat.maxAgentSteps`         | integer 1–1000                                                                                                                                                            |
| `chat.changePreviewSize`     | `off`, `small`, `medium`, `large`                                                                                                                                         |
| `designCheck.showOnCanvas`   | `true`, `false`                                                                                                                                                           |
| `designCheck.preset`         | `recommended`, `strict`, `accessibility`                                                                                                                                  |
| `designCheck.disabledRules`  | JSON array of rule IDs, e.g. `["no-default-names"]`; see `openpencil lint --list-rules`                                                                                   |

Credentials, AI models, MCP connections, storage, and tool access are deliberately not available here: an automation client can't read secrets or grant itself access.

## Calling tools

Every editor tool the MCP server exposes is also available from the CLI. List them, inspect a tool's arguments as JSON Schema, and call it with a JSON object:

```sh
openpencil tool list
openpencil tool describe set_fill
openpencil tool call set_fill --args '{"id":"0:5","color":"#2563eb"}'
openpencil tool call set_fill --document-id tab-123 --args-file fill.json
echo '{"name":"Icons"}' | openpencil tool call create_page --args-file -
```

Pass a file to run a tool headlessly instead. Changes to a file are kept only with `--write` (back to the input) or `--output`:

```sh
openpencil tool call create_page design.fig --args '{"name":"Icons"}' --write
openpencil tool call get_page_tree design.fig --json
```

For multi-step edits, [`eval`](./scripting) runs a whole script against the same Figma-compatible API.
