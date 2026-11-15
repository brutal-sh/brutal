# Bundled skill resource delivery

Updated 2026-11-15. MCP-03-READSKILL is an independent implementation candidate;
this receipt does not accept its reference-parity gate or a milestone.

The installed Pen reference remains 1.2.23, archive SHA-256
`d0c5c23a3a86ec1802c8754b59e82600d815f0e2b6a383f655319535e6e07925`.
Its published `read_skill` tool accepts an optional path. Its current MCP usage
limit refuses further live observations, so exact reference payload/content and
error equivalence remain unknown. No retry or access workaround is used.

## Independently implemented contract

Core owns four first-party Markdown resources: `SKILL.md`, `execute.md`,
`pen-schema.md` and `guide/web-app.md`. Exact linked names select packaged text;
they never reach the filesystem or load global user skills, providers or secrets.
The tool validates optional string paths, rejects unknown or malformed inputs,
declares no mutation and uses the same reader across Core, MCP and CLI.

Document-scoped MCP serves bounded plain Markdown without an attached app.
Disabled-tool and existing selection-scope restrictions remain enforced.
Interactive CLI preserves its JSON-lines output and existing connected target
and identity guards. Guidance does not establish a missing execute facade.

Registration is separated by Core, document, file and settings ownership, with
shared policy, annotations, agent metadata and settled-call cleanup retained.
The entry is 116 lines; the largest extracted module is 219 lines. Changed source
and tests pass the existing strict 300/50/10/4/4 size rules without new suppressions.

## Executed software controls

Evidence is retained privately in `local-evidence/read-skill-2026-11-15/`.

| Path | Observed outcome |
| --- | --- |
| Core/CLI/MCP owner and legacy transport cohort | 266 pass, one Windows-only skip, zero failures; includes root, policy, file, image/PDF, session and save regressions. |
| Built Node 24.18 headless CLI outside the checkout | Six controls: bundled reads, local shadow/symlink refusal, preservation, retry with failure exit, executable guide, save and fresh-process reopen. |
| Built Node MCP with real SDK TCP client | Four plain Markdown resources without an app, four refusals and successful retry; disabled and selection-scoped calls absent and refused. |
| Built Node CLI through the real owned browser bridge | 17 pass, no skips/retries/flaky results; includes guide reads/refusal, two-document preservation, dirty/selection/page state and usable Redo, plus existing save/target/export/connection cases. |
| Complete repository check | Exit zero, including source/test types, architecture, docs, package/security/tooling checks and zero detected duplicate clones. |

Initial failures remain retained: a stale Core build, an occupied default-socket
startup refusal before tool execution, the missing local MCP dispatch, test
fixture argument/import/output assumptions, and a build/test startup overlap.
The Node control initially assumed a new-file permission contract that did not
exist: the writer creates mode 0644 inside the owned 0700 fixture directory.
Existing source/output modes and bytes are checked exactly; the writer is unchanged.

## Remaining acceptance

Exact live Pen guide/payload/error compatibility, normal native application
delivery, standalone installation and the combined CLI-07 matrix remain open.
The Mac is locked at the latest desktop check. No normal app installation,
signing, release, profile/credential reset or reference-pixel change occurs in
this slice. Full design/functionality parity and every milestone remain open.
