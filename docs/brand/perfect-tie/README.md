# Perfect Tie identity

Perfect Tie uses **Folded Silk**: a soft, optically balanced knot above a tapered blade, separated by an asymmetric S-shaped fold. A small champagne facet suggests the turn of fabric. The mark represents care, preparation and a composed professional identity.

## Exploration and selection

The built-in image-generation tool created [three original concept directions](generated-concepts.png). This is actual generated exploration, retained with its [prompt](PROMPT.md). The production SVGs were subsequently constructed and refined as bespoke Bézier geometry; they are not claimed to be generated vector artwork.

| Concept                   | Evaluation                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Folded Silk, selected | Strong tie recognition, distinctive fold, balanced silhouette, straightforward optical reduction; best fit for an understated career platform. |
| B — PT ligature           | Memorable monogram, but reads more readily as P than a tie and has a heavier horizontal balance.                                               |
| C — Tailored Ribbon       | Fluid and elegant, but the open loop suggests a cause ribbon and loses its tie identity at small sizes.                                        |

The selected mark refines A with mathematically controlled curves, restrained color, a wider fold gap and rounded endpoints. The small-size version removes gold and widens the negative space. [Actual 16, 24, 32, 48 and 128 px proof](scaling-proof.png).

## Typography and palette

The wordmark uses carefully spaced, outlined Inter at weight 570 with optical size 32. Its custom spacing and asymmetric icon offset are fixed in the SVG, with no runtime font dependency. Application text retains self-hosted Inter. Inter's SIL Open Font License is included at `public/fonts/Inter-LICENSE.txt`.

- Midnight navy `#111A2E`: emblem, wordmark, authority.
- Deep slate `#35445E`: secondary text.
- Warm ivory `#F8F7F4` and white: application surfaces.
- Muted royal blue `#4F659E`: accessible primary actions, darkened from the starting reference for white-text contrast.
- Champagne gold `#B99A66`: one fold facet and occasional small supporting detail.
- Gray-blue `#8995A8`: borders and supporting structure.

Semantic hover, pressed, selected, focus, disabled, success, warning and error tokens are centralized in `src/app/design-system.css`. Application colors do not change users' resume document colors.

## Production assets

All application assets are in `public/brand/`.

| Asset                                             | Formats and purpose                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `logo-light`, `logo-dark`                         | SVG, transparent PNG (1568×416), WebP; horizontal emblem + outlined wordmark for light/dark backgrounds |
| `emblem-light`, `emblem-dark`                     | SVG, transparent PNG (1024×1536), WebP; standalone full-detail tie                                      |
| `emblem-mono.svg`                                 | Single-ink master for print and restricted color use                                                    |
| `icon`, `icon-light`                              | SVG, 512 px PNG and WebP; reduced optical version in a rounded container                                |
| `favicon.svg`, `favicon-{16,24,32,48,128}.png`    | Small-scale exports; tiny marks omit gold                                                               |
| `apple-touch-icon.png`                            | 180 px icon                                                                                             |
| `app-icon-{192,512}.png`, `app-icon-maskable.png` | Manifest icons; maskable variant has extra inset safe space                                             |
| `social-preview`                                  | SVG, 1200×630 PNG and WebP; coordinated editorial social card                                           |

SVG masters scale without resolution loss. Preserve aspect ratios; use the dark variant on navy and the light variant on ivory/white. Do not stretch, rotate or add effects. Give the emblem at least half a knot width of clear space.

Rebuild vectors with `python scripts/brand/build-vectors.py` (temporary environment with fonttools and brotli). Rebuild PNG/WebP exports and the scale proof with `node scripts/brand/render-assets.mjs` (existing Playwright dependency). No runtime dependencies were added.
