# Brutal design guidance

Brutal is a local design editor. Use the installed tool manifest to discover
available operations and their validated arguments before editing a document.

Read the relevant bundled guide:

- [Execution and document safety](execute.md).
- [Brutal document format](pen-schema.md).
- [Web layout workflow](guide/web-app.md).

These are first-party resources bundled with the installed version. Reading them
does not search user files, global skills, provider settings or credentials.
Only the linked resource names and `SKILL.md` are available through `read_skill`.

Inspect the intended document, page and selection before making changes. Preserve
unrelated layers and source files. Validate a small editable result, then inspect
the actual canvas/export and saved/reopened document before reporting completion.

Compatible Pen tool names and payloads are qualified individually. Do not assume
that an operation absent from this installation's manifest exists, or substitute
unrestricted host code for a document operation.
