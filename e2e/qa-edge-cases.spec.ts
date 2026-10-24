import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  readWorkspace,
  seed,
  openEditor,
  section,
  saved,
  upload,
} from './qa-support';

test('a dirty career draft survives a concurrent tab save and requires explicit reload', async ({
  page,
  context,
}) => {
  await seed(page);
  await page.goto('/profile');
  await page.getByLabel('Email', { exact: true }).fill('invalid draft');
  await expect(
    page.getByText('Not saved — review errors', { exact: true }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto('/profile');
  await other
    .getByLabel('Full name', { exact: true })
    .fill('Other tab saved name');
  await saved(other);
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
    'invalid draft',
  );
  await page.getByLabel('Email', { exact: true }).fill('corrected@example.com');
  await expect(page.getByRole('alert')).toContainText('another tab');
  expect((await readWorkspace(other)).profiles[0]!.identity.name).toBe(
    'Other tab saved name',
  );
  await page
    .getByRole('button', {
      name: 'Reload stored profile (discard local edits)',
      exact: true,
    })
    .click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue(
    'Other tab saved name',
  );
  await saved(page);
});

test('empty exports, standard import, blank resume, protected profile deletion and cancellation', async ({
  page,
}) => {
  await page.goto('/settings');
  await expect(
    page.getByRole('button', {
      name: 'Export standard JSON Resume',
      exact: true,
    }),
  ).toBeDisabled();
  for (const format of ['JSON', 'YAML']) {
    const pending = page.waitForEvent('download');
    await page
      .getByRole('button', { name: `Export VLR ${format}`, exact: true })
      .click();
    expect(
      (await readFile((await (await pending).path())!)).length,
    ).toBeGreaterThan(0);
  }
  await upload(page, {
    basics: { name: 'Fictional Standard Applicant', email: 'qa@example.com' },
    work: [{ name: 'Example Cooperative', position: 'Engineer' }],
  });
  await page.getByRole('checkbox', { name: /I reviewed/ }).check();
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect((await readWorkspace(page)).profiles[0]!.identity.name).toBe(
    'Fictional Standard Applicant',
  );
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await readWorkspace(page)).profiles).toHaveLength(1);
  await page.goto('/resumes');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete resume', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete profile', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page
    .getByRole('button', { name: 'Create profile', exact: true })
    .first()
    .click();
  await page.getByLabel('Profile name').fill('QA blank');
  await page.getByRole('button', { name: 'Create blank profile' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.goto('/resumes');
  await page
    .getByRole('button', { name: 'Create resume', exact: true })
    .first()
    .click();
  await page
    .getByLabel('Resume title', { exact: true })
    .fill('Blank application');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create resume', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const data = await readWorkspace(page);
  await openEditor(page, data.variants[0]!.id);
  await expect(
    page.getByRole('button', { name: 'Download PDF', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Full name', { exact: true }).fill('Mara Weiß');
  // A navigation click immediately after editing must drain the pending save.
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Career Profile', exact: true })
    .click();
  await expect(page.locator('h1')).toHaveText('Career Profile');
  expect((await readWorkspace(page)).variants[0]!.identityOverride?.name).toBe(
    'Mara Weiß',
  );
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Delete profile', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await openEditor(page, data.variants[0]!.id);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  expect(
    (await readFile((await (await pending).path())!)).subarray(0, 5).toString(),
  ).toBe('%PDF-');
});

test('HTML text remains inert, unsafe URL cannot save, and clipboard denial has selectable fallback', async ({
  page,
}) => {
  const data = await seed(page);
  await openEditor(page, data.variants[0]!.id);
  await section(page, 'Professional summary');
  const payload =
    '<img src=x onerror="window.__qaInjected=true"><script>alert(1)</script>';
  await page.getByLabel('Professional summary for this resume').fill(payload);
  await saved(page);
  if (await page.getByRole('tab', { name: 'Preview', exact: true }).isVisible())
    await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.resume-paper')).toContainText(payload);
  expect(await page.evaluate(() => '__qaInjected' in window)).toBe(false);
  expect(
    await page.locator('.resume-paper script, .resume-paper img').count(),
  ).toBe(0);
  await page.getByRole('tab', { name: 'Content', exact: true }).click();
  await section(page, 'Projects');
  const original = (await readWorkspace(page)).variants[0];
  await page
    .locator('.entry-editor')
    .first()
    .getByLabel('Website or project link')
    .fill('javascript:alert(1)');
  await expect(
    page.getByText('Not saved — review errors', { exact: true }),
  ).toBeVisible();
  expect((await readWorkspace(page)).variants[0]).toEqual(original);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await saved(page);
  await page.goto('/settings');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () =>
          Promise.reject(new DOMException('QA denied', 'NotAllowedError')),
      },
    });
  });
  await page
    .getByRole('button', { name: 'Copy AI Editing Instructions', exact: true })
    .click();
  await expect(page.getByText(/Clipboard access is unavailable/)).toBeVisible();
  await expect(page.getByRole('dialog').locator('textarea')).toBeVisible();
});
