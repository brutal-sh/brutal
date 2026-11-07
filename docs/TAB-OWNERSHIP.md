# Tab lifecycle ownership

MOD-06 candidate, 2026-11-07. Native acceptance remains pending.
Installed Pen remains the product parity reference; this extraction changes ownership only.

The original `src/app/tabs/index.ts` has 715 physical lines. The candidate keeps file-opening,
storage and recovery orchestration there (495 lines), with the same public facade. A real
`tabs/lifecycle.ts` owner (218 lines) holds tab types, ID allocation, shallow refs/computed
state, Home pinning, creation, activation/navigation, close/remove/dispose and count. The
existing opening domain gets `tabs/open/cover.ts` (57 lines), which owns the recent-cover
size, per-store listener map, rendering/cache scheduling and unsubscribe/delete cleanup.
No dependency, generic context factory, feature option or public package export is added.

The entry reads the same imported refs and functions; all tab-state writes remain in the
lifecycle owner. Its `useTabsStore` returns the same singleton objects. Cover rendering
orchestration stays under tabs rather than coupling the generic recent-file cache to editor
lifecycle. Cover has no reverse tabs import. Subscription cleanup still runs before the
preparation controller and editor store dispose. The remaining entry is an actual opening/
recovery owner; it is not a forwarding-only shim.

The original lifecycle block and cover function bodies compare byte for byte after only
export modifiers and expansion of the cleanup helper into the same two original calls.
Opening/storage/recovery bodies and their existing lexical ref names remain unchanged.
A TypeScript AST check verifies all 31 public names, declared signatures, types and computed
expressions against the original. This is not universal inferred-type or hot-reload proof;
consumer types and runtime workflows require their separate checks.

Before: 150 tests / 382 assertions across 22 exact canonical tab, recent-file, document
close/recovery/IO files pass in 6.79s. Twelve existing browser controls pass in 57.2s:
close/middle-click/navigation, preparation, overflow and resource/late-init/split reuse
(Chromium controls plus the four resource cases in both Chromium and WebKit).

The first after-run catches a removed `figThumbnailPageId` import still needed by the
entry's FIG reader: 144 passes and six failures. The shared import is restored in the entry
as well as the cover owner. The corrected identical file set passes 150 tests / 382
assertions in 6.65s. Source types, owned lint, architecture and the normal worktree build
pass. Vue and shared-test types pass too. The identical twelve browser controls pass after
extraction in 56.3s without snapshot updates, including live drawing and released renderer/
resource bounds. Independent source review verifies singleton refs, bodies, cleanup order and absence
of a demonstrated eager cycle; it does not independently rerun browser or native paths.

The full app shard is not passing. Both the original 715-line entry and extracted 495-line
entry produce 1,950 passes and the same three failures across 1,953 tests / 339 files.
The original control runs in a guarded restore operation; the candidate's source hash
matches afterward. An isolated three-file control passes all five backdrop cases while
retaining two native save/watch failures (13 passes / two failures overall). The native
tests still expect the old FIG default and direct-file watch, while current owners use
PEN first and watch the parent for atomic replacements. The backdrop cross-file cause is
unproven. [Native test contracts](https://trello.com/c/btVgS7TP) and
[backdrop isolation](https://trello.com/c/bd0qkKEQ) retain separate narrow repair criteria;
the full-shard failures are not waived by the focused refactor controls.

Subsequent [test-control repairs](APP-TEST-CONTROLS.md) correct the two inherited native
expectations and restore a leaking Cloud fetch spy. The full app shard then passes all
1,955 cases / 12,576 assertions across the same 339 files. This later result preserves
the original paired failure evidence and does not execute native tab delivery.

A fresh OS read last confirms the desktop locked. The earlier native GPU/PEN successes are
separate receipts; a later native graph/text batch stops at visibility guards. No native
retry, lock bypass, main-app installation or user profile/document/credential/recovery
change is performed for this candidate. The build includes preserved unrelated icon WIP,
which is excluded from this extraction's publication. Native tab lifecycle and all Pen
visual/functionality acceptance remain separate. Failed attempts and original controls are
retained; no baseline or assertion is weakened.
