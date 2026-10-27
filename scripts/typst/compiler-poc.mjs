import console from 'node:console';
import { build, preview } from 'vite';
import { chromium, firefox, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import hosting from '../../vercel.json' with { type: 'json' };
const headers = Object.fromEntries(
  hosting.headers[0].headers.map((h) => [h.key, h.value]),
);
const config = {
  configFile: false,
  plugins: [
    {
      name: 'preview-security-on-revalidation',
      configurePreviewServer(server) {
        server.middlewares.use((_request, response, next) => {
          for (const [key, value] of Object.entries(headers))
            response.setHeader(key, value);
          next();
        });
      },
    },
  ],
  root: 'scripts/typst/poc',
  publicDir: '../../../public',
  build: {
    assetsInlineLimit: 0,
    outDir: '../../../qa-artifacts/poc-dist',
    emptyOutDir: true,
  },
  preview: { host: '127.0.0.1', port: 4176, strictPort: true, headers },
};
await build(config);
const server = await preview(config);
const results = [];
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage();
      await page.goto('http://127.0.0.1:4176');
      await page.waitForFunction(
        () =>
          globalThis.document.querySelector('#status').textContent !==
          'Loading',
        {},
        { timeout: 90000 },
      );
      console.log(name, await page.locator('#status').innerText());
      const data = await page.evaluate(() => globalThis.poc);
      if (!data) throw new Error(await page.locator('#status').innerText());
      await mkdir('qa-artifacts/typst-poc', { recursive: true });
      await writeFile(
        `qa-artifacts/typst-poc/${name}.pdf`,
        new Uint8Array(data.bytes),
      );
      results.push({
        name,
        version: browser.version(),
        startup: data.startup,
        total: data.total,
        bytes: data.bytes.length,
        repeated: data.repeated,
      });
    } finally {
      await browser.close();
    }
  }
  await writeFile(
    'qa-artifacts/typst-poc/results.json',
    JSON.stringify(results, null, 2),
  );
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve));
}
