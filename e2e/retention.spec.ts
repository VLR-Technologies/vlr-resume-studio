import { expect, test } from '@playwright/test';

test('records survive closing and reopening the browser with the same profile', async ({
  playwright,
}, testInfo) => {
  const userDataDir = testInfo.outputPath('browser-profile');
  let context = await playwright.chromium.launchPersistentContext(userDataDir, {
    headless: true,
  });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    await expect(page.getByText('Alex Morgan · sample profile')).toBeVisible();
    await context.close();
    context = await playwright.chromium.launchPersistentContext(userDataDir, {
      headless: true,
    });
    const reopened = await context.newPage();
    await reopened.goto('http://127.0.0.1:4173/profile');
    await expect(
      reopened.getByRole('heading', { name: 'Alex Morgan', exact: true }),
    ).toBeVisible();
    await reopened.goto('http://127.0.0.1:4173/resumes');
    await expect(
      reopened.getByRole('heading', { name: 'AI Engineer Internship' }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
