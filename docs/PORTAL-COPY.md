# Portal client-label acceptance

Updated: 2026-11-09. Scope: BRAND-COPY-PORTAL, the ten changed own-client labels in the
optional Cloud portal. Production messages, views, styles and contracts are unchanged by this
verification unit. Real OpenPencil Cloud service/product and host identities remain intact.
This does not accept every branding surface, real authentication or full Pen parity.
Source fixture and initial evidence are published at `5e68a76682b8ec9e0cf2f8c9cdf59b0a92da599d`.

## Executed pages and labels

The fixture serves the actual `cloud.html`, entry point, router, HTTP clients and Vue views.
It simulates only the Cloud server's document routing and local discovery/account/auth API
responses, reusing existing discovery and remote-service fixtures. Account standing and
device outcomes are test-owned responses; no live Cloud backend, user account or provider is used.

| Source label | Actual presentation |
| --- | --- |
| `welcomeTitle` | Welcome page; its Sign in button navigates through the real router. |
| `returnsToDesktop` | Sign-in page with a device-approval continuation. No credentials submitted. |
| `deviceTitle` | Device approval heading. |
| `deviceDescription` | Device approval account text, retaining the synthetic email. |
| `deviceWarningDescription` | Device approval warning. |
| `deviceApprovedDescription` | Real device controller's successful approval feedback. |
| `deviceExpiredDescription` | Real device controller's failed-lookup feedback. |
| `desktopApp` | Loaded account-session cell, not its empty/loading placeholder. |
| `methodDesktop` | The session cell's sign-in-method detail. |
| `verifiedDescription` | Directly opened verified/return page; no email verification completed. |

The device journey starts with lowercase input and observes the normalized `ABCD-EFGH`
code. A test-owned 503 rejects the first approval; the real pending page shows translated
failure feedback, and retrying through its Approve control succeeds. A fresh pending request
is denied through the real Deny control. Finally a refused device lookup shows expiry advice.
This last case does not exercise an invalid-code decision response or actual expiry time.

## Evidence

Nine locales × two themes × two journeys × Chromium/WebKit pass all 72 cases in 108.254
seconds, with zero retries, skipped, unexpected or flaky results. All 324 region/cell captures
are inspected across 54 sheets: parent sheets 1–27 and independent reviewer sheets 28–54.
This is targeted copy/feedback inspection, not complete portal-screen or Pen geometry acceptance.

All ten labels match the canonical English messages or translated catalogs in every one of
the 36 locale/theme/browser contexts: 360 scoped label checks. Interpolated email and code
remain visible. All 108 decision requests have the expected approve/approve/deny ordering and
normalized code; no unexpected or recorded remote request and no page error is observed.
Actual light and dark themes are recorded, and all 26 frozen inputs still match.

The final ignored record is `local-evidence/portal-copy-final72-2026-11-09/`: JSON report,
explicit screenshot paths, decoded requests, canonical copy, all images, sheets and hash/check
records. No new snapshot baseline, timeout, retry, skip or global error filter is introduced.
Temporary process-only sleep assertions end with each browser run.

## Controls and limits

The initial English smoke passes two journeys but captures the session's empty placeholder.
A stricter four-case smoke passes the two device journeys and fails two session selectors:
the actual cell includes a current-session badge, so exact nested text does not match it.
The corrected accessible cell-name selector passes all four cases. These failures/controls
are retained. An initial full 72-case run also passes; its record is retained separately
before adding explicit screenshot-path metadata for the final recorded run.

All 21 portal-owner tests pass with 67 assertions across four files. Test types, focused
lint/format and architecture checks pass. Independent review repeats the matrix, source/hash,
label/request checks and its image half, finding no concrete defect in this scope.
The fixture uses Playwright storage state for themes and preserves the canonical first-run
preference; no direct storage bypass or production hook is added. This tests/docs-only unit
does not require another production build.

Direct sign-in/verified-page navigation proves displayed copy and routing, not credential
submission, email verification, device-token issuance or desktop return delivery. Real Cloud
authentication/backend/security, native/CLI/provider delivery, installation, complete accessibility
and actual Pen comparison remain separate. No real account is approved or denied, no issue
or email is sent, and no server is deployed.
