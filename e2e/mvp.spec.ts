import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

async function saved(page: Page) {
  await expect(
    page.getByText('All changes saved', { exact: true }),
  ).toBeVisible();
}
async function rows(page: Page, store: 'profiles' | 'variants') {
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('vlr-resume-studio');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const r = db.transaction(name).objectStore(name).getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  }, store);
}
async function sampleEditor(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'My Resumes' })
    .click();
  await page.getByRole('link', { name: 'Open editor' }).click();
  await expect(
    page.getByRole('heading', { name: 'AI Engineer Internship', exact: true }),
  ).toBeVisible();
}
test('blank profile authoring, reload retention, and two isolated tailored resumes', async ({
  page,
}, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create profile' }).click();
  await page.getByLabel('Profile name').fill('My career');
  await page.getByRole('button', { name: 'Create blank profile' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Career Profile' })
    .click();
  await page.getByLabel('Full name').fill('Zoë Müller');
  await page.getByLabel('Professional headline').fill('Software Engineer');
  await page.getByLabel('Email', { exact: true }).fill('zoe@example.com');
  const sections = page.getByRole('navigation', {
    name: 'Sections in My career',
  });
  await sections.getByRole('button', { name: /^Education/ }).click();
  await page.getByRole('button', { name: 'Add education entry' }).click();
  await page.getByLabel('Title', { exact: true }).fill('MSc Computer Science');
  await page.getByLabel('Institution').fill('Example University');
  await page.getByLabel('Start date').fill('2024-10');
  await sections.getByRole('button', { name: /^Work experience/ }).click();
  await page.getByRole('button', { name: 'Add work experience entry' }).click();
  await page.getByLabel('Position', { exact: true }).fill('Software Engineer');
  await page.getByLabel('Organization').fill('My real employer');
  await page.getByRole('button', { name: 'Add bullet' }).click();
  await page
    .getByLabel('Achievement bullet')
    .fill('Built a documented workflow.');
  await sections.getByRole('button', { name: /^Projects/ }).click();
  await page.getByRole('button', { name: 'Add projects entry' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Accessible editor');
  await page
    .getByLabel('Technologies (comma separated)')
    .fill('React, TypeScript');
  await page
    .getByLabel('Website or project link')
    .fill('https://github.com/example/editor');
  await sections.getByRole('button', { name: /^Skills/ }).click();
  await page.getByRole('button', { name: 'Add skills entry' }).click();
  await page.getByLabel('Skill group').fill('Engineering');
  await page.getByLabel('Skills (comma separated)').fill('TypeScript, Testing');
  await saved(page);
  await page.reload();
  await page
    .getByRole('navigation', { name: 'Sections in My career' })
    .getByRole('button', { name: /^Projects/ })
    .click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Accessible editor',
  );
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'My Resumes' })
    .click();
  await page.getByRole('button', { name: 'Create resume' }).first().click();
  await page.getByLabel('Resume title').fill('Engineering application');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create resume' })
    .click();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(page.locator('.resume-card')).toHaveCount(2);
  const original = page.locator('.resume-card').filter({
    has: page.getByRole('heading', {
      name: 'Engineering application',
      exact: true,
    }),
  });
  await original.getByRole('link', { name: 'Open editor' }).click();
  await page
    .locator('.studio-sections')
    .getByRole('button', { name: 'Projects', exact: true })
    .click();
  await page
    .getByLabel('Title', { exact: true })
    .fill('Tailored accessible editor');
  await saved(page);
  expect((await rows(page, 'profiles'))[0]?.projects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: 'Accessible editor' }),
    ]),
  );
  const variants = await rows(page, 'variants');
  expect(
    variants.filter((v) => Array.isArray(v.overrides) && v.overrides.length),
  ).toHaveLength(1);
  await page.reload();
  await page
    .locator('.studio-sections')
    .getByRole('button', { name: 'Projects', exact: true })
    .click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Tailored accessible editor',
  );
  await page.screenshot({
    path: info.outputPath('mvp-content.png'),
    fullPage: true,
  });
});

test('four templates, presets, section ordering, revision restore, PDF download, and exact proof', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  const outbound: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (
      !r.url().startsWith('http://127.0.0.1:4173') &&
      !r.url().startsWith('blob:') &&
      !r.url().startsWith('data:')
    )
      outbound.push(r.url());
  });
  // Exercise the same CSP used by the static hosting configuration, including WASM PDF layout.
  const headers = await readFile('public/_headers', 'utf8');
  const csp = headers
    .split('\n')
    .find((l) => l.includes('Content-Security-Policy:'))!
    .split('Content-Security-Policy:')[1]!
    .trim();
  await page.route('**/*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': csp },
    });
  });
  await sampleEditor(page);
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  for (const name of [
    'ATS Essential',
    'European Professional',
    'Modern Professional',
    'Academic / Research',
  ]) {
    await page
      .getByRole('button', { name, exact: false })
      .filter({ has: page.locator('strong') })
      .click();
    await saved(page);
  }
  await page.getByLabel('Body font size (pt)').fill('11');
  await page.getByLabel('Accent color').fill('#225566');
  await saved(page);
  await page.screenshot({
    path: info.outputPath('mvp-design.png'),
    fullPage: true,
  });
  await page.getByRole('tab', { name: 'Content', exact: true }).click();
  await page
    .locator('.studio-sections')
    .getByRole('button', { name: 'Resume settings & presets' })
    .click();
  await page.getByLabel('Employment category').selectOption('working-student');
  await page.getByLabel('Role preset').selectOption('Software Engineer');
  await page
    .getByRole('button', { name: 'Apply recommended order & template' })
    .click();
  await saved(page);
  let variant = (await rows(page, 'variants'))[0]!;
  expect((variant.sectionOrder as string[])[1]).toBe('education');
  expect((variant.template as Record<string, unknown>).templateId).toBe(
    'classic',
  );
  await page
    .locator('.studio-sections')
    .getByRole('button', { name: 'Move Education down', exact: true })
    .click();
  await saved(page);
  variant = (await rows(page, 'variants'))[0]!;
  expect((variant.sectionOrder as string[])[1]).not.toBe('education');
  const handle = page
    .locator('.studio-sections')
    .getByRole('button', { name: 'Drag Education', exact: true });
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByText(
      /Draggable item education was moved over droppable area projects\./,
    ),
  ).toBeAttached();
  await page.keyboard.press('Space');
  await saved(page);
  variant = (await rows(page, 'variants'))[0]!;
  expect((variant.sectionOrder as string[]).indexOf('education')).toBe(3);
  await page
    .getByLabel('Resume title', { exact: true })
    .fill('A title to restore');
  await saved(page);
  await page.getByRole('button', { name: 'Revisions' }).click();
  await page
    .locator('.revision-list')
    .getByRole('button', { name: 'Restore', exact: true })
    .first()
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('h1')).toHaveText('AI Engineer Internship');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const path = await download.path();
  expect((await readFile(path!)).subarray(0, 5).toString()).toBe('%PDF-');
  if (info.project.name === 'mobile')
    await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'PDF proof', exact: true }).click();
  await expect(page.getByRole('img', { name: /PDF page 1 of/ })).toBeVisible({
    timeout: 30000,
  });
  await page.screenshot({
    path: info.outputPath('mvp-pdf-proof.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(outbound).toEqual([]);
});

test('JSON and YAML reviewed round trips, invalid import rejection, and AI instructions', async ({
  page,
  context,
}, info) => {
  await sampleEditor(page);
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  await page.getByLabel('Accent color').fill('#336699');
  await saved(page);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Settings' })
    .click();
  const downloads: { name: string; data: Buffer }[] = [];
  for (const format of ['JSON', 'YAML']) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: `Export VLR ${format}` }).click();
    const download = await pending;
    downloads.push({
      name: download.suggestedFilename(),
      data: await readFile((await download.path())!),
    });
  }
  for (const file of downloads) {
    const clean = await context
      .browser()!
      .newContext({ viewport: info.project.use.viewport });
    const other = await clean.newPage();
    await other.goto('http://127.0.0.1:4173/settings');
    await other.getByLabel('Import JSON or YAML').setInputFiles({
      name: file.name,
      mimeType: 'application/octet-stream',
      buffer: file.data,
    });
    await expect(other.getByRole('dialog')).toBeVisible();
    expect(await rows(other, 'profiles')).toHaveLength(0);
    await other
      .getByLabel('I reviewed the incoming data and import behavior.')
      .check();
    await other.getByRole('button', { name: 'Confirm import' }).click();
    await expect(
      other.getByText('Import complete.', { exact: false }),
    ).toBeVisible();
    expect((await rows(other, 'variants'))[0]?.template).toMatchObject({
      accentColor: '#336699',
    });
    await other.reload();
    expect(await rows(other, 'profiles')).toHaveLength(1);
    await clean.close();
  }
  const before = await rows(page, 'profiles');
  await page.getByLabel('Import JSON or YAML').setInputFiles({
    name: 'malicious.yaml',
    mimeType: 'application/yaml',
    buffer: Buffer.from('payload: !!js/function function(){}'),
  });
  await expect(page.getByRole('alert')).toContainText('YAML');
  expect(await rows(page, 'profiles')).toEqual(before);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page
    .getByRole('button', { name: 'Copy AI Editing Instructions' })
    .click();
  await expect(
    page.getByText(
      /AI editing instructions copied|Clipboard access is unavailable/,
    ),
  ).toBeVisible();
});

test('editor accessibility, invalid autosave protection, undo, and mobile overflow', async ({
  page,
}, info) => {
  await sampleEditor(page);
  await page.getByLabel('Email', { exact: true }).fill('not-an-email');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Nothing was saved' }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'My Resumes' })
    .click();
  await expect(page.locator('h1')).toHaveText('AI Engineer Internship');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
    'alex@example.com',
  );
  await saved(page);
  for (const tab of [
    'Content',
    'Design',
    ...(info.project.name === 'mobile' ? ['Preview'] : []),
  ]) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  if (info.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 850 });
    for (const tab of ['Content', 'Design', 'Preview']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
