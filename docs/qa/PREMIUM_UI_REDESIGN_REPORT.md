# Premium UI redesign

## Scope and foundation

Started from `main` at `2953126`, the merged result of [PR #6](https://github.com/VLR-Technologies/vlr-resume-studio/pull/6), on `feat/premium-ui-redesign`. Reviewed the previous dashboard, desktop/mobile editor and design screenshots in `docs/qa/flowcv/` before implementation.

The redesign changes the actual application composition: a quieter workspace header, full-paper dashboard cards, a dedicated empty state, a more comfortable authoring column, refined section cards, visual design controls, and a distinct document canvas. It preserves the existing React architecture and local-first workflow. No AI features, optimization scores, backend, authentication, schema migrations, persistence changes or PDF engine changes were introduced.

## Visual system

`src/app/design-system.css` owns shared semantic tokens and control styles. `flow-ui.css` owns dashboard/editor composition and responsive behavior. Existing profile, settings, import, dialog and shared component styles now consume the same semantic colors and readable typography instead of the old green literals.

| Token                                  | Value / purpose                                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary / hover / pressed              | `#5B5BD6` / `#4848B9` / `#3D3DA3`                                                                                                                                                           |
| Lavender / powder blue                 | `#9486E9` / `#C7E3F4`, restrained supporting accents                                                                                                                                        |
| Background / surface                   | `#F5F6FA` / `#FFFFFF`                                                                                                                                                                       |
| Secondary / subtle / selected surfaces | `#F0F2F8` / `#FAFBFE` / `#EFEFFC`                                                                                                                                                           |
| Document canvas                        | `#E9ECF3`                                                                                                                                                                                   |
| Primary / secondary text               | `#19233B` / `#536078`                                                                                                                                                                       |
| Muted text                             | `#5F6C83`; darkened from the suggested `#66738A` after the browser measured only 4.43:1 on the main background                                                                              |
| Borders / control borders              | `#E4E8F1` / `#C5CCDC`                                                                                                                                                                       |
| Focus ring                             | `#A5B4FC`, with an indigo input border                                                                                                                                                      |
| Danger                                 | `#AA3447`, with a separate light danger surface                                                                                                                                             |
| Typography                             | Inter variable for application chrome; 15 px body, 14 px labels/buttons, 15 px desktop inputs, 16 px mobile inputs, 12 px secondary metadata, 26 px panel headings, 36 px dashboard heading |
| Weights / line heights                 | 400 / 500 / 600 / 650; 1.25 headings, 1.6 body                                                                                                                                              |
| Spacing                                | Shared 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 px scale                                                                                                                                    |
| Radii                                  | 8 px small, 10 px controls, 16 px cards, 20 px dialogs                                                                                                                                      |
| Elevation                              | Separate subtle control, card, hover, popover, modal and document shadows                                                                                                                   |
| Motion                                 | 150–220 ms surface, border and disclosure-chevron transitions; reduced-motion override                                                                                                      |

Inter is self-hosted and preloaded, so the application makes no runtime font request to an external provider. The font and its SIL Open Font License are checked in under `public/fonts/`. Source: [Inter project](https://github.com/rsms/inter/blob/master/docs/font-files/InterVariable.woff2), [license](https://github.com/rsms/inter/blob/master/LICENSE.txt).

The resume document remains independent: Noto Sans/Noto Serif, all existing document colors, custom color selection and the rendering configuration are retained. Small type inside miniature document previews represents a scaled paper document, not an application form label.

## Changed components and interactions

- **Workspace identity:** shared original `BrandMark`, inline VLR Resume Studio wordmark and restrained navigation. The small mark contains an abstract sparkle detail without advertising a nonexistent AI function.
- **Dashboard:** clear heading and Create Resume action; complete A4-proportioned miniatures, subtle cool card backgrounds, visible titles and edited dates, open/duplicate/edit/delete actions, an upward-opening card menu, and a purpose-built empty state. Preview content is decorative; the overlay link has a concise accessible name.
- **Editor frame:** bounded editing column and spacious canvas; a clear title/save hierarchy; consistent back, undo, options and download controls. The mobile header uses two rows so the title and download action remain readable.
- **Content:** shared `StudioHeading`, recognizable section icons, larger labels/inputs, long personal details given full width, and consistently reachable reorder controls in their own row. Existing evidence editors, accordion behavior, validation, revisions and overrides remain in use.
- **Design:** rendered Noto font specimens, explicit selected indicators, theme swatches plus a labeled custom-color control, three illustrations corresponding to the existing single/date/label-column layouts, styled native sliders with readable values, and collapsed advanced controls.
- **Templates:** all 12 registry entries and category filters retained, complete page thumbnails, refined selected borders, clear names and category metadata. Switching templates preserves content and unrelated settings.
- **Preview:** a grouped zoom/live-view toolbar, crisp white paper and restrained shadow, real loading feedback and a first-render skeleton. Fit/100% widths honor A4 and Letter; the existing five-page rendering window, compilation recovery and PDF download behavior remain unchanged.
- **Shared surfaces:** buttons, form fields, checkboxes, dialogs, notifications, profile sections, portability controls and settings use the same visual system. No user data or repository storage methods were changed.

## Browser visual evidence

All after images are actual browser screenshots using the fictional Avery Morgan fixture imported through the normal review flow. The pre-existing screenshots below remain unchanged as the before reference. Capture code is in `e2e/premium-ui.spec.ts`; `UPDATE_PREMIUM_SCREENSHOTS=1` updates the checked-in Chromium captures. Normal regression screenshots go to ignored test artifacts.

| View             | Before                                                   | After                                 |
| ---------------- | -------------------------------------------------------- | ------------------------------------- |
| Dashboard        | [FlowCV dashboard](flowcv/after-dashboard.png)           | [1440 px](premium/dashboard-1440.png) |
| Content editor   | [FlowCV desktop](flowcv/after-editor-desktop.png)        | [1440 px](premium/content-1440.png)   |
| Design           | [FlowCV design](flowcv/after-design-desktop.png)         | [1440 px](premium/design-1440.png)    |
| Template library | [FlowCV templates](flowcv/after-templates-desktop.png)   | [1440 px](premium/templates-1440.png) |
| Mobile editor    | [FlowCV mobile](flowcv/after-editor-mobile.png)          | [390 px](premium/content-390.png)     |
| Mobile preview   | [FlowCV mobile preview](flowcv/after-preview-mobile.png) | [390 px](premium/preview-390.png)     |

| Width | Empty / populated dashboard                                               | Content / design                                                        | Templates / PDF                                                           | Focus / action menu                                             |
| ----- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 390   | [Empty](premium/empty-390.png) · [Populated](premium/dashboard-390.png)   | [Content](premium/content-390.png) · [Design](premium/design-390.png)   | [Templates](premium/templates-390.png) · [PDF](premium/preview-390.png)   | [Focus](premium/focus-390.png) · [Menu](premium/menu-390.png)   |
| 768   | [Empty](premium/empty-768.png) · [Populated](premium/dashboard-768.png)   | [Content](premium/content-768.png) · [Design](premium/design-768.png)   | [Templates](premium/templates-768.png) · [PDF](premium/preview-768.png)   | [Focus](premium/focus-768.png) · [Menu](premium/menu-768.png)   |
| 1024  | [Empty](premium/empty-1024.png) · [Populated](premium/dashboard-1024.png) | [Content](premium/content-1024.png) · [Design](premium/design-1024.png) | [Templates](premium/templates-1024.png) · [PDF](premium/preview-1024.png) | [Focus](premium/focus-1024.png) · [Menu](premium/menu-1024.png) |
| 1440  | [Empty](premium/empty-1440.png) · [Populated](premium/dashboard-1440.png) | [Content](premium/content-1440.png) · [Design](premium/design-1440.png) | [Templates](premium/templates-1440.png) · [PDF](premium/preview-1440.png) | [Focus](premium/focus-1440.png) · [Menu](premium/menu-1440.png) |
| 1920  | [Empty](premium/empty-1920.png) · [Populated](premium/dashboard-1920.png) | [Content](premium/content-1920.png) · [Design](premium/design-1920.png) | [Templates](premium/templates-1920.png) · [PDF](premium/preview-1920.png) | [Focus](premium/focus-1920.png) · [Menu](premium/menu-1920.png) |

Additional design details: [Spacing controls](premium/design-spacing-1440.png), [advanced controls](premium/design-advanced-1440.png), [mobile spacing](premium/design-spacing-390.png), and [mobile advanced controls](premium/design-advanced-390.png).

Supporting surfaces: [Desktop settings](premium/settings-1440.png), [mobile settings](premium/settings-390.png), [desktop profile](premium/profile-1440.png), [mobile profile](premium/profile-390.png).

### Visual review observations

- **390 px:** two-row editor header keeps actions accessible; 16 px fields avoid microscopic input text; a single content panel and Content/Design/Preview tabs keep authoring focused. Theme swatches fit evenly. Card menus open above their triggers, within the viewport. PDF fitting preserves the paper's aspect ratio; 100% zoom scrolls inside the preview.
- **768 px:** centered, comfortable authoring width with the same panel switching; two-column dashboard. It avoids squeezing an editor and full document into a narrow tablet viewport.
- **1024 px:** three regions remain visible with a 388 px editing panel, single-column fields and a fitted document.
- **1440 px:** a 480 px editing panel with a large paper preview; label hierarchy, selection states and action groups remain distinct.
- **1920 px:** the editing panel grows to 520 px and paper stays centered at its natural CSS size, avoiding an oversized stretched resume.
- The screenshot iterations corrected muted-text contrast, an unwanted route-landmark outline, uneven mobile swatches, viewport-clipped menus, hover-dependent ordering, and accessible labels. Native controls remain keyboard operable, tabs support arrow/Home/End navigation, and motion is disabled with reduced-motion preferences.

## Verification

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing large PDF/Typst chunk warnings remain.
- `npm test`: **331 tests passed across 15 files**.
- Full Playwright suite: **196 scenarios executed** across desktop Chromium, mobile Chromium, Firefox and WebKit. **186 passed** in that run: all 176 existing workflow scenarios plus the 10 new Chromium visual scenarios. The remaining 10 visual scenarios failed in the screenshot helper when it attempted to decode off-screen lazy images in Firefox/WebKit.
- Corrected the helper to wait for visible images and reran the complete new visual suite: **20/20 passed across all four projects** (five widths each). Thus **all 196 unique browser scenarios passed across the full run and the corrected visual rerun**, not a single clean 196-test run.
- Browser coverage includes creation/deletion/duplication, source linking and variant isolation, autosave/recovery/conflicts, keyboard and pointer ordering, undo/revisions, all 12 templates, custom document color, A4/Letter settings, PDF compilation/proofs/downloads, imported data review, JSON/YAML/PDF interoperability, storage failures, CSP and bounded preview resources.
- New visual checks cover empty/populated dashboards, content/design/templates/preview, input focus, menu bounds, natural PDF fitting and actual-size zoom, template/content/settings isolation, reduced motion, font size, horizontal overflow, and axe WCAG A/AA checks including label-content matching. Supporting profile/settings and expanded design controls are also captured and checked.
- **48 checked-in browser screenshots** document the final desktop, tablet and mobile interface. Existing before screenshots remain unchanged.
- Confirmed no changes under `src/domain` or `src/services`, and the live resume document CSS block remains unchanged from main.

## Remaining limitations

- Dashboard cards are lightweight projections of resume content; the editor shows the actual PDF layout. Template-gallery assets remain the existing generated template previews.
- Preview fit on a phone necessarily reduces document text; 100% zoom and PDF export provide full-size reading.
- Existing large PDF/Typst bundle warnings remain. Both engines are still loaded through their existing paths.
- Automated accessibility checks and browser screenshots supplement, rather than replace, testing with assistive technology and physical devices.

No merge or deployment is included.
