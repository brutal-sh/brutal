# Panel catalog ownership review

Candidate disposition, 2026-11-07. MOD-08 remains Verify; inherited inspector controls
require adjudication against actual Pen under [VERIFY-INSPECTOR-CONTROLS](https://trello.com/c/ngc2tr1y).
No catalog exception, native behavior or whole-panel parity is accepted by this review yet.

The owner is the Vue SDK i18n domain, `packages/vue/src/i18n/messages/panels.ts`, with its
eight `locales/<locale>/panels.json` companions. The canonical file has 694 physical lines
and 656 entries: 618 strings and 38 parameter/plural declarations. It declares one flat
public `panels` namespace, consumed through `panelMessages`, `usePanelMessages`, the
compatibility aggregate and `messageDefaults.panels`. Its only store construction delegates
to the existing i18n service; there is no asynchronous workflow, mutable cache or branching
application logic in this catalog.

Proposed exception: retain this declaration family as the existing flat message contract.
Moving fields to new namespaces changes the public SDK and all consumers; composing many
physical fragments under the same namespace adds locale/checker coordination without
separating runtime responsibilities. This rationale does not authorize adding new feature
workflows here. New domains use the existing narrow catalog/locale-folder pattern. Review
this exception when a domain API changes, keys move, loading granularity changes, or this
file gains runtime behavior. A future partition must move canonical and all translated keys
together and preserve public compatibility deliberately.

The eight large translated companions are de/es/fr/it (679 lines each), ja/zh-cn (672 each),
and pl/ru (686 each). Keep the existing `LOCALE_FILE_NAMES`, placeholders, plural/parameter
shapes and reviewed translation/mixed-script baselines intact. A declaration label alone
is not acceptance and does not hide these files from the runtime inventory.

Executed evidence: all sixteen catalog/public-entry/loader/checker/baseline files match
published source byte for byte. The i18n structure/key/placeholder/quality check passes.
The exact canonical Vue owner shard passes 421 tests / 1,839 assertions. Initial directory
and relative-file unit invocations also discover the temporary scanner source copy and
fail; the explicit absolute canonical file run excludes that copy. The failed receipts are
retained, with no product fix or blanket error filtering claimed. The temporary scanner
copy is moved reversibly under `.git`; the ordinary canonical Vue runner then also passes
421 tests / 1,839 assertions.

Existing current compact-inspector checks pass six cases across Chromium/WebKit in 28.6s:
paired dimension/appearance/clipping edits with Undo, mixed clipping values restored in one
Undo, and Context/selection retained across collapse without history. The inherited menu/
inspector attempt records four menu passes, three failures and thirteen unexecuted cases
after serial failures: Chromium snapshot dimensions differ (230×683 expected, 221×734
actual), the WebKit baseline is missing, and Position-region lookup fails. The inherited
OpenPencil baseline is not the Pen reference; no baseline is blessed or replaced. The
new verification card owns actual-Pen adjudication before this disposition is accepted.
Action/clipboard/native and all-language visual acceptance remain outside these receipts.

Runtime source, locale values, public types and image baselines are unchanged. Generated
missing-baseline output remains untracked and unaccepted. The next re-entry is the same
fixture/viewport/state in actual installed Pen, then correction of only proven source or
stale-test ownership, followed by the failed and previously unrun controls.
