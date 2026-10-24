import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  seed,
  readWorkspace,
  openEditor,
  section,
  saved,
  dismissNotice,
} from './qa-support';

test('QA-007: a stale revision restore cannot overwrite another tab’s unseen saved changes', async ({
  page,
  context,
}) => {
  const original = await seed(page);
  const id = original.variants[0]!.id;
  await openEditor(page, id);
  await section(page, 'Professional summary');
  await page
    .getByLabel('Professional summary for this resume')
    .fill('First tab version');
  await saved(page);
  const other = await context.newPage();
  await openEditor(other, id);
  await section(other, 'Professional summary');
  await other
    .getByLabel('Professional summary for this resume')
    .fill('Other tab — keep this change');
  await saved(other);
  await expect(
    page.getByText('A newer stored version is available.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Revisions', exact: true }).click();
  await page
    .locator('.revision-list')
    .getByRole('button', { name: 'Restore', exact: true })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'another tab',
  );
  expect((await readWorkspace(other)).variants[0]!.summarySnapshot).toBe(
    'Other tab — keep this change',
  );
});

test('QA-009: applying organization recommendations preserves the tailored target role', async ({
  page,
}) => {
  const data = await seed(page);
  await openEditor(page, data.variants[0]!.id);
  await section(page, 'Resume settings & presets');
  await page
    .getByLabel('Target role', { exact: true })
    .fill('My tailored job title');
  await saved(page);
  await page
    .getByRole('button', { name: 'Apply recommended order & template' })
    .click();
  await saved(page);
  await expect(page.getByLabel('Target role', { exact: true })).toHaveValue(
    'My tailored job title',
  );
});
test('QA-010: light accent colors retain readable document headings and links', async ({
  page,
}) => {
  const data = await seed(page);
  await openEditor(page, data.variants[0]!.id);
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: /Modern Professional/ }).click();
  await page.getByLabel('Accent color').fill('#ffffff');
  await saved(page);
  await dismissNotice(page);
  expect(
    await page
      .locator('.resume-paper h2')
      .evaluate((e) => getComputedStyle(e).color),
  ).not.toBe('rgb(255, 255, 255)');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});
test('QA-011: workspace tabs follow keyboard navigation and identify their panel', async ({
  page,
}) => {
  const data = await seed(page);
  await openEditor(page, data.variants[0]!.id);
  const content = page.getByRole('tab', { name: 'Content', exact: true });
  await content.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Design', exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('tabpanel', { name: 'Design', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Home');
  await expect(content).toBeFocused();
  await page.keyboard.press('End');
  await expect(
    page.getByRole('tab', {
      name: (await page
        .getByRole('tab', { name: 'Preview', exact: true })
        .isVisible())
        ? 'Preview'
        : 'Design',
      exact: true,
    }),
  ).toBeFocused();
});

test('QA-014: form validation associates its explanation with the invalid field', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Create profile', exact: true })
    .click();
  await page.getByLabel('Profile name').fill(' ');
  await page.getByRole('button', { name: 'Create blank profile' }).click();
  await expect(page.getByLabel('Profile name')).toHaveAccessibleDescription(
    'Add a profile name.',
  );
});
test('QA-015: large PDF proof uses a bounded canvas window and navigates all pages', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const data = await seed(page, 'researcher', 5);
  await openEditor(page, data.variants[0]!.id);
  if (await page.getByRole('tab', { name: 'Preview', exact: true }).isVisible())
    await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'PDF proof', exact: true }).click();
  await expect(page.locator('.pdf-proof > [role=status]')).toContainText(
    'exact PDF layout',
    { timeout: 60000 },
  );
  const memory = await page
    .locator('.pdf-proof canvas')
    .evaluateAll((canvases) => ({
      canvases: canvases.length,
      rgbaBytes: canvases.reduce(
        (n, c) =>
          n +
          (c as HTMLCanvasElement).width * (c as HTMLCanvasElement).height * 4,
        0,
      ),
    }));
  await info.attach('proof-canvas-budget', {
    body: JSON.stringify(memory),
    contentType: 'application/json',
  });
  expect(memory.canvases).toBeLessThanOrEqual(5);
  await page.getByRole('button', { name: 'Next PDF pages' }).click();
  await expect(page.getByRole('img', { name: /PDF page 6 of/ })).toBeVisible();
  const next = page.getByRole('button', { name: 'Next PDF pages' });
  while (true) {
    await expect(page.locator('.pdf-proof > [role=status]')).toContainText(
      'exact PDF layout',
    );
    if (await next.isDisabled()) break;
    await next.click();
  }
  const count = Number(
    (await page.locator('.pdf-proof > [role=status]').innerText()).split(
      ' ',
    )[0],
  );
  await expect(
    page.getByRole('img', {
      name: `PDF page ${count} of ${count}. Use Download PDF for selectable text.`,
      exact: true,
    }),
  ).toBeVisible();
  while (true) {
    await expect(page.locator('.pdf-proof > [role=status]')).toContainText(
      'exact PDF layout',
    );
    const previous = page.getByRole('button', { name: 'Previous PDF pages' });
    if (await previous.isDisabled()) break;
    await previous.click();
  }
  await expect(page.getByRole('img', { name: /PDF page 1 of/ })).toBeVisible();
});
