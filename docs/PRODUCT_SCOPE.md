# Product scope

VLR Resume Studio is a VLR Technologies product for turning one evidence-based career profile into several purposeful resumes. The interface should make preparation calm and direct while preserving ownership of personal data.

## People and problems

Primary users are internship applicants, working students, recent graduates, full-time professionals, researchers, and people applying across European markets. They need reusable career evidence, role-specific selection, professional documents, and control over where sensitive information goes. Repeatedly copying a resume creates inconsistent source information; changing its design should never destroy its content.

## Essential product behavior

The master profile stores career history independently of any template. Each variant references selected stable evidence, pins a small snapshot, and holds its own wording. A selected design renders that variant. Users eventually download PDFs and portable structured files. The product remains useful when AI is unavailable.

Initial employment categories are internship, working student, graduate/entry-level, full-time, research/academic, and custom with an explicit label. Extending this set requires a schema change or a declared custom category, not unvalidated strings.

## Stage 0 boundaries

Implemented: local record creation, limited metadata updates, evidence inspection, sample records, safe deletion, schemas, persistence, routing, responsive design, tests, and static build preparation.

Prepared: template configuration, pinned source references and override provenance, retained revisions, future migrations, native backup contracts, limited standard profile projection, YAML envelope declaration, and import proposal interfaces.

Not implemented: full career editing, section drag-and-drop, resume composition, PDF generation, export/download or import UI, YAML parsing, revision restore UI, AI calls, cloud accounts, or deployment. The UI must not offer those as working actions.

## Future MVP

A useful MVP includes profile editing, independently tailored variants, accessible live preview, ATS-conscious single-column designs, A4 defaults, reliable PDF output, and local backup. European and Europass-inspired designs should support locales and clear date/education presentation without claiming Europass certification or copying a proprietary layout. Academic variants can include publications and research evidence. A photo is never required.

Standard JSON Resume targets interoperability using the maintained `@jsonresume/schema`; native VLR backups preserve app state. YAML must declare schema type/version and use safe parsing with input limits. External LLM editing is user-controlled: export → external edit → validate → preview a diff → accept/reject → render with the chosen template. No imported file writes to the database simply by being parsed.

AI should offer job-description alignment and evidence-grounded suggestions, cite source evidence, and require acceptance. It must never fabricate qualifications, employers, skills, or results. Provider unavailability cannot prevent ordinary editing and exporting.

## Explicit non-goals

Stage 0 does not include job tracking, payments, inference hosting, a backend, authentication, mandatory cloud storage, or public deployment. The longer-term product does not promise ATS scoring guarantees, employment outcomes, permanent browser retention, or encryption from IndexedDB alone.

## Development sequence

Stage 1 extends profile editing and stable section/entry management. Subsequent milestones can add variant editing and source-change review, design/preview/PDF, structured portability, and finally optional AI/sync. These are planning boundaries, not commitments to ship incomplete controls in the current interface.
