# Versioned strict WebKit paint controls

TEST-P3-EXACT isolates a browser-version baseline conflict, not a demonstrated renderer regression. The app and renderer remain unchanged during qualification.

## Cause and retained failure

The original paint-snapshot commit `bcb133b07` pins Playwright 1.63, whose bundled WebKit is 26.6 (revision 2359). The later tooling update `b4e0aaf52` moves to Playwright 1.65 / WebKit 27.2 (revision 2388) for file recovery qualification. The current library's bundled-browser manifests and recorded runtime executable/version identify those pairs. Playwright documents its [bundled browser requirement](https://playwright.dev/docs/api/class-browsertype#browser-type-launch).

Three unchanged canonical current-browser repetitions produce nine passes and three strict initial WebKit failures. All three received PNGs are byte-identical to the retained pre-extraction failure. Each differs from the original by five one-channel text pixels; the matcher reports one differing pixel. A diagnostic soft-assertion capture reaches the resized output and records six one-channel text differences there. That diagnostic remains a failing run, not acceptance.

The current app with the matched historical Core/browser passes all six cases over three repetitions, including both original strict images. Independently captured historical initial and resized PNGs reproduce the original files byte-for-byte, with zero differing decoded RGBA channels. A first diagnostic omitted cross-version context defaults and failed before navigation; it is retained separately and contributes no canvas acceptance.

This controls the browser pair as the cause of the baseline conflict. It does not identify a particular upstream WebKit commit or its internal rounding operation.

## Separate baseline decision

Preserve both original WebKit PNGs byte-for-byte under explicit `webkit-26.6` names. Add the two controlled current-browser captures under `webkit-27.2` names. Select the WebKit baseline using the actual runtime browser version; Chromium retains its original names and bytes. A future unrecorded WebKit version fails for a missing snapshot rather than silently sharing another version's reference.

Both phases retain `threshold: 0` and `maxDiffPixels: 0`. No renderer correction, image filtering, rounding adjustment, timeout or retry increase is made. This is an explicit test-reference provenance correction following the demonstrated browser-pair control, not a claim that a product rendering defect was repaired.

| Phase | Original 26.6 SHA-256 | Current 27.2 SHA-256 | Raw changed channels |
| --- | --- | --- | --- |
| Initial | `87f1d7a2c7dbf49ed552a0dc5718a849b760a0d8b358210878e86cfe2839903d` | `db5c03ce7463f32acaeb35f262254d1dcafaf69d8427ad402c7f2c2ba9b9ab26` | 5 |
| Resized | `59912b61edced173650a832c908a928443a21446ffe6c9ba71018555815d8dc4` | `54688d0a76aff60a80a90635397e467ef1275d391d8a3c8fe8283abe6c054939` | 6 |

## Acceptance scope

The final canonical current Chromium/WebKit run passes 12 cases over three repetitions (48.520 seconds). The matched historical diagnostic passes six cases over three repetitions (27.515 seconds), including both versioned original images and capability controls. Both runs set `--update-snapshots=none`, zero retries and unchanged exact thresholds. The first versioned run fails because Playwright normalizes version dots to hyphens in filenames; its automatic received-image writes are retained and independently checked against the controlled captures before the final runs. That failed run contributes no acceptance.

The committed selector passes strict size/lint and the complete static gate with zero clones. No runtime source changes are made; the 50-file native/renderer source freeze remains exact. Original Note and normal installed recovery gates remain open.

Private receipts under `local-evidence/claude-brand-review-2026-11-11/p3-exact-*` retain all failures, paired manifests, raw images, per-channel coordinates, restoration records and final results. This browser test correction does not accept actual Pen color fidelity, the unresolved Note raster case, normal installed recovery or full parity.
