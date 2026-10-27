# Data model

Career record schema version **1** and IndexedDB version **1** remain unchanged. Template contract v1 retains the original four IDs. Template contract v2 requires a Typst ID and `templateVersion: 1`. The centralized registry binds each ID to its engine and supported version; mixed or future pairs are rejected. Selecting a design is an explicit, pure presentation migration and never rewrites evidence or snapshots. Opening old data performs no implicit migration.

## Records

- **MasterCareerProfile:** UUID/version/timestamps, label, immutable sample flag, optional identity/summary, and typed evidence collections. Authoritative career information.
- **ResumeVariant:** UUID/version/timestamps, immutable source profile reference, title/target role, employment category, locale, selected sections/order, selected evidence snapshots, pinned summary, independent overrides, and validated design.
- **ResumeRevision:** UUID/version, variant reference, timestamp/reason, and complete previous variant snapshot. Maximum 20 per resume.

Identity fields (name, headline, email, phone, location) are optional. Each evidence entry and bullet has a stable UUID. Evidence covers education, work, internships, projects, skill groups, languages, certifications, publications, volunteering, awards, professional links, and custom sections. Typed fields include organization/institution/qualification, location, dates, issuer/publisher/awarder, proficiency, skill keywords/category, project technologies, and HTTP(S) links. Summaries and bullet text provide responsibilities and accomplishments without JSON editing.

Labels are bounded to 200 characters, long text to 10,000. Per-section entry counts, bullets, keywords, selections, overrides, backups, and parser depth/value counts are bounded. Profile/entry/bullet IDs must be unique within each profile; duplicate selection/override references are rejected. Empty profiles and unfinished entries are supported; temporarily invalid values remain unsaved drafts with visible errors.

## Source, selections, and tailored content

Each selection has its own UUID, section, sourceEntryId, sourceProfileUpdatedAt, and typed evidence snapshot. Its section/source ID must agree with the snapshot's kind/ID. New or modified selections must match current career evidence at repository save time. Unchanged pinned selections can survive source changes/removal.

An override refers to a selection and carries stable identity and provenance. Legacy title/summary/source-bullet wording is supported. Optional `content` contains a full independent typed entry with the same source entry ID and section, permitting resume-specific fields and new user-authored bullets. A user edit replaces the prior wording override with explicit user provenance linked to that source entry. Source evidence is never changed by variant operations. Override provenance is traceability, not proof that a qualification is true.

New variants pin `identitySnapshot` and `summarySnapshot`. A present `identityOverride` replaces the complete optional contact object, so clearing a field survives JSON/YAML omission of undefined values. `hiddenIdentityFields` hides individual fields without erasing them. Old Stage 0 variants without an identity snapshot explicitly use current source contact details until the user accepts a source refresh. Contact visibility never removes master information.

Resolution reports current, changed, or missing source evidence. The render model always uses pinned snapshots/overrides. The source refresh dialog explicitly resets tailored wording for existing entries and refreshes summary/contact snapshots. Missing source entries stay pinned; the previous saved variant is retained as a revision. Source-profile deletion is blocked while resumes reference it.

## Ordering, design, and categories

Variant `sectionOrder` is the semantic/display authority. The editor keeps `template.sectionOrder` synchronized when sections move. `selectedSections` defines content eligibility; `template.hiddenSections` hides sections without deleting selections. Selection array order determines entry order within a section. Profile array order and bullet arrays likewise use stable IDs, not array-index identity.

Template IDs: `classic` (ATS Essential), `european`, `modern`, `academic`. Config supports A4/legacy Letter, 8–40 mm margins, Noto Sans/Serif, 8–16 pt body size, 12–30 pt name size, 1–2 line spacing, 2–20 mm section spacing, left/centered header, six-digit accent color, heading rules, hidden sections, and explicit order. The legacy columns flag survives backups; the four implemented layouts are single-column. The renderer uses safe typed properties, never arbitrary CSS or HTML.

Employment categories: internship, working-student, graduate, full-time, research, or custom with a label. Eight role recommendations combine category-specific priorities with relevant section emphasis, a suggested template, length guidance, and optional information. Applying a recommendation changes order/design/target role only. Changing a category or template never removes evidence.

## Dates, concurrency, and restoration

Career dates are real calendar strings in YYYY, YYYY-MM, or YYYY-MM-DD precision. Ongoing periods cannot have an end; reversed ranges are rejected. Dates are not converted into instants. Record/revision timestamps are UTC ISO instants; writes advance timestamps monotonically.

Profile and variant updates compare expected `updatedAt`. Concurrent stale updates fail explicitly. Previous variants are retained atomically with each save. Restore accepts only an actual validated stored revision of that variant/source, retains current state, writes a new token, and keeps the bounded history. Profile undo is in-memory for the editing session; native backups provide cross-session recovery. Invalid drafts survive SPA remounts in the same tab and block unload/import/export until saved or explicitly reloaded/discarded.

No historical database migration was required. The Stage 0 detached migration preparation interface remains available. A future actual database migration must persist a validated original backup and transformed record atomically and test rollback; this pass does not claim that a future upgrade pipeline already exists.

## Native and standard interchange

Legacy-only native `vlr-backup` v1 preserves profiles, variants, snapshots, content/identity overrides, design, order, provenance, and revisions. A backup containing a current Typst selection or a Typst revision uses v2 with required `templateRegistryVersion: 1`. YAML uses a matching v1/v2 `schemaType: vlr-backup` envelope. Returning to an original design retains v2 while Typst history exists, so no historical selection is discarded. Old v1 files remain loadable unchanged; older application readers reject v2 safely. Both exports normalize optional undefined properties through JSON semantics. Limits: 5 MiB, 100 profiles, 1,000 variants, 20 revisions per variant, no orphan references or duplicate record IDs.

Imports validate before review and before transaction. The review includes up to 300 field differences per record, ordering changes, counts/warnings, and records removed by replace. Create-new remaps UUID values consistently. Safe merge accepts identical records and non-conflicting IDs only; it does not combine ambiguous fields. Replace downloads a recovery JSON and atomically replaces the workspace. A workspace fingerprint protects against edits during review. Storage/validation failure leaves previous data intact. Recovery from a successful replacement uses its downloaded native backup.

Standard JSON Resume is checked against `@jsonresume/schema` 1.7.0. Profile and resolved-variant exports cover basics, links, education, work/internships, projects/technologies, skill groups, languages, certificates, publications, volunteering, and awards. Standard import maps supported fields to new stable native records and one variant; JSON and YAML sources work. Unsupported extensions, images, references, interests, coursework/scores, rich address structure, custom sections, some per-entry details, native IDs/revisions/design, and selection/ordering semantics cannot round-trip. Visible warnings explain loss; native files are the full-fidelity format. Standard dates or URLs outside native bounds are rejected rather than guessed.
