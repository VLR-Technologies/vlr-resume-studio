import { test, expect } from '@playwright/test';
import { readWorkspace, saved } from './qa-support';
import { entrySectionSchema } from '../src/domain/schemas';
import { sectionNames } from '../src/domain/editor';

test('QA-016: renaming a clean profile leaves its editor ready for the next career edit', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Create profile', exact: true })
    .click();
  await page.getByLabel('Profile name').fill('QA profile');
  await page.getByRole('button', { name: 'Create blank profile' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Career Profile' })
    .click();
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await page.getByLabel('Profile name').fill('QA renamed');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByLabel('Full name').fill('Mara Weiß');
  await saved(page);
  expect((await readWorkspace(page)).profiles[0]!.identity.name).toBe(
    'Mara Weiß',
  );
});

test('complete profile control lifecycle and browser-restart retention for every career section', async ({
  playwright,
  browserName,
}, info) => {
  test.setTimeout(process.env.CI ? 420000 : 180000);
  const userDir = info.outputPath('complete-profile');
  const viewport = info.project.use.viewport;
  let context = await playwright[browserName].launchPersistentContext(userDir, {
    headless: true,
    viewport,
  });
  try {
    let page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await page
      .getByRole('button', { name: 'Create profile', exact: true })
      .click();
    await page.getByLabel('Profile name').fill('QA complete career');
    await page.getByRole('button', { name: 'Create blank profile' }).click();
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Career Profile' })
      .click();
    for (const [name, value] of Object.entries({
      'Full name': 'Mara Weiß Łukasz',
      'Professional headline': 'Working Student — AI',
      Email: 'qa@example.com',
      Phone: '+49 30 555 0123',
      Location: 'Berlin, Germany',
    }))
      await page.getByLabel(name, { exact: true }).fill(value);
    const nav = page.getByRole('navigation', {
      name: 'Sections in QA complete career',
    });
    await nav
      .getByRole('button', { name: 'Professional summary', exact: true })
      .click();
    await page
      .getByLabel('Professional summary', { exact: true })
      .fill(
        'Fictional applicant with documented experience and an interest in reliable software.',
      );
    for (const kind of entrySectionSchema.options) {
      await nav
        .getByRole('button', {
          name: new RegExp(`^${sectionNames[kind].replace('&', '\\&')}`),
        })
        .click();
      await page
        .getByRole('button', {
          name: `Add ${sectionNames[kind].toLowerCase()} entry`,
          exact: true,
        })
        .click();
      const entry = page.locator('.entry-editor').first();
      for (const field of await entry
        .locator('input:not([type=checkbox])')
        .all()) {
        const id = await field.getAttribute('id');
        const label = await page.locator(`label[for="${id}"]`).innerText();
        const values: Record<string, string> = {
          Title: `${kind} — duplicate name`,
          Position: `${kind} — duplicate name`,
          'Skill group': 'Engineering practices',
          'Custom section title': 'Selected talks',
          Organization: 'Example Cooperative (fictional)',
          Institution: 'Example Technical University',
          Qualification: 'Master of Science',
          Location: 'Berlin / hybrid',
          'Start date': '2023-10',
          'End date': '2025-09',
          Date: '2025-04',
          Proficiency: 'C1 — proficient',
          Issuer: 'Example Institute',
          Publisher: 'Example Proceedings',
          Awarder: 'Example Foundation',
          'Website or project link': `https://example.com/${'long-path-'.repeat(45)}`,
          'Skills (comma separated)': 'Machine Learning, GitHub Actions',
          'Technologies (comma separated)': 'TypeScript, GitHub Actions',
        };
        if (
          label === 'Skills (comma separated)' ||
          label === 'Technologies (comma separated)'
        )
          await field.pressSequentially(values[label]!);
        else await field.fill(values[label] ?? `${label} value`);
      }
      if (kind === 'skills')
        await entry.getByLabel('Skill category').selectOption('professional');
      await entry
        .locator('textarea')
        .first()
        .fill(
          `Fictional ${kind} description with European characters: Grüße, García, Élodie. ${'A documented, relevant contribution. '.repeat(15)}`,
        );
      const ongoing = entry.getByLabel('Currently here / ongoing');
      if (await ongoing.count()) {
        await ongoing.check();
        await expect(entry.getByLabel('End date')).toBeDisabled();
      }
      await entry
        .getByRole('button', { name: 'Add bullet', exact: true })
        .click();
      await entry
        .getByLabel('Achievement bullet')
        .fill(`A first ${kind} accomplishment.`);
      await entry
        .getByRole('button', { name: 'Add bullet', exact: true })
        .click();
      await entry
        .getByLabel('Achievement bullet')
        .last()
        .fill(`A second ${kind} accomplishment.`);
      await entry
        .getByRole('button', { name: 'Move bullet 2 up', exact: true })
        .click();
      await expect(entry.getByLabel('Achievement bullet').first()).toHaveValue(
        `A second ${kind} accomplishment.`,
      );
      await entry
        .getByRole('button', { name: 'Delete bullet', exact: true })
        .last()
        .click();
      await saved(page);
      await page
        .getByRole('button', {
          name: `Add ${sectionNames[kind].toLowerCase()} entry`,
          exact: true,
        })
        .click();
      const second = page.locator('.entry-editor').last();
      if (kind === 'links')
        await second
          .getByLabel('Website or project link')
          .fill('https://example.com/second');
      const titleLabel =
        kind === 'skills'
          ? 'Skill group'
          : kind === 'custom'
            ? 'Custom section title'
            : ['work', 'internships', 'volunteer'].includes(kind)
              ? 'Position'
              : 'Title';
      await second.getByLabel(titleLabel, { exact: true }).fill('Second entry');
      await saved(page);
      const secondRow = second.locator('xpath=../..');
      await secondRow
        .locator('> .sort-controls')
        .getByRole('button', { name: 'Move Second entry up', exact: true })
        .click();
      await saved(page);
      await expect(
        page
          .locator('.entry-editor')
          .first()
          .getByLabel(titleLabel, { exact: true }),
      ).toHaveValue('Second entry');
      await page
        .locator('.entry-editor')
        .first()
        .getByRole('button', { name: 'Delete Second entry', exact: true })
        .click();
      await saved(page);
      await expect(page.locator('.entry-editor')).toHaveCount(1);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await saved(page);
      await expect(page.locator('.entry-editor')).toHaveCount(2);
      await page
        .locator('.entry-editor')
        .first()
        .getByRole('button', { name: 'Delete Second entry', exact: true })
        .click();
      await saved(page);
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: 'My Resumes' })
        .click();
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: 'Career Profile' })
        .click();
      await page
        .getByRole('navigation', { name: 'Sections in QA complete career' })
        .getByRole('button', { name: new RegExp(`^${sectionNames[kind]}`) })
        .click();
      await expect(page.locator('.entry-editor')).toHaveCount(1);
      await page.reload();
      await expect(page.getByLabel('Full name')).toHaveValue(
        'Mara Weiß Łukasz',
      );
    }
    const before = await readWorkspace(page);
    for (const kind of entrySectionSchema.options)
      expect(before.profiles[0]![kind]).toHaveLength(1);
    await context.close();
    context = await playwright[browserName].launchPersistentContext(userDir, {
      headless: true,
      viewport,
    });
    page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/profile');
    await expect(page.getByLabel('Full name')).toHaveValue('Mara Weiß Łukasz');
    expect(await readWorkspace(page)).toEqual(before);
    await info.attach('persisted-profile', {
      body: JSON.stringify(before),
      contentType: 'application/json',
    });
    await page.screenshot({
      path: info.outputPath('complete-profile.png'),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});
