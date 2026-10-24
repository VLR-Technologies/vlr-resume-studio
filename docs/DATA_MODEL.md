# Data model

Internal record schema version: **1**. Database version: **1**. These versions have separate responsibilities: records govern domain shape, database versions govern IndexedDB stores/indexes.

## Core entities

| Entity                | Properties and responsibility                                                                                                                                                                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MasterCareerProfile` | UUID, schemaVersion, createdAt/updatedAt, workspace label, immutable isDemo flag, optional identity and summary, and typed evidence collections. Authoritative career source.                                                                                                                               |
| `ResumeVariant`       | UUID/version/timestamps, sourceProfileId, title, optional-in-practice targetRole (empty string allowed), employmentCategory, valid BCP 47 locale, selectedSections, explicit sectionOrder, selections, optional summarySnapshot, isolated overrides, and template config.                                   |
| `TemplateConfig`      | schemaVersion, allowlisted templateId, A4/Letter, millimetre margins (8–40), sans/serif typography, body/heading sizes (8–16 / 12–30 points), line spacing (1–2), section spacing (2–20 mm), header style, six-digit accent color, hiddenSections, sectionOrder, and bounded layout options. A4 is default. |
| `ResumeRevision`      | UUID/version, variantId, createdAt, reason, and complete validated previous variant snapshot. Independent of the source profile.                                                                                                                                                                            |
| Evidence selection    | UUID, section, sourceEntryId, sourceProfileUpdatedAt, and a snapshot of the selected source entry including stable bullet IDs.                                                                                                                                                                              |
| Wording override      | UUID, selectionId, optional title/summary, source-linked bullet replacements, and provenance (user or AI suggestion, evidence IDs, optional provider/model and proposed/accepted timestamps).                                                                                                               |

Profile evidence collections: education, work experience, internships, projects, skills, languages, certifications, publications, volunteer experience, awards, professional links, and custom sections. Each entry has an ID, kind, title, optional summary, and stable bullet records. Entry kinds add institution/qualification, organization/location, skill category/keywords, language proficiency, issuer, publisher, awarder, safe URL, and/or date/period as appropriate. Bullet records cover achievements without array-position identity. Custom section entries have independent IDs and bullets.

All personal fields are optional: identity can be `{}`, every evidence list can be empty, and summary may be absent. A workspace label is required, not a person's name. Labels are bounded to 200 characters, long text to 10,000; array limits prevent unbounded record structures. Profile IDs and every nested entry/bullet ID must be unique inside the profile. Evidence snapshots also reject duplicate IDs.

## Stable identifiers

Use browser `crypto.randomUUID()` for records, entries, bullets, selections, overrides, and revisions. IDs are generated once and preserved through validation, serialization, reordering, and updates. Array indices are never used to identify stored records. Repeated skill keyword labels are display values, not editable domain entities; the containing group has its stable ID.

## Master-to-variant relationship and source drift

Multiple variants reference one profile. They store selected evidence snapshots rather than an entire duplicate master profile. Creating a variant initially selects all supported sections and evidence. Summary is pinned separately. Contact identity remains on the source profile for the future renderer; pinning contact identity and any identity overrides must be explicitly designed before revision-perfect historical rendering is promised.

An entry selection's kind/section and source ID must match its snapshot. Override IDs must refer to a real selection; evidence IDs and bullet replacements must refer to that selected snapshot. Wording is kept on the variant. React components and repositories never propagate it back into source evidence.

`resolveSelections` returns **current**, **changed**, or **missing** by comparing current source content with the pinned snapshot. It always returns pinned evidence so the future rendered content stays predictable until review. Updating/deleting an entry does not silently update/delete variant wording. An added/changed selection may only be saved if its snapshot matches current source evidence. An unchanged existing selection may survive source removal. The UI flags source drift and missing source profiles; review/refresh actions are future work. Changes to the source summary require future explicit comparison/review against summarySnapshot.

Profile deletion is rejected while linked variants exist. Variant deletion leaves the profile intact. Confirmed sample deletion is a clearly scoped cascade across sample profiles, every linked variant (including user-created ones), and revisions. The demo flag cannot be toggled through metadata saving.

## Sections and templates

Variant selectedSections define content inclusion; variant sectionOrder defines semantic ordering. Template sectionOrder controls presentation ordering and hiddenSections controls design visibility. Neither removes source data. Each list rejects duplicates; selected sections must appear in variant order. A future renderer must define precedence explicitly: use variant order for selected content, with template order only as an intentional user-selected presentation override. Current Stage 0 contains no rendering engine.

Employment categories use a discriminated union: internship, working-student, graduate, full-time, research, or custom with a nonempty label. Unknown categories are rejected. New standard categories require a schema/migration decision; custom handles unanticipated roles now.

## Dates and time

Career dates are calendar strings in `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`, including leap-year validation. They are never converted to JavaScript instants. `ongoing: true` requires no end date. End periods cannot precede start periods; reduced precision compares possible date ranges. Entity timestamps are separate UTC ISO instants. Repository updates strictly advance modified timestamps even for rapid consecutive writes.

## Revisions

Before each variant update, save the previous validated variant as a revision and atomically write the next version. Retain the most recent 20 revisions per variant, ordered by createdAt. This is bounded snapshot history, not event sourcing. Initial creation has no previous revision. Deleting a variant removes its revisions. Restore UI/API is deferred; future restore should validate the selected revision, preserve existing evidence snapshots, create a revision of the current state, and atomically replace the variant with a new modified timestamp. No restoration capability is presented today.

## Versioning and migration

`identifyVersion` requires an explicit numeric schemaVersion. `validate` rejects unsupported versions before schema parsing and returns structured errors with field details. Strict object schemas reject unknown keys rather than silently stripping a future producer's content. Future schema versions are preserved on disk and rejected safely on read/write.

The migration interface declares from/to and a pure value transformation. `prepareMigration` clones the original, transforms another clone, and validates target/version before returning both. No historical migration exists for initial version 1. Before introducing an actual migration, add a backup store and a Dexie upgrade transaction that persists the original and validated migrated record together. Abort on any failure. Never replace the only valid original merely because a transformer returned a value. Domain migration preparation is implemented; a future database migration/backup persistence pipeline is not.

## Portability compatibility

Native `vlr-backup` v1 includes profiles, variants, revisions, template/override/order/reference data and validated application metadata. It rejects duplicate record IDs, orphan variants/revisions, malformed/future records, and inputs beyond 5 MiB. Serialization/parsing operates detached from storage. Runtime parsing does not trust TypeScript types.

Standard JSON Resume uses its maintained external schema (`@jsonresume/schema` 1.7.0 in tests). The current profile projection covers basics, professional links, education, work/internships, projects, skill keywords, languages, certificates, publications, volunteering, and awards. It intentionally omits proprietary state and unsupported details and emits explicit warnings. It is not a full variant exporter or reverse converter. Free-form location is omitted pending structured mapping. Calendar dates outside the standard schema's supported year range are omitted with warnings. Standard export cannot reconstruct VLR layouts or provenance.

YAML declares `schemaType: vlr-backup`, schemaVersion 1, and validated native data. Safe text parsing/serialization and standard-JSON-Resume YAML are deferred. External LLM edits must pass validation and diff review before acceptance; imported provenance cannot be treated as proof that a qualification is true.
