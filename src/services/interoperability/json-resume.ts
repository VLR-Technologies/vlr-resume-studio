import { profileSchema } from '@/domain/schemas';
import { validate } from '@/domain/validation';
import type { ConversionResult } from './contracts';
interface StandardEntry {
  name?: string;
  position?: string;
  institution?: string;
  studyType?: string;
  description?: string;
  summary?: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
  keywords?: string[];
  language?: string;
  fluency?: string;
  issuer?: string;
  date?: string;
  url?: string;
  publisher?: string;
  releaseDate?: string;
  title?: string;
  awarder?: string;
  organization?: string;
}
export interface StandardJsonResume {
  basics: {
    name?: string;
    label?: string;
    email?: string;
    phone?: string;
    summary?: string;
    profiles: { network: string; url: string }[];
  };
  education: StandardEntry[];
  work: StandardEntry[];
  projects: StandardEntry[];
  skills: StandardEntry[];
  languages: StandardEntry[];
  certificates: StandardEntry[];
  publications: StandardEntry[];
  volunteer: StandardEntry[];
  awards: StandardEntry[];
}
/** Profile projection only. A future variant exporter must resolve selections/overrides first. */
export function projectProfileToJsonResume(
  input: unknown,
): ConversionResult<StandardJsonResume> {
  const p = validate(profileSchema, input);
  const warnings = [
    'This profile projection omits VLR identifiers, variants, overrides, revisions, templates, selection order, skill categories, custom sections, and unsupported evidence details.',
    'Free-form location is omitted until a structured address mapping exists. Use a VLR backup for full fidelity.',
  ];
  const standardDate = (value?: string) => {
    if (!value || /^[12]\d{3}/.test(value)) return value;
    warnings.push(
      `Date ${value} is outside the standard schema year range and was omitted.`,
    );
    return undefined;
  };
  const period = (v: { start?: string; end?: string; ongoing: boolean }) => ({
    startDate: standardDate(v.start),
    endDate: v.ongoing ? undefined : standardDate(v.end),
  });
  return {
    data: {
      basics: {
        name: p.identity.name,
        label: p.identity.headline,
        email: p.identity.email,
        phone: p.identity.phone,
        summary: p.summary,
        profiles: p.links.map((e) => ({ network: e.title, url: e.url })),
      },
      education: p.education.map((e) => ({
        institution: e.institution,
        studyType: e.qualification ?? e.title,
        ...period(e.period),
      })),
      work: [...p.work, ...p.internships].map((e) => ({
        name: e.organization,
        position: e.title,
        summary: e.summary,
        highlights: e.bullets.map((b) => b.text),
        ...period(e.period),
      })),
      projects: p.projects.map((e) => ({
        name: e.title,
        description: e.summary,
        highlights: e.bullets.map((b) => b.text),
        url: e.url,
        ...period(e.period),
      })),
      skills: p.skills.map((e) => ({ name: e.title, keywords: e.keywords })),
      languages: p.languages.map((e) => ({
        language: e.title,
        fluency: e.proficiency,
      })),
      certificates: p.certifications.map((e) => ({
        name: e.title,
        issuer: e.issuer,
        date: standardDate(e.date),
        url: e.url,
      })),
      publications: p.publications.map((e) => ({
        name: e.title,
        publisher: e.publisher,
        releaseDate: standardDate(e.date),
        url: e.url,
        summary: e.summary,
      })),
      volunteer: p.volunteer.map((e) => ({
        organization: e.organization,
        position: e.title,
        summary: e.summary,
        highlights: e.bullets.map((b) => b.text),
        ...period(e.period),
      })),
      awards: p.awards.map((e) => ({
        title: e.title,
        awarder: e.awarder,
        date: standardDate(e.date),
        summary: e.summary,
      })),
    },
    warnings,
  };
}
