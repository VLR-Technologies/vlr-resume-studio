import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { seed, readWorkspace, saved } from './qa-support';
test.use({ viewport: { width: 1440, height: 1000 } });

async function openSection(page: Page, section: string) {
  const group = page.locator(`[data-section="${section}"]`);
  if (!(await group.getAttribute('open'))) {
    if ((await group.getAttribute('open')) === null)
      await group.locator(':scope > summary').click();
  }
  return group;
}

test('first-time resume authoring, every standard section, design, reopen and PDF', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Create Resume', exact: true })
    .click();
  await expect(page).toHaveURL(/\/resumes\/[\w-]+/);
  await page
    .getByLabel('Resume title', { exact: true })
    .fill('Maya · Software Engineer');
  await page.getByLabel('Full name', { exact: true }).fill('Maya Chen');
  await page
    .getByLabel('Professional headline', { exact: true })
    .fill('Software Engineer');
  await page.getByLabel('Email', { exact: true }).fill('maya@example.com');
  await page.getByLabel('Location', { exact: true }).fill('Berlin, Germany');
  const summary = await openSection(page, 'summary');
  await summary
    .getByLabel('Professional summary for this resume')
    .fill('I build thoughtful software for everyday problems.');
  const sections = [
    {
      id: 'work',
      title: 'Software Engineer',
      label: 'Position',
      more: { Organization: 'Studio North' },
    },
    {
      id: 'education',
      title: 'BSc Computer Science',
      label: 'Title',
      more: { Institution: 'North University' },
    },
    {
      id: 'skills',
      title: 'Technical skills',
      label: 'Skill group',
      more: { 'Skills (comma separated)': 'TypeScript, React, SQL' },
    },
    {
      id: 'projects',
      title: 'Open Library',
      label: 'Title',
      more: { Description: 'A community reading platform.' },
    },
    {
      id: 'certifications',
      title: 'Cloud Practitioner',
      label: 'Title',
      more: { Issuer: 'Example Institute' },
    },
    {
      id: 'languages',
      title: 'English',
      label: 'Title',
      more: { Proficiency: 'C2' },
    },
  ];
  for (const s of sections) {
    const group = await openSection(page, s.id);
    await group
      .getByRole('button', {
        name: /^Add (experience|education|skills|entry)$/,
      })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(s.label, { exact: true }).fill(s.title);
    for (const [label, value] of Object.entries(s.more))
      await dialog.getByLabel(label, { exact: true }).fill(value);
    await dialog
      .getByRole('button', { name: 'Add to resume', exact: true })
      .click();
    await expect(dialog).toBeHidden();
  }
  await saved(page);
  await page.getByRole('button', { name: 'Live view', exact: true }).click();
  await expect(page.getByLabel('Live resume preview')).toContainText(
    'Studio North',
  );
  const experience = page.locator('[data-section=work]');
  await experience
    .getByLabel('Position', { exact: true })
    .fill('Senior Software Engineer');
  await saved(page);
  const stored = await readWorkspace(page);
  expect(stored.profiles[0]!.work[0]!.title).toBe('Software Engineer');
  expect(stored.variants[0]!.selections).toHaveLength(6);
  await page
    .getByRole('button', { name: 'Move Experience down', exact: true })
    .click();
  await saved(page);
  const order = (await readWorkspace(page)).variants[0]!.sectionOrder;
  expect(order.indexOf('education')).toBeLessThan(order.indexOf('work'));
  await page.getByRole('tab', { name: 'Templates', exact: true }).click();
  await expect(page.locator('.template-picker > button')).toHaveCount(12);
  await page
    .locator('.template-picker > button')
    .filter({ hasText: 'European Professional' })
    .click();
  await saved(page);
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: 'Noto Serif', exact: false }).click();
  await page
    .getByRole('slider', { name: 'Body font size (pt)', exact: true })
    .focus();
  await page.keyboard.press('ArrowRight');
  await page
    .getByRole('button', { name: 'Use color #173954', exact: true })
    .click();
  await saved(page);
  await page
    .locator('.studio-content')
    .evaluate((el) => el.scrollTo({ top: 0 }));
  await page.screenshot({
    path: 'qa-artifacts/flowcv/after-design-desktop.png',
  });
  await page.getByRole('tab', { name: 'Content', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue(
    'Maya Chen',
  );
  await page.getByRole('button', { name: 'Live view', exact: true }).click();
  await expect(page.getByLabel('Live resume preview')).toContainText(
    'Senior Software Engineer',
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const file = await download;
  expect((await readFile((await file.path())!)).subarray(0, 5).toString()).toBe(
    '%PDF-',
  );
  await page.getByRole('button', { name: 'Add Section', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Achievements & awards', exact: false })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Title', { exact: true })
    .fill('Community Award');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add to resume', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const awards = await openSection(page, 'awards');
  await awards
    .getByRole('button', { name: 'Delete Community Award', exact: true })
    .click();
  await saved(page);
  expect((await readWorkspace(page)).variants[0]!.selections).toHaveLength(6);
});

test('existing resume, all templates retain content, desktop/tablet/mobile screenshots and keyboard', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const data = await seed(page, 'professional');
  await page.goto('/resumes');
  await page.screenshot({
    path: 'qa-artifacts/flowcv/after-dashboard.png',
    fullPage: true,
  });
  await page
    .getByRole('link', {
      name: `Open resume: ${data.variants[0]!.title}`,
      exact: true,
    })
    .click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue(
    data.profiles[0]!.identity.name!,
  );
  await expect(page.locator('.pdf-proof canvas').first()).toBeVisible({
    timeout: 30000,
  });
  await page.screenshot({
    path: 'qa-artifacts/flowcv/after-editor-desktop.png',
  });
  await page.getByRole('tab', { name: 'Content', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('tab', { name: 'Design', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Templates', exact: true }).click();
  await page.screenshot({
    path: 'qa-artifacts/flowcv/after-templates-desktop.png',
  });
  const buttons = page.locator('.template-picker > button');
  for (let i = 0; i < 12; i++) {
    await buttons.nth(i).click();
    await saved(page);
  }
  expect((await readWorkspace(page)).variants[0]!.selections).toEqual(
    data.variants[0]!.selections,
  );
  await buttons.nth(0).click();
  await saved(page);
  await page.getByRole('tab', { name: 'Content', exact: true }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(
    page.getByRole('region', { name: 'Document preview', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'qa-artifacts/flowcv/after-editor-tablet.png',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'qa-artifacts/flowcv/after-editor-mobile.png',
  });
  await expect(
    page.getByRole('tab', { name: 'Templates', exact: true }),
  ).toBeHidden();
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.pdf-proof canvas').first()).toBeVisible({
    timeout: 30000,
  });
  await page.screenshot({
    path: 'qa-artifacts/flowcv/after-preview-mobile.png',
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole('tab', { name: 'Content', exact: true }).click();
  const accessibility = await new AxeBuilder({ page })
    .include('.flow-studio')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('dashboard duplicate/delete, undo, revisions and invalid draft recovery remain safe', async ({
  page,
}) => {
  const data = await seed(page, 'student');
  await page.goto('/resumes');
  await page.locator('.card-options > summary').click();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(page.locator('.document-card')).toHaveCount(2);
  const copy = page.locator('.document-card').filter({ hasText: '(copy)' });
  await copy.locator('.card-options > summary').click();
  await copy.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete resume', exact: true })
    .click();
  await expect(page.locator('.document-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Open editor', exact: true }).click();
  await page.getByLabel('Full name', { exact: true }).fill('An edited name');
  await saved(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await saved(page);
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue(
    data.profiles[0]!.identity.name!,
  );
  await page.getByLabel('Email', { exact: true }).fill('invalid email');
  await expect(page.locator('.save-error-banner')).toBeVisible();
  await page
    .getByRole('link', { name: 'Back to resumes', exact: true })
    .click();
  await expect(page).toHaveURL(/\/resumes\/[\w-]+/);
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
    'invalid email',
  );
  await page.getByLabel('Email', { exact: true }).fill('valid@example.com');
  await saved(page);
  await page.locator('.editor-options > summary').click();
  await page.getByRole('button', { name: 'Revisions', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Saved resume revisions' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Restore', exact: true })
      .first(),
  ).toBeVisible();
  expect((await readWorkspace(page)).profiles[0]!.identity).toEqual(
    data.profiles[0]!.identity,
  );
});
