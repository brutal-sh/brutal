# ACP startup failure presentation

Updated: 2026-11-09. Scope: BRAND-SUPPORT-ACP, own-app naming and retained startup errors.
This does not accept native CLI delivery, provider authentication, inference or Pen parity.
Source and initial evidence are published at `c65a7374fc4a92fc01ee4235fbe032adae90d3be`.

## Executed path

An isolated Bun 1.4.2 process calls the actual `ACPChatTransport.sendMessages` controller.
Its process seam uses paired real ACP SDK JSON-RPC streams and an in-memory agent.
The real `linkOwnTools` owner runs against a test-owned MCP-server builder and connection
watcher. Authentication-token lookup and diagnostic collection are local stand-ins.
No provider login, native child process, user document or real credential is used.

Nine startup cases run: missing executable; token lookup rejected; initialization rejected;
MCP-link creation rejected; session rejected; authentication required; tools unreachable
without a reason; tools unreachable with a failed-tool notification carrying a reason;
tool-connection watcher rejected.
Every case rejects before a prompt is delivered. Each spawned stand-in is killed before
explicit transport destruction. The missing-executable case never creates a child.

The no-install-command branch says to restart Open Pen. The tools-unreachable branches
name Open Pen while preserving Codex and the agent-reported reason. The captured session
configuration retains `open-pencil`, `mcp__open-pencil`, the server arguments and the
test-owned working directory. These are protocol identities, not product labels.
Formatter controls retain vendor installation guidance, missing-server and timeout advice,
ordinary errors and the no-agent fallback. Those controls are direct calls, not additional
native or controller journeys.

## Reproduced defect and change

The initial pinned-runtime run passes seven checks and fails two: SDK initialization and
session errors arrive as structured JSON-RPC objects and become `[object Object]` in the
shared formatter. The SDK response also contains the synthetic reason in `data.details`.

The formatter now validates the message and optional textual detail before displaying them.
It retains ordinary Error/string handling, existing connection/authentication guidance and
non-text detail fallback. It does not serialize arbitrary response data into the UI.
Both failed controller cases then display `Internal error: <the agent's reason>`.
The final isolated run passes ten checks with 41 assertions; 33 affected owner tests pass
with 52 assertions in separate, unmocked processes.

A further red control simulates a rejected tool-connection watcher: the controller returns an error
without killing the starting child. It passes nine checks and fails the cleanup assertion.
The existing outcome-failure catch now stops that child just as the other startup catches do;
the final run observes one kill before destruction. The production watcher normally only
resolves; no naturally occurring watcher rejection or physical process leak is demonstrated.
This qualifies cleanup of a rejected outcome/startup race. Normal false connection outcomes already
stop the watcher in `linkChatAgent.connected` and are not treated as a new watcher leak.

The source also races startup with process exit and handles destruction while starting.
Those unchanged EOF/destroy guards are source-traced here, not additional executed cases in
this copy/controller record. Mid-turn crashes, permission dialogs and successful sessions
are outside this task's changed startup presentation.

The final normal build (including lint), source/Vue types, test types, focused Oxfmt check,
documentation and changelog checks pass. Architecture checking finds no problems.
Independent review identifies and closes an auth-code precedence regression and formatting
churn, then confirms the bounded change. A separate owner-wide readback finds all 201
repositories in the authorized scope have GitHub Actions disabled.

## Evidence and limits

Ignored evidence is under `local-evidence/acp-startup-2026-11-09/`, including the pinned
failing run, original source and harness, final controller output, captured session requests
and check receipts. The diagnostic harness remains in ignored `scratch/`; its module mocks
run only in a separate process. An initial system-Bun run is retained separately and is not
the pinned acceptance receipt.

This verifies controller rejection text and the no-prompt guard through simulated process
streams. It does not inspect visible native chat rendering, launch a real CLI, test an actual
MCP server, grant permissions or compare a Pen screen. Actual unsupported platforms, native
delivery and the full support/branding gates remain separate cards.
