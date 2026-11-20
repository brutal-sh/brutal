# Connected interactive CLI

CLI-06 owns a persistent tool session connected to an Brutal document and page.
Actual Pen1.2.23 remains the reference. This candidate does not establish native,
standalone, Pen tool-name or whole-product acceptance.

## Behavior

`openpencil interactive --app desktop` selects the one active document. Optional
`--document-id` and `--page-id` select an explicit tab/page. An input path opens
that file and cannot be combined with a document ID. The first JSON result reports
the resolved target. Subsequent calls recheck its existence, send explicit IDs,
and validate the returned target; changing the active tab/page does not retarget
the session.

The connection retains the original validated MCP discovery identity and refuses
a replacement discovery entry. Tab creation uses the existing cryptographic ID
helper, so a replacement renderer cannot reuse an old session's document ID while
keeping the same MCP server and FIG page IDs.

The app advertises `unique_document_ids: true` in `list_documents`. Persistent
sessions require that capability before any `open_file` or tool request, so an
older installed app cannot silently bypass the renderer-lifetime protection.
Missing, false and malformed metadata receive a friendly update refusal; the
owned server controls record exactly one list request and no open/edit requests.
Existing one-off clients ignore the additive field and headless mode stays local.
The touched app dispatcher separates global and targeted handlers while retaining
the same public methods, resolution, preparation, history and fallback owners.

Raster export retains the existing canvas-renderer guard. Activate the intended
document and let its canvas initialize before exporting; an inactive document
without a renderer is explicitly refused. The live control retains that refusal,
then activates the intended document and decodes its64×64PNG through the browser's
independent decoder, checking every RGBA channel and both unchanged graphs.

Existing Core tools and app history own edits. `undo()` and `redo()` use the app's
automation history. `save()` uses an optional `.pen`/`.fig` output or the existing
writable source and never opens a dialog. Refusal retains live edits for an
explicit retry. Exit and EOF perform no additional save or discard. App operations
can leave an undoable partial edit on failure; the headless rollback guarantee
does not apply to live app edits. Any failed call keeps the final exit status
nonzero, including after a later successful retry.

## Reproduced failures and corrections

Private evidence: `local-evidence/cli-app-connection-2026-11-14/`.

| Control                                                                                                                    | Before                                                                                | Correction / observed scope                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real Node CLI, live app eval creates a node then throws an error containing ENOENT.                                        | Four nodes appear from one invocation.                                                | Application errors have their own class and cannot enter socket fallback or discovery retry; the real rerun leaves exactly one node and the other document unchanged. |
| HTTP connection closes after the owned server receives a request.                                                          | An empty reply can be treated as success by the caller runtime.                       | Validate the response envelope and reject invalid replies without replay. The owned transport test records one received command.                                      |
| A read tool returns an error object.                                                                                       | Connected shell exits0 after a missing-node error.                                    | Headless and connected sessions share the existing error-value check; later explicit edits remain possible and the final status remains nonzero.                      |
| Reload the real editor on the same MCP server, reopen an owned FIG with the same page ID, then send an old session's edit. | Both tabs reuse tab-1 and the old session creates a node in the replacement document. | Cryptographic tab IDs prevent that reuse. Both engines reject the stale session and retain the exact replacement graph.                                               |

The failed initial controls remain retained. Fixture corrections also remain
explicit: child color flags conflict in an early run; FIG remaps imported PEN
node IDs, so fresh-file checks locate the one exact owned node name before reading
its geometry; a deliberate HTTP400 has one explicitly asserted browser resource
error; the page-switching fixture must activate the owned document first; tool creation
requires explicit x/y. Every opened synthetic document now returns its own newly
created tab ID directly, avoiding a reused name from a prior serial test.

## Qualification

The guarded affected CLI, tab and automation-owner cohort passes188tests with652assertions. The earlier cohort passes185tests with634assertions. The
initial live two-engine run has28expected cases and no skipped, unexpected or
flaky cases. The added replacement-renderer control passes in both engines.
The combined target/history/save/replacement/tab run passes33cases. The additional
two-engine PNG control passes separately; its initial unsupported-background
expectation remains retained as two failures, not relabeled as product success.
The final combined browser run and full repository check are recorded separately.

The first complete check stops on two new test Promise-executor lint violations;
the test callbacks are corrected without changing runtime behavior or rules.
The next check stops on two type-aware simplifications after the response schema
becomes mandatory; those branches are simplified. A later check reaches the new
image fixture and rejects its overly broad validator inference; the callback now
explicitly preserves its string input. No runtime validation is removed.
Strict300/50/10/4/4 remains required for every changed source/test file.

The new built-Node compatibility control exposes a test-helper environment gap:
Bun's default child environment omits the discovery override changed by a test.
Passing the current environment explicitly makes both source-Bun and built-Node
requests appear only on the owned mock, with zero open/edit requests. The initial
Node attempt receives the compatibility refusal from a different, uninstrumented
bridge; its pre-open refusal is code-path evidence, not an alternate-endpoint
effect trace. The actual live Playwright controls already pass an explicit child
environment and retain their original isolation.

Two broad runs retain moving JPEG-refusal timeouts and late assertion errors.
The OS log records lid-closed/maintenance sleep during those runs. No JPEG test or
timeout changes; its unchanged isolated foreground control passes13cases and the
subsequent full guarded owner cohort passes188. An idle-sleep assertion belongs
only to each qualification process and does not disable lid sleep or screen lock.

No baseline, pixel threshold, test runner or security permission changes. The
existing strict Note/layout failures remain unaccepted. This slice uses the real
Node CLI and actual owned browser/bridge, rather than mock-only delivery; its
mock-server controls prove only the named transport boundaries.

## Remaining gates

Actual Pen CLI result/error comparisons, installed native interactive delivery,
standalone installation/trust, native interruption, complete recovery lifecycle
and required platform states remain open. CLI-07 owns Pen's distinct tool-name and
execute/read_skill/get_style contracts. Existing tool exports return their current
encoded output; this session does not add a different export-delivery API.

CLI qualification uses isolated browser, bridge, discovery and document state.
Normal installed binaries, the saved user workspace and protected icon work retain
their verified bytes; no user credentials or recovery data are reset. A separate
CUA native Save-alert attempt opens and closes only a new synthetic fixture in the
normal app; it can add that owned file to Recents, so profile-byte identity is not
claimed. Coordinate input does not commit reliably and accepts no alert pixels or
save behavior. Both fixture originals remain intact under
`local-evidence/native-save-alert-cua-2026-11-14/`.

## Final guarded candidate

Full check exits0 with zero clones in297.651s; production build exits0 in8.553s. The final35-case real Node/live-app cohort has zero skipped, unexpected, flaky or retried cases in140.623s. All11frozen runtime hashes match through qualification. CLI-06 is Verify, not Executed; LAYOUT-WRAP-IMPORT is the next sole Building card. Independent read-only review confirms the target guard order, preserved dispatcher behavior, child environment and narrow evidence boundaries. Normal installation and native/reference/standalone acceptance remain open.
