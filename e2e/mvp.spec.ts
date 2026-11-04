import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import {
  seed,
  section,
  saved,
  readWorkspace,
  openEditor,
  templates,
  design,
  slider,
  options,
} from './qa-support';
async function rows<S extends 'profiles' | 'variants'>(page: Page, store: S) {
  return (await readWorkspace(page))[store];
}
async function sampleEditor(page: Page) {
  const data = await seed(page);
  await openEditor(page, data.variants[0]!.id);
}

test('career evidence, reload retention and isolated tailored resumes', async ({
  page,
}) => {
  const data = await seed(page);
  const original = data.variants[0]!;
  await page.goto('/resumes');
  await page.locator('.card-options > summary').click();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(page.locator('.document-card')).toHaveCount(2);
  await openEditor(page, original.id);
  await section(page, 'Projects');
  await page
    .locator('.entry-editor')
    .first()
    .getByLabel('Title', { exact: true })
    .fill('Tailored accessible editor');
  await saved(page);
  expect((await readWorkspace(page)).profiles).toEqual(data.profiles);
  expect(
    (await readWorkspace(page)).variants.filter((v) => v.overrides.length),
  ).toHaveLength(1);
  await page.reload();
  await section(page, 'Projects');
  await expect(
    page.locator('.entry-editor').first().getByLabel('Title', { exact: true }),
  ).toHaveValue('Tailored accessible editor');
});
test('four legacy templates, presets, ordering, revision restore and PDF export', async ({
  page,
}) => {
  const data = await seed(page);
  await openEditor(page, data.variants[0]!.id);
  for (const name of [
    'ATS Essential',
    'European Professional',
    'Modern Professional',
    'Academic / Research',
  ]) {
    await templates(page);
    await page
      .locator('.template-picker > button')
      .filter({ hasText: name })
      .click();
    await saved(page);
  }
  await design(page);
  await slider(page, 'Body font size (pt)', 11);
  await page.getByLabel('Accent color', { exact: true }).fill('#225566');
  await saved(page);
  await section(page, 'Resume settings & presets');
  await page.getByLabel('Employment category').selectOption('working-student');
  await page.getByLabel('Role preset').selectOption('Software Engineer');
  await page
    .getByRole('button', { name: 'Apply recommended order & template' })
    .click();
  await saved(page);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  const before = (await readWorkspace(page)).variants[0]!.sectionOrder;
  await page
    .getByRole('button', { name: 'Move Education down', exact: true })
    .click();
  await saved(page);
  expect((await readWorkspace(page)).variants[0]!.sectionOrder).not.toEqual(
    before,
  );
  const title = await page
    .getByLabel('Resume title', { exact: true })
    .inputValue();
  await page
    .getByLabel('Resume title', { exact: true })
    .fill('A title to restore');
  await saved(page);
  await options(page, 'Revisions');
  await page
    .locator('.revision-list')
    .getByRole('button', { name: 'Restore', exact: true })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByLabel('Resume title', { exact: true })).toHaveValue(
    title,
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  expect(
    (await readFile((await (await download).path())!))
      .subarray(0, 5)
      .toString(),
  ).toBe('%PDF-');
});
test('JSON and YAML reviewed round trips, invalid import rejection, and AI instructions', async ({
  page,
  context,
}, info) => {
  await sampleEditor(page);
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  await page.getByLabel('Accent color').fill('#336699');
  await saved(page);
  await page.locator('.editor-options > summary').click();
  await page
    .locator('.editor-options')
    .getByRole('link', { name: 'Advanced Settings', exact: true })
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
  await expect(page.locator('.save-error-banner')).toBeVisible();
  await page
    .getByRole('link', { name: 'Back to resumes', exact: true })
    .click();
  await expect(page.getByLabel('Resume title', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
    'student@example.com',
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
