# Product scope

VLR Resume Studio is a VLR Technologies product for turning one evidence-based career profile into several purposeful resumes. The interface should make preparation calm and direct while preserving ownership of personal data.

## People and problems

Primary users are internship applicants, working students, recent graduates, full-time professionals, researchers, and people applying across European markets. They need reusable career evidence, role-specific selection, professional documents, and control over where sensitive information goes. Repeatedly copying a resume creates inconsistent source information; changing its design should never destroy its content.

## Essential product behavior

The master profile stores career history independently of any template. Each variant references selected stable evidence, pins a small snapshot, and holds its own wording. A selected design renders that variant. Users download PDFs and portable structured files. The product remains useful when AI is unavailable.

Initial employment categories are internship, working student, graduate/entry-level, full-time, research/academic, and custom with an explicit label. Extending this set requires a schema change or a declared custom category, not unvalidated strings.

## Delivered MVP

The product supports complete career-profile authoring, repeatable entries/bullets, isolated resume variants, explicit source-change review, drag-and-drop and accessible arrow sorting, saved revision restore, twelve real templates (four React PDF, eight Typst), immediate original-layout HTML preview, exact PDF proof/download, native JSON/YAML backups, reviewed transactional import, standard JSON Resume interoperability, employment categories, and role recommendations.

Career information, variant content, the normalized document model, and layout/styling are separate layers. Incomplete profiles are valid. New profiles contain no fabricated experience. The sample workspace is explicitly fictional. Changing category, template, or order never removes career evidence.

The default A4 ATS Essential is a restrained single-column layout. European Professional uses a formal date-led CV presentation without claiming official Europass compatibility. Modern Professional adds a controlled accent and hierarchy. Academic / Research supports publications, appointments, projects, and flexible page count. A photo is never required.

Native VLR exports preserve supported record IDs/references, selections, overrides, order, design, and revisions. Standard JSON Resume is explicitly lossy. Import always parses into detached validated data, presents field comparisons and loss information, and requires confirmation. New records remap IDs together; safe merge rejects conflicts; replace downloads a recovery copy and applies one transaction. Invalid files do not write.

External LLM editing is user-controlled: copy instructions → export native data → supply it and a job description to a chosen model → import → review → accept/reject. Instructions require IDs/schema retention and prohibit invented facts. No paid AI API, inference host, account, or cloud synchronization is implemented.

## Explicit non-goals and release work

No job tracking, payments, backend, authentication, mandatory cloud storage, photo processing, built-in AI, or public deployment. The product does not guarantee ATS scores, employment outcomes, browser retention, or encryption from IndexedDB. Native backups have a 5 MiB bound; safe merge is record-based, not speculative field reconciliation. Master-profile undo is session-scoped; native backups provide persistent recovery.

Before public release: complete broader browser/real-device/screen-reader testing, large-document performance work, deployment/header verification at the final origin, and recovery usability review. Optional AI must remain evidence-grounded and require explicit acceptance; provider unavailability cannot block ordinary workflows.
