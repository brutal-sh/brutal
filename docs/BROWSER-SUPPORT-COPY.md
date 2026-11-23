# Pre-boot browser identity and support routing

Updated: 2026-11-07. Status: bounded browser criterion executed and published at
[`59e02516b`](https://github.com/brutal-sh/brutal/commit/59e02516b70bd22032906a1e8f5683c8512197ce),
with exact remote content readback for BRAND-SUPPORT-BROWSER. Actual unsupported engines,
native delivery, exact Pen geometry and full branding remain unaccepted.

## Resulting behavior

The pre-boot support notice links to this fork's own README requirements section and issue
form. Browser diagnostic prefill uses `Web (Brutal)`, matching the issue template's option;
the template's reproduction example also names Brutal. Report links preserve version,
browser, missing-feature and error details. Opening a link does not submit an issue.

Support guidance keeps its existing self-contained imports: it renders before Vue, app
services and locale catalogs load. It is intentionally English. Browser/OS detection,
support thresholds, native engine guidance and the Microsoft WebView2 destination are
unchanged. The shared guidance owner supplies the corrected links to both unsupported
engine notices and fatal startup feedback; desktop rendering is a separate verification task.

The README states this fork's configured support thresholds and distinguishes those from
executed platform qualification. It points to local build instructions without inventing an
installer, update feed or deployed website. Required upstream documentation and attribution
remain under their existing explicit heading.

## Executed checks

The unchanged three-case baseline passes one case and fails two because old tests still
expect `OpenPencil couldn't start`; the source already renders Brutal. Correcting those
expectations preserves both actual failure triggers: a module-loading history failure and
a first-route component setup failure. No production startup handling changes to satisfy them.

The new browser matrix removes one capability sentinel in modern browsers under eight
test-owned user agents: outdated Chrome, Edge, Firefox, Safari, Opera and iOS, an unknown
browser and a version that meets the baseline but lacks the feature. All eight render in
both requested color schemes and both engines. Every observed pre-boot notice keeps the
existing dark styling; this does not qualify a distinct light-theme design. This is
capability/user-agent simulation, not execution in
the historical browsers named by those fixtures.

The seven-case smoke run passes. The final canonical run passes all 35 cases in 29,490.604 ms:
16 new Chromium cases, 16 new WebKit cases and the three retained Chromium controls.
All thirty-five captures are inspected across nine contact sheets, including independent
review of twenty-four captures. No concrete own-name, retained detail, icon or link-fit defect
is observed. There are zero retries, skips, flaky or unexpected results. All 35 captures and 32 new layout
attachments are retained; all twenty-two frozen source/config hashes match after the run.
Disclosure reveals the supplied environment and missing feature; the own decorative icon
decodes; the new notices contain their links without horizontal overflow. The four matching
version/theme/engine cases keyboard-activate both own links into test-owned pages, then
retain the visible source notice. No real issue form is submitted. New matrix page errors
remain empty; the retained failure controls deliberately trigger their named startup errors.
This is not a universal console/network or accessibility audit.

All 65 live support-owner tests pass with 177 assertions across four files. Normal build/lint,
sequential source/Vue and test types, architecture, docs and changelog checks pass.
An earlier directory-filter owner invocation also ran an archived old test (79 pass, one
failure). That receipt remains; explicit `./tests/app/shell/support/*.test.ts` file arguments
run the actual four live owners without changing the archive or test discovery policy.

## Retained evidence and limits

- `local-evidence/support-browser-baseline3-2026-11-07/`: original failed run and source.
- `local-evidence/support-browser-smoke7-2026-11-07/`: complete smoke output and source.
- `local-evidence/support-browser-final35-2026-11-07/`: complete final output, source copies,
  cases, layout states, captures, contact sheets and SHA-256 manifest.
- `scratch/support-browser-*-2026-11-07.*`: source freeze, owner/build/types/architecture/docs
  receipts and the explicitly retained invocation failure.

Fresh authenticated GitHub readbacks after publication return exact local README and
issue-template bytes, including the new requirements heading and matching `Web (Brutal)`
option. The repository's remote `HEAD` resolves to the published source commit; the private
draft head and disabled Actions state also match. The proof retains both Git blob and
SHA-256 identifiers in `scratch/support-browser-live-content-proof-2026-11-07.json`.
Mocked browser link delivery and real repository content remain separate evidence. No issue
is submitted, and browser-account access is not qualified.

No user document, recovery store, profile, credential, installed app or OS configuration is
changed. No new endpoint, baseline, timeout, retry, skip or global error filter is introduced.
Native unsupported-engine advice, trusted OS browser opening, human acceptance, beta readiness
and full Pen parity remain separate gates.
