# CLI identity, help paths and format presentation

Updated: 2026-11-07. Status: bounded CLI criterion executed and published at
[`f5eef8e84`](https://github.com/brutal-sh/brutal/commit/f5eef8e84a2e438d53a112e199240f895f92f303) for
BRAND-SUPPORT-CLI. Full CLI workflows, native delivery and full branding remain open.

## Resulting behavior

Actual root help identifies Brutal CLI. The executable remains `openpencil`, package/API
names stay compatible, and the format list names its native display format Brutal Document
while retaining the `fig` identifier. Pencil, Figma API and other external format names remain
truthful interoperability labels.

Inspection discovers a functional help defect: commands without `meta.name` display the
local entry script path in usage instead of their command name. The installed Citty 0.1.6
renderer uses that fallback. A 23-line private CLI help owner creates named metadata views
at the entrypoint, retaining complete nested paths, nearest explicit versions, argument
definitions, handlers and error handling. Entry help avoids adding the immediate parent
twice. The public `COMMANDS` registry and its export remain unchanged.

The implementation uses the existing Citty and es-toolkit dependencies. Its focused tests
execute the real usage renderer and argument dispatcher, covering nested immutable views,
lazy definitions, promised metadata, inherited/explicit versions and retained handler input.
No new dependency, runtime test hook or document operation is added.

## Executed evidence

The final matrix executes every registered help path: root, twenty-four top-level commands
and twenty-four nested commands. All 49 paths pass through both the Bun source entry and the
normal packaged Node entry: 98 actual invocations, all exit zero and show their complete
executable/command path without the local script path. All 74 frozen source/compiled hashes
match after the run. Root version output matches the package version.
Independent review verifies all 265 listed archive hashes/sizes, the 74 current hashes
and the complete help tree reconstructed from actual command output.

Actual text and JSON format-list output are byte-identical to the initial baseline across
all fourteen registry entries. Two HTML entries have distinct roles; they are not treated
as an erroneous duplicate. These receipts qualify display and unchanged registry output,
not every reader/writer/exporter's semantics.

The complete live CLI owner suite passes 46 tests with 153 assertions across sixteen files,
including the two new focused help tests. The final normal build/lint, sequential source/Vue
and test types, documentation and changelog checks pass. Package generation finishes before
owners, type checks and the final output matrix run.

Retained failures are separate evidence:

- The first helper test omitted the usage renderer's Markdown formatting; its corrected
  structural assertion runs the same actual renderer.
- An initial generic helper failed source typing and is replaced by Citty's concrete
  `SubCommandsDef` contract, without a cast or suppression.
- An owner invocation overlapped package generation: 26 pass, 18 fail and two module errors,
  with generated Core exports temporarily absent. The subsequent serial owner runs pass.
- A focused type-aware invocation crossed the source/test boundary, and a later new test
  exposed a typed mock-context mismatch. The final test uses the inferred real handler
  context; the configured test type check passes without changing policy.

Complete receipts remain local in `local-evidence/cli-brand-output-2026-11-07/` (initial actual
commands), `local-evidence/cli-help-final-2026-11-07/` (pre-final control) and
`local-evidence/cli-help-final-after-2026-11-07/` (current final matrix, outputs, source copies,
cases and manifest). `scratch/cli-help-*-2026-11-07.*` retains build/owner/type receipts.

## Remaining boundaries

The source scan separately discovers one inherited Storybook invalid-manifest error label.
BRAND-STORYBOOK-ERROR owns that diagnostic. `.openpencil-stories.json` and generated
`openpencil/*` paths remain compatibility/data-preservation identities; the error's prose
does not. The separate diagnostic correction is published at `881d0b7e5`; see the
[parser/writer record](STORYBOOK-ERROR-COPY.md). This CLI help unit does not accept every diagnostic.

Owner tests use local fixtures and app stand-ins; help output is not actual native IPC,
provider authentication, beta, clean-release or Pen-parity acceptance. The normal worktree
still contains unrelated unpublished icon work. No user document, profile, credential,
recovery data or installed app is touched.
