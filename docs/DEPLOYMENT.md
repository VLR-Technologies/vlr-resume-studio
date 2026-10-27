# Deployment preparation

The MVP has **not deployed**, created a Cloudflare resource, attached a domain, or configured credentials. Local development and verification require no Cloudflare account. The deployment below is a future operator procedure, not part of MVP execution.

## Static output

```sh
nvm use
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Vite produces `dist/index.html`, fingerprinted assets, and the copied `public/_headers`. No environment file or API credential is needed. Do not add secrets to `VITE_*`: those values become public browser code. Build/test artifacts are ignored by Git.

`wrangler.jsonc` uses Cloudflare's supported assets-only configuration:

```json
{
  "name": "vlr-resume-studio",
  "compatibility_date": "2026-10-24",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

There is no `main` Worker entry point, backend logic, database binding, authentication service, or paid integration. No production domain is hardcoded. The top-level `$schema` is editor metadata, not a runtime request by the application.

The SPA fallback serves the application shell for browser navigation to `/profile`, `/resumes`, `/resumes/:id`, `/settings`, and unknown paths. React Router then renders the correct page or not-found view. A missing asset should not be assumed to behave identically to a navigation; follow the current Cloudflare asset routing rules. Local Vite preview verifies direct route entry, but a deployed Cloudflare edge has not been tested.

## Future operator commands

At the time of deployment, review the current Wrangler release, account permissions, and Cloudflare free-tier limits. Install/pin the then-supported Wrangler version in development tooling, authenticate interactively, and run:

```sh
npx wrangler login
npx wrangler deploy --dry-run
npx wrangler deploy
```

These commands are intentionally **not** run during this implementation. Deployment requires an explicit future request. No credit card or recurring subscription is an application requirement; remain within the provider's applicable free limits and confirm its current account terms when publishing. The GitHub Actions workflow only verifies code and does not deploy.

After future deployment, check deep-link refreshes, actual `_headers` responses/CSP, storage access in supported browsers, zero candidate-data requests, mobile layout, and the no-cloud-sync notice. IndexedDB is scoped to the final origin: changing protocol/hostname/browser profile does not migrate existing local records. Do not imply that publishing the app uploads or backs up local records.

## Official references checked for Stage 0

- [Cloudflare SPA asset routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Cloudflare static asset configuration](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Vite guide and Node compatibility](https://vite.dev/guide/)
- [Node release status](https://nodejs.org/en/about/previous-releases)

Reviewed 24 October 2026. Recheck provider documentation before publishing. The Cloudflare skill was used to select the assets-only configuration; no Worker SDK or speculative cloud dependencies were added.

## MVP rendering assets and policy

Publish the complete `dist/` output, including `fonts/` and the PDF worker asset. The PDF engine and worker are loaded only when requested. The CSP permits same-origin scripts/workers and `wasm-unsafe-eval` for PDF layout; it does not permit general JavaScript eval. Browser tests exercise PDF download and proof under this exact policy. Recheck actual edge headers, font/worker MIME types, and direct editor deep links after deployment. No deployment was performed in this pass.

## Stage 2 static hosting

`vercel.json` prepares a Vite static build (`dist`) with SPA rewrites and CSP, COOP `same-origin`, and COEP `require-corp`, and CORP `same-origin`. Vite production preview reads these same headers and the full browser regression runs under them. The existing `_headers` policy includes the matching isolation headers. Typst's worker backend needs `crossOriginIsolated`, growable SharedArrayBuffer and local `application/wasm` resources; small WASM files must not be inlined as data URLs. Fonts, workers and templates are same-origin assets. No external images or embeds are required.

JSON Resume validation is generated at build time, so the policy needs only `wasm-unsafe-eval`, never JavaScript `unsafe-eval`. Effective-header tests include portability, storage, clipboard fallback, original PDF output and Typst output. A missing-isolation test verifies an actionable Typst error and functioning original export.

No Vercel/Cloudflare project or public deployment was created. Final hosted MIME types, CDN compression/cache behavior, edge headers and deep-link routing must be verified on the eventual deployed origin. Changing origin does not migrate IndexedDB; export a native backup first.

Vite preview applies policy headers in early middleware as well as `preview.headers`, because Vite’s conditional 304 path otherwise returns before the latter is applied. Repeated worker compilation and explicit 304-header checks cover this behavior, including WebKit.
