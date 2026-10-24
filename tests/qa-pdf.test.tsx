// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderToBuffer } from '@react-pdf/renderer';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { configurePdfFonts, ResumeDocument } from '@/services/rendering/pdf';
import { buildRenderModel, pdfFilename } from '@/services/rendering/model';
import { createProfile, createVariant, newId } from '@/domain/factories';
import { qaWorkspace, profileTypes } from './fixtures/qa-profiles';
import type { Section, TemplateConfig } from '@/domain/schemas';
configurePdfFonts(resolve('public/fonts'));
const templates: TemplateConfig['templateId'][] = [
  'classic',
  'european',
  'modern',
  'academic',
];
const cases = [
  'empty',
  'minimal',
  'one-page',
  'two-page',
  'long-text',
  'bounds',
  'compact',
  ...profileTypes,
] as const;

describe.each(templates)(
  'Stage 1.5 independent PDF matrix: %s',
  (templateId) => {
    it.each(cases)(
      '%s layout, extraction, fonts, links, and bounds',
      async (scenario) => {
        let { profile, variant } = qaWorkspace(
          scenario === 'researcher'
            ? 'researcher'
            : scenario === 'professional'
              ? 'professional'
              : 'student',
        );
        if (scenario === 'empty' || scenario === 'minimal') {
          profile = createProfile('QA blank');
          if (scenario === 'minimal')
            profile.identity = {
              name: 'Zoë Weiß García Łukasz',
              email: 'qa@example.com',
            };
          variant = createVariant(profile, scenario);
        }
        if (scenario === 'one-page' || scenario === 'two-page') {
          const allowed: Section[] = [
            'summary',
            'education',
            'work',
            'projects',
            'skills',
            'languages',
            'links',
          ];
          variant.selectedSections = allowed;
          variant.sectionOrder = allowed;
          variant.selections = variant.selections
            .filter((s) => allowed.includes(s.section))
            .filter(
              (s, i, all) =>
                i === all.findIndex((other) => other.section === s.section),
            );
          variant.selections.forEach((s) => {
            s.snapshot.summary = undefined;
            s.snapshot.bullets = s.snapshot.bullets.slice(0, 1);
          });
          if (scenario === 'two-page')
            variant.summarySnapshot = profile.summary!.repeat(28);
        }
        if (scenario === 'long-text') {
          variant.summarySnapshot =
            'Long description with europäischen Zeichen, reliable evidence, and measured outcomes. '.repeat(
              75,
            );
          variant.selections = variant.selections.slice(0, 5);
          const s = variant.selections[0]!;
          s.snapshot.title = 'A long research title — '.repeat(8).slice(0, 190);
          s.snapshot.bullets = [
            {
              id: newId(),
              text: 'Detailed accomplishment with readable wrapped lines and a reproducible method. '.repeat(
                80,
              ),
            },
          ];
          const link = variant.selections.find((s) => 'url' in s.snapshot);
          if (link && 'url' in link.snapshot)
            link.snapshot.url = `https://example.com/${'long-path-'.repeat(120)}`;
        }
        variant.template.templateId = templateId;
        variant.template.typography =
          templateId === 'academic' ? 'serif' : 'sans';
        if (scenario === 'bounds') {
          variant.template = {
            ...variant.template,
            pageSize: 'Letter',
            bodyFontSize: 16,
            headingFontSize: 30,
            lineSpacing: 2,
            sectionSpacing: 20,
            margins: { top: 40, right: 40, bottom: 40, left: 40 },
            headerStyle: 'centered',
            accentColor: '#18486d',
            layout: { columns: 1, showDividers: false },
          };
          variant.selections = variant.selections.slice(0, 4);
        }
        if (scenario === 'compact')
          variant.template = {
            ...variant.template,
            bodyFontSize: 8,
            headingFontSize: 12,
            typography: templateId === 'academic' ? 'sans' : 'serif',
            lineSpacing: 1,
            sectionSpacing: 2,
            margins: { top: 8, right: 8, bottom: 8, left: 8 },
            accentColor: '#ffffff',
            headerStyle: 'left',
          };
        const model = buildRenderModel(profile, variant);
        const started = performance.now();
        const buffer = await renderToBuffer(<ResumeDocument model={model} />);
        const ms = performance.now() - started;
        const task = getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: false,
        });
        const pdf = await task.promise;
        try {
          const expected =
            scenario === 'empty' ||
            scenario === 'minimal' ||
            scenario === 'one-page'
              ? 1
              : scenario === 'two-page'
                ? 2
                : undefined;
          if (expected) expect(pdf.numPages).toBe(expected);
          if (profileTypes.some((type) => type === scenario)) {
            expect(pdf.numPages).toBeGreaterThanOrEqual(3);
            expect(pdf.numPages).toBeLessThanOrEqual(5);
          }
          const text: string[] = [],
            links: string[] = [];
          let fontCount = 0;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1 });
            expect(viewport.width).toBeCloseTo(
              scenario === 'bounds' ? 612 : 595.28,
              1,
            );
            expect(viewport.height).toBeCloseTo(
              scenario === 'bounds' ? 792 : 841.89,
              1,
            );
            const content = await page.getTextContent();
            const items = content.items.filter((item) => 'str' in item);
            const pageText = items.map((item) => item.str).join(' ');
            text.push(pageText);
            fontCount += Object.keys(content.styles).length;
            if (scenario !== 'empty')
              expect(pageText.trim().length).toBeGreaterThan(0);
            for (const item of items) {
              if (!item.str.trim()) continue;
              expect(
                item.transform[4],
                `${scenario} page ${i}: ${item.str}`,
              ).toBeGreaterThanOrEqual(-0.5);
              expect(
                item.transform[4] + item.width,
                `${scenario} page ${i}: ${item.str}`,
              ).toBeLessThanOrEqual(viewport.width + 0.5);
              expect(item.transform[5]).toBeGreaterThanOrEqual(0);
              expect(item.transform[5] + item.height).toBeLessThanOrEqual(
                viewport.height + 0.5,
              );
            }
            links.push(
              ...(await page.getAnnotations()).flatMap((a) =>
                a.url ? [a.url] : [],
              ),
            );
          }
          const extracted = text.join(' ').replace(/\s+/g, ' ');
          if (profileTypes.some((type) => type === scenario))
            for (const section of model.sections)
              for (const entry of section.entries) {
                if (!entry.summary || entry.summary.length > 300) continue;
                const titlePage = text.find((page) =>
                  page.includes(entry.title),
                );
                expect(
                  titlePage,
                  `QA-018: ${entry.title} must stay with its description`,
                ).toContain(entry.summary.slice(0, 45));
              }
          if (model.identity.name)
            expect(extracted).toContain(model.identity.name);
          if (scenario !== 'empty') expect(fontCount).toBeGreaterThan(0);
          if (scenario !== 'long-text')
            for (const section of model.sections)
              for (const entry of section.entries) {
                if (entry.title) expect(extracted).toContain(entry.title);
                if (entry.url) expect(links).toContain(entry.url);
              }
          expect(pdfFilename(model)).toMatch(/^[a-zA-Z0-9 -]+\.pdf$/);
          await mkdir('qa-artifacts/pdf', { recursive: true });
          await writeFile(
            `qa-artifacts/pdf/${templateId}-${scenario}.pdf`,
            buffer,
          );
          await writeFile(
            `qa-artifacts/pdf/${templateId}-${scenario}.json`,
            JSON.stringify(
              {
                scenario,
                templateId,
                pages: pdf.numPages,
                bytes: buffer.length,
                renderMs: Math.round(ms),
                fontCount,
                links,
                text: extracted,
              },
              null,
              2,
            ),
          );
        } finally {
          await task.destroy();
        }
      },
      30000,
    );
  },
);
