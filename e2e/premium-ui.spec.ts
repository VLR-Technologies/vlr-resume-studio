import { expect, test, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { premiumWorkspace } from '../tests/fixtures/premium-workspace';
import { upload, readWorkspace, saved, dismissNotice } from './qa-support';

async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const path =
    process.env.UPDATE_PREMIUM_SCREENSHOTS === '1' &&
    info.project.name === 'desktop'
      ? `docs/qa/premium/${name}.png`
      : info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual((await page.viewportSize())!.width);
}
async function accessible(page: Page, selector: string) {
  const result = await new AxeBuilder({ page })
    .include(selector)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
}

for (const width of [1440, 390, 768, 1024, 1920]) {
  test(`premium workspace composition, focus and document isolation at ${width}px`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await mkdir('docs/qa/premium', { recursive: true });
    await page.setViewportSize({
      width,
      height: width === 390 ? 844 : width === 768 ? 1024 : 1000,
    });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'My Resumes', exact: true }),
    ).toBeVisible();
    await capture(page, info, `empty-${width}`);
    await noOverflow(page);
    await accessible(page, '.flow-shell');
    const data = premiumWorkspace();
    await page.goto('/settings');
    await upload(page, data);
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
    await capture(page, info, `dashboard-${width}`);
    await noOverflow(page);
    await accessible(page, '.flow-shell');
    await page
      .locator('.document-card')
      .first()
      .locator('.card-options > summary')
      .click();
    const menu = page.locator('.card-options[open] > div');
    const menuBox = await menu.boundingBox();
    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(width);
    expect(menuBox!.y).toBeGreaterThanOrEqual(0);
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(
      (await page.viewportSize())!.height,
    );
    await capture(page, info, `menu-${width}`);
    await page.locator('.card-options[open] > summary').click();
    await page
      .getByRole('link', {
        name: `Open resume: ${data.variants[0]!.title}`,
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
    await capture(page, info, `content-${width}`);
    await noOverflow(page);
    await accessible(page, '.flow-studio');
    const fontSize = await page
      .getByLabel('Full name', { exact: true })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(14);
    await page.getByLabel('Full name', { exact: true }).focus();
    await capture(page, info, `focus-${width}`);
    await page.getByRole('tab', { name: 'Design', exact: true }).click();
    await capture(page, info, `design-${width}`);
    await noOverflow(page);
    await accessible(page, '.flow-studio');
    if (width === 1440 || width === 390) {
      await page.locator('.advanced-design').scrollIntoViewIfNeeded();
      await capture(page, info, `design-spacing-${width}`);
      await page.locator('.advanced-design > summary').click();
      await page
        .getByLabel('Paper size', { exact: true })
        .scrollIntoViewIfNeeded();
      await capture(page, info, `design-advanced-${width}`);
      await accessible(page, '.flow-studio');
      await page.locator('.advanced-design > summary').click();
    }
    const before = (await readWorkspace(page)).variants.find(
      (v) => v.title === data.variants[0]!.title,
    )!;
    await page.getByLabel('Accent color', { exact: true }).fill('#8b4170');
    await saved(page);
    expect(
      await page
        .locator('.download-pdf')
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe('rgb(79, 101, 158)');
    if (width <= 800)
      await page
        .getByRole('button', { name: 'Browse all templates', exact: true })
        .click();
    else
      await page.getByRole('tab', { name: 'Templates', exact: true }).click();
    await expect(page.locator('.template-picker > button')).toHaveCount(12);
    // Lazy images outside the scrolling panel have no decode request yet in
    // Firefox/WebKit. Wait for the images the user can actually see.
    await expect
      .poll(() =>
        page.locator('.template-art img').evaluateAll((imgs) => {
          const visible = imgs.filter((img) => {
            const rect = img.getBoundingClientRect();
            return rect.top < innerHeight && rect.bottom > 0;
          }) as HTMLImageElement[];
          return (
            visible.length > 0 &&
            visible.every((img) => img.complete && img.naturalWidth > 0)
          );
        }),
      )
      .toBe(true);
    await capture(page, info, `templates-${width}`);
    await accessible(page, '.flow-studio');
    await page
      .locator('.template-picker > button')
      .filter({ hasText: 'European Professional' })
      .click();
    await saved(page);
    const after = (await readWorkspace(page)).variants.find(
      (v) => v.id === before.id,
    )!;
    expect(after.selections).toEqual(before.selections);
    expect(after.template.accentColor).toBe('#8b4170');
    expect(after.template.margins).toEqual(before.template.margins);
    expect(after.template.bodyFontSize).toBe(before.template.bodyFontSize);
    if (width <= 800)
      await page.getByRole('tab', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.pdf-proof > [role=status]')).toContainText(
      'exact PDF layout',
      { timeout: 30000 },
    );
    await expect(page.locator('.pdf-proof canvas').first()).toBeVisible();
    await capture(page, info, `preview-${width}`);
    await noOverflow(page);
    const canvas = await page
      .locator('.pdf-proof canvas')
      .first()
      .boundingBox();
    expect(canvas!.width).toBeLessThanOrEqual(width);
    await page
      .getByRole('button', { name: '100% · Zoom', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Fit to page · Zoom' }),
    ).toBeVisible();
    await noOverflow(page);
    await page.getByRole('button', { name: 'Fit to page · Zoom' }).click();
    await page.getByRole('tab', { name: 'Content', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(
      page.getByRole('tab', { name: 'Design', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    if (width === 1440 || width === 390) {
      await page.goto('/settings');
      await expect(
        page.getByRole('button', { name: 'Export native JSON', exact: true }),
      ).toBeVisible();
      await capture(page, info, `settings-${width}`);
      await noOverflow(page);
      await accessible(page, '.flow-shell');
      await page.goto('/profile');
      await expect(page.getByLabel('Full name', { exact: true })).toHaveValue(
        'Avery Morgan',
      );
      await capture(page, info, `profile-${width}`);
      await noOverflow(page);
      await accessible(page, '.flow-shell');
      await page.goto(`/resumes/${before.id}`);
      await page.getByRole('tab', { name: 'Design', exact: true }).click();
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const duration = await page
      .locator('.font-choices button')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(parseFloat(duration)).toBeLessThan(0.001);
  });
}
