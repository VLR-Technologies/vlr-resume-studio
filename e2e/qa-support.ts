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
  await expect(page.locator('.studio h1')).toBeVisible();
}
export async function section(page: Page, label: string) {
  await page.getByRole('tab', { name: 'Content', exact: true }).click();
  await page
    .locator('.studio-sections')
    .getByRole('button', { name: label, exact: true })
    .click();
}
export async function dismissNotice(page: Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismiss.isVisible()) await dismiss.click();
}
