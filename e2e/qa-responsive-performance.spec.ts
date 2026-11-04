import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  seed,
  openEditor,
  section,
  saved,
  readWorkspace,
  design,
} from './qa-support';

test('desktop, tablet, mobile, landscape and direct routes remain usable', async ({
  page,
}) => {
  const data = await seed(page);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await openEditor(page, data.variants[0]!.id);
    for (const tab of [
      'Content',
      'Design',
      ...(width <= 800 ? ['Preview'] : []),
    ]) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.goto('/settings');
  await page.goBack();
  await expect(page.getByLabel('Resume title', { exact: true })).toBeVisible();
});
test('pointer section sorting, keyboard bullet sorting, visibility and presets remain editable', async ({
  page,
}) => {
  const data = await seed(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEditor(page, data.variants[0]!.id);
  const handle = page.getByRole('button', {
    name: 'Drag Professional Summary',
    exact: true,
  });
  const target = page.getByRole('button', {
    name: 'Drag Education',
    exact: true,
  });
  const a = await handle.boundingBox(),
    b = await target.boundingBox();
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height + 15, {
    steps: 20,
  });
  await page.mouse.up();
  await saved(page);
  expect((await readWorkspace(page)).variants[0]!.sectionOrder).not.toEqual(
    data.variants[0]!.sectionOrder,
  );
  await section(page, 'Projects');
  const entry = page.locator('.entry-editor').first();
  const bullets = entry.getByLabel('Achievement bullet');
  const first = await bullets.first().inputValue();
  const bullet = entry.getByRole('button', {
    name: 'Move bullet 1 down',
    exact: true,
  });
  await bullet.focus();
  await page.keyboard.press('Enter');
  await saved(page);
  expect(await bullets.first().inputValue()).not.toBe(first);
  await page.locator('.personal-accordion .quiet-disclosure > summary').click();
  await page.getByLabel('Show email on resume').uncheck();
  await saved(page);
  expect(
    (await readWorkspace(page)).variants[0]!.hiddenIdentityFields,
  ).toContain('email');
  await section(page, 'Resume settings & presets');
  for (const kind of [
    'internship',
    'working-student',
    'graduate',
    'full-time',
    'research',
  ]) {
    await page.getByLabel('Employment category').selectOption(kind);
    await saved(page);
  }
  await page.getByLabel('Role preset').selectOption('Software Engineer');
  await page
    .getByRole('button', { name: 'Apply recommended order & template' })
    .click();
  await saved(page);
});
for (const [size, scale] of [
  ['small', 1],
  ['medium', 2],
  ['large', 4],
] as const)
  test(`measured ${size} preview, repeat export and resource cleanup`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    const data = await seed(page, 'professional', scale);
    await page.goto('/resumes');
    expect(
      (
        await page.evaluate(() =>
          performance.getEntriesByType('resource').map((r) => r.name),
        )
      ).some((url) => url.includes('engine.core')),
    ).toBe(false);
    const start = Date.now();
    await openEditor(page, data.variants[0]!.id);
    if (
      await page.getByRole('tab', { name: 'Preview', exact: true }).isVisible()
    )
      await page.getByRole('tab', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.pdf-proof > [role=status]')).toContainText(
      'exact PDF layout',
      { timeout: 60000 },
    );
    expect(await page.locator('.pdf-proof canvas').count()).toBeLessThanOrEqual(
      5,
    );
    const exports: Buffer[] = [];
    for (let i = 0; i < 2; i++) {
      const pending = page.waitForEvent('download');
      await page
        .getByRole('button', { name: 'Download PDF', exact: true })
        .click();
      exports.push(await readFile((await (await pending).path())!));
    }
    expect(exports[0]!.equals(exports[1]!)).toBe(true);
    await info.attach('preview-and-export', {
      body: JSON.stringify({
        size,
        elapsedMs: Date.now() - start,
        bytes: exports[0]!.length,
      }),
      contentType: 'application/json',
    });
    await design(page);
    await page.getByLabel('Accent color').fill('#336699');
    await saved(page);
    await page
      .getByRole('link', { name: 'Back to resumes', exact: true })
      .click();
    await expect(page.locator('.pdf-proof canvas')).toHaveCount(0);
    expect((await readWorkspace(page)).profiles).toEqual(data.profiles);
  });
