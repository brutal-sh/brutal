# Pen 1.2.22 native decomposition

Observed: 2026-11-09. REA explicitly uses its **Hopper** provider on verified thin
Mach-O byte copies. This extends the [bundle/update catalog](update-1.2.22-2026-11-09.md);
it does not establish full native source recovery or Open Pen feature acceptance.
The [metadata ledger](native-1.2.22-2026-11-09.json) retains hashes, addresses, scope and gaps.

## Native changes

All 39 retained changed thin Mach-O files outside ASAR are compared against their old
copies, after verifying both whole-file hashes. This includes the 38 archive-native
copies and the separate ShipIt updater. **38 are byte-identical outside their exact
LC_CODE_SIGNATURE data regions.** Their file-backed sections also match. Signature
validity and the cause of those signature changes are not established.

The remaining file, `out/mcp-server-darwin-arm64`, changes 13 file-backed sections,
including instructions, Go function metadata, constants and data. Its current SHA-256
is `3564672ceeec0c62b4c6558680c586274f5d458a5541a188c70d87827869f6a1`.
The installed helper is rehashed to the same value. Unbaselined outer native files
remain unknown; this is not a complete historical comparison of every framework.

## Hopper outputs and named modules

The current 52,688-byte launcher has nine Hopper procedure entries: two non-import
entries and seven import stubs. Its observed entry delegates to Electron startup,
including the Run-as-Node branch. There are no retained old launcher bytes, so this
current decomposition does not prove a new launcher feature.

Hopper's complete reported helper inventory has 5,888 procedure entries. All 5,897
launcher/helper pseudocode files are exported and independently checked against their
provider manifests and SHA-256 values. The final helper batch reports zero remaining
and zero failures; these counts cover Hopper-discovered entries, not every source function.

The embedded Go PC/function tables separately yield 4,974 old and 4,982 new entries.
All records retain addresses, ends, file offsets and raw byte hashes; 26 duplicate-name
groups in each version are preserved. The decoder follows the relevant field layout in
[Go's own parser](https://go.dev/src/debug/gosym/pclntab.go). Both binaries declare
`go1.26.10`, and their embedded module-information bytes match; this does not authenticate
the compiler or establish complete dependencies.

The named first-party inventory contains 128 entries: 15 in `main`, 28 in transport and
85 in tools. The local HTML index links names and compiler PC ranges to possible Hopper
fragments. Its 167 local links are checked; browser rendering is not verified.

Of all current Go entries, 3,502 have exact Hopper entry matches and 1,480 do not.
Hopper also splits some Go bodies into multiple procedures: `SaveTool` has entries at
`0x10018ac40` and `0x10018ac50` within its compiler range; `HandleSave` similarly has
`0x10018b220` and `0x10018b23c`. These associations do not establish complete body ownership.
Hopper's public API does not provide complete function-body ranges. Pseudocode is
provider output, not reconstructed original source.

## Compiled feature evidence

There are 17 added function names and nine removed names, not 17 new product features.
They corroborate two existing catalog allocations:

| Finding  | Compiled observation                                                                        | Existing acceptance task |
| -------- | ------------------------------------------------------------------------------------------- | ------------------------ |
| UPD22-22 | URI-option wrappers replace file-path-option wrappers for Browser, Execute and SpawnAgents. | MCP-05 / MCP-03-EXECUTE  |
| UPD22-23 | New `SaveTool` and `HandleSave` entries, plus registration and URI wrappers.                | MCP-06-SAVE              |

REA/Hopper byte reads resolve the new registration name `save`, its document-save
description, and the handler's response/failure strings. The ledger records exact addresses
and original-file offsets. The registration/handler bodies remain provider pseudocode;
client-specific availability, actual save calls, error delivery and URI resolution have
not been executed by this analysis. Existing feature gates stay open.

Raw binaries, pseudocode, compiler maps, complete comparisons, REA Evidence and owned
session snapshots remain private under `local-evidence/pen-native-decomposition-2026-11-09/`.
Its `index.html` provides the module index. Both owned Hopper analysis sessions are closed;
copied target executables are not run. No vendor implementation is shipped in Open Pen.

## Fresh verification, 2026-11-10

The installed plist still reports 1.2.22 and its ASAR SHA-256 still matches
`1c6d0129dc9dda08f2f0da5dde23aa8cc52df11858fec1e35cd3bd2647bcf407`.
The retained catalog check revalidates all 31 findings, 54 source anchors and
182 changed path dispositions, plus 432 outer files and 14 recorded symlinks.
The independent Hopper export check rehashes all 5,897 files against their
provider manifests. No duplicate extraction or vendor implementation import
is needed for these unchanged reference bytes. These checks preserve the
semantic, runtime and exact visual coverage limits above.

A further current-byte REA inventory and explicit Hopper reopen reproduce the same
archive identity and 5,888 helper procedures. The Save entry at `0x10018ac40` remains
a bounded provider dossier, not complete recovered source. Fresh private receipts are
`current-asar-recheck-2026-11-10.json`, `current-hopper-recheck-2026-11-10.json` and
`current-recheck-summary-2026-11-10.json` under the native evidence directory above;
both owned REA sessions are closed after export.
