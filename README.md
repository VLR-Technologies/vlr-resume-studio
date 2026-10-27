# VLR Resume Studio

A professional, privacy-conscious resume workspace. **A product by VLR Technologies.**

One master career profile → independent tailored resumes → twelve professional designs → real PDFs and portable data. Everything runs locally in your browser.

## What works today

- Edit personal details, summary, education, work, internships, projects, skill groups, certifications, languages, publications, awards, volunteering, links, and custom sections. Add, remove, and reorder entries and individual bullets.
- Autosave with structured validation, conflict detection, visible save state, session undo, and guards for unsaved work.
- Create, duplicate, rename, and delete resumes. Select career entries, tailor wording/contact details independently, organize sections with drag-and-drop or arrows, and restore up to 20 saved revisions.
- A responsive gallery with the four original React PDF designs and eight new Typst designs. Bounded typography, A4/Letter paper, margins, spacing, accents, heading rules, and visibility.
- Immediate HTML preview for original designs, automatic exact Typst PDF proof, and downloadable PDFs with selectable text, embedded local fonts, European characters, and links.
- Full native JSON/YAML workspace backups, reviewed imports (new records, safe merge, or replace), and standard JSON Resume import/export with visible loss information.
- Six employment categories, eight role presets, and reusable external AI editing instructions. No AI account or API is connected.

## First resume

1. Create a blank profile from the overview, or explore the explicitly fictional sample.
2. Open **Career Profile** and complete whichever sections matter. Incomplete profiles are supported. Wait for **All changes saved** before refreshing.
3. Open **My Resumes**, create a resume from that profile, then **Open editor**. Select entries and tailor wording without changing your master evidence.
4. Choose **Design**, select a template, and adjust its controls. On small screens use **Content / Design / Preview** tabs.
5. Use **PDF proof** to inspect exact page breaks, then **Download PDF**.
6. Open **Settings → Import & export** for native backups, standard JSON Resume, or reviewed restoration. Keep an independent native backup.

## Requirements and local development

Use Node.js **22.23.1 LTS** (pinned in `.nvmrc`) and npm **10.9.8**. Node 24 LTS is also allowed by the package engine; the pinned Node 22 version is used for verification and CI. A modern browser with IndexedDB, `crypto.randomUUID`, and structured cloning is required. Use HTTPS when hosting; localhost works for development.

```sh
nvm use
npm ci
npm run dev
```

Open the localhost URL printed by Vite. No API keys, accounts, backend, paid service, or environment variables are required. Dependency installation requires internet access; candidate workflows make no external requests. The MVP has no service worker/offline installation: the page must first load from its host.

## Commands

| Command                | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Local Vite server                                             |
| `npm run build`        | Strict TypeScript check and production assets in `dist/`      |
| `npm run preview`      | Serve production assets locally                               |
| `npm run lint`         | ESLint, zero warnings                                         |
| `npm run typecheck`    | TypeScript strict checks                                      |
| `npm test`             | Domain, storage, interoperability, and UI integration tests   |
| `npm run test:e2e`     | Desktop/mobile Chromium workflows and axe checks; build first |
| `npm run format:check` | Prettier consistency                                          |
| `npm run format`       | Format repository sources                                     |

Before the first browser run:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

On Linux CI use `npx playwright install --with-deps chromium firefox webkit`. GitHub Actions runs the quality gates on PRs and feature/main pushes; it never deploys.

## Stack and architecture

React 19, TypeScript strict, Vite 8, React Router 8, Tailwind 4, shadcn/ui-style owned Button/Dialog components with Radix accessibility primitives, Lucide, React Hook Form, Zod 4, Zustand 5, Dexie 4, Vitest, React Testing Library, and Playwright. PDF generation uses React PDF for original designs and a lazy local `typst-wasm@1.0.0` worker for Typst designs; PDF.js renders the exact proof; dnd-kit supplies accessible sorting; YAML and the maintained JSON Resume schema validate portability. Exact direct versions and transitive resolutions are committed in `package-lock.json`. Components are maintained in this repository using the shadcn ownership model; `components.json` enables future additions.

`src/domain` owns validated records and factories. `src/services/storage` owns persistence. Feature modules render React pages and invoke repositories. Dexie is the authoritative record store; Zustand holds transient operation feedback only. Visual template configuration is independent of source career content. No template switch can overwrite a profile through the implemented APIs.

See [architecture](docs/ARCHITECTURE.md), [data model](docs/DATA_MODEL.md), [product scope](docs/PRODUCT_SCOPE.md), [design system](docs/DESIGN_SYSTEM.md), [deployment preparation](docs/DEPLOYMENT.md), and the [Stage 0 report](docs/STAGE_REPORTS/STAGE_0.md).

## Privacy and limitations

All candidate records stay in this origin's browser profile. There is no cloud backup, telemetry, authentication, AI request, or encryption guarantee. Browser eviction, clearing site data, losing a device, or private browsing can remove records. People with browser-profile access may read them. Use native backups regularly; the application cannot prevent browser storage eviction.

The live HTML preview is continuous and may wrap text slightly differently from PDF. PDF proof renders the actual exported layout. Native files are bounded to 5 MiB; YAML aliases, custom tags, duplicate keys, unsafe object keys, and unsupported record versions are rejected. Safe merge adds non-conflicting records and accepts identical duplicates; it never guesses how to merge conflicting fields. Replace downloads a recovery backup before an atomic transaction.

Undo is session-scoped; persistent revision history is for resumes, not master profiles. Invalid drafts survive SPA navigation in the same open tab and trigger an unload warning; they are not durable backups. Old Stage 0 resumes without identity snapshots explicitly indicate that contact details follow the source until pinned by source refresh. There is no universal ATS acceptance guarantee or official Europass compatibility. Chromium desktop/mobile emulation is verified; real-device, other-engine, and comprehensive screen-reader QA remain release work.

The PDF tools are lazy-loaded and the build reports a large optional PDF chunk. Fonts are bundled under the SIL Open Font License in `public/fonts/LICENSE`. Public hosting remains unperformed.

## Next stages

Optional evidence-grounded AI, optional synchronization with explicit consent, broader browser/device testing, and public deployment. Ordinary editing, preview, export, and recovery work without any of these integrations.

See the [MVP implementation report](docs/MVP_IMPLEMENTATION_REPORT.md) for actual verification, architecture decisions, and delivery references. The [Stage 0 report](docs/STAGE_REPORTS/STAGE_0.md) is a historical record.

Repository: [VLR-Technologies/vlr-resume-studio](https://github.com/VLR-Technologies/vlr-resume-studio). MVP work stays on `feat/resume-studio-mvp` and targets `main` through a pull request.

## Stage 2: Typst engine

See the [implementation and verification report](docs/typst/STAGE_2_IMPLEMENTATION_REPORT.md). Typst runs in a dedicated local WebAssembly worker, uses bundled Noto fonts, and sends no career content to a service. Typst proof and download reuse the same compiled bytes. Failed updates retain an explicitly labeled previous PDF and offer a retry.

The compiler worker requires HTTPS (or localhost), cross-origin isolation and current growable SharedArrayBuffer support. `npm run preview` applies the same CSP/COOP/COEP headers as `vercel.json`; `public/_headers` carries the matching static-host policy. Keep all built assets local. No deployment was performed.

Legacy templates and legacy-only backups keep contract version 1. Choosing a Typst design explicitly selects template contract 2 and template version 1; native backups containing any Typst current or historical selection use envelope version 2. Career records and the IndexedDB store remain version 1 without a destructive migration. Older applications safely reject v2 backups.
