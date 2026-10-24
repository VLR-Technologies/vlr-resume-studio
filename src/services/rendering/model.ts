import {
  type Evidence,
  type MasterCareerProfile,
  type ResumeVariant,
  type TemplateConfig,
  variantSchema,
  profileSchema,
} from '@/domain/schemas';
import { effectiveEvidence, sectionNames } from '@/domain/editor';
import { DataError, validate } from '@/domain/validation';

export interface RenderEntry {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  summary: string;
  details: string;
  bullets: { id: string; text: string }[];
  url?: string;
}
export interface RenderSection {
  id: string;
  title: string;
  text?: string;
  entries: RenderEntry[];
}
export interface ResumeRenderModel {
  title: string;
  identity: MasterCareerProfile['identity'];
  sections: RenderSection[];
  template: TemplateConfig;
  warnings: string[];
}
export function renderEntry(e: Evidence): RenderEntry {
  const subtitle = [
    'organization' in e
      ? e.organization
      : 'institution' in e
        ? e.institution
        : 'issuer' in e
          ? e.issuer
          : 'publisher' in e
            ? e.publisher
            : 'awarder' in e
              ? e.awarder
              : '',
    'qualification' in e ? e.qualification : '',
    'location' in e ? e.location : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    id: e.id,
    title: e.title,
    subtitle,
    date:
      'period' in e
        ? [e.period.start, e.period.ongoing ? 'Present' : e.period.end]
            .filter(Boolean)
            .join(' – ')
        : 'date' in e
          ? (e.date ?? '')
          : '',
    summary: e.summary ?? '',
    details:
      'keywords' in e
        ? e.keywords.filter(Boolean).join(' · ')
        : 'technologies' in e
          ? (e.technologies?.filter(Boolean).join(' · ') ?? '')
          : 'proficiency' in e
            ? (e.proficiency ?? '')
            : '',
    bullets: e.bullets.filter((b) => b.text.trim()),
    url: 'url' in e ? e.url : undefined,
  };
}
/** One pure boundary between career evidence, variant wording, and document layout. */
export function buildRenderModel(
  profileInput: MasterCareerProfile,
  variantInput: ResumeVariant,
): ResumeRenderModel {
  const profile = validate(profileSchema, profileInput);
  const v = validate(variantSchema, variantInput);
  if (profile.id !== v.sourceProfileId)
    throw new DataError(
      'REFERENCE',
      'Render source does not match this resume.',
    );
  // A present override is a complete optional identity, so cleared fields stay cleared in JSON/YAML.
  const identity = {
    ...(v.identityOverride ?? v.identitySnapshot ?? profile.identity),
  };
  for (const key of v.hiddenIdentityFields ?? []) delete identity[key];
  const warnings: string[] = [];
  if (!v.identitySnapshot)
    warnings.push(
      'This older resume uses current master personal details. Use source refresh to pin them for future edits.',
    );
  if (
    JSON.stringify(v.identitySnapshot ?? profile.identity) !==
    JSON.stringify(profile.identity)
  )
    warnings.push(
      'Personal details differ from the master profile. Your pinned details are preserved.',
    );
  if ((profile.summary ?? '') !== (v.summarySnapshot ?? ''))
    warnings.push('The master summary differs from this resume.');
  for (const s of v.selections) {
    const current = profile[s.section].find((e) => e.id === s.sourceEntryId);
    if (!current)
      warnings.push(
        `Source removed: ${s.snapshot.title || sectionNames[s.section]}. Pinned content is retained.`,
      );
    else if (JSON.stringify(current) !== JSON.stringify(s.snapshot))
      warnings.push(
        `Source changed: ${s.snapshot.title || sectionNames[s.section]}. Review before refreshing.`,
      );
  }
  // Variant order is the semantic authority; template order is synchronized by the editor.
  const sections: RenderSection[] = v.sectionOrder
    .filter(
      (s) =>
        v.selectedSections.includes(s) &&
        !v.template.hiddenSections.includes(s),
    )
    .flatMap<RenderSection>((s) => {
      if (s === 'summary')
        return v.summarySnapshot?.trim()
          ? [
              {
                id: s,
                title: sectionNames[s],
                text: v.summarySnapshot,
                entries: [],
              },
            ]
          : [];
      const entries = v.selections
        .filter((selection) => selection.section === s)
        .map((selection) => renderEntry(effectiveEvidence(v, selection)));
      return entries.length ? [{ id: s, title: sectionNames[s], entries }] : [];
    });
  return { title: v.title, identity, sections, template: v.template, warnings };
}
export function pdfFilename(model: ResumeRenderModel) {
  const stem = [model.identity.name, model.title]
    .filter(Boolean)
    .join(' - ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 140);
  return `${stem || 'VLR-Resume'}.pdf`;
}
