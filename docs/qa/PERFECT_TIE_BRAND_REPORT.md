# Perfect Tie rebrand

## Result

Implemented on `feat/perfect-tie-brand`, based on main at `e28e187` (the merged premium UI). The product is now Perfect Tie, with an original Folded Silk necktie emblem, an outlined wordmark, navy/ivory/slate application surfaces, muted-blue interactions and a restrained champagne accent.

See the [identity guide](../brand/perfect-tie/README.md), [three generated concepts](../brand/perfect-tie/generated-concepts.png), [generation prompt](../brand/perfect-tie/PROMPT.md) and [optical size proof](../brand/perfect-tie/scaling-proof.png).

## Logo decision and assets

Three concepts were genuinely explored with the built-in image-generation tool. Folded Silk was selected for clear tie recognition, distinctive negative space, balanced proportions and effective small-size reduction. The PT ligature was less recognizable as a tie; the ribbon suggested a campaign emblem. The selected concept was refined into original Bézier vector masters, with rounded knot contours, a sweeping fold and a champagne facet. The small variant omits gold and opens the fold.

Production SVGs were authored separately; the generated concept sheet is exploration, not a generated vector export. The wordmark uses optically sized Inter outlines with custom spacing at weight 570. All masters are self-contained and independent of installed fonts.

`public/brand/` contains horizontal logos and standalone emblems for light/dark backgrounds, a monochrome emblem, SVG/PNG/WebP variants, a 1024×1536 transparent emblem master raster, 1568×416 horizontal rasters, 16/24/32/48/128 px icons, Apple touch icon, app/maskable icons, and 1200×630 social assets. Production emblem SVGs are approximately 1 KB and horizontal logos approximately 13 KB. The generation/refinement process and reproducible export scripts are documented in the identity guide.

## Application coverage and compatibility

- Updated the navigation wordmark, editor rail emblem, browser title, settings product name, README, backup actions and filenames, import-review labels, conversion warnings and external AI-editing instructions.
- Added favicon links, Apple icon, manifest, Open Graph and Twitter preview metadata. The manifest references real local icons with maskable safe space.
- Centralized the new palette and semantic surface, text, border, focus, hover, selected, disabled, success, warning and error tokens in the existing design system. The primary blue is `#4F659E` for white-label contrast; midnight `#111A2E`, ivory `#F8F7F4`, slate `#35445E`, champagne `#B99A66` and gray-blue `#8995A8` complete the identity.
- Preserved self-hosted Inter for application text, visible keyboard focus, reduced motion, existing responsive layouts, all 12 templates, autosave, revision history, storage and import/export behavior.
- Kept the IndexedDB name, package/repository identifiers, native backup format/envelope and required legacy `metadata.application` value unchanged so existing data remains readable. These are compatibility identifiers, not the visible brand.
- VLR Technologies remains the company attribution in settings and metadata.
- Resume document layouts, font choices and accent colors remain independent. PDF creator metadata and the empty-name fallback filename now identify Perfect Tie; resume content and PDF engines are unchanged.

## Browser screenshots

Before references remain unchanged in `docs/qa/premium/`. After captures use the same fictional Avery Morgan fixture and normal reviewed import path.

| View                    | Before                             | After                                                                                                                |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Dashboard               | [1440](premium/dashboard-1440.png) | [1440](perfect-tie/dashboard-1440.png) · [768](perfect-tie/dashboard-768.png) · [390](perfect-tie/dashboard-390.png) |
| Editor                  | [1440](premium/content-1440.png)   | [1440](perfect-tie/editor-1440.png) · [768](perfect-tie/editor-768.png) · [390](perfect-tie/editor-390.png)          |
| Templates               | [1440](premium/templates-1440.png) | [1440](perfect-tie/templates-1440.png) · [768](perfect-tie/templates-768.png) · [390](perfect-tie/templates-390.png) |
| Design                  | [1440](premium/design-1440.png)    | [1440](perfect-tie/design-1440.png) · [390](perfect-tie/design-390.png)                                              |
| Empty/mobile navigation | [390](premium/empty-390.png)       | [390](perfect-tie/empty-390.png)                                                                                     |
| Settings                | [1440](premium/settings-1440.png)  | [1440](perfect-tie/settings-1440.png) · [390](perfect-tie/settings-390.png)                                          |

Visual review confirmed crisp logos, consistent navy/slate hierarchy, restrained gold, stable logo dimensions and usable mobile navigation. Actual icon exports were inspected at 16, 24, 32, 48 and 128 px. White/dark variants are shown side by side in the optical proof. Browser checks verify accessible names, image availability, title/manifest branding, horizontal overflow, axe contrast/label rules and all 12 template choices.

## Validation

- Formatting, lint, typecheck and production build: passed. Existing large PDF/Typst chunk warnings remain.
- Unit tests: **331 passed across 15 files**.
- Complete desktop Chromium and mobile Chromium regression run: **104 scenarios executed, 101 passed initially**. Three mobile cases encountered missing trace/network files after a separately launched browser run cleaned the shared test-output directory. This was a test-run orchestration error, not an application assertion failure.
- Re-ran those three cases sequentially without overlapping runs: **3/3 passed**, including the full career-profile lifecycle/restart case, pointer/keyboard sorting, and 1024 px responsive controls.
- Additional Perfect Tie identity checks in Firefox and WebKit: **6/6 passed**.
- **All 110 unique browser scenarios were verified across the main run, isolated rerun and additional browsers**, rather than a single clean combined run. Coverage includes all 12 templates, PDF exports, imports/backups, autosave, recovery, revisions, source/variant isolation, accessibility and responsive layouts.
- Captured and visually reviewed 18 application screenshots plus the concept board, social artwork, light/dark wordmarks and icon scaling proof. No login screenshot is claimed because the application has no login route.

## Limits

There is no authentication/login screen or onboarding account flow in this local-first application, so no login screenshot exists. There is no dark-mode application; dark-background identity assets are provided and inspected without adding a new theme. No integrated AI feature or fabricated AI controls were introduced. Social preview paths are root-relative; the deployment owner can resolve them against the final production domain when configuring hosting. Existing large PDF/Typst bundle warnings remain.

No merge or deployment was performed.
