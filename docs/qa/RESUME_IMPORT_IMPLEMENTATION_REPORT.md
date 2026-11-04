# Resume Import Implementation Report

## Workflow

The import surface in Settings accepts VLR JSON/YAML backups, JSON Resume, ordinary resume JSON/YAML, and PDF. The selected filename remains visible during parsing, and parsing and review happen locally in the browser.

Native VLR records continue through the strict backup schemas and existing workspace review/import transaction. The adapter only treats explicit VLR markers or a versioned VLR-shaped record as a native backup. It retains duplicate-key, unsafe-key, YAML alias/tag, depth, node-count, and file-size protections. Native backups are never rewritten as a resume import.

Non-native structured resumes pass through `resume-normalization.ts`. It recognizes JSON Resume `basics`, ordinary root fields, common aliases for experience, education, certifications, skills, internships, and other supported sections. It normalizes location strings and objects, date formats, skill lists, and alternative contact and entry keys before creating canonical evidence entries. The normalized record is still checked by the JSON Resume validator and then the existing profile schema. Invalid canonical fields surface as field-path validation details.

PDF work is isolated in `pdf-resume-import.ts`. It uses the installed `pdfjs-dist` package and the same worker asset approach as the current PDF proof. Pages are processed locally; text items are grouped by visual row and likely columns. The parser recognizes common English and European section headings, date ranges, contact details, experience, education, projects, skills, certifications, languages, publications, awards, and volunteering. It creates canonical evidence through the existing factory helpers and validates the finished profile before it reaches the UI.

Resume files open an editable review screen. It presents personal details, summary, populated evidence sections, entry removal, section removal, warnings, missing-field indicators, and an in-dialog preview. The user explicitly confirms before a new career profile is written. The saved profile remains independent from resume variant edits. The follow-up template chooser uses the current 12-entry registry, `createVariant`, and the existing resume editor. The variant is linked to the saved profile and contains the normal source snapshots and selections.

## Supported inputs and limits

- Native VLR JSON and YAML backups retain the existing strict import behavior, recovery backup, merge/replace controls, ID remapping, and transaction checks.
- JSON Resume documents and ordinary resume JSON/YAML are mapped into the existing `MasterCareerProfile` schema. Unknown extensions and unsupported fields are not retained; the review includes a mapping warning.
- PDF files must be at most 5 MiB and 100 pages. Extracted text is limited to 250,000 characters. Common single and two-column text PDFs are supported heuristically, and date/entry boundaries should be reviewed.
- OCR is not included. Image-only or scanned PDFs with too little selectable text stop with an explicit local OCR limitation message; no empty or generated profile is saved.
- Password-protected PDFs show an unlock-and-retry message. Password behavior is covered with a simulated PDF.js password exception; no encrypted fixture is included.
- Photo, references, interests, and unknown PDF sections are not added to the profile. Detected unsupported headings are named in the review warnings where possible.
- PDF parsing does not transmit resume data. No OCR or remote parsing service is called.

## Verification

Automated checks run from the feature branch:

| Check                                           | Result                                                                                                                                                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                             | Passed                                                                                                                                                                                                                                                        |
| `npm run lint`                                  | Passed                                                                                                                                                                                                                                                        |
| `npm test`                                      | Passed: 327 tests across 14 files                                                                                                                                                                                                                             |
| `npm run build`                                 | Passed. Vite reports the existing large PDF/Typst engine chunks.                                                                                                                                                                                              |
| `e2e/resume-import.spec.ts` on desktop Chromium | Passed: ordinary JSON review/edit/save, template selection, editor opening and PDF download; two-page PDF extraction and cancellation; image-only PDF fallback                                                                                                |
| Final focused desktop Playwright run            | Passed: all 6 resume import and edge-case scenarios                                                                                                                                                                                                           |
| Existing desktop Playwright regression suite    | 39 of 40 passed in the first run. The remaining standard-import test had an obsolete native-backup dialog expectation; it was updated for the new review flow and passed in an isolated rerun. Thus all 40 desktop scenarios passed across the run and rerun. |

Vitest also covers native JSON/YAML backup round trips, standard JSON Resume, string locations, common ordinary JSON/YAML aliases, internships, invalid canonical fields, multi-page/two-column extraction behavior, European headings and dates, empty/corrupt/oversized PDFs, password errors, and the scanned-PDF unsupported state.

The browser checks use generated synthetic resumes rather than a user-provided PDF. The UI workflow was exercised through Playwright; no separate manual import of a personal resume was performed.
