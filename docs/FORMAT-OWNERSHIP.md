# Format adapter ownership

MOD-11 bounded runtime criterion executed, 2026-11-07. Source publication/readback is in progress.
This is an internal module extraction; no new format behavior, pixel rule or subscription
change is introduced. Actual installed Pen remains the parity reference.

The format registry originally contains 650 physical lines and mixes built-in registration
with PEN asset loading and reading/writing. The candidate separates that existing PEN owner
into `packages/core/src/io/formats/pen/adapter.ts` (129 lines). Immutable adapter support,
fixed-size options and extension matching move together to `formats/shared.ts` (17 lines).
The registry retains its other format implementations and ordered registration, now 513
lines. This improves responsibility ownership; line reduction alone does not accept behavior.

The complete moved PEN region and shared contract bodies compare byte for byte after
normalizing only added export modifiers. The same fourteen source exports, thirteen ordered
adapters, metadata/options/support/method slots and seven filename/MIME matching cases
compare exactly. The existing public IO entry and package export map remain unchanged.
Authored layout, exact icon requests/retry, data-URL image handling, image-read failures,
shader UTF-8/size limits, missing-source preservation and PEN serialization retain the
existing implementations. Shared immutable objects retain a single source.

Before: the same 145 exact canonical Core IO/PEN files pass 827 tests / 4,371 assertions.
Four existing browser workflows pass in 31.2s across Chromium/WebKit: top-level Fill sizing
and mixed-selection fallback edits/history, actual PEN download/parse/reopen and retained
values. The broader inherited inspector snapshot/Position failures remain open under
[VERIFY-INSPECTOR-CONTROLS](https://trello.com/c/ngc2tr1y); these independent controls do not
accept that reference mismatch.

The first after-run exposes a mistakenly removed `layoutAuthoredNodes` import still used
by draw.io: 810 pass and seventeen draw.io cases fail. The import is restored, and the new
adapter uses the required Core alias. The corrected identical 145-file run passes all 827
tests / 4,371 assertions. Source types and owned lint pass. Failed attempts remain retained;
no error filtering, assertion weakening or new mirrored implementation test is introduced.
The normal worktree build, package metadata/exports/contents/Publint/ATTW, architecture,
source and Vue types pass. The built public IO entry retains all thirteen adapter metadata
rows and the same PEN registry object identity. The identical post-extraction browser controls pass all four cases in 30.8s. A freshly
compiled isolated native test binary also passes its Script-source PEN save/reopen journey
in 3.2s: document-local source resolves after reopen, ordinary and atomic source changes
update the generated layers, and an outside-folder source is refused with disabled conversion.
Both native acceptance markers execute. The test app exits; no exact test-binary PID remains.
The runner logs a missing optional external driver diagnostic while using its embedded
driver, and a post-session mock-store cleanup warning; these remain in the receipt. The
actual session and assertions pass. This is one bounded native journey, not OS file-panel,
trusted clipboard, arbitrary conversion or all-native acceptance. Final publication/readback is recorded on the card; no other native gate is closed.

The build includes the preserved unrelated icon worktree candidate; those files are excluded
from this extraction's publication. No user documents, native profiles, credentials, recovery
or main installation are changed. Browser download fallback does not qualify native file
panels, packaging or all Pen format fidelity. No full parity or beta acceptance is claimed.
