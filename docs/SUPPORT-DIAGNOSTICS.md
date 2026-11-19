# Support diagnostics

Updated 2026-11-19. [ERR-07](https://trello.com/c/OTshm7tR) stays in Verify. The
native report-save check below adds evidence for the macOS beta support packet.

## Outcome and authority

Produce a useful local report with the actual build/environment and reproducible
failure metadata, excluding credentials and private design/conversation content.
Reuse existing diagnostics/event/storage/Settings owners and the established
report filename. Use isolated synthetic fixtures; do not read user credentials,
copy private designs, send reports, add telemetry or alter normal profiles.

The [current Pen troubleshooting guide](https://docs.pen.dev/troubleshooting)
requires reproducible, non-sensitive support evidence. Actual installed reference
is Pen 1.2.23; prior 1.2.22 evidence remains historical. A documentation comparison
does not establish unavailable native screen/menu acceptance.

## Current control

At a3b04e0c1, four direct utility controls leak synthetic canaries: quoted JSON
API keys, quoted JSON passwords containing spaces, quoted assignments containing
spaces and quoted JSON session tokens. Both Chromium and WebKit also download an actual Settings report containing
those canaries in its runtime message and stack before correction. The red reports
and traces are retained; they contain synthetic data only.
The recorder, scrubber, typed event constructors, IDB store and Copy/Save UI
already exist. Do not create a parallel reporting subsystem.

The candidate recognizes quoted structured keys, escaped/spaced values, session
tokens and truncated quoted values. Error-text fields are scrubbed at recording
and report export; model identifiers, correlation IDs, scalars and other typed
metadata stay exact. Exporting older records does not rewrite their local data.
The English description and eight existing translations replace a blanket privacy
promise with guidance to review error details before sharing. No reporting service,
transmission, new dialog or production-profile change is added.

Published: `da2bd5984` on the private draft PR. The four new browser cases
execute actual downloads in Chromium/WebKit, exclude the synthetic open design,
retain metadata, and protect real legacy IDB records across reload without changing
their stored evidence. The affected app unit group records 2,032 passes; all 19
report/Settings/branding browser cases pass with zero skips/retries/flaky. The
complete repository check exits 0 with zero reported clones. These do not accept
native delivery.

A default-feature local production candidate at the same source builds with
signing disabled, then receives a local ad-hoc signature that verifies. Binary
`410f5f628b812095c4435d5259a05e68bda3561a2329f9f03e7865ca4a1788db`
refuses reserved native-test arguments before startup without creating their profile.
It is not installed, normally launched or notarized. Normal installed `db4e528c`
and isolated native-test `5b19ef31` remain byte-identical. Build, source, signature,
archive and guard receipts stay private with the downloaded report evidence.

## Native report export after a file-open failure

On 2026-11-19, the isolated normal-feature macOS candidate built from
`4926f5f36bb3be9c131efa4fc9d7d36a99c77aec` opened an owned project containing a
unique layer-name marker. Opening a separate malformed `.pen` showed the file-open
error. Settings > Diagnostics > Save diagnostics opened the native Save panel and
wrote `Open Pen diagnostics.json` to the selected temporary folder.

The JSON reported Open Pen 0.16.0, `shell: desktop` and a typed document-open
failure with `decode-failed`. It omitted both fixture filenames, the temporary
path, the open layer name and the malformed file's content marker. Canceling a
second Save panel preserved the report checksum. The project remained open and
its test process exited normally. The regular installed executable hash and
recovery digests matched the preflight. The private export receipt uses synthetic
fixtures. Earlier browser credential-redaction cases, remaining actual Pen
reference states and native-speaker review keep their own evidence requirements.

## Done evidence and re-entry

The report download must parse, retain useful build/error/reproduction metadata,
exclude tested secret/design/conversation canaries and remain safe after reloading
and when exporting older retained records. Do not loosen the tests, invent a
universal content-redaction guarantee or infer native/full-card acceptance from
a helper pass. Preserve failed controls and independently review the result.

Private receipts: `local-evidence/support-diagnostics-2026-11-13/`.
Re-entry: read the current task/card, before/after report artifacts and final
qualification receipts. The report builder reuses existing recorder/save owners;
do not replace them or re-run solved controls without a changed input or concern.
Heuristic redaction covers tested formats, not arbitrary unlabeled private content.
Reports and any optional screenshot/fixture must be reviewed before sharing.
Native and native-speaker review of the copy remain separate gates.

## Reporting a reproducible problem

Record the actual Open Pen version and candidate/source identity, operating-system
version, browser if applicable, expected/observed behavior and numbered reproduction
steps. For AI issues add provider/model/authentication method without credentials.
The exported user-agent string is compatibility data; do not infer the actual OS
version from it. Obtain that version from the system's About information.

Use Settings → Diagnostics → Save diagnostics or Copy diagnostics. Review the report
and attach a minimal non-sensitive fixture only when it is needed. Reports do not
automatically attach the open design or conversation. Exact existing telemetry and
branding behavior is covered by its own tests; this report fix does not establish
universal content redaction, all native dialogs or full Pen parity.

## Beta support packet draft

The candidate is Open Pen 0.16.0 for Apple silicon. The package declares macOS
13.0 as its minimum. The recorded native trial ran on macOS 27.3. The current
local archive uses an ad hoc signature and fails Gatekeeper assessment. Public
distribution, first launch on a clean Mac and signed updates remain open. Windows,
Linux and browser deployment are outside this Mac candidate's qualification.
[Package and native launch receipt](NATIVE-SAVE-DELIVERY.md#exact-regular-identity-package-trial-on-macos)

Core local editing and saving require no account. Share a copy of any document
used to reproduce a problem. Use the reported format limits before using an
import for production work. Optional agent and image providers use their own
sign-in or credentials and may charge for usage. The normal installed core
journey and broader file, agent and visual acceptance remain open.
[Desktop file and provider limits](../README.md)

The [Help support section](https://open-pen.vercel.app/help/#support) resolves and
links to the fork's bug report and question issue forms. GitHub confirms the fork
is private and Issues are enabled. Confirm that invited testers can use the
intended report destination before sending the package. Use the reporting steps
above and review exports and fixtures before sharing. [BRAND-LINKS](https://trello.com/c/Nyoko3k5)
retains the normal-app destination walkthrough.

Jason owns distribution, rollout and rollback decisions. Hold new invites on a
reproduced startup failure, loss of design or recovery data, exposed credentials,
or a trust failure on the exact candidate. Record the build, steps and sanitized
report locally. Resume after the correction or rollback is verified on a
disposable Mac profile and the owner approves expansion.
[Install and rollback qualification](https://trello.com/c/2OSPK0Pb)
