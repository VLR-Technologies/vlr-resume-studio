import type { TemplateConfig } from './schemas';
import type { TemplateId } from './template-ids';
export type TemplateCategory =
  'ATS' | 'European' | 'Modern' | 'Technical & academic';
export const templateCategories: TemplateCategory[] = [
  'ATS',
  'European',
  'Modern',
  'Technical & academic',
];
export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  category: TemplateCategory;
  engine: 'react-pdf' | 'typst';
  version: 1;
  paperSizes: readonly ['A4', 'Letter'];
  controls: readonly string[];
  recommendedCategories: readonly string[];
  recommendations: string;
  description: string;
  preview: string;
  defaults: {
    typography: 'sans' | 'serif';
    bodyFontSize: number;
    headingFontSize: number;
    lineSpacing: number;
    sectionSpacing: number;
    headerStyle: 'left' | 'centered';
  };
  capabilities: readonly string[];
}
const controls = [
  'typography',
  'bodyFontSize',
  'headingFontSize',
  'lineSpacing',
  'sectionSpacing',
  'headerStyle',
  'accentColor',
  'margins',
  'showDividers',
  'pageSize',
] as const;
function define(
  id: TemplateId,
  name: string,
  category: TemplateCategory,
  engine: TemplateDefinition['engine'],
  description: string,
  recommendations: string,
  recommendedCategories: string[],
  capabilities: string[],
  defaults: Partial<TemplateDefinition['defaults']> = {},
): TemplateDefinition {
  return {
    id,
    name,
    category,
    engine,
    version: 1,
    paperSizes: ['A4', 'Letter'],
    controls,
    description,
    recommendations,
    recommendedCategories,
    capabilities,
    preview: `/templates/${id}.webp`,
    defaults: {
      typography: 'sans',
      bodyFontSize: 10,
      headingFontSize: 22,
      lineSpacing: 1.3,
      sectionSpacing: 6,
      headerStyle: 'left',
      ...defaults,
    },
  };
}
export const templateRegistry: readonly TemplateDefinition[] = [
  define(
    'classic',
    'ATS Essential',
    'ATS',
    'react-pdf',
    'Clear, simple, application ready',
    'General applications · graduates',
    ['graduate', 'full-time'],
    ['single column', 'inline dates'],
  ),
  define(
    'european',
    'European Professional',
    'European',
    'react-pdf',
    'Formal, with a date-led history',
    'European applications · professionals',
    ['full-time', 'graduate'],
    ['date column'],
  ),
  define(
    'modern',
    'Modern Professional',
    'Modern',
    'react-pdf',
    'A restrained accent & clean hierarchy',
    'Product · business · technology',
    ['full-time'],
    ['accent header'],
  ),
  define(
    'academic',
    'Academic / Research',
    'Technical & academic',
    'react-pdf',
    'Research, appointments & publications',
    'Researchers · doctoral candidates',
    ['research'],
    ['academic labels'],
    { typography: 'serif' },
  ),
  define(
    'typst-ats-minimal',
    'ATS Minimal',
    'ATS',
    'typst',
    'Compact hierarchy, inline dates and a quiet single-column reading flow.',
    'Early careers · general applications',
    ['internship', 'working-student', 'graduate'],
    ['compact single column', 'inline dates'],
    { bodyFontSize: 9.5, sectionSpacing: 4, headingFontSize: 21 },
  ),
  define(
    'typst-ats-structured',
    'ATS Structured',
    'ATS',
    'typst',
    'Full-width heading rules, stacked entry metadata and generous breathing room.',
    'Operations · business · experienced applicants',
    ['full-time', 'graduate'],
    ['stacked metadata', 'ruled headings'],
    { sectionSpacing: 5 },
  ),
  define(
    'typst-european-classic',
    'European Classic',
    'European',
    'typst',
    'A formal date ledger with aligned chronology and indented evidence.',
    'European roles · consultants',
    ['full-time', 'graduate'],
    ['date ledger', 'indented entries'],
    { typography: 'serif', sectionSpacing: 5 },
  ),
  define(
    'typst-german-professional',
    'German Professional',
    'European',
    'typst',
    'Lebenslauf masthead with a timeline rail and clear personal details.',
    'German applications · working students',
    ['working-student', 'internship', 'full-time'],
    ['timeline rail', 'Lebenslauf masthead'],
    { bodyFontSize: 9.5, headingFontSize: 24 },
  ),
  define(
    'typst-modern-executive',
    'Modern Executive',
    'Modern',
    'typst',
    'A broad nameplate and a narrow section-label column frame your career.',
    'Leadership · senior specialists',
    ['full-time'],
    ['section label rail', 'split section layout'],
    { typography: 'serif', headingFontSize: 28, sectionSpacing: 7 },
  ),
  define(
    'typst-modern-accent',
    'Modern Accent',
    'Modern',
    'typst',
    'Tinted section bands, offset entry markers and a crisp accent masthead.',
    'Design · product · customer-facing roles',
    ['full-time', 'graduate'],
    ['tinted bands', 'offset markers'],
    { headingFontSize: 26, sectionSpacing: 5 },
  ),
  define(
    'typst-technical-engineer',
    'Technical Engineer',
    'Technical & academic',
    'typst',
    'Numbered sections and clearly separated tools make technical evidence easy to scan.',
    'Software · data · engineering',
    ['full-time', 'working-student'],
    ['numbered sections', 'tools panels'],
    { bodyFontSize: 9.5, headingFontSize: 24, sectionSpacing: 5 },
  ),
  define(
    'typst-academic-research',
    'Academic Research',
    'Technical & academic',
    'typst',
    'A centered scholarly masthead, double heading rules and numbered publications.',
    'Research · doctoral · academic roles',
    ['research'],
    ['numbered publications', 'academic labels'],
    {
      typography: 'serif',
      headerStyle: 'centered',
      headingFontSize: 24,
      sectionSpacing: 5,
    },
  ),
];
export function getTemplate(id: TemplateId): TemplateDefinition {
  const definition = templateRegistry.find((t) => t.id === id);
  if (!definition) throw new Error('Unknown resume template.');
  return definition;
}
export function isTypstTemplate(id: TemplateId): boolean {
  return getTemplate(id).engine === 'typst';
}
/** Only presentation changes. Semantic section order and hidden content remain intact. */
export function selectTemplate(
  current: TemplateConfig,
  id: TemplateId,
): TemplateConfig {
  const entry = getTemplate(id);
  const rest = { ...current };
  delete rest.templateVersion;
  if (entry.engine === 'react-pdf')
    return {
      ...rest,
      schemaVersion: 1,
      templateId: id,
      typography: id === 'academic' ? 'serif' : current.typography,
    };
  return {
    ...rest,
    ...entry.defaults,
    schemaVersion: 2,
    templateId: id,
    templateVersion: entry.version,
  };
}
export function documentSectionTitle(
  id: string,
  title: string,
  templateId: TemplateId,
) {
  return (templateId === 'academic' ||
    templateId === 'typst-academic-research') &&
    id === 'work'
    ? 'Research & professional appointments'
    : title;
}
