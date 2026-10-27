import { newId } from './factories';
import { selectTemplate, templateRegistry } from './templates';
import {
  type Evidence,
  type Section,
  type ResumeVariant,
  type TemplateConfig,
  sections,
} from './schemas';

export const sectionNames: Record<Section, string> = {
  summary: 'Professional summary',
  education: 'Education',
  work: 'Work experience',
  internships: 'Internships',
  projects: 'Projects',
  skills: 'Skills',
  languages: 'Languages',
  certifications: 'Certifications',
  publications: 'Publications',
  volunteer: 'Volunteer activities',
  awards: 'Achievements & awards',
  links: 'Professional links',
  custom: 'Custom sections',
};
export const templateNames = Object.fromEntries(
  templateRegistry.map((t) => [t.id, t.name]),
) as Record<TemplateConfig['templateId'], string>;
export function createEvidence(kind: Evidence['kind']): Evidence {
  const common = { id: newId(), title: '', bullets: [] };
  switch (kind) {
    case 'education':
      return { ...common, kind, institution: '', period: { ongoing: false } };
    case 'work':
    case 'internships':
    case 'volunteer':
      return { ...common, kind, organization: '', period: { ongoing: false } };
    case 'projects':
      return { ...common, kind, period: { ongoing: false }, technologies: [] };
    case 'skills':
      return { ...common, kind, category: 'technical', keywords: [] };
    case 'links':
      return { ...common, kind, url: 'https://' };
    default:
      return { ...common, kind };
  }
}
export function effectiveEvidence(
  v: ResumeVariant,
  selection: ResumeVariant['selections'][number],
): Evidence {
  const override = v.overrides.find((o) => o.selectionId === selection.id);
  const entry = structuredClone(override?.content ?? selection.snapshot);
  if (override?.title !== undefined) entry.title = override.title;
  if (override?.summary !== undefined) entry.summary = override.summary;
  entry.bullets = entry.bullets.map((b) => ({
    ...b,
    text:
      override?.bullets.find((o) => o.sourceBulletId === b.id)?.text ?? b.text,
  }));
  return entry;
}
export function updateContent(
  v: ResumeVariant,
  selectionId: string,
  content: Evidence,
): ResumeVariant {
  const selection = v.selections.find((s) => s.id === selectionId);
  if (!selection) return v;
  const previous = v.overrides.find((o) => o.selectionId === selectionId);
  return {
    ...v,
    overrides: [
      ...v.overrides.filter((o) => o.selectionId !== selectionId),
      {
        id: previous?.id ?? newId(),
        selectionId,
        content,
        bullets: [],
        provenance: {
          origin: 'user',
          evidenceIds: [selection.sourceEntryId],
          acceptedAt: new Date().toISOString(),
        },
      },
    ],
  };
}
export const rolePresets = [
  {
    name: 'AI / Machine Learning Engineer',
    emphasis: 'Model evaluation, datasets, deployment, and measured impact.',
    priority: ['projects', 'skills', 'work'],
  },
  {
    name: 'Agentic AI / LLM Engineer',
    emphasis:
      'Agent workflows, retrieval, evaluation, reliability, and responsible use.',
    priority: ['projects', 'skills', 'work'],
  },
  {
    name: 'Software Engineer',
    emphasis:
      'Shipped software, engineering decisions, testing, and team contributions.',
    priority: ['work', 'projects', 'skills'],
  },
  {
    name: 'Data Scientist',
    emphasis:
      'Statistical methods, experiments, model validation, and business outcomes.',
    priority: ['work', 'projects', 'skills'],
  },
  {
    name: 'Data Analyst',
    emphasis:
      'SQL, dashboards, clear analysis, and decisions your findings supported.',
    priority: ['skills', 'work', 'projects'],
  },
  {
    name: 'Cybersecurity',
    emphasis:
      'Threat analysis, security controls, investigations, and certifications.',
    priority: ['work', 'certifications', 'projects'],
  },
  {
    name: 'Product Management',
    emphasis:
      'Product outcomes, discovery, prioritization, and cross-team leadership.',
    priority: ['work', 'projects', 'skills'],
  },
  {
    name: 'General Professional',
    emphasis:
      'Relevant experience, transferable skills, and evidenced achievements.',
    priority: ['work', 'education', 'skills'],
  },
] satisfies { name: string; emphasis: string; priority: Section[] }[];
export function presetAdvice(
  category: ResumeVariant['employmentCategory']['kind'],
) {
  if (category === 'research')
    return {
      template: 'academic' as const,
      priority: ['education', 'publications', 'projects', 'work'] as Section[],
      length: 'Two or more pages as needed for research and publications.',
      optional: 'Teaching, conferences, volunteering, and awards.',
    };
  if (category === 'internship' || category === 'working-student')
    return {
      template: 'classic' as const,
      priority: [
        'education',
        'projects',
        'skills',
        'internships',
        'work',
      ] as Section[],
      length:
        'Aim for one focused page; a second page is fine for relevant evidence.',
      optional:
        'Languages, volunteering, and certifications. Include current study and availability when relevant.',
    };
  if (category === 'graduate')
    return {
      template: 'modern' as const,
      priority: ['education', 'projects', 'work', 'skills'] as Section[],
      length: 'Usually one to two pages.',
      optional: 'Awards, languages, and certifications.',
    };
  return {
    template: 'european' as const,
    priority: ['work', 'skills', 'education', 'projects'] as Section[],
    length: 'Usually one to two pages; prioritize recent relevant experience.',
    optional: 'Certifications, languages, publications, and volunteering.',
  };
}
export function applyPreset(v: ResumeVariant, role: string): ResumeVariant {
  const advice = presetAdvice(v.employmentCategory.kind);
  const categoryPriority: Section[] =
    v.employmentCategory.kind === 'research'
      ? advice.priority
      : ['internship', 'working-student', 'graduate'].includes(
            v.employmentCategory.kind,
          )
        ? ['education']
        : [];
  const priority: Section[] = [
    'summary',
    ...categoryPriority,
    ...(rolePresets.find((p) => p.name === role)?.priority ?? []),
    ...advice.priority,
  ];
  const order = [...new Set([...priority, ...v.sectionOrder, ...sections])];
  return {
    ...v,
    sectionOrder: order,
    template: {
      ...selectTemplate(v.template, advice.template),
      sectionOrder: order,
    },
  };
}
