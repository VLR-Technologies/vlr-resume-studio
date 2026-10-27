# Architecture

## Application boundaries

One React/TypeScript/Vite client. React Router serves overview, `/profile`, `/resumes`, `/resumes/:id`, Settings, and a not-found view. The shared shell owns navigation, route focus/title, notifications, and unsaved-work unload protection. Profile and resume editors, portability tools, PDF generation, and PDF proof load in separate chunks. No server, login, AI provider, or candidate upload is required.

The content pipeline is deliberately split:

1. `src/domain/schemas.ts` and `factories.ts`: validated career evidence and stable IDs.
2. `src/domain/editor.ts`: independent variant content, source-linked overrides, section names, categories, and recommendations.
3. `src/services/rendering/model.ts`: pure resolution of identity, pinned summary, selected snapshots/overrides, visibility, order, entry text, links, dates, and source warnings.
4. `src/services/rendering/pdf.tsx` and `features/resumes/resume-preview.tsx`: PDF and HTML layout/styling consuming the same model. `pdf-proof.tsx` renders the actual PDF pages through PDF.js.

Features invoke repositories; they do not write raw IndexedDB data. Existing source-owned Button/Dialog/Field foundations and Radix semantics remain in use. Editor input helpers use unique IDs and plain text. Sorting uses dnd-kit with stable IDs, pointer and keyboard sensors, drag handles, and arrow alternatives.

## State and autosave

Dexie remains the only persisted record authority. The workspace reads a consistent validated profile/variant snapshot through Dexie live queries. Zustand owns transient operation notices only. React Hook Form handles creation/metadata dialogs. Full editors keep local drafts and a bounded 30-step session undo stack.

Autosave debounces edit bursts by 350 ms and serializes writes. A later edit arriving during a write remains dirty and is saved against the returned optimistic token. The UI says saved only after repository success. Validation/storage failures preserve the local draft and show structured errors. Internal link navigation waits for valid edits to save; dirty drafts survive SPA back/forward remounts in memory. Active editors and the shell guard document unload. Drafts are not durable storage; reload/discard is explicit, and native backups are the recovery mechanism across sessions. Import/export blocks while unsaved drafts exist.

An external saved change is never silently merged over a local draft. A timestamp mismatch produces an explicit reload affordance; the repository rejects stale saves. Draft namespaces prevent record-ID collisions across profile and variant tables. Confirmed deletion clears associated transient drafts.

## Persistence and revisions

IndexedDB database version **1** is unchanged: profiles, variants, and revisions. All previous Stage 0 records still validate. The record contract adds optional identity snapshots/overrides/visibility, full entry overrides, project technologies, a few location fields, and the modern template ID. No destructive migration or additional database store was needed. Strict parsing rejects unsupported schema versions/unknown fields without modifying stored data.

Existing validated writes, monotonic `updatedAt`, immutable record/source metadata, protected source deletion, sample transactions, and conflict checks remain. Each variant save atomically retains its previous state and keeps at most 20 revisions. Revision restoration validates the selected stored revision, allows its historical pinned evidence, snapshots the current state with reason `restore`, writes a new modification token, and prunes history in the same transaction. Arbitrary changed selections still require matching current source evidence. Duplicate resumes receive a new record ID and independent contents without mutating the source or sibling.

## Rendering and design

Variant section order determines semantic and displayed order; the editor synchronizes template order when reorganizing. Selected sections and template visibility filter the document without removing career evidence. Selection order determines entry order within sections. Overrides take precedence over pinned snapshot wording. Contact details come from a complete optional identity override when present, otherwise the identity snapshot; hidden contact fields are removed from the model. Old records without a contact snapshot use current source identity and display an explicit pinning notice.

The versioned registry in `src/domain/templates.ts` identifies four original React PDF layouts and eight Typst layouts. The gallery uses actual PDF-derived previews. A4 and Letter, typography, margins, spacing, colors, header alignment, and heading rules use bounded validated values. Typst layouts include date ledgers, section rails and numbered technical/academic structures. Legacy column metadata remains lossless and is explicitly explained as unsupported by the column control.

Original layouts use local Noto fonts and immediate continuous HTML layout. Typst layouts automatically show the actual paginated PDF. `ResumeRenderModel → typstProject → local compiler worker → PDF` is separate from the original renderer. The fixed trusted Typst source reads a validated virtual JSON file; no career text enters executable source. The compiler denies all external file, URL and package loaders. Jobs serialize, abort stale work, and dispose their worker after each compilation. One successful PDF buffer is cached for byte-identical proof/download reuse. Last-valid recovery is scoped to the mounted editor; superseded canvases are hidden and failed updates expose a clearly labeled earlier PDF and retry. PDF uses embedded Noto fonts, text/link primitives, flowing pages, orphan/widow rules, and heading presence constraints. Long paragraphs and bullets can flow across pages. PDF proof displays the actual generated pages and is the authority for page breaks. PDF rendering jobs serialize around the shared font/layout engine. Object URLs used for downloads are revoked; proof workers/documents and resize observers are destroyed/disconnected on cleanup.

## Portability

Native JSON and versioned YAML envelopes include profiles, variants, designs, IDs/references, provenance, and retained revisions. Files are limited to 5 MiB before parsing. YAML core parsing rejects aliases, custom tags, duplicate keys, parser warnings/errors, unsafe object keys, excessive nesting, and excessive values. Native schemas validate relationships and revision limits. Standard JSON Resume uses the maintained schema through a build-generated Ajv standalone validator before mapping supported career fields. Runtime schema compilation is excluded to satisfy CSP; Zod also runs with its JIT disabled. Loss information is displayed for standard conversions.

Parsing produces detached data only. Import review compares record fields and ordering, shows removals for replace, and requires explicit confirmation. New-record import remaps UUID values consistently through all references. Safe merge adds non-conflicting records and skips identical duplicates; conflicting IDs abort. Replace downloads the validated current workspace as recovery JSON before the write. Every mode uses one transaction and a complete workspace fingerprint to reject changes since review. Validation or storage failure rolls back existing records. Imports cannot infer that resume claims are factually verified.

External AI instructions are a clipboard/file workflow only. They require schema/ID retention, evidence-grounded wording, separate missing-information explanations, and manual reimport review. No model calls or keys exist.

## Privacy and hosting

Candidate content stays in browser IndexedDB. Fonts and PDF workers are bundled. There is no telemetry, remote font, inference request, backend, account, payment, or sync. React escapes all rendered user text; imported styling is restricted to allowlisted domain fields. The CSP permits same-origin assets/workers and WASM compilation for PDF layout, without general eval. Browser tests exercise that policy and assert no external candidate-workflow requests.

Browser storage is origin/profile scoped and is not an encrypted vault or durable backup. Clearing storage, eviction, private browsing, device loss, and same-origin compromise remain real limits. The assets-only hosting configuration remains prepared but undeployed; final edge headers and origin-specific storage behavior must be verified before public release.
