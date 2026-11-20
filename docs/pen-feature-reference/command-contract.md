# CLI and MCP contract requirements

Reference: [official CLI](https://docs.pen.dev/for-developers/pen-cli) and [AI integration](https://docs.pen.dev/getting-started/ai-integration), retrieved 2026-10-30. These are reference contracts; the inherited `openpencil` CLI and current local bridge have different public surfaces. **Contract parity is open.** Independent binary/server names must identify Brutal truthfully.

## CLI commands

Compare `version`, `status`, `login`, `codex-login`, `codex-logout`, `interactive`, default agent mode and their help/error output. Vendor-account authentication is excluded; existing provider login is the approved AI route. Do not read, copy or remove Pen credentials to implement equivalent behavior.

| Agent option | Alias / values | Acceptance concern |
| --- | --- | --- |
| `--in` | `-i path` | Optional input; omitted input starts empty |
| `--out` | `-o path` | Required except export; no accidental source overwrite |
| `--prompt` | `-p text` | Actual provider receives request |
| `--prompt-file` | `-f path`, repeatable | Images/text arrive in intended order |
| `--agent` | Claude, Codex, provider | Correct runtime when model omitted |
| `--model` | `-m id` | Agent inferred from model |
| `--effort` | level | Validate supported reasoning levels |
| `--usage` | path | Inspect actual usage JSON |
| `--custom` | `-c` | Custom Claude configuration |
| `--list-models` | flag | Available models then exit |
| `--tasks` | `-t path` | Reference stops after first success; never silently claim all ran |
| `--repo` | `-C path` | Correct isolated working directory |
| `--workspace` | slug | Independent equivalent; no vendor workspace gate |
| `--list-workspaces` | flag | Independent workspace enumeration |
| `--export` | `-e path` | Inspect output bytes, not just exit code |
| `--export-scale` | number, default 1 | Raster dimensions |
| `--export-type` | png/jpeg/webp/pdf | Explicit format; extension does not choose it |
| `--preview-output` | path | Independent preview location |
| `--enable-preview` | flag | Preview refresh after design change |
| `--verbose-mcp` | flag | Detailed tool errors, secrets redacted |
| `--verbose` | `-v` | Stream diagnostic output safely |
| `--max-failed-calls` | number | Stop at configured failure limit |
| `--help` | `-h` | Accurate supported-command reference |

Interactive options: `--app/-a`, `--in/-i`, `--out/-o`, `--preview-output`, `--enable-preview`, `--help/-h`. Headless mode requires an output; app mode targets a running host. Shell supports tool invocation, `save()` and `exit()`. Verify saved files by reopening them in the desktop editor.

Reference environment names: `PEN_CLI_KEY`, `PEN_AGENT_API_KEY`, `ANTHROPIC_API_KEY`, provider keys such as `GEMINI_API_KEY`/`XAI_API_KEY`, `PEN_API_BASE` and `DEBUG`. Reference precedence puts the CLI key before stored vendor session and agent API key before Anthropic API key. Independent configuration must be documented separately and must never default to Pen's backend or token store. Vendor token paths in public docs are provenance, not an implementation instruction.

## Public MCP tools

| Tool | Contract to inspect | Availability |
| --- | --- | --- |
| `get_app_state` | Metadata, active document and selection | Standard |
| `execute` | Read/mutate/render/export operations and diagnostics | Standard |
| `read_skill` | Index and referenced schema/workflow instructions | Standard |
| `get_style` | Style enumeration and retrieval | Standard |
| `browser` | Browser automation/capture/import | Desktop target |
| `spawn_agents` | Agent dispatch contract and failure handling | Explicit server enablement only |

`execute` includes screenshot/export operations; compare actual live argument/result schemas rather than inventing a matching name around a different API. Inspect error shape, cancellation, document targeting and partial changes too. Reference transport is stdio to a local host connection, using Unix socket or Windows named pipe. The current Brutal loopback bridge is not evidence of equivalent public contracts.

Native execution remains required: connect a real external client, confirm the intended document, create/edit through the public interface, render/export/save, then reopen and inspect. Use synthetic documents and preserve the user's existing MCP entries and credentials.
