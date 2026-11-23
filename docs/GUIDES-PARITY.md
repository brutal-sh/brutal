# Native File guides

Reference: actual `/Applications/Pen.app`1.2.21, inspected2026-10-31. This unit closes named menu-delivery workflows only. Full guide design and coding-client integration parity remain OPEN.

## Observed reference

File shows the code-export guide, Figma-import guide and CLI-install link between Snapshot and Save. The code guide is an approximately896 CSS-pixel wide dialog, limited to80vh, with dark surface/border, icon heading, client-status badges, three terminal steps, three black example blocks and a right-hand terminal illustration. Seven green badges appeared in the inspected reference. They are observations of that application, not evidence that Brutal has seven working client integrations.

The Figma action shows a nonmodal informational toast, rather than a dialog. The earlier accessibility-only check missed it; a later screenshot confirmed it. It describes clipboard paste, local `.fig` import and compatibility limits. The CLI action’s extracted menu metadata points to the official CLI documentation; no vendor installer was executed. The current official CLI page was reread and confirms that the vendor agent CLI is a separate product contract.

## Independent implementation

Brutal adds the three native, browser File and command-palette actions through the existing catalog and shell dispatch. Guides also work from native Home. The code guide uses the shared dialog, the measured width/height/surface treatment, semantic steps/examples, an independent terminal card and the existing local MCP server’s reported state. Opening it refreshes health; the green state means the local server reports running, not that an external coding client is configured or authenticated. The Settings action opens the existing MCP page. It installs nothing and writes no client configuration or credentials.

The Figma toast uses the shared toast component and a neutral information treatment, existing import paths, a Close action and F9 keyboard access. It does not change the canvas selection. The CLI action opens the [Brutal CLI guide](https://brutal.sh/help/#cli). From a prepared source checkout, `bun run brutal --help` displays the available commands.

All new copy has matching files/menu entries in eight locales. The22 reviewed Japanese/Chinese mixed-script baseline additions retain product names, MCP, Figma, React and file extensions; existing baseline ordering is preserved.

## Evidence and corrections

Four browser workflows execute dialog close/reopen/Escape, accessible description, MCP-settings navigation, repeatable nonmodal Figma delivery, F9→toast→Close→Enter, the intended CLI URL, selected-node preservation and light-theme/narrow-window scroll/action access. Private captures retain the dark/light/narrow dialog and information toast. Exact Pen/Brutal pixel typography and toast placement are not accepted.

The isolated native Tauri workflow executes the command-palette routes, Settings navigation, selected IDs/dirty-state preservation and the captured CLI URL. A separate bundled operator test physically activated the actual macOS File actions from Home, observed the guide/toast, and verified that the CLI command delivered this fork’s URL. Its screenshot revealed an existing runtime-status defect: after test-route startup, the displayed endpoint remained port0. The shared health application now updates the endpoint after resolution; native automation checks the displayed address against the real test-owned configured port.

Review found a second default-F8 toast viewport stealing focus. The guide now uses distinct F9; a modifier-array attempt failed because the installed key listener treats array elements as alternatives. The executed keyboard regression confirms the final route. Lint also caught a static bridge/menu import cycle, corrected by loading runtime health at action time.

Retained failed probes are not acceptance: one native assertion used the general dialog selector, which then matched Settings after the guide closed; it now pins the guide’s accessible-title ID. The physical Home probe initially asserted text on an icon-only tab; its accessible Home label is the correct assertion. A native runtime-validator import initially lacked the native runner’s app alias; adding that alias also pulled unrelated application globals into the isolated compiler. The probe now validates only the native command’s port field at its IPC boundary, preserving the isolated runner configuration. The original sampler and minimal AppKit probe failures remain separate in EYEDROPPER-PARITY.md.

Private logs: `guides-display-browser.log`, `guides-native-resolved-endpoint.log`, `guides-physical-native-final.log`, `guides-runtime-model.log`, `guides-model.log`, `guides-shared-storybook.log`, plus scoped types/lint/architecture/locales/build checks. The final build/check results are recorded with this unit’s commit; source or build success alone does not prove the guide’s external coding workflow.

## Remaining acceptance

- Connect real approved coding clients to the independent bridge, generate code from a synthetic selection and inspect the output in the destination project. Preserve existing client entries, credentials and authorization boundaries.
- Match the supported-client catalog/status semantics, every terminal setup/error/restart state, exact expanded/light typography and Figma toast placement/lifetime against the running reference. The independent terminal card deliberately contains no vendor artwork.
- Implement and verify the independent public CLI/MCP contracts, tracked in `pen-feature-reference/command-contract.md`. The existing headless editor CLI is not a complete replacement for Pen’s agent CLI.
- Install/deliver the final normal candidate only after the stalled main-profile file-open question is resolved. No recovery data was removed and the installed main app was not replaced during this unit.

Final unit validation: four final guide browser workflows passed; six controlled-browser sampler and two snapshot workflows passed in the adjacent run.20 menu/toast/import and11 MCP-runtime model tests passed. Eight shared dialog/toast Storybook regressions passed. The final rebuilt native guide workflow, including the actual configured endpoint, passed; snapshot and chat-text-size native regressions also passed. Actual File/Home operator acceptance passed in47.7s. Source/Vue/test/native types, structure lint (existing warnings), architecture, locales, changelog, test placement and package metadata/exports/contents/Publint/ATTW checks passed. The normal77.92MiB debug bundle was built and its deep/strict signature verified; frontend/Mach-O checks exclude native test driver entry points/symbols. It is a signed local candidate, not a notarized release or installed-main-profile acceptance.
