import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { premiumWorkspace } from '../tests/fixtures/premium-workspace';
import { upload, dismissNotice } from './qa-support';

for (const width of [1440, 768, 390]) {
  test(`Perfect Tie identity and preserved document at ${width}px`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const capture = async (name: string) => {
      await page.evaluate(() => document.fonts.ready);
      const path =
        info.project.name === 'desktop'
          ? `docs/qa/perfect-tie/${name}-${width}.png`
          : info.outputPath(`${name}-${width}.png`);
      await page.screenshot({ path, animations: 'disabled' });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    };
    await mkdir('docs/qa/perfect-tie', { recursive: true });
    await page.goto('/');
    await expect(page).toHaveTitle('My Resumes · Perfect Tie');
    await expect(
      page.getByRole('link', { name: 'Perfect Tie', exact: true }),
    ).toBeVisible();
    await capture('empty');
    await page.goto('/settings');
    const fixture = premiumWorkspace();
    await upload(page, fixture);
    await page
      .getByLabel('I reviewed the incoming data and import behavior.')
      .check();
    await page
      .getByRole('button', { name: 'Confirm import', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await dismissNotice(page);
    await page.goto('/resumes');
    await expect(page.locator('.document-card')).toHaveCount(2);
    await capture('dashboard');
    await page
      .getByRole('link', {
        name: `Open resume: ${fixture.variants[0]!.title}`,
        exact: true,
      })
      .click();
    await expect(page.getByLabel('Full name', { exact: true })).toHaveValue(
      'Avery Morgan',
    );
    if (width > 800)
      await expect(page.locator('.pdf-proof canvas').first()).toBeVisible({
        timeout: 30000,
      });
    await capture('editor');
    await page.getByRole('tab', { name: 'Design', exact: true }).click();
    await capture('design');
    if (width > 800)
      await page.getByRole('tab', { name: 'Templates', exact: true }).click();
    else
      await page
        .getByRole('button', { name: 'Browse all templates', exact: true })
        .click();
    await expect(page.locator('.template-picker > button')).toHaveCount(12);
    await capture('templates');
    await page.getByRole('tab', { name: 'Content', exact: true }).click();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.goto('/settings');
    await expect(
      page.getByRole('button', { name: 'Export native JSON', exact: true }),
    ).toBeVisible();
    await capture('settings');
    await expect(page.locator('body')).not.toContainText('VLR Resume Studio');
    const manifest = await (
      await page.request.get('/manifest.webmanifest')
    ).json();
    expect(manifest.name).toBe('Perfect Tie');
    for (const asset of [
      'logo-light.svg',
      'logo-dark.svg',
      'emblem-light.svg',
      'emblem-dark.svg',
      'favicon.svg',
      'favicon-16.png',
      'favicon-24.png',
      'favicon-32.png',
      'favicon-48.png',
      'favicon-128.png',
      'app-icon-192.png',
      'app-icon-512.png',
      'app-icon-maskable.png',
      'social-preview.png',
    ]) {
      const response = await page.request.get(`/brand/${asset}`);
      expect(response.status(), asset).toBe(200);
    }
  });
}
