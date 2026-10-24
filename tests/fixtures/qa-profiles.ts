import {
  createProfile,
  createVariant,
  newId,
} from '../../src/domain/factories';
import { createEvidence } from '../../src/domain/editor';
import {
  entrySectionSchema,
  type Evidence,
  type MasterCareerProfile,
} from '../../src/domain/schemas';

export const profileTypes = ['student', 'professional', 'researcher'] as const;
export type QaProfileType = (typeof profileTypes)[number];
/** Entirely fictional, repeatable career data. No private browser/user records are read. */
export function qaProfile(
  type: QaProfileType = 'student',
  scale = 1,
): MasterCareerProfile {
  const p = createProfile(`QA fictional ${type}`);
  p.identity = {
    name: {
      student: 'Mara Weiß',
      professional: 'Jonas García',
      researcher: 'Dr Élodie Martin',
    }[type],
    headline: {
      student: 'Werkstudentin Softwareentwicklung',
      professional: 'Senior Software & AI Engineer',
      researcher: 'Research Fellow — Reliable Machine Learning',
    }[type],
    email: `${type}@example.com`,
    phone: '+49 30 555 0100',
    location: 'Berlin, Germany',
  };
  p.summary =
    'Fictional QA profile. Builds reliable, documented systems and communicates results clearly. Experience includes careful evaluation, accessible tools, and collaboration across teams.';
  for (const kind of entrySectionSchema.options) {
    const count =
      kind === 'work'
        ? type === 'professional'
          ? 4
          : type === 'researcher'
            ? 3
            : 1
        : kind === 'projects'
          ? 3 * scale
          : kind === 'publications'
            ? type === 'researcher'
              ? 7 * scale
              : 1
            : ['education', 'skills', 'languages', 'links'].includes(kind)
              ? 2
              : 1;
    for (let i = 0; i < count; i++) {
      const e = createEvidence(kind);
      e.title = `${kind === 'projects' ? 'Reliable evaluation platform' : kind === 'education' ? 'MSc Computer Science' : kind === 'work' ? 'Research Software Engineer' : kind === 'skills' ? 'Engineering practices' : kind === 'languages' ? 'German' : kind === 'publications' ? 'Reproducible methods for trustworthy systems' : kind === 'links' ? 'Professional website' : kind === 'custom' ? 'Selected talks' : kind} ${i + 1}`;
      e.summary = `Fictional ${kind} entry ${i + 1}. Contributed to documented systems with reproducible experiments and clear handover notes.`;
      e.bullets = [
        'Designed and tested a reliable workflow with documented assumptions.',
        'Reviewed results with colleagues and communicated limitations.',
      ].map((text) => ({ id: newId(), text }));
      if ('organization' in e)
        e.organization = `Example Research Cooperative ${i + 1} (fictional)`;
      if (e.kind === 'education') {
        e.institution = 'Hanseatic Technical University (fictional)';
        e.qualification = 'Master of Science';
        e.location = 'Hamburg';
      }
      if (e.kind === 'work' || e.kind === 'internships')
        e.location = 'Berlin / hybrid';
      if ('period' in e)
        e.period = {
          start: '2023-10',
          end: i % 2 ? '2025-09' : undefined,
          ongoing: i % 2 === 0,
        };
      if (e.kind === 'skills') {
        e.category = i % 2 ? 'professional' : 'technical';
        e.keywords = [
          'Machine Learning',
          'GitHub Actions',
          'TypeScript',
          'Team communication',
        ];
      }
      if (e.kind === 'projects') {
        e.technologies = ['TypeScript', 'GitHub Actions', 'Python'];
        e.url = `https://example.com/projects/${i + 1}`;
      }
      if (e.kind === 'languages')
        e.proficiency = i ? 'C1 English' : 'C2 German';
      if (e.kind === 'certifications') {
        e.issuer = 'Example Institute';
        e.date = '2025-04';
        e.url = 'https://example.com/certification';
      }
      if (e.kind === 'publications') {
        e.publisher = 'Example Research Proceedings';
        e.date = '2025-06';
        e.url = `https://example.com/papers/${i + 1}`;
      }
      if (e.kind === 'awards') {
        e.awarder = 'Example Foundation';
        e.date = '2025';
      }
      if (e.kind === 'links')
        e.url = i
          ? 'https://www.linkedin.com/in/example'
          : 'https://github.com/example';
      if (['skills', 'languages', 'links'].includes(kind)) e.bullets = [];
      (p[kind] as Evidence[]).push(e);
    }
  }
  return p;
}
export function qaWorkspace(type: QaProfileType = 'student', scale = 1) {
  const profile = qaProfile(type, scale);
  const variant = createVariant(profile, `QA ${type} resume`);
  variant.employmentCategory = {
    kind:
      type === 'student'
        ? 'working-student'
        : type === 'researcher'
          ? 'research'
          : 'full-time',
  };
  return { profile, variant };
}
