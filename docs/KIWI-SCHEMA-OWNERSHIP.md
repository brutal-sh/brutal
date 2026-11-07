# Kiwi wire-schema ownership exception

2026-11-07. MOD-18 retains one named wire declaration with an explicit size
exception. It does not claim code extraction, smaller source, a schema upgrade,
complete format support or product parity. Runtime source and public APIs are unchanged.

## Owner and provenance

`@open-pencil/kiwi` owns `src/fig/schema/fig.kiwi`, its parser/validator, binary-schema
codec and compiled runtime tables. FIG owns complete archives and source metadata;
Core owns export orchestration. Codex records and verifies this Open Pen disposition;
changes to the product target remain Jason's decision.

The declaration has 5,628 physical lines. Its SHA-256 is
`07c7150398b0d98c57f26a38abfa64bd93b3a9f8d37fef0bd19ab622d5e40ceb`.
Local followed history contains 27 records, starting at `ec90f35df` on 2026-02-27
(Yoga/Kiwi proof of concept), through Core extraction, the `f5bd2425b` Kiwi package
move on 2026-06-06, and the October clipboard/formula schema additions. The package
manifest identifies the upstream OpenPencil repository and declares MIT; NOTICE
credits the adapted Evan Wallace Kiwi runtime. Existing attribution stays intact.

## Why retain this declaration

This is one protocol model, separate from executable parsing and serialization.
Its 605 definitions reference one another. Definition order, enum values, field
types, sparse wire tags, arrays and deprecation flags are protocol data. The
current grammar accepts package/enum/struct/message declarations and has no import
or include mechanism. A partition would need a composition step with equivalent
ordering and binary output. It would add loader/build ownership while leaving the
protocol model and runtime complexity intact.

Retain this specific declaration rather than introduce that machinery solely for
line counts. This exception does not cover the parser, codec, interpreter, FIG
coordinators or translated catalogs. Executable logic stays in its existing small
owners and new behavior must use the shared compiled tables.

The app imports the parsed and validated declaration through `fig/schema.ts`.
`initCodec()` compiles it once; `getSchemaBytes()` encodes it for clipboard/new-file
paths. The font-feature adapter reads its OpenType definitions. Each imported
archive's own schema remains separate: container parsing and record patching use
that archive's schema, and Core export retains `graph.figSchemaDeflated` when
present. The bundled declaration is not substituted for every imported schema.

## Executed criterion

A local control reads the raw file independently, parses/validates it and compares
it exactly with the shipped parsed schema. Binary-schema encode/decode preserves
every definition's name/kind/order and every field's name/type/tag/array/deprecated
flag. The codec's actual `getSchemaBytes()` equals that encoded result:
68,916 bytes, SHA-256
`18257dae2d88f30d98bd991b2d469f87708af3218f021e9e1b0faea746a24a1e`.

The actual compiled tables cover all 605 definitions, 2,210 non-enum fields and
1,604 enum values. The control checks field order/IDs/flags, by-ID entries, enum
name/value entries and referenced-definition object identity throughout the model.
All 43 Kiwi parser/schema/table/codec/container tests pass across ten files with
112 assertions; package source/test types pass. These are executed checks, not a
line-count-only disposition. They do not exercise every possible message value.

The unchanged-source [whole saved-archive controls](FIG-PAYLOAD-OWNERSHIP.md) also
retain three actual exports, all decoded records/blob/image hashes and every
captured interpreted node. Schema-source changes are absent from those runs.
The raw hash and twelve schema/consumer/attribution file hashes remain unchanged.
Local history, complete field inventory, binary hash, control source and receipts
are retained in ignored evidence. Source/evidence publication closes this bounded
disposition; it does not close the FIG visual or live Figma gates.

## Mandatory review triggers

- Any definition, field name/type/tag/order, enum value or flag changes: compare the
  pinned inventory and binary schema, run parser/codec/coverage and affected whole
  archives, and qualify behavioral changes through the owning FIG guide.
- Any parser/codec/table/public-type change: check every consumer above, shared
  read/skip/write behavior, source metadata and archive patch/full-write round trips.
- Any proposed split or generator: prove identical definition order, tags, binary
  schema, raw archive retention and build ownership before replacing this file.

Tracking: [MOD-18](https://trello.com/c/3TOfol9P), [modularity](MODULARITY.md),
[runtime inventory](RUNTIME-PACKAGES.md), [task index](TASKS.md), [PRD](PRD.md).
