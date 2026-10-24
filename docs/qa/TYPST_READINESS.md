# Typst readiness assessment

No Typst runtime, template, backend, AI feature, or new storage abstraction was added in Stage 1.5.

## Existing rendering boundary

`MasterCareerProfile` holds typed evidence and stable bullet IDs. `ResumeVariant` holds pinned identity/summary/evidence snapshots, independent wording overrides, selected sections, ordering and design configuration. `buildRenderModel` in `src/services/rendering/model.ts` validates both records and resolves a pure `ResumeRenderModel`: identity, ordered sections, normalized entries, template configuration and source-change warnings.

The React HTML preview and `ResumeDocument` in `src/services/rendering/pdf.tsx` consume that model. PDF proof calls the same PDF generation service as Download PDF, then uses PDF.js to display the result. The model is reusable without querying or rewriting IndexedDB. The current React PDF path remains tested and available.

## Stable contracts and compatibility

| Boundary               | Current state                                                                      | Future migration requirement                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Career storage         | IndexedDB v1 profiles, variants, revisions; runtime validation on reads/writes     | A renderer adapter does not require changing career evidence storage. Preserve IDs and references.                                                                     |
| Template identifiers   | Strict v1 enum: `classic`, `european`, `modern`, `academic`                        | Never repurpose these IDs to mean incompatible layouts. Unknown IDs currently fail validation.                                                                         |
| Template configuration | Page size, typography, sizes, margins, spacing, colors, header and layout metadata | Define renderer-specific capabilities and units deliberately; preserve existing design values and legacy Letter.                                                       |
| Native backups         | Versioned strict JSON/YAML envelope with all snapshots and revisions               | Expand identifiers through an explicit versioned contract/migration; keep old readers' rejection of future versions. Adding a string to an enum alone is insufficient. |
| Revisions              | Stored complete validated variant states, maximum 20                               | Restore must retain renderer/template identity and the historical configuration. Migrate revision states as well as current variants if their contract changes.        |
| Legacy documents       | Older optional identity snapshots and legacy columns metadata are accepted         | Preserve existing compatibility behavior; columns metadata currently renders as a single column. Do not promise an unimplemented two-column design.                    |

## Recommended integration boundary

Add a future adapter after `buildRenderModel`, beside React PDF, producing document bytes from a validated normalized model and a selected versioned template. Retain the existing renderer for saved designs and an explicit fallback during migration. Keep export, proof, filenames, validation and error handling behind a shared renderer interface only when a second renderer actually exists.

Treat career text, URLs and filenames as data when generating Typst source. Do not interpolate arbitrary imported text into executable markup. Package fonts and required template assets locally to preserve offline/privacy expectations. Evaluate runtime and hosting needs in that milestone using current official Typst documentation; this stage makes no untested claim about a browser compiler or server requirement.

## Obstacles and migration risks

- The render model includes the existing TemplateConfig rather than a renderer-neutral capability contract. Keep content reusable, but map layout options explicitly.
- Date strings, `Present` and section labels are already formatted in English. Localization will need a defined presentation boundary.
- Academic work heading naming currently occurs independently in the HTML and PDF adapters; centralize that mapping when a second renderer makes duplication material.
- Font metrics and pagination differ across renderers. Matching a model is not proof of matching page breaks. Reuse the Stage 1.5 fictional personas, long-text/bounds matrix, extraction checks and visual evidence for migration acceptance.
- Proof/download must choose the same adapter, template version and font assets. Do not let preview quietly fall back to a different renderer.
- Design/import migrations must remain transactional, preserve old backups, report unsupported options and require intentional source refresh. The seven high-priority data/content fixes in this stage illustrate why silently rewriting snapshots is unsafe.

**Decision:** suitable for a future adapter without a career-storage rewrite. Template registry/versioning and migration policy require deliberate work in the Typst milestone. Existing templates and React PDF should remain available throughout migration.
