# Split-pane control access

UI-SPLIT-HEADER repairs the independently reproduced pointer obstruction in Brutal's
desktop workspace. Native delivery, actual Pen visual comparison and the narrower native
split-browser layout remain unaccepted. The installed normal app is not replaced here.

On the published original source, both Chromium and WebKit retain a failed nested-pane
Close click. A second four-case run distinguishes the two actual obstacles: the floating
top-right actions intercept a top header, and the inspector intercepts lower right-edge
controls. The traces retain those intercepted targets; no forced click, hidden obstacle or
larger test timeout is used.

The first candidate reserves right space only while the inspector is visible. Its expanded
matrix passes14cases and fails10. During an ordinary drag, opening the automatic inspector
resizes a pane: the intended40px rectangle becomes154px or212px wide. Activating another
pane can also move its Close button between pointer-down and pointer-up. These are retained
candidate regressions, not timing noise or waived assertions.

The corrected single-component change reserves fixed floating-control gutters while more
than one pane exists:50px above,229px at the inspector edge and52px at the tool-rail edge.
The latter clears the sidebar toggle as well as the drawing rail. Selection no longer changes
these gutters. The inspector, toolbar and pane header controls remain visible. No editor,
document, history, camera, renderer or dependency implementation changes. The intermediate
workspace/sidebar refactor is removed byte-for-byte.

The resulting24canonical Chromium/WebKit pointer cases pass at1280×800 without retries,
skips or flaky outcomes. Horizontal, vertical and nested layouts open every pane's Split menu
and close from either end of the tree. The inspector starts automatic/hidden or explicitly
pinned; it may naturally open when drawing selects a shape. Real pointer drawing creates
the intended40×30rectangle, the original180×120rectangle retains its geometry, and both
remain unchanged after collapsing to one pane. Representative before/after captures are
visually inspected; this is own-application containment evidence, not matched reference pixels.

Twelve further canonical cases pass without retries/skips: keyboard focus/Enter opens a pane
menu, executes Split Down and closes nested views; existing split activation/resizing and
document/context resource workflows retain their assertions in both engines. The resource
cohort includes its existing four-pane keyboard collapse, document switch and reopening path.
These results do not establish native keyboard delivery or full-product GPU reliability.

Separate review confirms the raw totals, current source hashes, embedded trace sources and
representative images. The complete canonical `bun run check` passes with zero duplicate
clones; touched owners pass strict300/50/10/4/4 checks, and the production Vite build passes.
Original15-second app deadlines, retry policy and checked geometry/resource assertions remain
unchanged. Successful polling samples in an existing resource check are not test retries.

REA reads the actual installed Pen plist as1.2.22; a full archive digest remains
`1c6d0129dc9dda08f2f0da5dde23aa8cc52df11858fec1e35cd3bd2647bcf407`.
The resource-only session closes afterward. Inventory identity is separate from observing
screens or menus. macOS still reports a locked desktop, and the previously reported Pen MCP
account limit is not retried or bypassed. The narrower native browser-and-four-pane layout
is an explicit remaining review risk, not a confirmed runtime defect or a qualified layout.

Private evidence: `local-evidence/pane-controls-2026-11-12/`, retaining both original
reproductions, the rejected conditional-gutter candidate, stable-gutter source/results/traces,
screenshots and reference identity. No user documents, profiles, credentials or recovery
stores are test fixtures. This work does not accept recovery panels or full design/functionality
parity.
