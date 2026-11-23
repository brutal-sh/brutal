# Restart feedback identity and controller behavior

Updated: 2026-11-07. Status: bounded browser criterion executed and published at
[`4006503a6`](https://github.com/brutal-sh/brutal/commit/4006503a6f051a7a76e7517bf7d0c7d0d648ed99) for
[BRAND-RESTART-COPY](https://trello.com/c/H4fe0dbb).
Native restart, exact Pen geometry and full branding remain open.

## Executed path

The component workshop connects the real `createUpdaterSession` to the real `UpdatePrompt`
through the existing typed `UpdaterBackend` and `PendingUpdate` interfaces. The example
owns its backend counters and release data per mounted instance. It never overwrites
session state or calls the Tauri backend. No production hook, endpoint, dependency,
installation, actual restart or user-document operation is added.

Both stories enter through the controller's actual check and the component's Install and
Restart buttons. The fictitious update is `0.16.1`, with current version `0.16.0`.

- Denied approval leaves the installed view and retained release intact. The backend
  receives one approval call and zero relaunch calls.
- Rejected relaunch retains the release and displays the localized Brutal restart-error
  wrapper with the original test-owned error detail. Retry invokes approval and relaunch
  a second time and returns to the installed view. Check, download and install each remain
  at one call; Retry does not repeat them.
- Later invokes the pending-update close and close-window backends once.
  Neither backend receives a call before the click; the fixture window itself stays open.

The English release notes and `test-owned relaunch refused` error are deliberate fixture
data. They qualify interpolation of supplied content, not translation of arbitrary backend
errors. Product labels, action names and feedback wrappers use the existing locale catalogs.
Production updater/session logic, catalogs and component styling remain unchanged.

## Browser evidence

The English smoke run passes four cases, producing six captures. The final canonical
`storybook-chromium` run passes all 36 cases: nine locales × two themes × two scenarios.
There are zero retries, skips, flaky or unexpected results. Runner duration is 61,154.209 ms.
All 54 captures and decoded layout attachments are retained, and all thirty frozen
source/config hashes match after the run. Story play functions and axe pass in both themes.
All fifty-four captures are visually inspected across nine contact sheets; suspicious English
and Russian thumbnail text is also checked at raw capture resolution. No clipped own name,
version, error detail or controls are observed. Independent review verifies the case, source,
layout and capture receipts. No snapshot baseline, timeout, retry policy or error filter changes.

Complete local receipts:

- `local-evidence/restart-copy-en4-2026-11-07/`: complete smoke output, captures and source.
- `local-evidence/restart-copy-final36-2026-11-07/`: complete runner output, cases, fifty-four
  layout states, source copies, contact sheets and a SHA-256 manifest.
- `scratch/restart-copy-{build,source-types,test-types,architecture,i18n,owner-before}-2026-11-07.log`:
  normal build/lint, sequential source/Vue and test types, architecture, locale integrity
  and 23 updater-owner tests with 44 assertions across three files.

The browser checks monitor uncaught page errors and the existing HTTPS fixture boundary;
both remain empty. Storybook outcome reporting includes play and accessibility failures.
This is not universal console/network coverage or native platform delivery.

## Acceptance limits

These executed interactions qualify the controller/component restart-feedback contract
with test-owned backend behavior. They do not qualify native unsaved-document approval,
trusted OS input, process relaunch, signed updating, downloading or installation. The app
still has no published update feed or installer. No installed app, profile, credential,
recovery store or document is touched.

Exact Pen screen geometry, human translation sign-off, all supported platforms, beta
readiness and full product parity remain separate acceptance gates.
