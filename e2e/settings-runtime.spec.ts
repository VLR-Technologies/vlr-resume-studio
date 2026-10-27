import { expect, test, type Page } from '@playwright/test';
import { createVariant } from '../src/domain/factories';
import { selectTemplate } from '../src/domain/templates';
import { makeBackup } from '../src/services/interoperability/portability';
import { qaProfile } from '../tests/fixtures/qa-profiles';

function watchRuntime(page: Page) {
  const exceptions: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (error) =>
    exceptions.push(error.stack ?? error.message),
  );
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith('http://127.0.0.1:4173/'))
      failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on('response', (response) => {
    if (
      response.status() >= 400 &&
      response.url().startsWith('http://127.0.0.1:4173/')
    )
      failedRequests.push(`${response.status()} ${response.url()}`);
  });
  return async () => {
    await expect(
      page.getByRole('heading', { name: 'We couldn’t open this view' }),
    ).toHaveCount(0);
    expect({ exceptions, consoleErrors, failedRequests }).toEqual({
      exceptions: [],
      consoleErrors: [],
      failedRequests: [],
    });
  };
}

test('Settings opens from navigation and direct URL in an empty workspace', async ({
  page,
}, info) => {
  const assertClean = watchRuntime(page);
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Settings', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByText('0career profiles')).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Import & export' }),
  ).toBeVisible();
  await info.attach('settings-empty-workspace.png', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await assertClean();
});

test('Settings opens with multiple React PDF and Typst records and exports on demand', async ({
  page,
}, info) => {
  const assertClean = watchRuntime(page);
  const firstProfile = qaProfile('professional');
  const secondProfile = qaProfile('researcher');
  const firstVariant = createVariant(
    firstProfile,
    'Fictional React PDF resume',
  );
  const secondVariant = createVariant(secondProfile, 'Fictional Typst resume');
  secondVariant.template = selectTemplate(
    secondVariant.template,
    'typst-ats-minimal',
  );
  const backup = makeBackup(
    [firstProfile, secondProfile],
    [firstVariant, secondVariant],
  );

  await page.goto('/settings');
  await page.getByLabel('Import JSON or YAML').setInputFiles({
    name: 'settings-regression.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByLabel('I reviewed the incoming data and import behavior.')
    .check();
  await page.getByRole('button', { name: 'Confirm import' }).click();
  await expect(
    page.getByText('Import complete.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText('2career profiles')).toBeVisible();
  await expect(page.getByText('2resume variants')).toBeVisible();
  await info.attach('settings-mixed-workspace.png', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Import & export' }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export standard JSON Resume' })
    .click();
  expect((await download).suggestedFilename()).toMatch(/standard\.json$/);
  await assertClean();
});
