# Typst rendering notices

- `typst-wasm` **1.0.0**: MIT, copyright 2026 will-lol. The pinned npm package is the browser compiler dependency. Its license is retained in [licenses/typst-wasm-MIT.txt](licenses/typst-wasm-MIT.txt).
- Typst engine: Apache-2.0. The upstream engine lockfile identifies Typst **0.15.0**; actual PDF creator metadata is also checked in browser tests. See [licenses/Typst-Apache-2.0.txt](licenses/Typst-Apache-2.0.txt) and [upstream source](https://github.com/typst-wasm/typst-wasm/tree/main/packages/typst-wasm/engine). The npm compiler is pinned; the repository's current lockfile alone is not an immutable build provenance guarantee.
- The compiler project's published [third-party notices](licenses/ENGINE_THIRD_PARTY_NOTICES.md) are retained verbatim except Markdown formatting. They describe its separate New Computer Modern font distribution. This application does not install `@typst-wasm/fonts` or fetch those font assets.
- The application supplies the existing **Noto Sans** and **Noto Serif** regular/bold fonts locally, under the [SIL Open Font License](../../public/fonts/LICENSE). No new font family is introduced.
- All eight VLR Typst layouts are authored in this repository. No Universe template, external template package, stock preview image or paid template is embedded. Gallery images are generated from fictional QA profiles and the actual local renderers.

The npm lockfile also retains the dependency license metadata for the JavaScript compiler runtime. No additional backend, remote compile service or remote font loader is used.
