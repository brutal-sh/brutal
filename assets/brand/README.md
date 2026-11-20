# Brutal brand sources

`brutal-app.png` is the Brutal artwork master: an ivory geometric B on a violet tile, generated for this project. All shipped app, browser, PWA and documentation marks derive from this source. Edit the master, then regenerate; generated output is ignored by Git.

- Native PNG, ICO and ICNS assets retain the existing Tauri generation path.
- Web main and optical micro placements embed the master at 256px and 16px respectively. Both themes retain the same recognizable violet/ivory palette.
- Monochrome placements use neutral shades of the same tile and letterform. They do not reuse the inherited pencil-P artwork.
- App/profile and any-purpose PWA icons preserve the master's transparency. Apple Touch is opaque so the platform controls rounding; maskable artwork is opaque with the mark inside the central 80%-diameter safe circle.
- `BrandMark` with `variant="app-icon"` uses the original Brutal PNG. The editor header keeps its 24px tile.
- Historical `mark.svg` and `mark-micro.svg` sources retain their provenance and are not inputs to shipped artwork. Required upstream licenses and credit remain intact.

## Generation

```sh
bun run generate:icons                    # All targets
bun run generate:icons --target web       # App/browser/PWA
bun run generate:icons --target docs      # Documentation
bun run generate:icons --target desktop   # Native PNG/ICO/ICNS
bun run generate:icons --force            # Ignore the content cache
bun run check:icons                       # Fresh generation, contracts, reproducibility, types
bun test tools/generate/brand/tests
```

Generation is local using pinned RealFaviconGenerator/Sharp and Tauri versions; no hosted generator or credentials are needed. Generated assets and the cache are ignored by Git. Only source artwork masters, settings, code, tests, and the normal Playwright visual baseline are tracked.

Vite ensures web assets before app dev/build. VitePress ensures docs assets before docs dev/build. Storybook prepares the assets for its stories. Tauri's dev/build hooks prepare native icons before compilation. Direct Cargo commands bypass those hooks: run `bun run generate:icons --target desktop` before `cargo check` or `cargo build` on a fresh checkout. CI's native-contract job does this explicitly. No icon generation runs in the shipped application.

Outputs are owned by `tools/generate/brand/src/config.ts`: `public/brand/`, `packages/docs/public/brand/`, the root ICO/Apple Touch files in each public directory, and `desktop/icons/`. The app's manifest remains in `vite/pwa.ts`; docs intentionally do not receive an installable-app manifest. Web assets never symlink into desktop output.

Preparation fingerprints the artwork, generator code/settings, lockfile and runtime/tool versions, verifies output hashes, and skips unchanged targets. Missing or corrupted outputs regenerate. A cross-process lock serializes concurrent builds; each file is published atomically and the cache is written last. Destination symlinks are rejected. Native ICNS frame ordering is normalized without re-encoding images.

## Review

Use the **Brand/Mark** Storybook stories for main, micro, dark, and monochrome appearances. `tests/e2e/brand/icons.spec.ts` checks the browser assets, app theme selection, and the main mark's visual baseline. Review intentional changes before updating its snapshot. Run at actual 16/24/32 pixel sizes as well as large sizes.

Do not mechanically replace generic pencil/tool icons or historical screenshots. Social artwork, external profile avatars, and Apple Icon Composer layered icons are separate design/export tasks.
