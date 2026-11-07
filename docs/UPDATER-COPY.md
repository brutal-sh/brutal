# Update prompt identity and guidance

Updated: 2026-11-07. Status: bounded component criterion executed and published at
[`9d399a4ab`](https://github.com/jpoindexter/open-pen/commit/9d399a4abaa9ba1c465b38fdaf00965535b82ed1) for
[BRAND-UPDATER-COPY](https://trello.com/c/XrpINmo1).
Native update delivery, restart feedback and full branding remain open.

## Resulting behavior

Unavailable-update guidance tells the user they can keep using this version of Open Pen.
It uses the existing message key in English and all eight translated catalogs. It no
longer asks the app user to publish a signed release or create `latest.json`.

The update window's notes link opens this private fork's real changelog. GitHub's authenticated
contents API returns the exact `/blob/HEAD/CHANGELOG.md` URL; the repository currently has no
releases. The one-caller version-specific upstream URL helper becomes a named own URL constant.
No version tag, installer, feed or signed release is invented. Version-specific published
release routing remains a later publishing concern, documented beside the constant.

Both app manifests report `0.16.0`; updater endpoints remain empty and the existing startup
check stays disabled by that configuration. Protocol/package IDs, provider identities, update
session logic and native operations are unchanged.

## Component criterion

The real UpdatePrompt renders thirteen states: available, no notes, Windows install wording,
known/unknown download size, download failure, installed, installing, install failure,
checking, up to date, check failure and unavailable. Release data is explicitly fictitious
`0.16.1`/current `0.16.0` workshop content; it is not evidence that an update exists.

Stories exercise actual component buttons and assert typed mock Install, Cancel, Restart,
Retry and Dismiss callbacks. Installing exposes no action button. This qualifies emitted UI
intent, not a real controller transition or an OS operation. The separate restart child will
connect the real session/controller through its existing typed backend seam.

The English smoke check passes all thirteen states in both themes: four runner cases,
twenty-six captures, play functions and axe. The notes link is focused and activated with
Enter into a test-owned page at the own URL; the source component retains its available state after the popup closes. That
mocked page proves delivery/routing, while the separate real API readback proves the path
exists. Native system-browser opening and browser account access remain unqualified.

The final nine-locale, two-theme matrix passes all 36 cases with zero retries, skipped,
flaky or unexpected cases in 568,286 ms. All 234 state captures and containment records
are present, and all 27 frozen source/config hashes match. All 234 captures are reviewed
across 53 sheets: parent reviews English, Italian, Russian and Chinese; independent review
covers German, Spanish, French, Japanese and Polish. Suspicious thumbnails are checked
against five raw originals, without a matching product defect. These are component
copy/action/visibility checks, not actual-Pen design acceptance. The canonical runner, existing thirty-second Storybook case budget and
single worker remain in place; release and check/failure states use separate cases.

## Observed contrast correction

The initial English smoke check reaches the no-notes state and fails axe for muted text
on its input background. The update theme changes only that label to the existing primary
text token; no global palette, layout or contrast exemption changes.
Rendered English dark/light colors give contrast ratios of 9.50:1 and 15.80:1, respectively;
passing axe results are retained. The old default-dark source token pair gives 4.07:1; that
numeric before pair is source-derived, while the failed axe result is observed. Subsequent captures are taken before the final story-result assertion so failures
retain their visual and geometry evidence.

The final current-source normal build, sequential source/Vue and test type checks,
architecture and i18n checks pass. All 23 updater-owner tests pass before and after the copy
change, and again after the matrix (44 assertions across three files). Earlier rejected story argument/guard attempts and
the actual contrast failure are retained without suppressions.

Raw reports, traces, source copies and hash manifests remain in ignored
`local-evidence/updater-copy-final36-2026-11-07`; the visual index and independent proofs
are in `local-evidence/updater-copy-visual-review-2026-11-07`. No baseline, timeout, retry,
skip or axe exemption is changed. Wider combined/native typing and cache-scan limitations
remain recorded separately; this is not a clean release qualification.

## Limits

Monitored HTTPS requests use the existing local service fixtures; unconfigured requests in
that scope fail. Uncaught page errors and Storybook play/axe outcomes are checked. This does
not establish universal network/console coverage. No real updater check, download,
installation, native approval, OS restart, physical input or exact Pen geometry is accepted.
The empty feed and user files, profiles, credentials and recovery remain untouched.

See the [PRD](PRD.md), [identity record](BRANDING.md) and [task index](TASKS.md).
