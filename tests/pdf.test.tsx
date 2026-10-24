// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDemo } from '@/data/demo';
import { newId } from '@/domain/factories';
import { buildRenderModel } from '@/services/rendering/model';
import { ResumeDocument, configurePdfFonts } from '@/services/rendering/pdf';

configurePdfFonts(resolve('public/fonts'));
describe('real text PDF rendering', () => {
  it.each(['classic', 'european', 'modern', 'academic'] as const)(
    'exports a readable short A4 %s PDF with Unicode and website links',
    async (templateId) => {
      const { profile, variant } = createDemo();
      profile.identity.name = 'Zoë Müller — Łukasz García';
      variant.identitySnapshot = profile.identity;
      for (const [title, url] of [
        ['GitHub', 'https://github.com/example'],
        ['LinkedIn', 'https://www.linkedin.com/in/example'],
        ['Website', 'https://example.com'],
      ]) {
        const entry = {
          id: newId(),
          kind: 'links' as const,
          title: title!,
          url: url!,
          bullets: [],
        };
        profile.links.push(entry);
        variant.selections.push({
          id: newId(),
          section: 'links',
          sourceEntryId: entry.id,
          sourceProfileUpdatedAt: profile.updatedAt,
          snapshot: entry,
        });
      }
      variant.template.templateId = templateId;
      variant.template.typography =
        templateId === 'academic' ? 'serif' : 'sans';
      const buffer = await renderToBuffer(
        <ResumeDocument model={buildRenderModel(profile, variant)} />,
      );
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
      const task = getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: false,
      });
      const document = await task.promise;
      try {
        expect(document.numPages).toBe(1);
        const page = await document.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        expect(viewport.width).toBeCloseTo(595.28, 1);
        expect(viewport.height).toBeCloseTo(841.89, 1);
        const content = await page.getTextContent();
        const text = content.items
          .flatMap((item) => ('str' in item ? [item.str] : []))
          .join(' ');
        expect(text).toContain('Zoë Müller');
        expect(text).toContain('Łukasz García');
        expect(text).toContain('Open Garden Classifier');
        const textItems = content.items.filter((item) => 'str' in item);
        const nameLine = textItems.find((item) =>
          item.str.includes('Zoë Müller'),
        )!;
        const headline = textItems.find((item) =>
          item.str.includes('AI Engineer Intern'),
        )!;
        expect(nameLine.transform[5] - headline.transform[5]).toBeGreaterThan(
          headline.height + 2,
        );
        for (const item of textItems) {
          if (!item.str.trim()) continue;
          expect(item.transform[4]).toBeGreaterThanOrEqual(0);
          expect(item.transform[4] + item.width).toBeLessThanOrEqual(596);
          expect(item.transform[5]).toBeGreaterThanOrEqual(8);
          expect(item.transform[5] + item.height).toBeLessThanOrEqual(842);
        }
        const annotations = await page.getAnnotations();
        expect(annotations.map((a) => a.url)).toEqual(
          expect.arrayContaining([
            'https://github.com/example',
            'https://www.linkedin.com/in/example',
            'https://example.com/',
          ]),
        );
        await mkdir('test-results/pdf', { recursive: true });
        await writeFile(`test-results/pdf/${templateId}-short.pdf`, buffer);
      } finally {
        await task.destroy();
      }
    },
    30000,
  );
  it.each(['classic', 'european', 'modern', 'academic'] as const)(
    'paginates long %s content with no blank pages, lost text or content beyond page bounds',
    async (templateId) => {
      const { profile, variant } = createDemo();
      variant.template.templateId = templateId;
      variant.template.typography =
        templateId === 'academic' ? 'serif' : 'sans';
      const selection = variant.selections.find(
        (s) => s.section === 'projects',
      )!;
      selection.snapshot.bullets = Array.from({ length: 90 }, (_, i) => ({
        id: newId(),
        text: `Evidence ${String(i).padStart(3, '0')}: Designed and evaluated a documented system with careful testing, reproducible analysis, reliable interfaces, and clear communication to the project team. `.repeat(
          i === 30 ? 20 : 1,
        ),
      }));
      const model = buildRenderModel(profile, variant);
      const buffer = await renderToBuffer(<ResumeDocument model={model} />);
      const task = getDocument({ data: new Uint8Array(buffer) });
      const document = await task.promise;
      try {
        expect(document.numPages).toBeGreaterThan(2);
        expect(document.numPages).toBeLessThan(12);
        let allText = '';
        for (let i = 1; i <= document.numPages; i++) {
          const page = await document.getPage(i);
          const content = await page.getTextContent();
          const items = content.items.filter((item) => 'str' in item);
          expect(items.length).toBeGreaterThan(3);
          allText += items.map((item) => item.str).join(' ');
          for (const item of items) {
            if (!item.str.trim()) continue;
            expect(item.transform[4]).toBeGreaterThanOrEqual(0);
            expect(item.transform[4] + item.width).toBeLessThanOrEqual(596);
            expect(item.transform[5]).toBeGreaterThanOrEqual(8);
            expect(item.transform[5]).toBeLessThanOrEqual(842);
          }
        }
        for (let i = 0; i < 90; i++)
          expect(allText).toContain(`Evidence ${String(i).padStart(3, '0')}:`);
        await mkdir('test-results/pdf', { recursive: true });
        await writeFile(`test-results/pdf/${templateId}-long.pdf`, buffer);
      } finally {
        await task.destroy();
      }
    },
    30000,
  );
});
