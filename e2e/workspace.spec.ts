import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readWorkspace, saved } from './qa-support';

test('local workspace lifecycle, navigation, refresh and resume management', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'My Resumes', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Create New Resume', exact: true })
    .click();
  await page
    .getByLabel('Resume title', { exact: true })
    .fill('Graduate applications');
  await page.getByLabel('Full name', { exact: true }).fill('Mara Weiß');
  await saved(page);
  await page
    .getByRole('link', { name: 'Back to resumes', exact: true })
    .click();
  await page.reload();
  const card = page.locator('.document-card');
  await expect(card).toHaveCount(1);
  await expect(
    card.getByRole('heading', { name: 'Graduate applications' }),
  ).toBeVisible();
  await card.locator('.card-options > summary').click();
  await card.getByRole('button', { name: 'Edit details', exact: true }).click();
  await page
    .getByLabel('Resume title', { exact: true })
    .fill('Focused applications');
  await page.getByRole('button', { name: 'Save details', exact: true }).click();
  await expect(
    card.getByRole('heading', { name: 'Focused applications' }),
  ).toBeVisible();
  await card.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  expect((await readWorkspace(page)).variants).toHaveLength(1);
  await card.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete resume', exact: true })
    .click();
  expect((await readWorkspace(page)).variants).toHaveLength(0);
  expect((await readWorkspace(page)).profiles).toHaveLength(1);
});
test('dialog keyboard focus and validation', async ({ page }) => {
  await page.goto('/profile');
  await page
    .getByRole('button', { name: 'Create profile', exact: true })
    .first()
    .click();
  await expect(page.getByLabel('Profile name')).toBeFocused();
  await page.getByLabel('Profile name').fill('   ');
  await page.getByRole('button', { name: 'Create blank profile' }).click();
  await expect(page.getByLabel('Profile name')).toHaveAccessibleDescription(
    'Add a profile name.',
  );
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
test('tablet and very narrow workspace routes remain usable', async ({
  page,
}) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      '/',
      '/profile',
      '/resumes',
      '/settings',
      '/missing',
    ]) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
