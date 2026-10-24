import { z } from 'zod';

export const SCHEMA_VERSION = 1 as const;
export const idSchema = z.uuid();
const text = z.string().max(10_000);
const label = z.string().trim().max(200);
const stamp = z.iso.datetime();
export const careerDateSchema = z.string().refine((value) => {
  if (!/^\d{4}(-\d{2})?(-\d{2})?$/.test(value)) return false;
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return (
    day <=
    ([31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ??
      0)
  );
}, 'Use a real date as YYYY, YYYY-MM, or YYYY-MM-DD.');
export const periodSchema = z
  .strictObject({
    start: careerDateSchema.optional(),
    end: careerDateSchema.optional(),
    ongoing: z.boolean(),
  })
  .refine(
    (v) => !(v.ongoing && v.end),
    'An ongoing period cannot have an end date.',
  )
  .refine(
    (v) =>
      !v.start || !v.end || v.end.padEnd(10, '9') >= v.start.padEnd(10, '0'),
    'End date must follow start date.',
  );
export const bulletSchema = z.strictObject({ id: idSchema, text });
const common = {
  id: idSchema,
  title: label,
  summary: text.optional(),
  bullets: z.array(bulletSchema).max(200),
};
const url = z
  .url()
  .refine((value) => /^https?:\/\//.test(value), 'Use an HTTP or HTTPS URL.');
const education = z.strictObject({
  ...common,
  kind: z.literal('education'),
  institution: label,
  qualification: label.optional(),
  period: periodSchema,
});
const work = z.strictObject({
  ...common,
  kind: z.literal('work'),
  organization: label,
  location: label.optional(),
  period: periodSchema,
});
const internships = z.strictObject({
  ...common,
  kind: z.literal('internships'),
  organization: label,
  period: periodSchema,
});
const projects = z.strictObject({
  ...common,
  kind: z.literal('projects'),
  url: url.optional(),
  period: periodSchema,
});
const skills = z.strictObject({
  ...common,
  kind: z.literal('skills'),
  keywords: z.array(label).max(100),
  category: z.enum(['technical', 'professional']),
});
const languages = z.strictObject({
  ...common,
  kind: z.literal('languages'),
  proficiency: label.optional(),
});
const certifications = z.strictObject({
  ...common,
  kind: z.literal('certifications'),
  issuer: label.optional(),
  date: careerDateSchema.optional(),
  url: url.optional(),
});
const publications = z.strictObject({
  ...common,
  kind: z.literal('publications'),
  publisher: label.optional(),
  date: careerDateSchema.optional(),
  url: url.optional(),
});
const volunteer = z.strictObject({
  ...common,
  kind: z.literal('volunteer'),
  organization: label,
  period: periodSchema,
});
const awards = z.strictObject({
  ...common,
  kind: z.literal('awards'),
  awarder: label.optional(),
  date: careerDateSchema.optional(),
});
const links = z.strictObject({ ...common, kind: z.literal('links'), url });
const custom = z.strictObject({ ...common, kind: z.literal('custom') });
export const evidenceSchema = z
  .discriminatedUnion('kind', [
    education,
    work,
    internships,
    projects,
    skills,
    languages,
    certifications,
    publications,
    volunteer,
    awards,
    links,
    custom,
  ])
  .refine(uniqueIds, 'Evidence identifiers must be unique.');
export const entrySectionSchema = z.enum([
  'education',
  'work',
  'internships',
  'projects',
  'skills',
  'languages',
  'certifications',
  'publications',
  'volunteer',
  'awards',
  'links',
  'custom',
]);
export const sectionSchema = z.enum(['summary', ...entrySectionSchema.options]);
export const sections = sectionSchema.options;
export type Section = z.infer<typeof sectionSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
function uniqueIds(value: unknown): boolean {
  const ids = new Set<string>();
  const visit = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return true;
    if (Array.isArray(node)) return node.every(visit);
    for (const [key, v] of Object.entries(node)) {
      if (key === 'id' && typeof v === 'string') {
        if (ids.has(v)) return false;
        ids.add(v);
      } else if (!visit(v)) return false;
    }
    return true;
  };
  return visit(value);
}
const base = {
  id: idSchema,
  schemaVersion: z.literal(SCHEMA_VERSION),
  createdAt: stamp,
  updatedAt: stamp,
};
export const profileSchema = z
  .strictObject({
    ...base,
    label: label.min(1),
    isDemo: z.boolean(),
    identity: z.strictObject({
      name: label.optional(),
      headline: label.optional(),
      email: z.email().optional(),
      phone: label.optional(),
      location: label.optional(),
    }),
    summary: text.optional(),
    education: z.array(education).max(500),
    work: z.array(work).max(500),
    internships: z.array(internships).max(500),
    projects: z.array(projects).max(500),
    skills: z.array(skills).max(500),
    languages: z.array(languages).max(500),
    certifications: z.array(certifications).max(500),
    publications: z.array(publications).max(500),
    volunteer: z.array(volunteer).max(500),
    awards: z.array(awards).max(500),
    links: z.array(links).max(500),
    custom: z.array(custom).max(500),
  })
  .refine(uniqueIds, 'Profile and evidence identifiers must be unique.')
  .refine((v) => v.updatedAt >= v.createdAt, 'Invalid record timestamps.');
export type MasterCareerProfile = z.infer<typeof profileSchema>;
export const employmentCategorySchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.enum([
      'internship',
      'working-student',
      'graduate',
      'full-time',
      'research',
    ]),
  }),
  z.strictObject({ kind: z.literal('custom'), label: label.min(1) }),
]);
export const templateConfigSchema = z
  .strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION),
    templateId: z.enum(['classic', 'european', 'academic']),
    pageSize: z.enum(['A4', 'Letter']),
    margins: z.strictObject({
      top: z.number().min(8).max(40),
      right: z.number().min(8).max(40),
      bottom: z.number().min(8).max(40),
      left: z.number().min(8).max(40),
    }),
    typography: z.enum(['sans', 'serif']),
    bodyFontSize: z.number().min(8).max(16),
    headingFontSize: z.number().min(12).max(30),
    lineSpacing: z.number().min(1).max(2),
    sectionSpacing: z.number().min(2).max(20),
    headerStyle: z.enum(['left', 'centered']),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    hiddenSections: z.array(sectionSchema),
    sectionOrder: z.array(sectionSchema),
    layout: z.strictObject({
      columns: z.union([z.literal(1), z.literal(2)]),
      showDividers: z.boolean(),
    }),
  })
  .refine(
    (v) =>
      new Set(v.sectionOrder).size === v.sectionOrder.length &&
      new Set(v.hiddenSections).size === v.hiddenSections.length,
    'Template sections must be unique.',
  );
export type TemplateConfig = z.infer<typeof templateConfigSchema>;
export const selectionSchema = z
  .strictObject({
    id: idSchema,
    section: entrySectionSchema,
    sourceEntryId: idSchema,
    sourceProfileUpdatedAt: stamp,
    snapshot: evidenceSchema,
  })
  .refine(
    (v) => v.section === v.snapshot.kind && v.sourceEntryId === v.snapshot.id,
    'Selection must match its source snapshot.',
  );
export const overrideSchema = z.strictObject({
  id: idSchema,
  selectionId: idSchema,
  title: label.optional(),
  summary: text.optional(),
  bullets: z.array(z.strictObject({ sourceBulletId: idSchema, text })).max(200),
  provenance: z.strictObject({
    origin: z.enum(['user', 'ai-suggestion']),
    evidenceIds: z.array(idSchema).min(1),
    provider: label.optional(),
    model: label.optional(),
    proposedAt: stamp.optional(),
    acceptedAt: stamp.optional(),
  }),
});
export const variantSchema = z
  .strictObject({
    ...base,
    sourceProfileId: idSchema,
    title: label.min(1),
    targetRole: label,
    employmentCategory: employmentCategorySchema,
    locale: z.string().refine((v) => {
      try {
        return Intl.getCanonicalLocales(v).length === 1;
      } catch {
        return false;
      }
    }, 'Use a valid locale.'),
    selectedSections: z.array(sectionSchema),
    sectionOrder: z.array(sectionSchema),
    selections: z.array(selectionSchema).max(1000),
    summarySnapshot: text.optional(),
    overrides: z.array(overrideSchema).max(1000),
    template: templateConfigSchema,
  })
  .superRefine((v, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (v.updatedAt < v.createdAt) fail('Invalid record timestamps.');
    for (const values of [v.selectedSections, v.sectionOrder])
      if (new Set(values).size !== values.length)
        fail('Sections must be unique.');
    if (v.selectedSections.some((s) => !v.sectionOrder.includes(s)))
      fail('Every selected section needs an order.');
    if (
      new Set(v.selections.map((s) => s.id)).size !== v.selections.length ||
      new Set(v.selections.map((s) => s.sourceEntryId)).size !==
        v.selections.length
    )
      fail('Duplicate selections.');
    if (
      new Set(v.overrides.map((o) => o.id)).size !== v.overrides.length ||
      new Set(v.overrides.map((o) => o.selectionId)).size !== v.overrides.length
    )
      fail('Duplicate overrides.');
    for (const selection of v.selections)
      if (!v.selectedSections.includes(selection.section))
        fail('Selection section is hidden.');
    for (const o of v.overrides) {
      const selection = v.selections.find((s) => s.id === o.selectionId);
      if (!selection) {
        fail('Override refers to a missing selection.');
        continue;
      }
      const evidenceIds = [
        selection.sourceEntryId,
        ...selection.snapshot.bullets.map((b) => b.id),
      ];
      if (o.provenance.evidenceIds.some((id) => !evidenceIds.includes(id)))
        fail('Override evidence is unsupported.');
      if (
        o.bullets.some(
          (b) =>
            !selection.snapshot.bullets.some(
              (source) => source.id === b.sourceBulletId,
            ),
        )
      )
        fail('Override bullet source is missing.');
      if (
        new Set(o.bullets.map((b) => b.sourceBulletId)).size !==
        o.bullets.length
      )
        fail('Duplicate bullet overrides.');
    }
  });
export type ResumeVariant = z.infer<typeof variantSchema>;
export const revisionSchema = z
  .strictObject({
    id: idSchema,
    schemaVersion: z.literal(SCHEMA_VERSION),
    variantId: idSchema,
    createdAt: stamp,
    reason: z.enum(['metadata-update', 'restore']),
    snapshot: variantSchema,
  })
  .refine(
    (v) => v.variantId === v.snapshot.id,
    'Revision belongs to a different variant.',
  );
export type ResumeRevision = z.infer<typeof revisionSchema>;
