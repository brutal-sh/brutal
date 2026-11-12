# Checked documentation build

TEST-DOCS-TYPESCRIPT-LIBS owns the observed documentation-build failure. Application runtime, recovery behavior and full parity have separate acceptance gates.

The original canonical `bun run docs:build` fails because Twoslash locates `lib.esnext.full.d.ts` under the installed `@typescript/typescript6` forwarding package. That package forwards to the actual compiler and contains no standard-library declarations. Its public `tsLibDirectory` option accepts the active compiler's `getDefaultLibFilePath` directory; the local configuration supplies that directory without patching installed dependencies or disabling checking. The pinned Twoslash 0.3.9 types and implementation confirm the option; its [API documentation](https://twoslash.netlify.app/refs/api) describes the checking factory.

Once standard libraries resolve, the build reaches a separate generated-reference failure: Vue interprets double braces in inline JSX examples as template expressions. The authoring generator wraps only the published static Markdown copy in VitePress's supported [`v-pre` container](https://vitepress.dev/guide/using-vue#escaping). Shared authoring prose and the agent-skill copy remain unchanged. The generated copy is regenerated through the canonical command rather than edited by hand.

The complete documentation build then passes. A temporary checked example assigning a number to a string makes the actual canonical build fail with the expected type diagnostic. The example's exact original bytes and permissions are restored in `finally`; a fresh complete positive build passes again. Parsing the built authoring HTML confirms that font-feature, font-variation and constraint double-brace examples remain literal. This checks generated content, not a whole-site browser visual audit.

The existing generator test passes its five assertions, strict 300/50/10/4/4 checks pass for both changed source files, and dependency checks pass with retained configuration hints. The final complete `bun run check` passes with zero detected clones. No new dependency, type-error suppression or broad Markdown escape rule is introduced.

Private evidence is retained under `local-evidence/cli-svg-2026-11-12/`: original failure in the linked native-isolation evidence directory, library-only intermediate failure, complete positive builds, negative checked-example log/result, restored-source confirmation, generated HTML literal checks and owner/static logs. Remaining native file-dialog/refusal/reference and full-product gates are not accepted by this correction.
