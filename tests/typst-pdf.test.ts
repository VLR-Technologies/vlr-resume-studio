// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import {
  createTypstCompiler,
  type TypstCompiler,
  type CoreModules,
} from 'typst-wasm';
import { createWorkerThread } from 'typst-wasm/worker/node';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { typstProject } from '@/services/rendering/typst/adapter';
import { buildRenderModel } from '@/services/rendering/model';
import { selectTemplate } from '@/domain/templates';
import { typstTemplateIds } from '@/domain/template-ids';
import { typstWorkspace, typstScenarios } from './fixtures/typst-scenarios';
import { documentSectionTitle } from '@/domain/templates';
let compiler: TypstCompiler;
beforeAll(async () => {
  const modules = await Promise.all(
    ['engine.core.wasm', 'engine.core2.wasm', 'engine.core3.wasm'].map(
      async (name) =>
        [
          name,
          await WebAssembly.compile(
            await readFile(
              new URL(import.meta.resolve(`typst-wasm/engine/${name}`)),
            ),
          ),
        ] as const,
    ),
  );
  compiler = await createTypstCompiler({
    backend: 'worker',
    worker: () =>
      createWorkerThread(
        new URL(import.meta.resolve('typst-wasm/worker/worker-thread')),
      ),
    coreModules: Object.fromEntries(modules) as CoreModules,
    fileLoaders: [
      async () => {
        throw new Error('External resources disabled');
      },
    ],
    fetch: async () => {
      throw new Error('Network disabled');
    },
    packageCache: false,
  });
  await compiler.addFonts(
    ...[
      'NotoSans-Regular.ttf',
      'NotoSans-Bold.ttf',
      'NotoSerif-Regular.ttf',
      'NotoSerif-Bold.ttf',
    ].map((name) => readFile(`public/fonts/${name}`)),
  );
}, 60000);
afterAll(async () => {
  await compiler?.dispose();
});
describe.each(typstTemplateIds)('Typst real compiler %s', (id) => {
  it.each(typstScenarios)(
    '%s: content, links, fonts and page bounds',
    async (scenario) => {
      const { profile, variant } = typstWorkspace(scenario);
      variant.template = selectTemplate(variant.template, id);
      if (scenario === 'bounds' || scenario === 'stress-fields')
        variant.template = {
          ...variant.template,
          pageSize: 'Letter',
          bodyFontSize: 16,
          headingFontSize: 30,
          lineSpacing: 2,
          sectionSpacing: 20,
          margins: { top: 40, right: 40, bottom: 40, left: 40 },
          headerStyle: 'centered',
          layout: { columns: 2, showDividers: false },
        };
      if (scenario === 'compact')
        variant.template = {
          ...variant.template,
          bodyFontSize: 8,
          headingFontSize: 12,
          lineSpacing: 1,
          sectionSpacing: 2,
          margins: { top: 8, right: 8, bottom: 8, left: 8 },
          typography: variant.template.typography === 'sans' ? 'serif' : 'sans',
          accentColor: '#ffffff',
        };
      const model = buildRenderModel(profile, variant);
      const project = typstProject(model);
      const start = performance.now();
      await compiler.clearFiles();
      await compiler.addSource('main.typ', project.source);
      await compiler.addFile('resume.json', project.data);
      const output = await compiler.compile({
        main: 'main.typ',
        format: 'pdf',
      });
      const renderMs = performance.now() - start;
      expect(output.diagnostics.filter((d) => d.severity === 'error')).toEqual(
        [],
      );
      expect(new TextDecoder().decode(output.output.slice(0, 5))).toBe('%PDF-');
      await mkdir('qa-artifacts/typst-pdf', { recursive: true });
      await writeFile(
        `qa-artifacts/typst-pdf/${id}-${scenario}.pdf`,
        output.output,
      );
      const task = getDocument({
        data: output.output.slice(),
        useSystemFonts: false,
      });
      const doc = await task.promise;
      const text: string[] = [],
        links: string[] = [];
      let fontCount = 0;
      try {
        if (scenario === 'minimal' || scenario === 'empty')
          expect(doc.numPages).toBe(1);
        if (scenario === 'multipage') expect(doc.numPages).toBeGreaterThan(2);
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i),
            viewport = page.getViewport({ scale: 1 });
          expect(viewport.width).toBeCloseTo(
            ['bounds', 'stress-fields'].includes(scenario) ? 612 : 595.28,
            1,
          );
          expect(viewport.height).toBeCloseTo(
            ['bounds', 'stress-fields'].includes(scenario) ? 792 : 841.89,
            1,
          );
          const content = await page.getTextContent();
          const items = content.items.filter((item) => 'str' in item);
          const pageText = items.map((item) => item.str).join(' ');
          text.push(pageText);
          if (scenario !== 'empty')
            expect(pageText.trim().length).toBeGreaterThan(0);
          fontCount += Object.keys(content.styles).length;
          for (const item of items) {
            if (!item.str.trim()) continue;
            const label = `${id} ${scenario} p${i}: ${item.str}`;
            expect(item.transform[4], label).toBeGreaterThanOrEqual(-0.5);
            expect(item.transform[4] + item.width, label).toBeLessThanOrEqual(
              viewport.width + 0.5,
            );
            expect(item.transform[5], label).toBeGreaterThanOrEqual(0);
            expect(item.transform[5] + item.height, label).toBeLessThanOrEqual(
              viewport.height + 0.5,
            );
          }
          links.push(
            ...(await page.getAnnotations()).flatMap((a) =>
              a.url ? [a.url] : [],
            ),
          );
        }
        const normalize = (value: string) =>
          value.replace(/[\s\u200b\u00ad-]/gu, '').toLocaleUpperCase();
        const extracted = normalize(text.join(' '));
        expect(extracted.includes('ELSEIFSTYLE==')).toBe(false);
        if (
          ['student', 'professional', 'researcher', 'bounds'].includes(scenario)
        ) {
          for (const section of model.sections)
            for (const entry of section.entries) {
              if (!entry.title || !entry.summary) continue;
              const page = text.find((page) =>
                normalize(page).includes(normalize(entry.title)),
              );
              expect(
                Boolean(
                  page &&
                  normalize(page).includes(
                    normalize(entry.summary.slice(0, 45)),
                  ),
                ),
                `Entry header must stay with evidence: ${id} ${scenario} ${entry.title}`,
              ).toBe(true);
            }
        }
        for (const value of Object.values(model.identity))
          if (value) expect(extracted).toContain(normalize(value));
        for (const section of model.sections) {
          expect(extracted).toContain(
            normalize(documentSectionTitle(section.id, section.title, id)),
          );
          if (section.text)
            expect(extracted).toContain(normalize(section.text));
          for (const entry of section.entries) {
            for (const value of [
              entry.title,
              entry.subtitle,
              entry.date,
              entry.summary,
              entry.details,
              ...entry.bullets.map((b) => b.text),
            ])
              if (value) expect(extracted).toContain(normalize(value));
            if (entry.url) expect(links).toContain(entry.url);
          }
        }
        if (scenario !== 'empty') expect(fontCount).toBeGreaterThan(0);
        await writeFile(
          `qa-artifacts/typst-pdf/${id}-${scenario}.json`,
          JSON.stringify(
            {
              scenario,
              templateId: id,
              pages: doc.numPages,
              bytes: output.output.length,
              renderMs,
              fontCount,
              links,
            },
            null,
            2,
          ),
        );
      } finally {
        await task.destroy();
      }
    },
    60000,
  );
});
it.each([
  '#read("/private/secret.txt")',
  '#image("https://example.org/tracker.png")',
  '#import "@preview/unknown:0.1.0": *',
])('denies compiler resource access: %s', async (source) => {
  await compiler.clearFiles();
  await compiler.addSource('main.typ', source);
  await expect(
    compiler.compile({ main: 'main.typ', format: 'pdf' }),
  ).rejects.toThrow();
});
