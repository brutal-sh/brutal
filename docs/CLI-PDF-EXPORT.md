# CLI and browser PDF export

Updated 2026-11-13. CLI-04-PDF remains open for current-reference, native,
app-connected and standalone-package acceptance. The reference is installed
Pen 1.2.23, archive
`d0c5c23a3a86ec1802c8754b59e82600d815f0e2b6a383f655319535e6e07925`.

## Reproduced failures and correction

At published source `5e54130be`, the actual built workspace Node 24.18.0 CLI
fails before writing a PDF: svg2pdf's package-root UMD entry cannot resolve jsPDF.
Bun's source runner selects a different module entry and does not expose that
failure. Importing the dependency's published ES entry repairs actual Node
execution without changing dependency versions or vendor files. Its existing
package-root types describe that entry through a small ambient declaration.

The first corrected image PDF exits successfully but is blank: svg2pdf reports
`Image is not defined` and omits the image. The existing headless DOM now supplies
its real Image constructor inside the serialized export scope. Every replaced
global descriptor is restored after success or failure and the temporary DOM is
closed. Network image-file loading remains disabled. The correction adds no
new dependency or unrestricted image loader.

Private page-rendering helpers preserve the existing font preparation, bounds,
page order and 2× shader/mesh raster path while meeting the changed-code size and
complexity limits. Public callable arguments and existing tests remain intact.

## Executed controls

The actual built workspace Node entry runs outside the checkout on six owned
fixtures: solid, local image, text, selection and two explicit-node targets. All
six succeed and independent Poppler readers confirm their page counts, bounds
and rendered content. PDFKit extracts the exact owned text. Input documents and
image bytes stay unchanged. This qualifies the workspace entry, not a separately
installed or distributed CLI package.

Seven actual failure/refusal controls execute: file-size limit, restricted output
folder, unknown node, conflicting targets, unsupported thumbnail, future input
schema and a destination symlink. Failed writes retain the previous valid PDF
byte for byte and preserve mode 0640. Successful retries render identically; PDF
metadata/IDs are nondeterministic, so successful raw bytes need not match. The
symlink target remains unchanged and temporary files are cleaned up. Five
unaffected non-image cases retain identical decoded pixels after the correction.

All 148 affected CLI, conversion, PDF and document-export cases pass with 586
assertions. Descriptor tests cover both successful conversion and an owned failure
with a pre-existing Image accessor. Actual Node regression tests preserve source,
resource, prior-output and permission behavior.

The first browser cohort retains a real Vite dependency-cache startup failure,
29 passes and 14 unexecuted serial cases. With source unchanged, a fresh canonical
server executes all 44 cases across Chromium and WebKit, with no skips, retries,
unexpected or flaky results. Actual inspector PDF downloads retain complete node
and image snapshots. Poppler and PDFKit independently confirm both downloaded
PDFs: one 160 × 120 page, blue/red image samples matching the owned resource and
searchable `PDF UI acceptance` text. Existing strict fractional checks and raster
quality assertions remain unchanged.

## Open acceptance

A high-frequency Node image is present after the correction, but its decoded
sample differs from raw source pixels and the prior own PNG sample. Sampling and
matched current Pen output remain unaccepted; no threshold or baseline changes.
The solid browser image control does not settle high-frequency image fidelity.

Current Pen matched PDF output, installed native/platform delivery, app-connected
CLI output and standalone installation/release trust remain open. This slice does
not install a normal app or change its binary, credentials, profiles, recovery,
original workspace or protected icon work. All milestones and full parity remain
open. Private commands, failed controls, PDFs, decoded images, source hashes and
logs are retained under `local-evidence/cli-pdf-2026-11-13/`.

## Final bounded qualification and handoff

The full repository gate passes in 186.57 seconds with zero clones, and the
production Vite build passes in 5.51 seconds. All eight qualified source/test
hashes remain unchanged. The production build qualifies module bundling; it does
not establish a production-preview or installed native runtime result. Independent
read-only review verifies the source/retained receipts and finds no actionable
regression.

CLI-04-PDF is Verify; CLI-05 is the next sole Building card. All 525 live cards,
507 unique execution tasks and 18 single-owner milestone allocations reconcile,
including all 506 other PARITY-ALL prerequisites. Counts are 375 Backlog, no Ready,
one Building, 44 Verify and 87 Executed, with no unknown dependencies, cycles or
Executed/open-prerequisite contradictions. No execution card is newly accepted and
all 18 milestone exits stay open. These are task states, not a parity percentage.
