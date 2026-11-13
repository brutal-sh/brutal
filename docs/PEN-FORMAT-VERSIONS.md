# Pen format versions

Updated 2026-11-13. FMT-01 is Verify. Current installed reference is Pen 1.2.23,
ASAR `d0c5c23a3a86ec1802c8754b59e82600d815f0e2b6a383f655319535e6e07925`.
The archive still matches the retained REA catalog; no new extraction is needed.

## Outcome and current control

The [current format guide](https://docs.pen.dev/for-developers/the-pen-format)
declares schema 2.22, accepts comments and describes supported older-version
conversion. The earlier catalog/card label naming 2.21 is historical. Unsupported
input must be refused before replacing the active design or destructively saving.

Retained owned Pen 1.2.23 saves use 2.22. At source `17b2a03ed`, actual Chromium
owned-file Save and both Chromium/WebKit file-input/download controls instead emit
2.21 from commented 2.7 and 2.22 inputs. Those red saved files and producing traces
remain private. Existing reader controls already accept comments and refuse future
versions before graph/asset construction; no reader repair is inferred.

The first private WebKit OPFS controls fail with `UnknownError` while creating the
fixture, before app import. Preserve them as unavailable filesystem setup. Named
WebKit uses the actual supported file-input/download fallback; Chromium separately
executes the filesystem-backed save path. No native picker or in-place WebKit
acceptance follows from the fallback.

## Candidate ownership and compatibility

The existing Core `penExportResult` is shared by document Save and every `.pen`
export scope. It calls public `writePenDocument`, retains structured export
refusals, applies the current application schema header and serializes with the
existing indentation/newline. The format package's bounded-interchange API and
its explicit 2.21 default remain unchanged; Note compositions already require 2.22.
This follows Core's existing artifact-specific structured-writer policy.

The published current union omits the bounded writer's legacy `type: "line"`.
Core retains the prior header/output when such a record remains, including nested
content. [FMT-LINE-2-22](https://trello.com/c/N4z4LJt8) owns actual current-reference
line representation, equivalent geometry/paint and saved/reopened acceptance.
FMT-01 and FMT-05-PATH require that child. Its temporary header exception is an
open compatibility gate. No all-output schema-fidelity claim is made.

## Qualification and re-entry

The final frozen-source cohort passes 11 actual browser cases without retries,
skips, unexpected results or snapshot updates: commented older/current
inputs, edit/Undo/Redo, Save As cancellation, actual Save, clean close/reopen,
future-version refusal, exact active-file and recovery-byte retention, fallback
download target/source preservation, and existing fresh/edited Save controls.
The combined final Core/package and comment/version-reader cohort passes 90 cases
with 241 assertions. Actual Open Pen CLI conversion writes 2.22 from both 2.7
and 2.22 inputs while preserving their source bytes; future 2.23 input exits one
without changing a pre-existing destination. These are document-converter checks,
not Codex/Claude provider acceptance. Independent read-only review identifies the
Core owner and retained line exception, then catches a Script input `{type: "line"}`
false positive. A retained failing test reproduces it; typed traversal now visits only
serialized nodes and descendant overrides. The exact Script inputs and current header
pass the owner test, actual converter and independent re-review.

The complete repository check passes with zero clones in 192.22 seconds. The first
complete attempt stopped at the test-domain architecture check; only the two new
specs moved to `tests/e2e/document/pen/`, leaving existing tests and snapshots intact.
An earlier local binding rejected by Core's global-name rule was renamed before
the final check and browser cohort. Original failures and producing identities
remain retained; no guard or acceptance threshold was relaxed.

Now: ERR-06 continues owned CLI output/failure/safe-retry qualification. This bounded
format slice remains Verify for actual native/reference and line conversion acceptance.
Retain strict checks, raw controls, exact source and saved-output identities.
Normal installed `db4e528c`, user workspace, profiles, credentials, older recovery
and protected icon work remain untouched. Do not infer actual native-menu pixels,
all older-version semantics, complete schema fidelity or beta/full parity from
these bounded controls. FMT-01 stays unaccepted while its line/native gates remain.

Private receipts: `local-evidence/pen-version-2026-11-13/`, including
`reference-and-source-control.json`, preserved before/after browser reports,
`after-review.json`, `owner-after-review.log`, `cli-after-review-control.json`,
`independent-review.json` and `complete-check-after-review.json`. Re-entry starts with the current card and those
source/output boundaries. Reuse existing file/recovery helpers; stop repeated
private-WebKit filesystem setup attempts and use the explicit fallback path.
