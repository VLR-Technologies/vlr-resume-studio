import { expect, type Page } from '@playwright/test';
import type { VlrBackup } from '../src/services/interoperability/contracts';

import { qaWorkspace, type QaProfileType } from '../tests/fixtures/qa-profiles';

export async function saved(page: Page) {
  await expect(
    page.getByText('All changes saved', { exact: true }),
  ).toBeVisible();
}
export async function readWorkspace(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('vlr-resume-studio');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<{
        profiles: unknown[];
        variants: unknown[];
        revisions: unknown[];
      }>((resolve, reject) => {
        const tx = db.transaction(['profiles', 'variants', 'revisions']);
        const requests = ['profiles', 'variants', 'revisions'].map((name) =>
          tx.objectStore(name).getAll(),
        );
        tx.oncomplete = () =>
          resolve({
            profiles: requests[0]!.result,
            variants: requests[1]!.result,
            revisions: requests[2]!.result,
          });
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }) as Promise<Pick<VlrBackup, 'profiles' | 'variants' | 'revisions'>>;
}
export async function upload(page: Page, data: unknown, name = 'qa.json') {
  await page.getByLabel('Import JSON or YAML').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)),
  });
}
export async function seed(
  page: Page,
  type: QaProfileType = 'student',
  scale = 1,
) {
  const { profile, variant } = qaWorkspace(type, scale);
  await page.goto('/settings');
  await upload(page, {
    format: 'vlr-backup',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profiles: [profile],
    variants: [variant],
    revisions: [],
    metadata: { application: 'VLR Resume Studio' },
  });
  await page
    .getByLabel('I reviewed the incoming data and import behavior.')
    .check();
  await page.getByRole('button', { name: 'Confirm import' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  return readWorkspace(page);
}
export async function openEditor(page: Page, id: string) {
  await page.goto(`/resumes/${id}`);
  await expect(page.getByLabel('Resume title', { exact: true })).toBeVisible();
}
export async function section(page: Page, label: string) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible())
    await page
      .getByRole('button', { name: 'Close dialog', exact: true })
      .click();
  await page.getByRole('tab', { name: 'Content', exact: true }).click();
  if (label === 'Resume settings & presets') {
    await page.locator('.editor-options > summary').click();
    await page
      .getByRole('button', { name: 'Resume settings', exact: true })
      .click();
    return;
  }
  const names: Record<string, string> = {
    'Work experience': 'work',
    Education: 'education',
    Projects: 'projects',
    Skills: 'skills',
    'Professional summary': 'summary',
    Languages: 'languages',
    Certifications: 'certifications',
    'Professional links': 'links',
    Internships: 'internships',
  };
  if (label === 'Personal details') return;
  const id = names[label] ?? label;
  const openGroups = page.locator('.content-accordion[data-section][open]');
  for (const item of await openGroups.all())
    if ((await item.getAttribute('data-section')) !== id)
      await item.locator(':scope > summary').click();
  const group = page.locator(`[data-section="${id}"]`);
  if ((await group.getAttribute('open')) === null)
    await group.locator(':scope > summary').click();
}
export async function templates(page: Page) {
  if (
    await page.getByRole('tab', { name: 'Templates', exact: true }).isVisible()
  )
    await page.getByRole('tab', { name: 'Templates', exact: true }).click();
  else {
    await page.getByRole('tab', { name: 'Design', exact: true }).click();
    await page
      .getByRole('button', { name: 'Browse all templates', exact: true })
      .click();
  }
}
export async function proof(page: Page) {
  const button = page.getByRole('button', { name: 'PDF proof', exact: true });
  if (await button.isVisible()) await button.click();
}
export async function options(page: Page, name: string) {
  if ((await page.locator('.editor-options').getAttribute('open')) === null)
    await page.locator('.editor-options > summary').click();
  await page.getByRole('button', { name, exact: true }).click();
}
export async function dismissNotice(page: Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismiss.isVisible()) await dismiss.click();
}
export async function design(page: Page, advanced = false) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible())
    await page
      .getByRole('button', { name: 'Close dialog', exact: true })
      .click();
  await page.getByRole('tab', { name: 'Design', exact: true }).click();
  if (
    advanced &&
    (await page.locator('.advanced-design').getAttribute('open')) === null
  )
    await page.locator('.advanced-design > summary').click();
}
export async function slider(page: Page, label: string, value: number) {
  const input = page.getByRole('slider', { name: label, exact: true });
  const min = Number(await input.getAttribute('min'));
  const step = Number((await input.getAttribute('step')) || 1);
  await input.focus();
  await input.press('Home');
  for (let i = 0; i < Math.round((value - min) / step); i++)
    await input.press('ArrowRight');
}
