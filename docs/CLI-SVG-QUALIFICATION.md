# CLI SVG qualification

CLI-04-SVG remains **Verify**. These owned-file checks exercise Open Pen's existing CLI at `e8a76d43`; they do not establish matched actual Pen CLI output or full visual parity. No product implementation changes are needed for the checked paths.

The installed reference remains Pen 1.2.22, ASAR SHA-256 `1c6d0129dc9dda08f2f0da5dde23aa8cc52df11858fec1e35cd3bd2647bcf407`. Its menu opens the [official CLI documentation](https://docs.pen.dev/for-developers/pen-cli). The extracted app package declares no `bin`, and `pen` is absent from PATH. Selected REA syntax-only analysis is partial; neither that inventory nor the current documentation proves that the standalone CLI is newer-only or equivalent to this installed engine. The authenticated reference export is unexecuted. No vendor CLI installation, login, inference or access-limit bypass occurs.

## Executed independent outputs

Disposable schema 2.21 content contains a frame, rectangle, ellipse and local PNG. Explicit `-f svg` writes valid, byte-identical XML to `.svg` and `.png` filenames. Omitting the format writes PNG even with a `.svg` extension. Selected-node export executes. Original document and asset SHA-256 remain exact after every invocation. The image embedded in SVG retains its exact original bytes.

Invalid format, missing source, missing node, conflicting page/node targets and a missing output directory each return nonzero without creating their requested output. Standard output/error and exact arguments are retained. Standard output is a completion/target report; these checks do not assert a raw-SVG stdout mode.

Headless Chromium renders the exported SVG at 240 × 160. Four analytically chosen interior pixels match both expected authored colors and the independent CLI raster output. The complete images differ at 244 pixels: no whole-render equality or tolerance exception is accepted. This compares two Open Pen outputs, not the actual Pen reference. Text, effects, broader assets and app-connected exports retain their separate criteria.

## Evidence and re-entry

Private evidence: `local-evidence/cli-svg-2026-11-12/`, including `outcomes.json`, original fixture/assets, outputs, per-command stdout/stderr, `own-render-comparison.json` and the difference image. The first private render helper imports unavailable `playwright`; correcting it to the installed `@playwright/test` produces the retained render without adding a dependency. REA resource/selected-source evidence is exported to `local-evidence/native-store-isolation-2026-11-12/cli-reference-source-analysis.json` and the resource session closes.

Re-entry requires the exact reference CLI entry/version and an authorized owned export, followed by matched asset/render acceptance. Current documentation describes explicit export type independently of extension and a separately authenticated CLI; that documentation alone does not close the pinned-runtime requirement. Native recovery/picker and normal-installed gates remain open while the desktop is locked.
