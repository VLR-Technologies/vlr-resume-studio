import {
  type MasterCareerProfile,
  type ResumeVariant,
  type TemplateConfig,
  profileSchema,
  variantSchema,
  templateConfigSchema,
  sections,
  entrySectionSchema,
} from './schemas';
import { DataError, validate } from './validation';
export const newId = () => crypto.randomUUID();
export function createProfile(
  label = 'My career profile',
): MasterCareerProfile {
  const now = new Date().toISOString();
  return validate(profileSchema, {
    id: newId(),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    label,
    isDemo: false,
    identity: {},
    education: [],
    work: [],
    internships: [],
    projects: [],
    skills: [],
    languages: [],
    certifications: [],
    publications: [],
    volunteer: [],
    awards: [],
    links: [],
    custom: [],
  });
}
export function createTemplate(): TemplateConfig {
  return validate(templateConfigSchema, {
    schemaVersion: 1,
    templateId: 'classic',
    pageSize: 'A4',
    margins: { top: 18, right: 18, bottom: 18, left: 18 },
    typography: 'sans',
    bodyFontSize: 10,
    headingFontSize: 22,
    lineSpacing: 1.3,
    sectionSpacing: 6,
    headerStyle: 'left',
    accentColor: '#245b4b',
    hiddenSections: [],
    sectionOrder: [...sections],
    layout: { columns: 1, showDividers: true },
  });
}
export function createVariant(
  profile: MasterCareerProfile,
  title = 'Untitled resume',
  targetRole = '',
): ResumeVariant {
  const source = validate(profileSchema, profile);
  const now = new Date().toISOString();
  return validate(variantSchema, {
    id: newId(),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    sourceProfileId: source.id,
    title,
    targetRole,
    employmentCategory: { kind: 'graduate' },
    locale: 'en-GB',
    selectedSections: [...sections],
    sectionOrder: [...sections],
    selections: entrySectionSchema.options.flatMap((section) =>
      source[section].map((entry) => ({
        id: newId(),
        section,
        sourceEntryId: entry.id,
        sourceProfileUpdatedAt: source.updatedAt,
        snapshot: structuredClone(entry),
      })),
    ),
    summarySnapshot: source.summary,
    identitySnapshot: structuredClone(source.identity),
    overrides: [],
    template: createTemplate(),
  });
}
export function resolveSelections(
  profile: MasterCareerProfile,
  variant: ResumeVariant,
) {
  if (profile.id !== variant.sourceProfileId)
    throw new DataError('REFERENCE', 'Variant belongs to a different profile.');
  return variant.selections.map((selection) => {
    const current = profile[selection.section].find(
      (e) => e.id === selection.sourceEntryId,
    );
    const status = !current
      ? 'missing'
      : JSON.stringify(current) === JSON.stringify(selection.snapshot)
        ? 'current'
        : 'changed';
    // Pinned evidence remains predictable until a user explicitly accepts source changes.
    return {
      selection,
      evidence: selection.snapshot,
      override: variant.overrides.find((o) => o.selectionId === selection.id),
      status,
    };
  });
}
