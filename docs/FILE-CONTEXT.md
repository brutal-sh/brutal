# Agent file context

Updated 2026-11-13. AI-04-FILE is Verify; CLI-04-PNG is Building. Actual installed reference is Pen
1.2.23; full design/functionality parity and all milestone exits remain open.

## Outcome and scope

Use the existing composer, attachment presentation, conversation storage and
transport owners to send a picked synthetic text/source file with its exact decoded
content, filename and media type. Preserve image/selection paths, draft restoration,
queue ownership, unrelated documents and user profiles. No reporting service,
provider signup, credential/configuration change or remote inference is added.

The [current reference guide](https://docs.pen.dev/core-concepts/ai-agents)
documents image and text/source attachments. Our unchanged `da2bd5984` composer
only offers images. Both Chromium/WebKit controls reach that composer and time out
waiting for the absent file-capable action. Preserve those red controls rather than
accepting source inspection as a functional result.

## Candidate behavior

The picker accepts files; the shared draft owner retains images and decoded text
separately. UTF-8 decoding preserves Unicode, BOM and whitespace. Unsupported input,
binary NULs, invalid UTF-8 and text over 1 MB are refused with feedback. The 1 MB
text bound and extension/media-type applicability are provisional independent
limits, not measured Pen parity. A pending read disables submission; clearing or
taking a draft invalidates late results. An unsent submission can restore files.

File content is appended as JSON reference data to the model's text, while history
keeps the person's visible request and attachment presentation separate. The file
viewer renders escaped text, never HTML or executable source. Existing history
storage retains the file preview and context; file-bearing requests use its existing
non-editable attachment guard so a plain-text resend cannot silently remove them.
The optional submission field preserves existing image/text-only callers.

Draft preparation, submission lifecycle, attachment delivery and history actions
have bounded owners under the existing input/submission domains. The public
`useChatSubmission` surface and image/undo/error/cancellation contracts remain.
Existing English and eight translated picker/removal labels cover files as well as
images. Native-speaker review and exact reference menu/chip appearance remain open;
this correction does not replace the broader SURF-AGENT/menu acceptance.

## Qualification and re-entry

The final affected Chromium/WebKit cohort passes 23 cases with zero skips,
retries, unexpected or flaky results. It executes text/source picks, exact escaped
previews, removal, empty chooser, refusal, a new-document transition, production
HTTP serialization and actual saved-conversation reload/reopen. Both decoded
provider-request artifacts retain exact source names, types and content. Stable
browser previews are visually inspected; they are not matched Pen pixel acceptance.

The first broader cohort has 18 passes and one stale `/Remove image/` locator;
the independent review identifies that renamed-label mismatch, corrected without
changing its four-image limit assertion. A second run has two setup timeouts before
attachment actions while a package rebuild overlaps. The subsequent isolated
21-case control and final 23-case cohort pass with no overlapping build. Retain all
failed runs; no timeout, retry, threshold or baseline is relaxed. A BOM control also
rejects `File.text()` as a byte-preservation proxy because it strips the BOM; the
final assertion compares original UTF-8 bytes directly.

The final owner group passes 29 cases and the app shard passes 2,038 cases. The
complete repository check exits zero with zero clones; source/test types and strict
300/50/10/4/4 checks pass. Final test/document-only changes receive their owning
checks. Independent read-only review reports no outstanding product finding.
These results do not establish full native or live-provider acceptance. The direct
provider test uses the production transport with its HTTP request intercepted and
answered locally; it proves serialized wire content, not a live provider, MCP or
Codex/Claude CLI receipt. Real inference/native/reference visual acceptance remains
separate and unexecuted while desktop access is unavailable.

Published `17b2a03ed` retains exact source/request/preview artifacts on the private
draft. Next: finish the remaining applicable native/CLI and reference gates;
CLI-04-PNG proceeds independently while those gates are unavailable. Do not install over
the normal app while its unsaved state cannot be inspected. The prepared production
bundle `410f5f62` belongs to earlier diagnostics source `da2bd5984`, not this file
candidate. Normal installed `db4e528c` remains unchanged.

Private receipts: `local-evidence/file-context-2026-11-13/`. Re-entry starts with
the current card, retained red/after controls and final source hashes. Do not infer
native Cancel from an empty browser chooser, document-content invariance from a
reply that performs no edits, or every transport from the intercepted HTTP path.
