# Design system

## Principles

Calm, purposeful, light, and content-led. The visual hierarchy is the workspace → career evidence → resume variants. The overview's branching illustration explains that relationship; it is conceptual, not a rendered template or a fake preview. Counts always come from local records. Fictional data is explicitly marked. The text-based VLR mark is a replaceable typographic placeholder, not a claimed official logo.

## Foundations

Semantic tokens in `src/app/styles.css`: background `#f8faf9`, surface white, foreground `#25332e`, primary `#285b4b`, hover `#1c483a`, muted text `#5f6e61`, border `#e2e8e4`, soft surface `#edf3ef`. Soft green backgrounds distinguish supportive information; red text/borders identify destructive controls and errors. Do not convey state with color alone.

Use the operating system sans-serif stack (`Segoe UI`, Apple system, BlinkMacSystemFont, sans-serif); no external font requests. Page titles use 24–32px with compact tracking; section titles 12–20px; body text 11–14px; small metadata uses 9–11px. Small labels are supplementary, never the only action identifier. Maintain visible text contrast of at least WCAG AA at its actual background. Keyboard focus uses a 3px green outline with 4px offset.

Spacing follows a 4px base, with 8/12/16/20/24/32px groups and occasional optical adjustments. Desktop content gutters are 44px, laptop 26–30px, mobile 16–20px. Borders are 1px; control radii 6px, cards 12px, dialogs 13px. Shadows are restrained and primarily separate dialogs/notifications from content.

## Reusable components

- `Button`: primary for creation/saving, outline for secondary actions, ghost for compact metadata actions, destructive for explicit removal. Disabled states reflect real prerequisites/pending writes.
- `Dialog`: Radix modal semantics, labelled title/description, focus trap, Escape dismissal, close button, and explicit return focus to the opener. Destructive confirmations explain the deletion scope.
- `Field`: visible label linked to a unique input ID, bounded values, inline error text. Forms use React Hook Form and repository validation remains authoritative.
- `Card`, `Badge`, `EmptyState`, `TextLink`, and `PageHeader`: consistent container, label, first-use, navigation, and page hierarchy patterns.
- Notifications: Zustand transient feedback, polite live region for save/delete success, alert semantics for errors, explicit dismissal. Candidate content stays out of diagnostic logs.

These source-owned controls follow the shadcn/ui component ownership pattern using Radix primitives, class variance authority, Tailwind utilities, and `cn`. `components.json` describes the Vite project for future shadcn additions. Shared layout styling belongs in the global token/style layer rather than isolated page stylesheets.

## Navigation and responsive behavior

Desktop: fixed 238px sidebar and shared workspace topbar. At 1150/900px the sidebar and gutters contract. At 680px navigation becomes a sticky, labelled horizontal row; no hover-only menu. Main content remains a single-column flow on mobile. Stat cards remain compact; resume cards auto-fit. Settings and dashboard panels stack. Dialogs stay within viewport bounds and scroll vertically. Long user-supplied titles and evidence wrap rather than widening the page.

Every route uses a semantic `main`, one h1, a descriptive browser title, and the same navigation. The active link uses `aria-current` through React Router. A skip link appears on keyboard focus. Navigation moves focus to main. Keep shell navigation available after recoverable page errors.

## Accessibility and verification

Respect reduced motion; disable transitions/animations under `prefers-reduced-motion`. Icons complement text; icon-only dismiss/close buttons have accessible labels. All interactive elements are native links/buttons/inputs. Automated axe checks cover all routes and form dialogs on desktop/mobile; browser tests check horizontal overflow, initial focus, Escape behavior, and return focus. Screenshots are inspected for alignment and hierarchy. Automated checks supplement rather than certify comprehensive assistive-technology testing; manual screen-reader and cross-browser coverage remain future QA work.

## Resume editor and preview

At wide desktop sizes the editor uses a compact navigation rail, section organizer, content/design controls, and a live document pane. At 1180px and below a Content / Design / Preview tab system keeps controls and preview usable; mobile section navigation has its own bounded scrolling area. Sorting uses dnd-kit pointer/keyboard sensors, stable IDs, explicit drag handles, and arrow alternatives.

The HTML preview is immediate and continuous. The optional PDF proof uses PDF.js to display each actual generated page, including on mobile. Exported PDF contains text, not screenshots. Noto Sans and Noto Serif are bundled locally with their SIL license; the interface retains its system font stack.

Save feedback distinguishes pending, saving, saved, and validation/storage errors. Destructive entry edits have session undo; resume updates retain revisions. Source drift remains visible until explicitly accepted. Imports use a wide, bounded dialog with field-level comparison, loss warnings, confirmation, and visible errors. Unknown/malformed input never becomes executable HTML or styles.
