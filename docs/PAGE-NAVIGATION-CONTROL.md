# Page-navigation driver control

Updated: 2026-11-09. Scope: [TEST-PAGE-NAV](https://trello.com/c/NIjUHghm).
This repairs an existing browser-test driver; it does not change production page navigation.

Both retained menu-schema controls fail when `visitPage` waits for Alpha inside the hidden
Layers panel. The fixture starts in Agent. The driver now selects the actual Layers tab
before clicking the exact-name page row. Its existing current-page assertion remains.
Repository and Graphify caller checks find only the Alpha/Beta calls in the canonical
command-palette spec; existing app tests already use this Layers-tab interaction.

Executed: the unchanged canonical five command-palette journeys and eleven menu controls
all pass in Chromium: 16 expected, zero skipped/unexpected/flaky, one attempt each, no retries,
23.5 seconds. The existing assertions exercise Recent entries, search and actual Gamma
navigation; both page-step workflows previously unrun now execute. Menu controls also cover
keyboard category opening, disabled selection, Undo, Duplicate, zoom and returning Home.

The original failures stay retained: 13 pass/one failure/two unrun before the menu split;
eight pass/two failures/six unrun afterward. The new passing run verifies the hidden-panel
driver repair. It does not classify the additional prior Commands submenu detachment,
which remains on [STAB-COMMAND-MENU](https://trello.com/c/6WTOPIdh). A passing rerun alone
is neither a causal explanation nor a waiver of that card or MOD-13 acceptance.

Shared test types, focused lint and format checks pass. An independent reviewer verifies
the one-line diff, callers, retained page assertion and complete report. No application,
configuration, shortcut, timeout, retry, skip, snapshot baseline or global error filter changes.
No production rebuild is needed for this test-helper-only change; the real browser run
compiles and executes the affected helper/callers. Native/WebKit/Pen parity is unaccepted.

Ignored evidence: `local-evidence/page-navigation-2026-11-09/` contains the full JSON report,
runner output, moved test-results, source controls, frozen inputs and check/review receipts.
The separate original failures remain in `local-evidence/menu-schema-2026-11-09/`.
