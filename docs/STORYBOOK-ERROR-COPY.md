# Storybook manifest error identity

Updated: 2026-11-07. Status: bounded parser/writer criterion executed; publication pending
for [BRAND-STORYBOOK-ERROR](https://trello.com/c/0FF3JZ3g).

The invalid-manifest error names Open Pen. Its remaining sentence, path context, validation
and error handling are unchanged. `.openpencil-stories.json` and generated `openpencil/*`
paths remain compatibility identities so existing exports are recognized and unrelated
files stay outside generated-file ownership. Only the inherited product name in prose changes.

The actual `readManifest`/`writeManifest` path runs before and after the change in disposable
directories. Malformed JSON, a traversal file entry and an unsupported manifest version each
throw the same error with only `OpenPencil` replaced by `Open Pen`. All three invalid files
retain exactly their original bytes. A valid manifest reads and writes with identical bytes;
its compatibility filename and generated font/story paths are retained. Absolute/traversal
paths are refused, and a synthetic unrelated file retains its hash.

Both existing manifest-owner tests pass with fourteen assertions. The CLI package rebuild
and targeted type-aware source lint pass. No new committed test mirrors this copy change.
Actual I/O checks, raw output/errors, source-before/after and SHA-256 receipts remain in
`local-evidence/storybook-error-2026-11-07/`. Independent review confirms the name-only source
delta, actual rejection messages and retained fixture bytes.

This qualifies the actual parser/writer error and named data-preservation controls. It is
not full CLI Storybook export, native delivery, all diagnostics, beta or Pen-parity acceptance.
No user export, document, profile, credential, recovery store or installed app is touched.
