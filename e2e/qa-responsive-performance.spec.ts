import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import {
  seed,
  readWorkspace,
  openEditor,
  section,
  saved,
  dismissNotice,
} from './qa-support';

const widths = [1920, 1440, 1280, 1024, 820, 768, 430, 390, 375, 320];
test('all requested viewports, landscape, direct routes, and history remain usable', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const data = await seed(page);
  await openEditor(page, data.variants[0]!.id);
  await dismissNotice(page);
  const checks: {
    width: number;
    height: number;
    tab: string;
    overflow: boolean;
  }[] = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of ['Content', 'Design', 'Preview']) {
      const control = page.getByRole('tab', { name: tab, exact: true });
      if (!(await control.isVisible())) continue;
      await control.click();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      checks.push({ width, height: 1000, tab, overflow });
      expect(overflow, `${width}px ${tab}`).toBe(false);
      if (tab === 'Design') {
        await page.getByLabel('Name font size (pt)').fill('30');
        await page.getByLabel('Left margin (mm)').fill('40');
        await saved(page);
      }
    }
    if ([1920, 1280, 820, 320].includes(width))
      await page.screenshot({
        path: info.outputPath(`responsive-${width}.png`),
        fullPage: false,
      });
  }
  for (const [width, height] of [
    [844, 390],
    [932, 430],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.getByRole('tab', { name: 'Content', exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.getByRole('button', { name: 'Revisions', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Revisions', exact: true }),
    ).toBeFocused();
  }
  // 640 CSS pixels at 2x density gives the reflow budget of a 1280px display at 200%.
  await page.setViewportSize({ width: 640, height: 900 });
  await page.getByRole('tab', { name: 'Content', exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Settings', exact: true })
    .click();
  await page.goBack();
  await expect(page.locator('.studio h1')).toHaveText(data.variants[0]!.title);
  await page.goForward();
  await expect(page.locator('h1')).toHaveText('Settings');
  for (const route of [
    '/profile',
    '/resumes',
    '/settings',
    `/resumes/${data.variants[0]!.id}`,
    '/missing-qa-route',
  ]) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
  }
  await info.attach('viewport-checks', {
    body: JSON.stringify(checks),
    contentType: 'application/json',
  });
});

test('pointer entry sorting, keyboard bullet sorting, visibility, and all category/role controls', async ({
  page,
}) => {
  test.setTimeout(120000);
  const data = await seed(page);
  const v = data.variants[0]!;
  await openEditor(page, v.id);
  await section(page, 'Projects');
  const before = (await readWorkspace(page)).variants[0]!.selections.filter(
    (s) => s.section === 'projects',
  );
  const first = page.getByRole('button', {
    name: `Drag ${before[0]!.snapshot.title}`,
    exact: true,
  });
  const last = page.getByRole('button', {
    name: `Drag ${before[2]!.snapshot.title}`,
    exact: true,
  });
  await first.scrollIntoViewIfNeeded();
  const start = await first.boundingBox();
  expect(start).toBeTruthy();
  await page.mouse.move(
    start!.x + start!.width / 2,
    start!.y + start!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    start!.x + start!.width / 2,
    start!.y + start!.height / 2 + 12,
    { steps: 3 },
  );
  const height = page.viewportSize()!.height;
  // Scroll with the pointer away from the auto-scroll edge, then target the visible card.
  await page.mouse.move(start!.x + start!.width / 2, height / 2, { steps: 5 });
  for (let attempt = 0; attempt < 100; attempt++) {
    const box = (await last.boundingBox())!;
    if (box.y >= 50 && box.y + box.height < height - 50) break;
    await page.mouse.wheel(0, box.y < 50 ? -200 : 200);
    await expect
      .poll(async () => (await last.boundingBox())!.y)
      .not.toBe(box.y);
  }
  const destination = page.getByText(
    `Draggable item ${before[0]!.id} was moved over droppable area ${before[2]!.id}.`,
    { exact: true },
  );
  for (
    let attempt = 0;
    attempt < 8 && !(await destination.count());
    attempt++
  ) {
    const end = (await last.boundingBox())!;
    expect(end.y).toBeGreaterThanOrEqual(0);
    expect(end.y + end.height).toBeLessThan(height);
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
      steps: 5,
    });
  }
  await expect(destination).toBeAttached();
  await page.mouse.up();
  await saved(page);
  await expect
    .poll(async () =>
      (await readWorkspace(page)).variants[0]!.selections.filter(
        (s) => s.section === 'projects',
      ).map((s) => s.sourceEntryId),
    )
    .toEqual([
      before[1]!.sourceEntryId,
      before[2]!.sourceEntryId,
      before[0]!.sourceEntryId,
    ]);
  const entry = page.locator('.entry-editor').first();
  const bulletIds = before[1]!.snapshot.bullets.map((b) => b.id);
  const bullet = entry.getByRole('button', {
    name: 'Drag bullet 1',
    exact: true,
  });
  await bullet.focus();
  await page.keyboard.press('Space');
  await expect(bullet).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByText(
      `Draggable item ${bulletIds[0]} was moved over droppable area ${bulletIds[1]}.`,
      { exact: true },
    ),
  ).toBeAttached();
  await page.keyboard.press('Space');
  await saved(page);
  const sorted = (await readWorkspace(page)).variants[0]!.overrides.find(
    (o) => o.selectionId === before[1]!.id,
  )!;
  expect(sorted.content!.bullets.map((b) => b.id)).toEqual(
    [...bulletIds].reverse(),
  );
  const selected = page.locator('.entry-selection input').first();
  await selected.uncheck();
  await saved(page);
  await selected.check();
  await saved(page);
  await page
    .getByRole('checkbox', { name: 'Show Projects', exact: true })
    .uncheck();
  await saved(page);
  await page
    .getByRole('checkbox', { name: 'Show Projects', exact: true })
    .check();
  await saved(page);
  await section(page, 'Personal details');
  await page
    .getByRole('checkbox', { name: 'Show email on resume', exact: true })
    .uncheck();
  await saved(page);
  expect(
    (await readWorkspace(page)).variants[0]!.hiddenIdentityFields,
  ).toContain('email');
  await page
    .getByRole('checkbox', { name: 'Show email on resume', exact: true })
    .check();
  await saved(page);
  await section(page, 'Resume settings & presets');
  await page.getByLabel('Target role', { exact: true }).fill('My chosen role');
  for (const category of [
    'internship',
    'working-student',
    'graduate',
    'full-time',
    'research',
    'custom',
  ]) {
    await page.getByLabel('Employment category').selectOption(category);
    if (category === 'custom')
      await page
        .getByLabel('Custom category', { exact: true })
        .fill('Consulting');
    await page
      .getByRole('button', { name: 'Apply recommended order & template' })
      .click();
    await saved(page);
  }
  for (const role of await page
    .getByLabel('Role preset', { exact: true })
    .locator('option')
    .evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value),
    )) {
    await page.getByLabel('Role preset', { exact: true }).selectOption(role);
    await page
      .getByRole('button', { name: 'Apply recommended order & template' })
      .click();
    await saved(page);
    await expect(page.getByLabel('Target role', { exact: true })).toHaveValue(
      'My chosen role',
    );
  }
  const a11y = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(a11y.violations).toEqual([]);
});

for (const [size, scale] of [
  ['small', 1],
  ['medium', 3],
  ['large', 10],
] as const)
  test(`measured ${size} performance, lazy assets, repeat exports and resource cleanup`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    const requests: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const urls = new Set<string>();
      (window as unknown as { __qaUrls: Set<string> }).__qaUrls = urls;
      const create = URL.createObjectURL.bind(URL),
        revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        const url = create(blob);
        urls.add(url);
        return url;
      };
      URL.revokeObjectURL = (url) => {
        urls.delete(url);
        revoke(url);
      };
    });
    const start = Date.now();
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const initialMs = Date.now() - start;
    const initialRequests = [...requests];
    expect(
      initialRequests.some((url) => /\/pdf(?:-proof)?-|pdf\.worker/.test(url)),
    ).toBe(false);
    const importStart = Date.now();
    const data = await seed(page, 'professional', scale);
    const importMs = Date.now() - importStart;
    const editorStart = Date.now();
    await openEditor(page, data.variants[0]!.id);
    const editorMs = Date.now() - editorStart;
    await page.getByRole('tab', { name: 'Design', exact: true }).click();
    const templateStart = Date.now();
    await page.getByRole('button', { name: /Modern Professional/ }).click();
    await saved(page);
    const templateMs = Date.now() - templateStart;
    const exportTimes: number[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < 3; i++) {
      const exportStart = Date.now();
      const pending = page.waitForEvent('download');
      await page
        .getByRole('button', { name: 'Download PDF', exact: true })
        .click();
      const download = await pending;
      const bytes = await readFile((await download.path())!);
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      sizes.push(bytes.length);
      exportTimes.push(Date.now() - exportStart);
    }
    if (
      await page.getByRole('tab', { name: 'Preview', exact: true }).isVisible()
    )
      await page.getByRole('tab', { name: 'Preview', exact: true }).click();
    const proofStart = Date.now();
    await page.getByRole('button', { name: 'PDF proof', exact: true }).click();
    await expect(page.locator('.pdf-proof > [role=status]')).toContainText(
      'exact PDF layout',
      { timeout: 60000 },
    );
    const proofMs = Date.now() - proofStart;
    const canvases = await page
      .locator('.pdf-proof canvas')
      .evaluateAll((nodes) => ({
        count: nodes.length,
        rgbaBytes: nodes.reduce(
          (sum, node) =>
            sum +
            (node as HTMLCanvasElement).width *
              (node as HTMLCanvasElement).height *
              4,
          0,
        ),
      }));
    expect(canvases.count).toBeLessThanOrEqual(5);
    await page.getByRole('button', { name: 'Live view', exact: true }).click();
    await expect(page.locator('.pdf-proof canvas')).toHaveCount(0);
    await expect.poll(() => page.workers().length).toBe(0);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __qaUrls: Set<string> }).__qaUrls.size,
        ),
      )
      .toBe(0);
    const snapshot = await readWorkspace(page);
    for (let i = 0; i < 3; i++) {
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: 'My Resumes', exact: true })
        .click();
      await page
        .getByRole('link', { name: 'Open editor', exact: true })
        .click();
      await expect(page.locator('.studio h1')).toBeVisible();
    }
    expect(await readWorkspace(page)).toEqual(snapshot);
    expect(errors).toEqual([]);
    expect(
      requests.filter(
        (url) =>
          !url.startsWith('http://127.0.0.1:4173') &&
          !url.startsWith('data:') &&
          !url.startsWith('blob:'),
      ),
    ).toEqual([]);
    await info.attach('performance-observation', {
      body: JSON.stringify({
        size,
        scale,
        browser: info.project.name,
        browserVersion: page.context().browser()!.version(),
        initialMs,
        importMs,
        editorMs,
        templateMs,
        exportTimes,
        pdfBytes: sizes,
        proofMs,
        canvases,
        initialJsRequests: initialRequests.filter((url) => url.endsWith('.js'))
          .length,
      }),
      contentType: 'application/json',
    });
  });
