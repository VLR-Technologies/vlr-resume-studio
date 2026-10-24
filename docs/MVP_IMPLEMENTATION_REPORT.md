# VLR Resume Studio — MVP implementation report

Date: **24 October 2026**. Product: **VLR Technologies**. Release: **0.2.0**.

## Result

A first-time user can create an incomplete or complete career profile, build independent tailored resumes, select one of four real designs, inspect a live document and exact paginated proof, download a text-based PDF, and export/import JSON or YAML. The product runs locally without authentication, a paid API, or a backend. This pass implements the product workflows; it is not another planning foundation.

## Baseline and delivery

- Verified [Stage 0 PR #1](https://github.com/VLR-Technologies/vlr-resume-studio/pull/1) was merged on 24 October 2026. Its merge commit is `75da74c75a8a8b9973cee6bd7a5d82a412aa9df7`.
- Fetched current refs, verified the rebased `main` tree exactly matched the delivered Stage 0 tree, fast-forwarded local `main`, then created **`feat/resume-studio-mvp`** from that baseline. No application changes were made on `main`.
- Implementation commit: [`69a266db0109898edee766ffc88804df2fb17851`](https://github.com/VLR-Technologies/vlr-resume-studio/commit/69a266db0109898edee766ffc88804df2fb17851), pushed to `origin/feat/resume-studio-mvp`.
- Pull request targeting `main`: [#2 — feat: ship complete local-first resume studio MVP](https://github.com/VLR-Technologies/vlr-resume-studio/pull/2), open for review.
- No merge or public deployment was performed.

## Implemented screens and workflows

### Career Profile

All supported evidence collections have real editors: personal/contact details, summary, education, work, internships, projects, skill groups, certifications, languages, publications, achievements/awards, volunteering, professional links, and custom sections. Typed fields cover institutions/organizations, positions/qualifications, locations, dates/current status, descriptions, technologies/skills, issuer/publisher/awarder, proficiency, and links. Entries and accomplishment bullets can be added, changed, removed, and reordered with stable IDs. Users never have to edit JSON to enter career history.

Autosave has explicit pending/saving/saved/error states and structured validation paths. Writes serialize and use optimistic modification tokens. Invalid drafts remain available, navigation protects pending work, and failed saves never produce success feedback. Session undo restores recent edits/deletions. Invalid drafts survive SPA navigation in the same open tab; document unload warns about unsaved changes. Persistent profile recovery uses native backups. Import/export refuses to omit pending editor drafts silently.

### My Resumes and editor

Create from a selected profile, duplicate, rename, delete, or open a saved resume. Wide desktop layout has section organization at left, content/design controls in the center, and actual document content at right. Smaller screens use Content / Design / Preview tabs.

Select source entries, edit all supported entry fields and bullets as resume-specific content, tailor summary/contact details, hide optional contact fields/sections, and reorder sections/entries. dnd-kit supplies pointer and keyboard sorting with explicit handles, plus arrow alternatives. The master profile and sibling resumes remain isolated. Cleared optional contact fields stay cleared through native JSON/YAML round trips.

Source changes/removals generate visible review information. Pinned wording remains intact. An explicit source refresh dialog explains that current source wording/contact/summary will replace tailored content for surviving entries; removed source entries remain pinned. Previous saved variants are retained. Saved revision restore is validated and transactional and first retains the state being replaced. Up to 20 revisions are available.

### Design and document output

Four reusable layouts are implemented:

| Template              | Internal ID | Presentation                                                                                                  |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| ATS Essential         | `classic`   | Minimal single-column text, logical reading order, restrained headings                                        |
| European Professional | `european`  | Formal CV label, date-led history, A4 defaults and optional personal fields                                   |
| Modern Professional   | `modern`    | Restrained accent rule, stronger section hierarchy, balanced spacing                                          |
| Academic / Research   | `academic`  | Research/appointment heading treatment, publications/projects, flexible pagination, optional serif typography |

Controls cover font family, body/name sizes, margins, line spacing, section spacing, accent, header alignment, heading rules, and section visibility/order. Values are bounded and schema-validated. Numeric editing supports natural multi-digit entry and clamps on blur. A4 is the normal UI format. Legacy Letter values remain supported in preview/PDF; the older columns flag survives backups, while the four tested layouts are single-column.

The immediate HTML preview and PDF derive from one normalized render model. HTML is continuous; PDF proof renders the actual generated pages through PDF.js, including on mobile. Export uses React PDF text/link primitives, not screenshots. Fonts are bundled Noto Sans/Noto Serif under SIL OFL, supporting exercised European characters without remote font requests. Long entries/bullets flow across pages with heading-presence and orphan/widow handling. PDF filenames use candidate/resume labels. Empty documents cannot be downloaded accidentally from the editor.

### Settings and portability

Native JSON and YAML exports preserve all supported profiles, variants, selection snapshots, stable references, tailored content/identity, order, design, provenance, and retained revisions. Standard JSON Resume can export either a master profile or a resolved tailored variant. Its losses are disclosed; it cannot reproduce native layout/revision/reference state.

JSON and YAML import supports native backups and standard JSON Resume. Parsing is bounded to 5 MiB and validates records and relationships before any write. YAML aliases/custom tags/duplicate keys/parser warnings are rejected. Unsafe object keys, excessive nesting/value counts, future schema versions, duplicate IDs, orphan references, and unsupported revision counts are rejected safely.

Review displays field comparisons, ordering, record/revision counts, conversion warnings, and records removed by replacement. Users choose:

- **New records:** consistently remap UUIDs through every reference, preserving existing work.
- **Safe merge:** accept non-conflicting records and identical duplicates; conflicting IDs abort without guessing fields.
- **Replace:** download a recovery JSON of the current workspace before applying one transaction.

Every apply checks a complete workspace fingerprint so concurrent edits after review cause a conflict. Failed validation/storage writes preserve the original workspace. Recovery from an accepted replacement uses the downloaded native backup.

Copy AI Editing Instructions supplies a reusable external-model prompt requiring evidence-based job-description alignment, schema/ID retention, explicit AI-suggestion provenance, no fabricated facts, structured output, and a separate missing-information explanation. Clipboard denial has a selectable-text fallback. No AI API, model download, subscription, or upload is connected.

### Employment and role guidance

Internship, Working Student / Werkstudent, Graduate / Entry-Level, Full-Time Professional, Research / Academic, and labelled Custom categories are editable. Eight role presets cover AI/ML, Agentic AI/LLMs, software engineering, data science, data analysis, cybersecurity, product management, and general professional work. They recommend section priorities, suitable design, length guidance, emphasis, and optional information. Applying recommendations changes organization/design/target role without deleting evidence or inventing qualifications.

## Architecture and persistence

The mandatory layers remain distinct: master career evidence → variant selections/overrides → pure document render model → template rendering. Existing React, TypeScript, Zod, Dexie, Zustand, React Hook Form, and source-owned UI foundations are reused.

The IndexedDB schema is still **version 1**, with the same three stores. Optional domain additions support identity snapshots/overrides/visibility, full entry content overrides, project technologies, location fields, and the modern template. Existing Stage 0 records remain valid. No destructive schema migration was required. Strict unknown/future data rejection, stable IDs, source-reference checks, immutable metadata, monotonically increasing tokens, transaction rollback, provenance, and bounded history remain in place. Old resumes without identity snapshots explicitly state that source contact details are live until pinned.

Editors, sorting, portability, PDF generation, and PDF proof are lazy-loaded. The PDF engine is a large optional chunk; the build warning is documented rather than hidden. Download object URLs are revoked. PDF proof destroys its workers/documents, and preview resize observers disconnect on cleanup. Imported text is escaped by React; no executable HTML/CSS is accepted. Same-origin fonts/workers and a narrow WASM CSP permission support rendering without external requests.

## Actual verification

Environment: macOS ARM64, Node **22.23.1**, npm **10.9.8**, Playwright **1.64.1**, Chromium desktop and iPhone 13 emulation. No unexecuted browser engines or physical devices are claimed.

| Required command                   | Actual result                                                               |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `npm run lint`                     | PASS — zero errors/warnings                                                 |
| `npm run typecheck`                | PASS — strict TypeScript                                                    |
| `npm run format:check`             | PASS — all matched sources formatted                                        |
| `npm test`                         | PASS — **96 / 96**, 7 files                                                 |
| `npm run test:e2e`                 | PASS — **16 / 16**, desktop/mobile; final run **23.0 s**                    |
| `npm run build`                    | PASS — production assets generated; optional PDF chunk-size warning remains |
| `npm audit --audit-level=moderate` | PASS — **0 vulnerabilities**                                                |
| `git diff --check`                 | PASS                                                                        |

Unit/integration counts: existing domain **31**, storage **16**, interoperability **6**, application UI **4**; new MVP domain/storage/portability **28**, autosave **3**, and real PDF **8**. Total **96**. Browser coverage is the original **8** plus **8** new desktop/mobile MVP journeys.

### Journey evidence

| Journey                         | Executed evidence                                                                                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — author and retain a profile | Browser enters name/contact, education, work/bullets, projects/technologies/link, and skills; refresh retains them. Unit test persists every evidence kind and reconnects IndexedDB.                                       |
| B — isolated variants           | Browser creates and duplicates a resume, edits one, refreshes, and checks master/sibling storage. Unit test checks full content, summary, contact, and design isolation.                                                   |
| C — template switching          | Browser selects all four templates; pure render-model tests confirm content survives every switch and visibility/order changes.                                                                                            |
| D — real PDF                    | Eight PDF tests exercise four short and four long documents; browser downloads PDF bytes and renders exact proof under the production CSP on desktop/mobile.                                                               |
| E — JSON/YAML round trip        | Both native formats reimport into clean database/browser contexts. IDs/references, content overrides, revisions, and detailed design survive. Standard JSON/YAML supported fields are also tested.                         |
| F — invalid/malicious import    | Invalid JSON, malicious YAML tags/aliases, duplicate keys, prototype keys, excessive nesting/size, future versions, orphan references, and excess revisions fail before writes. Simulated failed replace writes roll back. |
| G — presets                     | Browser applies a Werkstudent recommendation and edits the order; unit cases cover internship, working-student, and research priorities without evidence loss.                                                             |
| H — responsive/accessibility    | Desktop/mobile authoring, templates, revision restore, import, PDF proof, keyboard drag/drop, arrow reorder, invalid autosave/undo, axe checks, and narrow overflow. Existing 320/768/1024 checks remain.                  |

### PDF inspection

Each template's short document has **1 A4 page** and each long document has **5 pages**, totaling **24 exercised pages**. Extraction verifies candidate and project text, `Zoë Müller` / `Łukasz García`, GitHub/LinkedIn/website link annotations, A4 dimensions, all 90 numbered long-entry bullets, nonblank content on every long page, and text placement inside page bounds. Name/headline separation has a regression assertion.

Poppler rasterizations of all four final short PDFs were visually inspected for hierarchy, line spacing, special characters, and links; representative long-page transitions were inspected too. An additional pdfplumber check inspected every glyph across all 24 final pages: **0 glyphs outside page bounds**. Visual QA caught and corrected an inherited heading line-height issue and removed an unreliable dynamic footer that had been positioned outside the page. PDF page counts remain available in proof; no broken footer is shipped.

Browser screenshots of profile/content/design/PDF proof at desktop/mobile sizes were inspected. Generated screenshots, traces, builds, and PDF fixtures remain ignored local verification output; source tests reproduce them. Local persistence is exercised through navigation, refresh, database reconnect, and full Chromium shutdown/relaunch using the same browser profile. Tested candidate workflows make **zero external network requests**.

## Known limits and remaining release work

- HTML preview is continuous and can wrap slightly differently; exact PDF proof is authoritative for pagination. Downloaded PDFs preserve selectable text; the proof canvas itself is an image with an accessible page label.
- Native files are bounded to 5 MiB. Safe merge is record-based and rejects conflicts. Import review shows at most 300 field differences per record. Standard conversion is intentionally lossy; native backups retain supported state.
- Master-profile undo is session-scoped. Resume revisions are persistent but bounded to 20. Invalid drafts are in-memory tab recovery, not durable backups. Browser eviction/data clearing still requires independent native backups.
- Legacy two-column configuration is preserved as metadata but not exposed as a new layout. The tested templates use single-column reading order. European presentation is not official Europass compatibility; no ATS score/acceptance guarantee is made.
- Fonts cover the tested European character set; exhaustive worldwide-script/emoji shaping is not certified.
- The lazy PDF chunk is about **1.20 MB** minified (**443 kB** gzip); proof adds PDF.js and its worker. Initial loading excludes these. Very large-document performance, virtualized proof pages, and more aggressive splitting merit future profiling.
- Chromium/emulated mobile are verified. Other browser engines, physical mobile devices, and comprehensive manual screen-reader testing remain before public release.
- No AI integration or public deployment was performed. Before AI: implement opt-in evidence-grounded suggestions, provider provenance, and explicit acceptance without changing master evidence automatically. Before deployment: verify final-origin storage, headers/CSP/WASM/worker/font delivery, deep links, recovery UX, and broader browser/device performance.

## Delivery references

Application implementation: `69a266db0109898edee766ffc88804df2fb17851`. Review: [pull request #2](https://github.com/VLR-Technologies/vlr-resume-studio/pull/2), `feat/resume-studio-mvp` → `main`. This report is finalized in a subsequent documentation commit, preserving an immutable application commit reference rather than trying to embed its own hash.

The GitHub connector could read merge metadata but returned HTTP 403 for PR creation. The authenticated GitHub CLI successfully created PR #2, which is attached to this chat. No credential changes, direct main pushes, merges, or deployments were performed. All verification results above describe executed local checks; hosted CI is tracked independently on the PR.
