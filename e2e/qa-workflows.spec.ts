import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { profileTypes } from '../tests/fixtures/qa-profiles';
import {
  seed,
  readWorkspace,
  openEditor,
  section,
  saved,
  upload,
  dismissNotice,
} from './qa-support';

test('intentional source refresh, missing source evidence, historical restore, and variant isolation', async ({
  page,
  context,
}) => {
  const initial = await seed(page, 'professional');
  const variant = initial.variants[0]!;
  const profile = initial.profiles[0]!;
  await page.goto('/resumes');
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(page.locator('.resume-card')).toHaveCount(2);
  const sibling = (await readWorkspace(page)).variants.find(
    (v) => v.id !== variant.id,
  )!;
  await openEditor(page, variant.id);
  await section(page, 'Professional summary');
  await page
    .getByLabel('Professional summary for this resume')
    .fill('Tailored summary stays pinned.');
  await saved(page);
  await section(page, 'Projects');
  const project = page.locator('.entry-editor').first();
  await project
    .getByLabel('Description', { exact: true })
    .fill('Tailored project wording.');
  await project
    .getByRole('button', { name: 'Add bullet', exact: true })
    .click();
  await project
    .getByLabel('Achievement bullet')
    .last()
    .fill('A newly authored accomplishment.');
  await saved(page);
  const beforeRefresh = (await readWorkspace(page)).variants.find(
    (v) => v.id === variant.id,
  )!;
  const master = await context.newPage();
  await master.goto('/profile');
  await master
    .getByRole('navigation', { name: `Sections in ${profile.label}` })
    .getByRole('button', { name: /^Projects/ })
    .click();
  await master
    .locator('.entry-editor')
    .first()
    .getByLabel('Description', { exact: true })
    .fill('Master evidence changed intentionally.');
  await saved(master);
  await master
    .locator('.entry-editor')
    .last()
    .locator('header')
    .getByRole('button', { name: /^Delete / })
    .click();
  await saved(master);
  await expect(page.locator('.source-review summary')).toContainText(
    'source changes',
  );
  await page.locator('.source-review summary').click();
  await expect(page.locator('.source-review')).toContainText('Source removed');
  await page.getByRole('button', { name: 'Review source refresh' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  expect(
    (await readWorkspace(page)).variants.find((v) => v.id === variant.id),
  ).toEqual(beforeRefresh);
  await page.getByRole('button', { name: 'Review source refresh' }).click();
  await page
    .getByRole('button', { name: 'Use current source', exact: true })
    .click();
  await saved(page);
  await expect(
    page
      .locator('.entry-editor')
      .first()
      .getByLabel('Description', { exact: true }),
  ).toHaveValue('Master evidence changed intentionally.');
  expect(
    (await readWorkspace(page)).variants.find((v) => v.id === sibling.id),
  ).toEqual(sibling);
  await page.getByRole('button', { name: 'Revisions', exact: true }).click();
  await page
    .locator('.revision-list')
    .getByRole('button', { name: 'Restore', exact: true })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const restored = (await readWorkspace(page)).variants.find(
    (v) => v.id === variant.id,
  )!;
  expect(restored.selections).toEqual(beforeRefresh.selections);
  expect(restored.overrides).toEqual(beforeRefresh.overrides);
  expect(restored.summarySnapshot).toBe(beforeRefresh.summarySnapshot);
  expect((await readWorkspace(page)).profiles[0]!.projects).not.toEqual(
    initial.profiles[0]!.projects,
  );
  await page
    .getByRole('link', { name: 'My Resumes', exact: true })
    .first()
    .click();
  const card = page.locator('.resume-card').filter({
    has: page.getByRole('heading', { name: variant.title, exact: true }),
  });
  await card.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  expect((await readWorkspace(page)).variants).toHaveLength(2);
  await card.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete resume', exact: true })
    .click();
  expect((await readWorkspace(page)).variants).toEqual([sibling]);
});

test('reviewed import modes, replacement recovery, standard sources, cancellation, and malicious JSON', async ({
  page,
}, info) => {
  const original = await seed(page);
  await page.goto('/settings');
  const exportWait = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export VLR JSON', exact: true })
    .click();
  const exported = await exportWait;
  const native = await readFile((await exported.path())!);
  const parsed = JSON.parse(native.toString());
  await upload(page, native.toString());
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  expect(await readWorkspace(page)).toEqual(original);
  await upload(page, native.toString());
  await page
    .getByLabel('Import behavior', { exact: true })
    .selectOption('merge');
  await page.getByRole('checkbox', { name: /I reviewed/ }).check();
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await readWorkspace(page)).toEqual(original);
  const conflicting = structuredClone(parsed);
  conflicting.variants[0].title = 'Conflicting incoming title';
  await upload(page, conflicting);
  await page
    .getByLabel('Import behavior', { exact: true })
    .selectOption('merge');
  await page.getByRole('checkbox', { name: /I reviewed/ }).check();
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'conflicting',
  );
  expect(await readWorkspace(page)).toEqual(original);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  const empty = { ...parsed, profiles: [], variants: [], revisions: [] };
  await upload(page, empty);
  await page
    .getByLabel('Import behavior', { exact: true })
    .selectOption('replace');
  await expect(
    page.getByText('Will be removed', { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: /recovery backup/ }).check();
  const recoveryWait = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click();
  const recovery = await recoveryWait;
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await readWorkspace(page)).toEqual({
    profiles: [],
    variants: [],
    revisions: [],
  });
  const recoveryData = await readFile((await recovery.path())!);
  await upload(page, recoveryData.toString());
  await page
    .getByLabel('Import behavior', { exact: true })
    .selectOption('replace');
  await page.getByRole('checkbox', { name: /recovery backup/ }).check();
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await readWorkspace(page)).toEqual(original);
  await upload(page, native.toString());
  await page.getByRole('checkbox', { name: /I reviewed/ }).check();
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const copied = await readWorkspace(page);
  expect(copied.profiles).toHaveLength(2);
  expect(copied.variants).toHaveLength(2);
  for (const v of copied.variants)
    expect(copied.profiles.some((p) => p.id === v.sourceProfileId)).toBe(true);
  for (const source of [
    `p:${original.profiles[0]!.id}`,
    `v:${original.variants[0]!.id}`,
  ]) {
    await page.getByLabel('JSON Resume source').selectOption(source);
    const downloadWait = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Export standard JSON Resume', exact: true })
      .click();
    const standard = JSON.parse(
      (await readFile((await (await downloadWait).path())!)).toString(),
    );
    expect(standard.basics.name).toBe(original.profiles[0]!.identity.name);
    expect(standard.format).toBeUndefined();
  }
  await page.getByText('Standard export limitations', { exact: true }).click();
  await expect(page.locator('.standard-export')).toContainText(
    'omits VLR identifiers',
  );
  await upload(page, '{"basics":{"name":"First","name":"Second"}}');
  await expect(page.getByRole('alert')).toContainText('Duplicate JSON');
  expect(await readWorkspace(page)).toEqual(copied);
  await info.attach('native-source', {
    body: native,
    contentType: 'application/json',
  });
});

test('real write rejection and unavailable storage show errors, preserve data, and retry', async ({
  page,
}) => {
  const original = await seed(page);
  await page.goto('/profile');
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    Object.defineProperty(window, '__qaFailWrites', {
      value: true,
      writable: true,
    });
    IDBObjectStore.prototype.put = function (value, key) {
      if (
        this.name === 'profiles' &&
        (window as unknown as { __qaFailWrites: boolean }).__qaFailWrites
      )
        throw new DOMException('QA quota failure', 'QuotaExceededError');
      return key === undefined
        ? put.call(this, value)
        : put.call(this, value, key);
    };
  });
  await page
    .getByLabel('Full name', { exact: true })
    .fill('Changed after simulated quota');
  await expect(
    page.getByText('Not saved — review errors', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('storage is full');
  expect((await readWorkspace(page)).profiles).toEqual(original.profiles);
  await page.evaluate(() => {
    (window as unknown as { __qaFailWrites: boolean }).__qaFailWrites = false;
  });
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await saved(page);
  expect((await readWorkspace(page)).profiles[0]!.identity.name).toBe(
    'Changed after simulated quota',
  );
  await page.reload();
  await page
    .getByRole('navigation', {
      name: `Sections in ${original.profiles[0]!.label}`,
    })
    .getByRole('button', { name: /^Work experience/ })
    .click();
  const entry = page.locator('.entry-editor').first();
  await entry.getByLabel('Currently here / ongoing').uncheck();
  await entry.getByLabel('Start date').fill('2025-13');
  await entry.getByLabel('End date').fill('2024-01');
  await expect(page.getByRole('alert')).toContainText('real date');
  expect((await readWorkspace(page)).profiles[0]!.work[0]!.period).toEqual(
    original.profiles[0]!.work[0]!.period,
  );
  await entry.getByLabel('Start date').fill('2025-01');
  await entry.getByLabel('Currently here / ongoing').check();
  await saved(page);
});
test('storage restriction reaches the recoverable boundary without deleting records', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...args) => {
      if (
        !(window as unknown as { __qaStorageAllowed?: boolean })
          .__qaStorageAllowed
      )
        throw new DOMException('QA blocked storage', 'SecurityError');
      return open(...args);
    };
  });
  await page.goto('/profile');
  await expect(
    page.getByRole('heading', { name: 'We couldn’t open this view' }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('storage is unavailable');
  await page.evaluate(() => {
    (window as unknown as { __qaStorageAllowed: boolean }).__qaStorageAllowed =
      true;
  });
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Every career starts somewhere' }),
  ).toBeVisible();
});

for (const type of profileTypes)
  test(`realistic ${type}: four template proofs match downloaded PDFs and retain content`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    const data = await seed(page, type);
    const id = data.variants[0]!.id;
    await openEditor(page, id);
    const counts: { template: string; pages: number; bytes: number }[] = [];
    for (const template of [
      'ATS Essential',
      'European Professional',
      'Modern Professional',
      'Academic / Research',
    ]) {
      await page.getByRole('tab', { name: 'Design', exact: true }).click();
      await page
        .getByRole('button', { name: new RegExp(template) })
        .filter({ has: page.locator('strong') })
        .click();
      await page
        .getByLabel('Font family', { exact: true })
        .selectOption(template === 'Academic / Research' ? 'sans' : 'serif');
      await page.getByLabel('Body font size (pt)').fill('10');
      await page.getByLabel('Header presentation').selectOption('centered');
      await page.getByLabel('Line spacing').fill('1.35');
      await page.getByLabel('Section spacing (mm)').fill('5');
      await page.getByLabel('Accent color').fill('#245b4b');
      await page.getByLabel('Section heading rules').uncheck();
      await saved(page);
      const pending = page.waitForEvent('download');
      await page
        .getByRole('button', { name: 'Download PDF', exact: true })
        .click();
      const download = await pending;
      const buffer = await readFile((await download.path())!);
      const task = getDocument({ data: new Uint8Array(buffer) });
      const pdf = await task.promise;
      const text: string[] = [];
      try {
        for (let i = 1; i <= pdf.numPages; i++)
          text.push(
            (await (await pdf.getPage(i)).getTextContent()).items
              .flatMap((x) => ('str' in x ? [x.str] : []))
              .join(' '),
          );
        counts.push({ template, pages: pdf.numPages, bytes: buffer.length });
        expect(text.join(' ')).toContain(data.profiles[0]!.identity.name);
      } finally {
        await task.destroy();
      }
      await download.saveAs(
        info.outputPath(`${type}-${template.replaceAll('/', '-')}.pdf`),
      );
      if (
        await page
          .getByRole('tab', { name: 'Preview', exact: true })
          .isVisible()
      )
        await page.getByRole('tab', { name: 'Preview', exact: true }).click();
      const proof = page.getByRole('button', {
        name: 'PDF proof',
        exact: true,
      });
      if (await proof.isVisible()) await proof.click();
      await expect(page.locator('.pdf-proof > [role=status]')).toContainText(
        `${counts.at(-1)!.pages} pages · exact PDF layout`,
      );
      await dismissNotice(page);
      await page.locator('.pdf-proof canvas').first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath(`${type}-${template.replaceAll('/', '-')}.png`),
        fullPage: false,
      });
    }
    await info.attach('template-output-comparison', {
      body: JSON.stringify(counts),
      contentType: 'application/json',
    });
    const after = await readWorkspace(page);
    expect(after.profiles).toEqual(data.profiles);
    expect(after.variants[0]!.selections).toEqual(data.variants[0]!.selections);
  });
