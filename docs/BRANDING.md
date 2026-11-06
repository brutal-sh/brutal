# Open Pen identity acceptance

Updated: 2026-11-06. Own-brand assets have executed output and browser checks.
Product copy, native identity, owned logs and links remain separate open tasks.

The original `assets/brand/open-pen-app.png` is the source for shipped artwork.
Historical teal SVG masters retain provenance but are no longer generator inputs.
Native generation retains its existing source and Tauri path; app geometry is unchanged.

| Surface | Executed evidence | Limit |
| --- | --- | --- |
| Main/micro marks and light/dark variants | Generator source-fidelity checks; inspected browser captures at 16/24/32px and larger sizes. | Chromium browser evidence; WebKit and full product branding remain open. |
| Monochrome | Neutral-channel and retained light/dark feature checks; rendered output inspected. | Browser filter rendering is not separately qualified. |
| Favicon and declarations | Real browser loads, both themes, 1x/2x captures; ICO sizes and no duplicate manifest checked. | No installed PWA acceptance is inferred. |
| Profile and any-purpose PWA | Output pixels match canonical Open Pen PNG; generated images inspected. | Platform installation and cache migration remain open. |
| Apple Touch / maskable | Opaque output, expected dimensions and safe-circle validation; output inspected. | Actual mobile OS launcher delivery remains open. |
| Native PNG/ICO/ICNS | Fresh generation, dimensions/RGBA/container and reproducibility checks; 32px/128px images inspected. | This does not qualify a newly packaged or installed native build. |

All 16 generator/cache tests pass. Eight browser workflows pass without snapshot update
after inspecting the eight intentionally changed artwork captures. Existing Open Pen header
captures are unchanged. Web, docs and desktop output checks reproduce byte-for-byte.
Tool types, focused lint, architecture, documentation and changelog checks pass.
Independent review finds no concrete source defect and repeats six focused generator checks.

SVG image compositing can round a visible premultiplied edge channel by one; source-fidelity
checks use the rendered image after scaling and compositing. Canonical PNG/PWA output remains
pixel-equal to the canonical Open Pen PNG at the required size.

Required upstream licenses and engine attribution remain. Compatibility package/protocol IDs
and truthful external-provider names are not own-product branding. Localized visible labels,
native permission/process labels, app-owned diagnostics/log prefixes and help destinations have
their own task cards. None is accepted by the artwork checks.

See the [PRD](PRD.md), [task index](TASKS.md), [source/generator guide](../assets/brand/README.md)
and [branding milestone](https://trello.com/c/2cCz31Kz).
