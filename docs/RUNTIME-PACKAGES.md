# Remaining runtime package inventory

Measured 2026-11-07 at `3095a3520`, using tracked worktree content. The preserved icon,
canvas, font and graph candidates are included without accepting their pending behavior.
This accepts inventory and task allocation only; it does not certify architecture or parity.

The original five-root audit counts 2,935 `.ts`, `.vue`, `.rs` and `.css` files. Extending
those roots to JavaScript also finds four native browser helpers. Thirteen additional
first-party packages add 664 code files; two shipped public OAuth callback scripts add
eleven lines. Two explicit Vite browser alias replacements add eight more lines.
The resulting code scope is **3,607 files**, median
66 lines, with 3,370 at most 300 lines and 14 above 600. One oversized model declaration has
a reviewed exception; thirteen other oversized code owners remain open. Font/graph
acceptance remains open despite their reduced sizes.

## Targets and source ownership

`vite/aliases.ts` injects `vite/node-process.ts` and `vite/empty-node-module.ts` into
browser imports; they are included despite the build-directory location. The two public
OAuth scripts are loaded by their shipped callback HTML. HTML wrappers are markup, listed
by entry configuration rather than counted as code modules.

All sixteen runtime package manifests are reachable from the root workspace dependencies,
including runtime peer dependencies. This is an owner inventory, not a claim that every file
ships in every bundle. Build tools and documentation-site packages are separate.

| Target | Entry and package evidence | Distinction |
| --- | --- | --- |
| Browser/native editor and updater | Root `vite.config.ts` selects `index.html` and `updater.html`; Tauri consumes the editor build. | `src` and `desktop/src` plus shared runtime packages. Native test-only paths are included conservatively. |
| Shared document/runtime libraries | Core's dependencies include FIG, Kiwi, Pen, draw.io, Mermaid, DOM/CSS, design JSX and Scene Graph; DOM/CSS and design JSX depend on Emit. | Neutral libraries retain their own package/public-export boundaries; Vue SDK is the headless UI owner. |
| Node companion targets | CLI, MCP and Harness manifests declare commands; their `tsdown.config.ts` entries select Node. | These are not browser-shipped code; include their three small `bin/*.js` launchers. |
| Optional Cloud targets | Cloud's build separates contract/server, browser client, email and Node entries; standalone/server and Cloudflare deployment adapters are explicit. | Optional service code is inventoried separately from the editor and Cloud portal entry. No deployment is performed. |
| Optional feedback/metrics targets | Feedback's Wrangler entry is `src/index.ts`; root metrics build is its own HTML/Vue entry. | Include four feedback SQL migrations and both Cloud deployment worker adapters; never imply these inherited services are deployed for Open Pen. |

| Owner | Code files | Physical lines | Largest file | Above 600 |
| --- | ---: | ---: | ---: | ---: |
| `app` | 1,587 | 134,219 | 715 | 4 |
| `desktop` | 49 | 7,386 | 561 | 0 |
| `packages/cli` | 56 | 4,764 | 411 | 0 |
| `packages/cloud` | 240 | 22,220 | 592 | 0 |
| `packages/core` | 696 | 98,006 | 1,140 | 5 |
| `packages/design-jsx` | 60 | 8,718 | 598 | 0 |
| `packages/dom-css` | 69 | 11,340 | 587 | 0 |
| `packages/drawio` | 8 | 629 | 182 | 0 |
| `packages/emit` | 4 | 501 | 195 | 0 |
| `packages/feedback` | 35 | 2,567 | 415 | 0 |
| `packages/fig` | 106 | 14,833 | 1,333 | 2 |
| `packages/harness` | 9 | 831 | 201 | 0 |
| `packages/kiwi` | 18 | 2,574 | 536 | 0 |
| `packages/mcp` | 27 | 4,202 | 598 | 0 |
| `packages/mermaid` | 8 | 729 | 418 | 0 |
| `packages/pen` | 24 | 4,585 | 418 | 0 |
| `packages/scene-graph` | 192 | 22,596 | 1,107 | 1 |
| `packages/vue` | 415 | 33,343 | 694 | 2 |
| `public/oauth` | 2 | 11 | 6 | 0 |
| Browser alias stand-ins | 2 | 8 | 7 | 0 |

The inventory includes every tracked code file in these owners, not only currently imported
functions. It excludes `.d.ts`/`.d.mts`/`.d.cts`, test/spec/story examples, package build
configurations, generated `dist`/targets, docs/example apps, tools and dependencies. These
are explicit scope boundaries, not accepted module dispositions. Runtime data, artwork, fonts,
HTML entry markup and prompt Markdown are not counted as executable-code files.

The entire `packages/mermaid/src/upstream/` tree is pinned copied/generated Mermaid 12.2.0
source. Its 1,099-line parser is generated from the pinned grammar by
`tools/generate/mermaid-sources`; its preprocessing headers and license identify provenance.
Change the generator/pin and validate parsing rather than hand-splitting vendor output.
Authored Mermaid adapters remain included. The Kiwi schema below is not hidden by this exclusion.

## Newly allocated dispositions

| Owner | Observed size | Bounded tasks |
| --- | ---: | --- |
| FIG importer `node-change/convert.ts` | 1,333 | [MOD-16](https://trello.com/c/P6y3uJe1) extracts text conversion; [MOD-19](https://trello.com/c/q0ZEZpOy) reviews the remaining coordinator afterward. |
| FIG exporter `node-change/export/node.ts` | 1,017 | [MOD-17](https://trello.com/c/uGL3MDSH) extracts raw-payload preservation; [MOD-20](https://trello.com/c/BGyM2T9o) reviews the remaining coordinator afterward. |
| Kiwi runtime wire schema `fig/schema/fig.kiwi` | 5,628 data/declaration lines | [MOD-18](https://trello.com/c/3TOfol9P) reviews the contract owner, field/tag preservation and a justified exception or supported partition. It is parsed and validated by `packages/kiwi/src/fig/schema.ts`. |
| Translated panel catalogs | de/es/fr/it: 679 each; ja/zh-cn: 672 each; pl/ru: 686 each | Existing MOD-08 owns these eight companions together with canonical `messages/panels.ts` (694). Key partitioning must preserve every locale, placeholder and consumer. |

The schema and eight translated catalogs are nine additional data/declaration files above
600 lines, separate from the fourteen code files. No exception is accepted merely because
a file is declarative. The first FIG extractions leave explicit coordinator follow-ups;
neither extraction card alone certifies the whole importer/exporter. Every task retains
public exports, serialized/raw metadata, before/after whole-archive controls and real
browser/Figma round trips required by the owning guide. Unexecuted paths remain in Verify.

## Reproduce code counts

Run from the repository root. This uses the Git-tracked file set and current source bytes;
future commits will deliberately change the totals. It does not read user documents or send
source to a provider.

```python
from pathlib import Path
from collections import Counter
import subprocess

roots = ["src", "desktop/src"] + [
    str(p / "src") for p in Path("packages").iterdir()
    if p.name != "docs" and (p / "package.json").is_file()
]
roots += ["packages/cli/bin", "packages/mcp/bin", "packages/cloud/deploy",
          "packages/feedback/migrations", "public/oauth"]
extensions = {".ts", ".vue", ".rs", ".css", ".tsx", ".jsx", ".js", ".mjs",
              ".cjs", ".mts", ".cts", ".sql"}
extra_files = {"vite/node-process.ts", "vite/empty-node-module.ts"}
counts = Counter()
oversized = []
for name in subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0"):
    p = Path(name)
    if (name not in extra_files and not any(name.startswith(root + "/") for root in roots)) or not p.is_file():
        continue
    if name.startswith("packages/mermaid/src/upstream/") or p.name.endswith(
        (".d.ts", ".d.mts", ".d.cts", ".stories.ts", ".test.ts", ".spec.ts")
    ) or p.suffix not in extensions:
        continue
    owner = "/".join(p.parts[:2]) if name.startswith("packages/") else p.parts[0]
    counts[owner] += 1
    lines = len(p.read_text().splitlines())
    if lines > 600:
        oversized.append((name, lines))
print(dict(sorted(counts.items())), "total", sum(counts.values()))
print(sorted(oversized))
```

Private evidence retains each included path, line count and SHA-256, exclusions, manifest
closure and local Graphify query. The graph is a source locator; current manifests and
entry configuration establish this scope. [Tracking](TRACKING.md) records complete board
readback and dependency allocation. No runtime refactor, provider login, native delivery,
branding milestone, beta or full Pen parity is accepted by this inventory.
