# Named icon comparison

Reference: `/Applications/Pen.app` 1.2.21. Full icon and product parity remain open.
Vendor captures and resource measurements stay in ignored `local-evidence/`;
the implementation uses the existing independent editor and public icon providers.

| Contract | Reference evidence | Open Pen status |
| --- | --- | --- |
| Glyph and family | Native Lucide inspector has separate 24px rows, 6px apart, below Fill | Separate compact selectors; ordinary Fill owns authored icon paint. Advanced retains detach and legacy controls. |
| Families | Shipped controls list Material Symbols Outlined, Rounded, Sharp, feather, lucide and phosphor | Same choices and ordering; existing custom families remain available for their selected icons. |
| Family change | Controlled reference API retains the glyph name even when the destination family lacks it | Retains name, dimensions, frame identity and paints; missing artwork remains an empty named icon. |
| Weight | Shipped Material control is one 24px range/numeric field, 100–700 in steps of 100, default 200 | Uses the shared number field; Material outlines change in place, preserving child identities and authored paints. Modified glyphs require reset. |
| History | Reference control behavior is not exhaustively qualified | Owned asynchronous previews coalesce typed edits and paused scrubs, cancel synchronously, ignore late results and settle before Undo/Redo. Browser and SDK evidence below. |
| Persistence | Pen owns named icons across all its supported libraries and sizes | Current `.pen` writer accepts verified, unmodified 24px Lucide icons only. Other families, weights and sizes remain an explicit export gap. |

## Evidence boundaries

Fresh native reference observation establishes the Lucide rows and absence of a separate
Icon color or weight row. Read-only shipped-resource inspection establishes the family
choices and weight control parameters. A controlled document API probe establishes that
switching families retains the glyph name; that API document did not update the selected
native inspector, so it does not establish a physical family-menu interaction.

An owned Material reference document opens in actual Pen and draws `home`, but has no
selection. Native reference weight editing and exact paired control pixels remain open.
No vendor implementation or assets are included in the application.

The browser weight workflow uses a checked-in public Material font fixture. It checks actual
outline changes, a multi-value typed edit undone in one step, focus-only typed cancellation,
paused pointer dragging, Escape preserving selection and Redo, and stable glyph identities.
The canvas snapshots cover the final 700-weight glyph without unrelated profile UI.

SDK tests cover delayed-provider cancellation, selection changes, disposal, independent
history batches, external metadata edits and Undo during a held preview. These establish
owned edit behavior; they do not establish OS keyboard delivery or full native parity.

## Executed checks — 2026-11-04

- 1,049 editor/icon/SDK tests pass with 4,638 assertions; the final focused rerun passes
  45 tests with 174 assertions. An independent reviewer repeats the focused owner checks.
- 39 Chromium/WebKit application checks pass without snapshot update, including existing
  keyboard-layout history, glyph picker, Fill, toolbar placement, Save/reopen and numeric fields.
  Both new canvas baselines are visually inspected.
- Three isolated native WebView checks pass. The Material case loads the public provider's
  64px `home`, changes 200→400→700, ends the input session, and restores exact path geometry
  and child identities through native-menu Undo/Redo events. The other cases retain painted
  icon pixels and Lucide color Save/Recents reopen. The final inspector capture is inspected.
  Focus, input and Enter are DOM-delivered because the embedded driver's click/key delivery
  does not open/commit this field. Physical OS input and menu clicks remain unqualified.
- Source/Vue/test types, scoped lint, architecture, documentation, translations and changelog
  checks pass. Full repository lint still reports existing icon-writer return-contract and
  DOM/CSS conditional diagnostics. The separate native-test type gate reports older driver
  contract errors outside this icon spec; it is not reported as passing.
- Native-test/normal bundles build at 87.75/81.25MiB. The normal bundle passes strict signature
  verification and excludes native-test hooks from its frontend and executable. The main
  installed app and user profile are not replaced.

## Remaining acceptance

- All-family/size/weight `.pen` Save and reopen, including actual Pen interchange.
- Exact glyph picker, family menu and weight-control pixels, hover, focus and disabled states.
- Native trusted pointer/keyboard cancellation, provider failure, offline and mixed/read-only states.
- Image/shader icon paints, live wide and zero-size resizing, and exhaustive instance bindings.

Private reference and test receipts: `local-evidence/icon-selectors-2026-11-04/`.
