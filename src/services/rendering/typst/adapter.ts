import { z } from 'zod';
import {
  identitySchema,
  templateConfigSchema,
  sectionSchema,
} from '@/domain/schemas';
import { documentSectionTitle, getTemplate } from '@/domain/templates';
import type { ResumeRenderModel } from '../model';
import { documentAccent } from '../colors';
import source from './resume.typ?raw';
const text = z.string().max(30_000);
const entrySchema = z.strictObject({
  id: z.uuid(),
  title: text,
  subtitle: text,
  date: text,
  summary: text,
  details: text,
  bullets: z.array(z.strictObject({ id: z.uuid(), text })).max(200),
  url: z
    .url()
    .refine((v) => /^https?:\/\//.test(v))
    .optional(),
});
const inputSchema = z.strictObject({
  title: text,
  identity: identitySchema,
  sections: z
    .array(
      z.strictObject({
        id: sectionSchema,
        title: text,
        text: text.optional(),
        entries: z.array(entrySchema).max(1000),
      }),
    )
    .max(13),
  template: templateConfigSchema,
  warnings: z.array(text),
});
/** Soft break only long unspaced runs. The link destination remains byte-for-byte intact. */
export function wrapText(value: string): string {
  return value.replace(/[^\s\u200b]{32,}/gu, (run) =>
    Array.from(run).reduce(
      (out, char, index) =>
        out + (index > 0 && index % 8 === 0 ? '\u200b' : '') + char,
      '',
    ),
  );
}
export function typstProject(model: ResumeRenderModel): {
  source: string;
  data: Uint8Array;
} {
  const m = inputSchema.parse(model);
  const definition = getTemplate(m.template.templateId);
  if (
    definition.engine !== 'typst' ||
    m.template.templateVersion !== definition.version
  )
    throw new Error('Unsupported Typst template version.');
  const data = {
    title: m.title,
    headerLength: Object.values(m.identity).reduce(
      (total, value) => total + (value?.length ?? 0),
      0,
    ),
    emailLabel: wrapText(m.identity.email ?? ''),
    identity: Object.fromEntries(
      Object.entries(m.identity).map(([k, v]) => [
        k,
        k === 'email' ? v : wrapText(v),
      ]),
    ),
    template: m.template,
    accent: documentAccent(m.template),
    sections: m.sections.map((s) => ({
      ...s,
      title: documentSectionTitle(s.id, s.title, m.template.templateId),
      text: wrapText(s.text ?? ''),
      entries: s.entries.map((e) => ({
        ...e,
        title: wrapText(e.title),
        subtitle: wrapText(e.subtitle),
        summary: wrapText(e.summary),
        details: wrapText(e.details),
        url: e.url ?? null,
        urlLabel: wrapText(e.url ?? ''),
        bullets: e.bullets.map((b) => ({ ...b, text: wrapText(b.text) })),
      })),
    })),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  if (bytes.length > 5 * 1024 * 1024)
    throw new Error(
      'This document exceeds the 5 MiB compilation limit. Reduce selected content.',
    );
  return { source, data: bytes };
}
