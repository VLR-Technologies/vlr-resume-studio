import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import {
  Document,
  Page as PdfPage,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import { readWorkspace } from './qa-support';

test('ordinary resume JSON can be reviewed, saved, templated, edited, and exported', async ({
  page,
}) => {
  await page.goto('/settings');
  await page.getByLabel('Import JSON or YAML').setInputFiles({
    name: 'sam-rivera.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        fullName: 'Sam Rivera',
        headline: 'Data Analyst',
        email: 'sam@example.com',
        location: 'Berlin, Germany',
        summary: 'Analyst focused on useful reporting.',
        experience: [
          {
            role: 'Analyst',
            company: 'Example GmbH',
            from: '01/2021',
            to: 'Present',
            achievements: ['Created reports'],
          },
        ],
        education: [{ degree: 'BSc Statistics', school: 'North University' }],
        projects: [
          { title: 'Forecasting', description: 'Built a forecasting model.' },
        ],
        skills: ['SQL', 'Python'],
      }),
    ),
  });
  const review = page.getByRole('dialog');
  await expect(
    review.getByRole('heading', { name: 'Review imported resume' }),
  ).toBeVisible();
  await expect(review).toContainText('sam-rivera.json');
  await expect(review.getByLabel('Full name')).toHaveValue('Sam Rivera');
  await review.getByLabel('Full name').fill('Sam R. Rivera');
  await review.getByText('Preview before saving').click();
  await expect(review.locator('.resume-import-preview')).toContainText(
    'Sam R. Rivera',
  );
  await review
    .getByRole('button', { name: 'Confirm and save career profile' })
    .click();
  await expect(
    review.getByRole('heading', { name: 'Profile saved' }),
  ).toBeVisible();
  const saved = await readWorkspace(page);
  expect(saved.profiles).toHaveLength(1);
  expect(saved.variants).toHaveLength(0);
  expect(saved.profiles[0]).toMatchObject({
    identity: { name: 'Sam R. Rivera', email: 'sam@example.com' },
  });
  await review.getByRole('button', { name: 'Choose Resume Template' }).click();
  await expect(
    review.getByRole('region', { name: 'Template gallery' }),
  ).toBeVisible();
  await expect(review.locator('.template-picker > button')).toHaveCount(12);
  await review
    .getByLabel('Resume template')
    .selectOption('typst-technical-engineer');
  await review
    .getByRole('button', { name: 'Create resume and open editor' })
    .click();
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]+$/i);
  await expect(
    page.getByRole('button', { name: 'Download PDF' }),
  ).toBeVisible();
  const afterCreate = await readWorkspace(page);
  expect(afterCreate.variants).toHaveLength(1);
  expect(afterCreate.variants[0]).toMatchObject({
    sourceProfileId: (afterCreate.profiles[0] as { id: string }).id,
    template: { templateId: 'typst-technical-engineer' },
  });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/i);
});

test('text-based multi-page PDF is parsed locally and confirms before persistence', async ({
  page,
}) => {
  const pdf = await renderToBuffer(
    createElement(
      Document,
      null,
      createElement(
        PdfPage,
        { size: 'A4', style: { padding: 36, fontSize: 11 } },
        createElement(Text, null, 'Jordan Lee'),
        createElement(Text, null, 'Software Engineer'),
        createElement(Text, null, 'jordan@example.com'),
        createElement(Text, { style: { marginTop: 12 } }, 'Work Experience'),
        createElement(Text, null, 'Software Engineer | Example GmbH'),
        createElement(Text, null, '2021 – Present'),
        createElement(Text, null, '• Improved API reliability'),
      ),
      createElement(
        PdfPage,
        { size: 'A4', style: { padding: 36, fontSize: 11 } },
        createElement(Text, null, 'Education'),
        createElement(Text, null, 'MSc Computer Science | North University'),
        createElement(Text, null, '2018 – 2020'),
        createElement(Text, null, 'Skills'),
        createElement(Text, null, 'TypeScript, Python'),
      ),
    ),
  );
  await page.goto('/settings');
  await page.getByLabel('Import JSON or YAML').setInputFiles({
    name: 'jordan-lee.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(pdf),
  });
  const review = page.getByRole('dialog');
  await expect(
    review.getByRole('heading', { name: 'Review imported resume' }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(review).toContainText('jordan-lee.pdf');
  await expect(review.getByLabel('Full name')).toHaveValue('Jordan Lee');
  await expect(
    review.getByRole('heading', { name: 'Work experience' }),
  ).toBeVisible();
  await review.getByRole('button', { name: 'Cancel' }).click();
  expect(await readWorkspace(page)).toEqual({
    profiles: [],
    variants: [],
    revisions: [],
  });
});

test('image-only PDFs show the local OCR limitation and do not create a profile', async ({
  page,
}) => {
  const pdf = await renderToBuffer(
    createElement(
      Document,
      null,
      createElement(
        PdfPage,
        { size: 'A4', style: { padding: 36 } },
        createElement(View, {
          style: { width: 260, height: 360, backgroundColor: '#d0d0d0' },
        }),
      ),
    ),
  );
  await page.goto('/settings');
  await page.getByLabel('Import JSON or YAML').setInputFiles({
    name: 'scanned-cv.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(pdf),
  });
  await expect(page.getByRole('alert')).toContainText('Scanned PDFs need OCR');
  expect(await readWorkspace(page)).toEqual({
    profiles: [],
    variants: [],
    revisions: [],
  });
});
