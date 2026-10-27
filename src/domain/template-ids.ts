export const legacyTemplateIds = [
  'classic',
  'european',
  'modern',
  'academic',
] as const;
export const typstTemplateIds = [
  'typst-ats-minimal',
  'typst-ats-structured',
  'typst-european-classic',
  'typst-german-professional',
  'typst-modern-executive',
  'typst-modern-accent',
  'typst-technical-engineer',
  'typst-academic-research',
] as const;
export type LegacyTemplateId = (typeof legacyTemplateIds)[number];
export type TypstTemplateId = (typeof typstTemplateIds)[number];
export type TemplateId = LegacyTemplateId | TypstTemplateId;
