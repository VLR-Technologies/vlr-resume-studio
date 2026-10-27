import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { seed, openEditor, saved, readWorkspace } from './qa-support';
import { templateRegistry } from '../src/domain/templates';
const typst = templateRegistry.filter((t) => t.engine === 'typst');
async function proof(page: Page) {
  await expect(page.locator('.pdf-proof [role="status"]')).toContainText(
    'exact PDF layout',
    { timeout: 60000 },
  );
}
async function download(page: Page, label = 'Download PDF') {
  const waiting = page.waitForEvent('download', { timeout: 30000 });
  await page.getByRole('button', { name: label, exact: true }).click();
  const file = await waiting;
  const path = await file.path();
  expect(path).toBeTruthy();
  return readFile(path!);
}
test('Typst gallery: all eight actual proofs and exports preserve evidence under effective headers', async ({
  page,
}, info) => {
  test.setTimeout(240000);
  let compilerWorkerUrl = '';
  const network: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/assets/web-worker-')) compilerWorkerUrl = r.url();
    if (new URL(r.url()).origin !== 'http://127.0.0.1:4173')
      network.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations =
      violations;
    window.addEventListener('securitypolicyviolation', (e) =>
      violations.push(e.violatedDirective),
    );
  });
  const initial = await page.goto('/');
  expect(initial!.headers()['cross-origin-opener-policy']).toBe('same-origin');
  expect(initial!.headers()['cross-origin-embedder-policy']).toBe(
    'require-corp',
  );
  expect(initial!.headers()['content-security-policy']).toContain(
    "'wasm-unsafe-eval'",
  );
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  expect(
    (
      await page.evaluate(() =>
        performance.getEntriesByType('resource').map((r) => r.name),
      )
    ).some((url) => url.includes('engine.core')),
  ).toBe(false);
  const original = await seed(page, 'professional');
  const variant = original.variants[0]!;
  await openEditor(page, variant.id);
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  const timings: unknown[] = [];
  for (const definition of typst) {
    const start = Date.now();
    await page
      .getByRole('button', { name: definition.name, exact: false })
      .filter({ has: page.locator('strong') })
      .click();
    await proof(page);
    await saved(page);
    await expect
      .poll(() =>
        page
          .getByRole('button', { name: definition.name, exact: false })
          .filter({ has: page.locator('strong') })
          .locator('img')
          .evaluate((img) => (img as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    const proofMs = Date.now() - start;
    // Numeric customization must alter the same current model used by proof/export.
    await page.getByLabel('Body font size (pt)').fill('10.5');
    await saved(page);
    await proof(page);
    const exportStart = Date.now();
    const bytes = await download(page);
    const exportMs = Date.now() - exportStart;
    const task = getDocument({ data: new Uint8Array(bytes) });
    const pdf = await task.promise;
    try {
      expect(
        ((await pdf.getMetadata()).info as { Creator?: string }).Creator,
      ).toContain('Typst');
      await expect(page.locator('.pdf-proof [role="status"]')).toHaveText(
        `${pdf.numPages} pages · exact PDF layout`,
      );
      const text = (await (await pdf.getPage(1)).getTextContent()).items
        .map((i) => ('str' in i ? i.str : ''))
        .join(' ');
      expect(text).toContain('Jonas García');
    } finally {
      await task.destroy();
    }
    const again = await download(page);
    expect(again.equals(bytes)).toBe(true);
    const stored = await readWorkspace(page);
    expect(stored.profiles).toEqual(original.profiles);
    expect(stored.variants[0]!.selections).toEqual(variant.selections);
    expect(stored.variants[0]!.overrides).toEqual(variant.overrides);
    expect(stored.variants[0]!.sectionOrder).toEqual(variant.sectionOrder);
    expect(stored.variants[0]!.template.templateId).toBe(definition.id);
    expect(stored.variants[0]!.template.bodyFontSize).toBe(10.5);
    timings.push({
      template: definition.id,
      proofMs,
      exportMs,
      bytes: bytes.length,
    });
  }
  const workerResponse = await page.request.get(compilerWorkerUrl);
  expect(workerResponse.status()).toBe(200);
  const revalidated = await page.request.get(compilerWorkerUrl, {
    headers: { 'if-none-match': workerResponse.headers().etag! },
  });
  expect(revalidated.status()).toBe(304);
  expect(revalidated.headers()['cross-origin-embedder-policy']).toBe(
    'require-corp',
  );
  expect(revalidated.headers()['cross-origin-opener-policy']).toBe(
    'same-origin',
  );
  await page
    .getByRole('group', { name: 'Template categories' })
    .getByRole('button', { name: 'European', exact: true })
    .click();
  await expect(page.locator('.template-picker > button')).toHaveCount(3);
  await page
    .getByRole('group', { name: 'Template categories' })
    .getByRole('button', { name: 'All', exact: true })
    .click();
  await page.getByRole('button', { name: /ATS Essential/ }).click();
  await saved(page);
  expect((await readWorkspace(page)).profiles).toEqual(original.profiles);
  expect((await readWorkspace(page)).variants[0]!.template.schemaVersion).toBe(
    1,
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { cspViolations: string[] }).cspViolations,
    ),
  ).toEqual([]);
  await page.reload();
  await expect(page.locator('.studio h1')).toBeVisible();
  const previewTab = page.getByRole('tab', { name: 'Preview', exact: true });
  if (await previewTab.isVisible()) await previewTab.click();
  await expect(page.locator('.resume-paper')).toBeVisible();
  expect(network).toEqual([]);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => (window as unknown as { cspViolations: string[] }).cspViolations,
    ),
  ).toEqual([]);
  await info.attach('typst-performance', {
    body: JSON.stringify(timings, null, 2),
    contentType: 'application/json',
  });
});
test('failed Typst compilation retains a labeled last valid PDF, and switching recovers', async ({
  page,
}) => {
  test.setTimeout(120000);
  const initial = await seed(page);
  await openEditor(page, initial.variants[0]!.id);
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: /ATS Minimal/ }).click();
  await proof(page);
  const valid = await download(page);
  await page.route('**/engine.core-*.wasm', (route) => route.abort());
  await page.getByLabel('Body font size (pt)').fill('11');
  await saved(page);
  await expect(page.locator('.pdf-proof [role="status"]')).toContainText(
    'Preview failed:',
    { timeout: 60000 },
  );
  await expect(
    page.getByText(
      'Your last valid PDF uses earlier content or design settings.',
      { exact: false },
    ),
  ).toBeVisible();
  expect(
    (await download(page, 'Download last valid PDF (earlier version)')).equals(
      valid,
    ),
  ).toBe(true);
  expect((await readWorkspace(page)).profiles).toEqual(initial.profiles);
  await page.unroute('**/engine.core-*.wasm');
  const preview = page.getByRole('tab', { name: 'Preview', exact: true });
  if (await preview.isVisible()) await preview.click();
  await page
    .getByRole('button', { name: 'Retry PDF proof', exact: true })
    .click();
  await proof(page);
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: /ATS Structured/ }).click();
  await page.getByRole('button', { name: /German Professional/ }).click();
  await page.getByRole('button', { name: /Modern Executive/ }).click();
  await saved(page);
  await proof(page);
  expect((await readWorkspace(page)).variants[0]!.template.templateId).toBe(
    'typst-modern-executive',
  );
  await expect(
    page.getByRole('button', {
      name: 'Download last valid PDF (earlier version)',
    }),
  ).toBeHidden();
});
test('Typst workers and proof canvases clean up across repeated navigation; gallery reflows', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    const Original = window.Worker;
    const counts = { created: 0, terminated: 0 };
    (window as unknown as { workerCounts: typeof counts }).workerCounts =
      counts;
    window.Worker = class extends Original {
      private stopped = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        counts.created++;
      }
      terminate() {
        if (!this.stopped) {
          this.stopped = true;
          counts.terminated++;
        }
        super.terminate();
      }
    };
  });
  const data = await seed(page);
  await openEditor(page, data.variants[0]!.id);
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: /Technical Engineer/ }).click();
  await proof(page);
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(
      page.getByRole('heading', { name: 'Find your format' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await proof(page);
  expect(await page.locator('.pdf-proof canvas').count()).toBeLessThanOrEqual(
    5,
  );
  await page.locator('.studio .back-link').click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = (
          window as unknown as {
            workerCounts: { created: number; terminated: number };
          }
        ).workerCounts;
        return c.created - c.terminated;
      }),
    )
    .toBe(0);
  await openEditor(page, data.variants[0]!.id);
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await proof(page);
  await download(page);
  await page.locator('.studio .back-link').click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = (
          window as unknown as {
            workerCounts: { created: number; terminated: number };
          }
        ).workerCounts;
        return c.created - c.terminated;
      }),
    )
    .toBe(0);
});
test('missing isolation reports an actionable compiler error while legacy export remains usable', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const headers = response.headers();
    delete headers['cross-origin-opener-policy'];
    delete headers['cross-origin-embedder-policy'];
    await route.fulfill({ response, headers });
  });
  const data = await seed(page);
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(false);
  await openEditor(page, data.variants[0]!.id);
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: /ATS Minimal/ }).click();
  await expect(page.locator('.pdf-proof [role="status"]')).toContainText(
    'cross-origin isolation',
    { timeout: 60000 },
  );
  await page.getByRole('button', { name: /ATS Essential/ }).click();
  await saved(page);
  const bytes = await download(page);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect((await readWorkspace(page)).profiles).toEqual(data.profiles);
});
