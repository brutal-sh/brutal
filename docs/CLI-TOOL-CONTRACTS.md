# Shared CLI tool contracts

Updated 2026-11-15. Decision owner: Jason. Implementation/evidence owner: Codex.
This allocation accepts no additional functionality or milestone.

The outcome is the same independently implemented tool behavior through MCP and
the actual built Node CLI, with explicit document ownership and precise mode
refusals. CLI-07 aggregates delivery over existing owners; it creates no second
tool engine, resource catalog or agent scheduler.

The current [official CLI documentation](https://docs.pen.dev/for-developers/pen-cli)
names `execute`, `get_app_state`, `read_skill` and `get_style`, with `browser` for
desktop connections and `spawn_agents` only after explicit startup enablement.
It describes live app edits and recommends checking document state before them.
This is documentation evidence. Actual installed Pen 1.2.23 schemas, payloads,
errors and applicable availability still require observed reference receipts;
dated 1.2.22 receipts are historical. Access limits remain explicit.

## Existing owners

| Contract | Owner | Bounded outcome |
| --- | --- | --- |
| Document state | MCP-03-GETAPPSTATE | Validated read-only metadata/selection result for the intended document/page, including missing/replaced targets. |
| Document scripting | MCP-03-EXECUTE | Shared execute envelope and independently authored facade over existing Core operations, with mutation/history/IO and refusal semantics. |
| Skill resources | MCP-03-READSKILL | Bounded first-party resource discovery/read, executable guidance and no global-skill/private-file exposure. |
| Style resources | MCP-03-GETSTYLE | Shared list/load/error contract using existing style/library ownership and qualified first-party resources. |
| Desktop browser | MCP-04-BROWSER | Desktop admission, precise headless refusal and owned-session dispatch; browser feature behavior retains its existing cards. |
| Optional agents | MCP-04-AGENTS | Default-off registration and explicit enablement; AI-08-EXECUTE retains real scheduling/cancellation ownership. |

CLI-05 and CLI-06 own the interactive shell and connected target/session delivery.
Their bounded qualification with other tool names does not establish these six
contracts. CLI-07 requires those two cards and the six owners above, then executes
the combined CLI matrix. The six semantic owners retain their primary milestone allocations; the index
now has 510 execution IDs after the separate MCP-05-SELECT and MCP-05-CANCEL discoveries; shared requirements are not duplicated implementation work.

## Sequence and checkpoints

The [resource](CLI-SKILL-RESOURCES.md) and [app-state](CLI-APP-STATE.md)
software candidates retain separate unaccepted reference/native gates. Now map each documented
execute operation to its existing owning implementation. An unknown schema or
inaccessible reference result stays unknown. A confirmed independent missing
operation is split before expanding the execute card.

Every shared owner must connect a real MCP client to the actual owned server,
enumerate registration and execute applicable success/unavailable/refusal cases.
Core, mock, browser-bridge and Node CLI results do not establish MCP dispatch.

Next, qualify execute and style delivery through real MCP and built Node headless
and connected clients. Use two owned documents/pages, inspect target state, decode
exports independently and reopen explicit saves. Read-only tools preserve graph,
history, dirty state and files. Mutating tools exercise applicable failure,
rollback, Undo/Redo, cancellation, disconnection and stale-target refusal.

Later, qualify browser admission using isolated desktop/local-page fixtures and
agent enablement with explicit process/provider counts. Disabled calls must have
zero spawn effects. Existing authorization permits the user's Codex/Claude CLI
login when real inference is required; it does not authorize paid APIs, credential
creation or implicit agent launches. Native/browser restart and the full agent
lifecycle keep their separate acceptance criteria.

There is one Building task: STAB-FIG-RECOVERY-WORKER. MCP-05-CANCEL is Verify on its bounded software receipt. MCP-05-SELECT is Verify on its
[explicit selection delivery](CLI-SELECTION.md); real MCP cancellation and native/reference acceptance remain open. MCP-03-GETAPPSTATE is Verify on its
[bounded state delivery](CLI-APP-STATE.md), with reference/native gates open. MCP-03-READSKILL is Verify on its
[bounded software delivery](CLI-SKILL-RESOURCES.md); reference/native acceptance remains open. LAYOUT-WRAP-IMPORT returns to
Backlog while its missing native measurements wait on desktop availability;
its owned inputs, red regression and exact re-entry remain retained. No beta date follows
from card counts. Reassess after each bounded owner receipt or reference update.

## Aggregate exit

Each semantic owner is accepted on its own real MCP and applicable mode criterion.
Then CLI-07 runs the
actual outside-checkout built Node matrix over the shared implementations in both
supported modes, retaining exact source/candidate/reference identities, validated
outputs, failure exit behavior and resource/target preservation. Mocks and static
declarations cannot replace the live delivery paths. Standalone installation,
native/reference delivery, strict visual checks and full parity remain separate
required gates. Repository private, PR draft, Actions disabled and user data
preserved remain binding.
