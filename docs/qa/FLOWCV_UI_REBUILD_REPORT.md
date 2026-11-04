# FlowCV-inspired UI rebuild

## Reference analysis and visual direction

Public references reviewed on 4 November 2026:

- [FlowCV public resume dashboard](https://app.flowcv.com/resumes): restrained navigation, large document thumbnails, a short heading, and a small set of obvious actions. The template gallery uses consistent paper proportions and a visible selection state.
- [FlowCV personal details reference](https://assets.flowcvassets.com/landing/how-it-works/step2-add-your-experience_1200w.jpg): a clear section heading, labels above comfortable fields, and one task per surface.
- [FlowCV design reference](https://assets.flowcvassets.com/landing/how-it-works/step3-customize-layout-and-design_1200w.jpg): graphical layout choices, segmented controls, and compact sliders with visible values.
- [FlowCV product workflow](https://flowcv.com): content and design edits are paired with an immediately available document preview.

The implementation uses original VLR components, a forest-green accent, a simple V monogram, cool neutral surfaces, and existing VLR fonts. No FlowCV code, image assets, photos, logos, private endpoints, or undocumented APIs were copied. No editor recording was supplied.

## Resulting workflow

The root route and `/resumes` now show a resume dashboard. **Create New Resume** creates a blank source profile and linked variant in one transaction and opens the editor directly. Existing career profiles remain available through the secondary “Start from a career profile” control. Cards show a miniature projection of the user's content and offer open, duplicate, rename, and delete actions.

The desktop editor has three regions: an 86 px tool rail, a scrollable content/design panel, and a scrollable document preview. The toolbar contains an editable title, save feedback, Undo, an options menu, and Download PDF. The rail contains Content, Design, and Templates. At widths of 800 px and below it becomes Content, Design, and Preview tabs; templates are reached from Design. The editing panel scroll resets when switching tools.

Content uses accordions for Personal Details, Professional Summary, Experience, Education, Skills, Projects, Certifications, and Languages. Optional sections are available through Add Section. Existing populated optional sections stay visible. Each evidence section supports entry creation, editing, removal, ordering, and hiding. Section and bullet ordering support pointer dragging and labelled keyboard arrow controls. New entry forms validate before committing and retain an in-memory draft across an editor remount; browser unload is guarded while an entry is pending.

Design offers font-family choices, a font-size slider, theme swatches and a custom color, visual layout choices, and spacing/margin sliders. Layout choices select the existing single-column, date-column, or label-column template implementations. They do not advertise an unsupported general-purpose two-column engine. Advanced Design retains paper size, heading size, header alignment, individual margins, and heading rules. The separate Templates view uses the original registry and all 12 designs.

The default preview uses the existing PDF generators and actual PDF pages. It supports fitting the available space, actual-size zoom, page scrolling, and the existing five-page canvas window with page navigation for long documents. The previous raster pages remain visible while a replacement compiles, and new canvases are swapped together after rendering. Legacy templates also retain an immediate live HTML view. PDF output, font registration, selectable export text, and both rendering engines remain in place.

## Removed, consolidated, and preserved UI

| Previous element                                                             | New treatment                                                                    |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Overview hero, counters, metrics, and repeated product explanations          | Removed from the initial resume experience                                       |
| Global application sidebar inside the editor                                 | Replaced by Content / Design / Templates rail                                    |
| Separate section navigation and single-section editing view                  | Consolidated into reorderable accordions                                         |
| Profile-first creation requirement and resume-purpose dialog                 | Replaced by one-click blank resume creation                                      |
| Resume metadata, evidence counts, and source details on every card           | Replaced by document preview, title, and edited date                             |
| Repeated card actions                                                        | Consolidated into open action and a small options menu                           |
| Templates mixed into a long design form                                      | Moved to their own tool                                                          |
| All design numbers shown at once                                             | Common controls use visual choices/sliders; less frequent controls are collapsed |
| Role presets and employment category                                         | Preserved in Resume settings in the options menu                                 |
| Revisions and explicit source refresh                                        | Preserved in the options menu and source-change review                           |
| Master career profiles, snapshots, tailored overrides, validation, IndexedDB | Preserved                                                                        |
| Backup, import, export, storage information, and sample-data controls        | Preserved under Advanced Settings                                                |
| Undo, save retry, invalid-draft protection, cross-tab conflict checks        | Preserved                                                                        |

## Implementation and storage safety

`ResumeContent` presents the existing identity and evidence editors through the new accordion structure. Wording changes continue through `updateContent` and variant overrides. Template switches only modify template configuration. The full profile and variant schemas remain unchanged.

`startResume` atomically creates a source and variant, or starts from a validated existing profile. `addResumeEntry` validates evidence, adds it to the source, creates its matching selection, and saves a revision in one IndexedDB transaction. A stale variant token rolls back the source addition. These paths reuse `createProfile`, `createVariant`, the evidence factory, and the existing repository save operations.

PDF previews now render at a higher canvas resolution and keep previous pages during updates. A guarded Vite transform skips Yoga's speculative fetch of its already embedded WASM data URI, using its built-in decoder instead. This avoids a CSP violation without widening the security policy. The guard fails the build if a dependency update changes the expected loader and requires review. No package files are modified on disk.

## Browser screenshots and comparison

The screenshots below are actual local browser captures with fictional QA data. Baseline captures were taken from main at `cb44728` before editing.

| View             | Before                                     | After                                    |
| ---------------- | ------------------------------------------ | ---------------------------------------- |
| Resume dashboard | [Before](flowcv/before-dashboard.png)      | [After](flowcv/after-dashboard.png)      |
| Desktop editor   | [Before](flowcv/before-editor-desktop.png) | [After](flowcv/after-editor-desktop.png) |
| Mobile editor    | [Before](flowcv/before-editor-mobile.png)  | [After](flowcv/after-editor-mobile.png)  |

Additional captures: [Design](flowcv/after-design-desktop.png), [Templates](flowcv/after-templates-desktop.png), [Tablet](flowcv/after-editor-tablet.png), and [Mobile preview](flowcv/after-preview-mobile.png).

Visual review confirmed that the content panel and paper now form the main hierarchy, technical explanations no longer compete with editing controls, and mobile displays a single focused panel. The reference patterns informed the spacing, card proportions, and visual selection controls; VLR's branding and existing data capabilities determine the final interface.

## Verification

- `npm run format:check`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 331 tests passed across 15 files, including new atomic creation, evidence linking, variant isolation, stale-token rollback, and orphan-prevention coverage.
- `npm run build`: passed. Existing large PDF/Typst bundle warnings remain.
- Complete desktop Playwright project: 44 tests passed. This includes actual first-time authoring, every standard section, add/remove, section and bullet ordering, autosave/reopen, all 12 template selections, design customization, PDF export, undo/revisions, invalid drafts, keyboard/a11y checks, responsive layouts, profile lifecycle, storage failures, backup restore, imports, and rendering/resource regression checks.
- Firefox: 44 tests passed.
- WebKit: 44 tests passed.
- Mobile Chromium: 43 passed in the initial full run. The source-refresh case exposed an old navigation target and a stacked-card menu overlap. Both were fixed, and the complete case passed in an isolated rerun. All 44 mobile scenarios were verified across the run and rerun.
- In total, all 176 browser scenarios were verified across the four projects and the mobile rerun. The initial failed attempts are not counted as successful runs.

The previous UI-specific E2E scenarios were migrated to the new dashboard, accordion, overflow-menu, and template workflows. Assertions for storage isolation, revision safety, PDF bytes/text, compiler failure recovery, CSP, and bounded preview canvases remain covered. No merge or deployment is part of this work.
