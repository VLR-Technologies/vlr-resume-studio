# Stage 2 — Typst template engine

## Scope and delivery

Implementation starts from merged PR #2 (`e8437c50057b3f3f481f15232edf7c6b3a6faeda`) on `feat/typst-template-engine`. The original four React PDF designs and all Stage 1.5 tests remain. No merge or public deployment is performed by this stage.

The tested implementation is commit `3641c8b7b6daf2b7fba81b41873f3869515c0b99`, delivered in [PR #3](https://github.com/VLR-Technologies/vlr-resume-studio/pull/3), targeting `main`. Subsequent report-only delivery metadata does not change the tested application fingerprint. GitHub CI is running at PR creation; its eventual hosted Linux result is not claimed by this local verification report. Generated PDFs, browser traces and raster sheets remain ignored under `qa-artifacts/`; compact evidence is retained beside this report.

## Compiler evaluation and working proof

Selected: **`typst-wasm@1.0.0`**, pinned in npm's lockfile, using its worker backend. Actual PDF metadata identifies **Typst 0.15.0**. The MIT compiler and Apache-2.0 engine notices are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); the existing Noto fonts remain under SIL OFL. All layouts are authored locally.

Sources reviewed:

- [typst-wasm browser/Vite guide](https://typst-wasm.github.io/typst-wasm/packages/typst-wasm/getting-started/browser-vite/): local worker and core-module URLs, PDF export, explicit disposal.
- [Browser deployment requirements](https://typst-wasm.github.io/typst-wasm/packages/typst-wasm/deployment/browser-requirements/): growable SharedArrayBuffer/Atomics and COOP/COEP.
- [Compiler API](https://typst-wasm.github.io/typst-wasm/packages/typst-wasm/reference/api/typst-wasm/interfaces/typstcompiler/): source/data/font registration and compilation.
- [typst.ts compiler interfaces](https://myriad-dreamin.github.io/typst.ts/cookery/guide/compiler/bindings.html) and [official PDF example](https://github.com/Myriad-Dreamin/typst.ts/blob/main/github-pages/preview.html): `@myriaddreamin/typst-ts-web-compiler@0.7.0` is another browser-capable PDF option. It was reviewed as an alternative, not experimentally declared unreliable. The selected compiler offers the documented worker path and promise-based resource loaders needed here.
- [typst.js](https://github.com/typst-community/typst.js): documents native-platform support and no current browser support; unsuitable for this local browser requirement.

`node scripts/typst/compiler-poc.mjs` builds an isolated real Vite application and compiles a Unicode/hyperlink PDF through three separate compiler/worker lifecycles in each of Chromium, Firefox and WebKit. The POC uses the full hosting policy, including cached response revalidation. It saves the actual bytes and observed startup/compile timings. No mock or backend participates. The first POC exposed CSP blocking tiny WASM modules inlined as data URLs; `assetsInlineLimit: 0` keeps all three modules on the same origin.

## Architecture and lifecycle

`ResumeRenderModel → typstProject → compileTypst → local WASM worker → PDF` lives beside the unchanged React PDF renderer. The registry selects the engine. Compiler code, three WASM files, fonts and PDF.js tools load when needed; original editing does not fetch the Typst engine.

Typst proof is automatic after a 500 ms edit debounce. PDF.js shows at most five canvases, with navigation for subsequent pages. The shared rendering service serializes jobs and retains one successful byte buffer. Proof and download use the same model, template version, fonts and bytes; repeat-download byte equality is tested. A stable serialized model prevents metadata-only autosaves from interrupting an unchanged proof or removing recovery actions.

Every Typst compilation owns one worker and virtual project. Success, failure, cancellation and the 60-second timeout terminate the worker. A canceled proof cannot publish stale output; superseded canvases are hidden while the new proof loads. Input JSON is capped at 5 MiB and generated PDF output at 25 MiB. One successful PDF and one editor-scoped last-valid reference are retained; this is not an unbounded history cache. Browser tests count created/terminated workers across navigation and repeated exports. Browser process RSS/GC is not measured.

If an update fails, the editor retains a clearly labeled **Download last valid PDF (earlier version)** action. It never labels that PDF as current. **Retry PDF proof** retries the current model. A missing-isolation error explains the required hosting headers; original designs remain usable.

## Registry and eight layouts

`src/domain/templates.ts` centralizes the twelve immutable IDs, names, category, engine, template version, paper sizes, supported controls, recommended employment categories/roles, preview URL, defaults and layout capabilities. Existing IDs retain their original meaning. Gallery cards use rasterized output from fictional QA fixtures, category filters, selection state and responsive layout.

| New ID                      | Layout structure                                                            |
| --------------------------- | --------------------------------------------------------------------------- |
| `typst-ats-minimal`         | Compact single column; uppercase section headings; inline dates             |
| `typst-ats-structured`      | Full-width rules; stacked employer and date metadata                        |
| `typst-european-classic`    | Formal CV masthead; aligned date ledger; indented evidence                  |
| `typst-german-professional` | Lebenslauf masthead; chronology column and timeline rail                    |
| `typst-modern-executive`    | Broad nameplate; narrow section-label column beside flowing content         |
| `typst-modern-accent`       | Tinted heading bands; offset entry markers; accent masthead                 |
| `typst-technical-engineer`  | Numbered section navigation; separated tools panels                         |
| `typst-academic-research`   | Scholarly masthead; double rules; numbered publications; appointments label |

Section order and visibility always follow the existing semantic model; templates do not silently reorder evidence to match a role recommendation. Incomplete/empty data works without invented content. German/European styling is not an official Europass format, and no ATS acceptance guarantee is made. Labels remain English, with a German masthead on that layout; full localization is outside this stage.

All layouts support Noto Sans/Serif, body/name font size, header alignment, line and section spacing, margins, accent, heading rules, A4 and Letter. Typst paragraph leading is `(lineSpacing − 0.8) × bodyFontSize`; section spacing and margins use mm, font sizes use pt. Very light accents retain their stored value while document text uses the existing contrast fallback. The UI explains that legacy column metadata is retained without a configurable column promise. Layout-specific rails/bands are part of the template rather than editable arbitrary code.

## Versioned compatibility

Career profile, resume/revision record shells and IndexedDB remain v1. Original template configurations stay **template contract v1**, with no added version property. An intentional Typst selection migrates only presentation to **template contract v2**, requiring its unique Typst ID and `templateVersion: 1`. Returning to an original design removes that Typst version field and returns the configuration to v1. Schema validation rejects mixed ID/version pairs, unknown IDs and unsupported future versions.

Legacy-only native backups remain **v1**. A current Typst selection or a retained Typst revision requires **backup v2** with `templateRegistryVersion: 1`. YAML's envelope version must match its nested backup. This prevents a v1 file from silently acquiring a new engine contract and preserves old readers' safe rejection of future files. Old records/backups load without being rewritten. Mixed-engine revisions, restore to a pre-Typst snapshot, native JSON/YAML round trips and transactional replacement are covered. Evidence IDs, snapshots, overrides, order, visibility, source references and provenance remain untouched by selection.

External AI editing instructions now preserve supplied backup/template versions and Typst IDs instead of directing a model to return only the four legacy IDs.

## Security and effective hosting headers

Career text is validated and serialized exclusively into `resume.json`; the executable `.typ` file is fixed, trusted repository source. There is no `eval`/markup interpolation of user text and no user source/file import UI. Long unspaced text receives soft wrap opportunities only for display; hyperlink destinations remain unchanged. HTTP/HTTPS URLs and validated email links become PDF link annotations. Literal Typst/script payloads remain selectable inert text.

The compiler's resource loaders reject unauthorized project files, URL fetches and Universe packages. Actual compile tests exercise all three denial paths. Only the fixed virtual source/data and four same-origin fonts are supplied. No career data upload, remote compiler, account, subscription or server is introduced.

`vercel.json` prepares static output and SPA routing with CSP, COOP `same-origin`, COEP `require-corp`, CORP `same-origin`, nosniff and existing privacy headers. Vite production preview applies those exact header values; `_headers` carries the equivalent static policy. WASM stays local with the expected MIME type. No JavaScript `unsafe-eval` is added.

Effective-header testing found an existing runtime AJV compilation incompatibility. JSON Resume validation is now generated from the same pinned schema at build time using [AJV standalone generation](https://ajv.js.org/standalone); Zod runs without JIT. Native and standard imports therefore work under the full CSP from page startup. The generated validator is committed and regenerated by `prebuild`/`pretest`. No previous validation assertion is removed.

Host configuration follows [Vercel's static configuration documentation](https://vercel.com/docs/project-configuration/vercel-json). Local effective-header tests are not a claim of verified Vercel/CDN deployment. Actual final-origin headers, caching/compression, deep links and MIME types need verification when a deployment is separately requested.

## PDF, visual and browser evidence

The Stage 1.5 Mara Weiß, Jonas García and Dr Élodie Martin fixtures are reused. Each of eight layouts is compiled for twelve scenarios: gallery, empty, minimal, student, professional, researcher, long text, multipage, Unicode/long URL/inert code, maximum valid Letter design, compact alternate-font design, and combined maximum-length fields at maximum typography. Tests check all expected career strings, safe link destinations, dimensions, page bounds, no empty overflow pages, multipage continuation and short entry headers staying with their descriptions. Three additional real compile cases deny filesystem/URL/package access.

Independent `pypdf`/`pdfplumber` inspection covers **96 PDFs / 374 pages**, with embedded fonts and **zero out-of-page glyphs**. Poppler rasterizes every page. Contact sheets and larger representative pages are reviewed for hierarchy, continuation, glyphs, wrapping, spacing and visible code leakage. Committed visual evidence: [gallery with an exact proof](visuals/gallery-proof.png) and [eight-layout contact sheet](visuals/gallery-contact-sheet.jpg). Actual gallery thumbnails are regenerated from those PDFs; the four original thumbnails come from the retained one-page QA matrix. Tests preserve all original PDF assertions.

New Playwright workflows cover all eight template proof/download/customize/switch-back journeys, unchanged career data, repeat-download equality, category filtering, effective headers, no off-origin requests/CSP violations, failed compile with last-valid download, retry, rapid switching, cleanup, reflow and missing-isolation recovery. The existing Stage 1.5 suite remains intact.

## Findings resolved during validation

- Tiny WASM modules were initially inlined into CSP-blocked data URLs. Vite now emits local files for all core modules.
- Full-policy startup exposed runtime AJV code generation in the existing importer. Build-generated validation and Zod's JIT-free mode preserve imports without weakening CSP.
- Repeated WebKit worker loads exposed Vite preview returning 304 before applying security headers. Early preview middleware now sets the same policy on 200 and 304 responses; the POC repeats worker creation and Playwright explicitly checks revalidation headers. Compiler initialization also waits for core modules before opening the worker, so worker load errors reach an active initialization request.
- Timeout and cancellation now abort initialization/font fetches as well as active worker work; focused lifecycle regressions prevent a late worker from starting after timeout.
- A multiline Typst conditional initially emitted internal `else` branches as literal document text. The static source was corrected; every scenario now asserts expected headings/content and rejects that internal-code signature.
- Maximum-width unbroken identity/metadata fields at maximum font sizes exposed horizontal overflow and oversized sticky blocks. Long runs now have additional display wrap opportunities; large mastheads can flow across pages, and unusually long entry headers can break without sticky grouping. A combined maximum-field scenario covers all eight layouts while normal short headers still stay with their introductions.
- Metadata-only autosaves replaced equivalent proof-model objects and could interrupt last-valid recovery clicks. Semantic model stabilization keeps recovery controls and proof lifecycle stable; failure/download/retry regression tests cover this.
- New QA harness paths were corrected to use the Preview tab only where that responsive tab is visible. Desktop and mobile expose the same proof through their intended layouts; original tests and assertions are retained.

## Final gates, performance and remaining limits

Final local production-build decision: **PASS** on macOS 26.6.1, Node 22.23.1 and npm 10.9.8. [EVIDENCE_SUMMARY.json](EVIDENCE_SUMMARY.json) retains the application fingerprint, every browser case, compiler measurements and independent PDF metadata. Existing Stage 1.5 test files are unchanged.

| Gate                                        | Observed result                                                       |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Lint / typecheck / format                   | PASS                                                                  |
| Unit / integration / PDF                    | **318 passed**, 0 failed, 0 skipped; 12 files                         |
| Production build                            | PASS; optional large-chunk warning retained                           |
| Production browsers under effective headers | **144 passed**, 0 failed, 0 skipped, 0 flaky; 6.8 minutes             |
| Independent Typst PDF inspection            | **96 documents / 374 pages**; fonts embedded; zero out-of-page glyphs |
| Dependency audit                            | PASS; zero vulnerabilities                                            |
| Git whitespace check                        | PASS                                                                  |

The final browser run includes Chromium desktop/mobile emulation, Firefox and WebKit. Earlier failed exploratory runs are excluded from this gate; their defects and harness corrections are described above. No original assertion was removed or relaxed. The complete final suite was run after the extreme-field fixes.

Compiler POC timings (milliseconds; three separate worker lifecycles per engine, full effective headers, local static assets):

| Engine                | Cold startup | First PDF total | Subsequent PDF totals |
| --------------------- | -----------: | --------------: | --------------------: |
| chromium 156.0.8078.4 |          109 |             146 |                 57–72 |
| firefox 157.0         |          276 |             282 |               239–241 |
| webkit 27.2           |          133 |             162 |               114–131 |

Observed eight-template editor journeys (milliseconds, includes the 500 ms debounce and save/proof readiness; download uses an already compiled PDF):

| Project | Template proof min–max | Cached PDF download min–max |
| ------- | ---------------------: | --------------------------: |
| desktop |               850–1415 |                      44–116 |
| mobile  |               854–1405 |                       34–66 |
| firefox |              1407–2203 |                      71–229 |
| webkit  |              1405–2704 |                      50–140 |

Timings vary with concurrent QA load and local caching. They are not hosted-network or physical-device benchmarks. The browser journeys also verify identical bytes on repeated downloads and zero outstanding tracked workers after navigation.

Reproduce:

```sh
npm ci
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
npm run test:e2e
npm audit --audit-level=moderate
git diff --check
node scripts/typst/compiler-poc.mjs
python3 scripts/typst/inspect_pdfs.py
```

The compiler core is **22.80 MB** uncompressed / **8.43 MB** build-reported gzip, loaded lazily. Its worker is about **95 KB**, and the optional adapter/compiler JS chunk about **118 KB**. The existing React PDF optional-chunk warning remains visible. Local timings use current desktop engines on macOS; they are observations, not low-power/mobile-network guarantees. No installed Safari/iOS, physical phones, arbitrary Unicode beyond Noto coverage, tagged PDF/PDF-UA certification, or whole-browser memory audit is claimed. Extreme valid typography can spread content across many sparse pages. Last-valid recovery is in memory for the current mounted editor, not a persisted PDF archive. Career data still needs independent native backups against browser eviction or origin changes.
