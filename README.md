# VLR Resume Studio

A professional, privacy-conscious resume workspace. **A product by VLR Technologies.**

One master career profile → multiple independent resume variants → selectable designs → portable documents. Stage 0 establishes the data and application foundation; the full editor and document renderer come later.

## What works today

- Responsive overview, Career Profile, My Resumes, Settings, and not-found routes.
- Blank profiles with no required personal information, profile renaming, read-only evidence inspection, and protected deletion.
- Resume creation from a source profile, title/target-role updates, and explicit deletion.
- Fictional Alex Morgan sample creation and confirmed cleanup, including linked records.
- IndexedDB persistence, reactive queries, validation, atomic transactions, conflict detection, and up to 20 previous revisions per resume.
- Native backup validation/serialization contracts and a limited, tested profile-to-JSON-Resume projection. These are code APIs, not an import/export interface.

## Requirements and local development

Use Node.js **22.23.1 LTS** (pinned in `.nvmrc`) and npm **10.9.8**. Node 24 LTS is also allowed by the package engine; the pinned Node 22 version is used for verification and CI. A modern browser with IndexedDB, `crypto.randomUUID`, and structured cloning is required. Use HTTPS when hosting; localhost works for development.

```sh
nvm use
npm ci
npm run dev
```

Open the localhost URL printed by Vite. No API keys, accounts, backend, paid service, or environment variables are required. Dependency installation requires internet access; candidate workflows make no external requests. Stage 0 has no service worker/offline installation: the page must first load from its host.

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

On Linux CI use `npx playwright install --with-deps chromium`. GitHub Actions runs the quality gates on PRs and feature/main pushes; it never deploys.

## Stack and architecture

React 19, TypeScript strict, Vite 8, React Router 8, Tailwind 4, shadcn/ui-style owned Button/Dialog components with Radix accessibility primitives, Lucide, React Hook Form, Zod 4, Zustand 5, Dexie 4, Vitest, React Testing Library, and Playwright. Exact direct versions and transitive resolutions are committed in `package-lock.json`. Components are maintained in this repository using the shadcn ownership model; `components.json` enables future additions.

`src/domain` owns validated records and factories. `src/services/storage` owns persistence. Feature modules render React pages and invoke repositories. Dexie is the authoritative record store; Zustand holds transient operation feedback only. Visual template configuration is independent of source career content. No template switch can overwrite a profile through the implemented APIs.

See [architecture](docs/ARCHITECTURE.md), [data model](docs/DATA_MODEL.md), [product scope](docs/PRODUCT_SCOPE.md), [design system](docs/DESIGN_SYSTEM.md), [deployment preparation](docs/DEPLOYMENT.md), and the [Stage 0 report](docs/STAGE_REPORTS/STAGE_0.md).

## Privacy and limitations

All candidate records stay in this origin's browser profile. There is no cloud backup, telemetry, authentication, AI request, or encryption guarantee. Browser eviction, clearing site data, losing a device, or private browsing can remove records. People with browser-profile access may read them. Preserve important source material independently until backup download is implemented.

Career editing beyond the workspace label, a full resume editor, template rendering/selection, PDF output, import/export UI, YAML parsing, revision restoration UI, AI, and cloud sync are future stages. The maintained `@jsonresume/schema` validates the limited standard projection in contract tests; standard JSON Resume cannot reconstruct VLR template or provenance metadata. Production Cloudflare configuration is prepared but no deployment has been performed.

## Next stages

1. Extend validated profile editing and section management.
2. Build selection/override editing and explicit source-change review.
3. Add independent templates, preview, and PDF rendering.
4. Add backup and standard JSON/YAML diff-and-accept workflows.
5. Add optional evidence-grounded AI and optional synchronization behind explicit user control.

Repository: [VLR-Technologies/vlr-resume-studio](https://github.com/VLR-Technologies/vlr-resume-studio). Stage 0 work stays on `feat/stage-0-foundation`; it must not be merged automatically.
