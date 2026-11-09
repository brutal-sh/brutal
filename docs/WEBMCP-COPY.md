# WebMCP registration identity and metadata

Updated: 2026-11-09. Status: bounded service/metadata criterion executed and published at
`c85c151201f1933f8e89d78274811fe78a2fc6de` for BRAND-SUPPORT-WEBMCP. The browser-provided API, actual document execution and native
delivery remain unaccepted by this unit.

## Executed path

The real `createWebMCPRuntimeService` and registration owner run with a test-owned
`modelContext.registerTool` implementation. No production code changes. The fixture starts
Off, registers Inspect and Edit, returns to Inspect, switches Off and stops. The two captured
snapshots contain 24 Inspect and 47 Edit payloads, covering 47 unique tool names. Repeated
Inspect registration emits identical metadata after the mode change.

Every description keeps its Core tool description and names the active Open Pen document.
Tool names, complete JSON input schemas and annotations are captured. Read-only hints match
the declared Core mutation flags; Inspect advertises no mutating tool. These are metadata
checks, not proof that every advertised callback performs its intended operation.

The revoked editing callback fails before resolving a target. Off and stopped services
leave zero registrations in the test host. An absent context reports unsupported; rejection
on the third registration cleans the partial set and retains the supplied error. All paths
make zero document-target requests. No document is read or edited by this fixture.

All eleven existing registration/preference owner tests pass with 148 assertions across
two files. Current source/Vue and test types pass. All ten frozen authored/config hashes
match after the capture. This is a verification-only documentation unit; the existing
registration/service/policy/tool sources remain unchanged.

## Format ownership and compatibility

The registration payload emits descriptions, input schemas and annotations. Its captured
`design_to_tokens.format` field retains `css`, `tailwind` and `dtcg`, its default and its
description in both modes. Standalone document-format listing and its own native display
label are a separate CLI path, executed in [CLI copy evidence](CLI-COPY.md). This registration
owner does not publish that format list as metadata or invent a new format-list API. The
original support/format requirement stays allocated across those actual owners.

A recursive scan of all strings in both captured payloads finds two inherited-name matches:
the real `OPENPENCIL_MCP_ROOT` variable in `get_jsx.path` guidance, once per mode. The MCP
server actually reads that variable; it remains a compatibility identifier. No inherited
own-app label remains in the captured descriptions or schemas.

## Receipts and limits

`local-evidence/webmcp-copy-service-2026-11-07/` retains the actual payloads, format fields,
complete string-scan result, service fixture/output, owner/type receipts, ten source copies
and a SHA-256 manifest. Protocol metadata is English by design; this is not a nine-locale UI
rendering or layout check.

The host is a local stand-in that honors the existing registration abort contract. It does
not establish a browser vendor's ModelContext/CDP implementation, permission behavior,
the live app entrypoint, actual agent calls, native input or real document operations. The
existing browser acceptance spec is not executed by this unit. Full MCP functionality,
branding, beta and Pen parity remain separate gates. No user profile, credential, recovery,
document, installed app or external provider is touched.
