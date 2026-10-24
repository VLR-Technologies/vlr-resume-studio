import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('local workspace lifecycle, navigation, refresh, and accessibility', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const outbound: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (req) => {
    if (
      !req.url().startsWith('http://127.0.0.1:4173') &&
      !req.url().startsWith('data:')
    )
      outbound.push(req.url());
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Your next chapter starts here.' }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('overview-empty.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Create profile' }).click();
  await page.getByLabel('Profile name').fill('My private profile');
  await page.getByRole('button', { name: 'Create blank profile' }).click();
  await expect(page.getByText('My private profile')).toBeVisible();
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await expect(page.getByText('Alex Morgan · sample profile')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Alex Morgan · sample profile')).toBeVisible();
  await expect(page.getByText('My private profile')).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('link', { name: 'Career Profile' }).click();
  await expect(
    page.getByRole('heading', { name: 'Alex Morgan', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', {
      name: 'Sections in Alex Morgan · sample profile',
    })
    .getByRole('button', { name: /^Projects/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Open Garden Classifier' }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('profile.png'),
    fullPage: true,
  });
  await nav.getByRole('link', { name: 'My Resumes' }).click();
  await expect(
    page.getByRole('heading', { name: 'AI Engineer Internship' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Create resume' }).click();
  await page
    .getByRole('combobox', { name: 'Career profile', exact: true })
    .selectOption({ label: 'My private profile' });
  await page.getByLabel('Resume title').fill('Graduate applications');
  await page.getByLabel('Target role (optional)').fill('Software Engineer');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create resume' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Graduate applications' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Graduate applications' }),
  ).toBeVisible();
  const resume = page.locator('.resume-card').filter({
    has: page.getByRole('heading', { name: 'Graduate applications' }),
  });
  await resume.getByRole('button', { name: 'Edit details' }).click();
  await page.getByLabel('Resume title').fill('Focused graduate applications');
  await page.getByRole('button', { name: 'Save details' }).click();
  await expect(
    page.getByRole('heading', { name: 'Focused graduate applications' }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('resumes.png'),
    fullPage: true,
  });
  await nav.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Remove sample data' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Remove sample data' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Remove sample data' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remove sample data' })
    .click();
  await expect(
    page.getByRole('button', { name: 'Remove sample data' }),
  ).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath('settings.png'),
    fullPage: true,
  });
  for (const route of ['/', '/profile', '/resumes', '/settings', '/missing']) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  }
  await page.goto('/resumes');
  await expect(
    page.getByRole('heading', { name: 'Focused graduate applications' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'AI Engineer Internship' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete resume', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your next opportunity starts here' }),
  ).toBeVisible();
  await nav.getByRole('link', { name: 'Career Profile' }).click();
  await expect(
    page.getByRole('heading', { name: 'My private profile' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(outbound).toEqual([]);
});
test('dialog keyboard focus and validation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create profile' }).click();
  await expect(page.getByLabel('Profile name')).toBeFocused();
  await page.getByLabel('Profile name').fill('   ');
  await page.getByRole('button', { name: 'Create blank profile' }).click();
  await expect(page.getByRole('alert')).toHaveText('Add a profile name.');
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('tablet and very narrow layouts stay usable', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await expect(page.getByText('Alex Morgan · sample profile')).toBeVisible();
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['/', '/profile', '/resumes', '/settings']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: testInfo.outputPath(`settings-${width}.png`),
      fullPage: true,
    });
  }
});
