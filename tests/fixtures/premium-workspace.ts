import {
  createProfile,
  createVariant,
  newId,
} from '../../src/domain/factories';
import type { Evidence } from '../../src/domain/schemas';
import { createEvidence } from '../../src/domain/editor';
import type { VlrBackup } from '../../src/services/interoperability/contracts';

function evidence<K extends Evidence['kind']>(kind: K) {
  return createEvidence(kind) as Extract<Evidence, { kind: K }>;
}

/** Fictional visual-QA data, imported through the normal review flow. */
export function premiumWorkspace(): VlrBackup {
  const profile = createProfile('Avery Morgan · Career profile');
  profile.identity = {
    name: 'Avery Morgan',
    headline: 'Senior Product Designer',
    email: 'avery@example.com',
    phone: '+49 30 555 0142',
    location: 'Berlin, Germany',
  };
  profile.summary =
    'Product designer bringing clarity to complex experiences. I partner with thoughtful teams to build useful, accessible products — from the first conversation to the final detail.';
  const work = evidence('work');
  Object.assign(work, {
    title: 'Senior Product Designer',
    organization: 'Forma Studio',
    location: 'Berlin, Germany',
    period: { start: '2022-03', ongoing: true },
    summary:
      'Leading end-to-end design for a collaborative workspace used by independent creative teams.',
    bullets: [
      {
        id: newId(),
        text: 'Simplified onboarding through research and prototyping, helping new teams reach their first project faster.',
      },
      {
        id: newId(),
        text: 'Created a shared design system with engineering, improving consistency across web and mobile.',
      },
    ],
  });
  const previous = evidence('work');
  Object.assign(previous, {
    title: 'Product Designer',
    organization: 'Northstar Digital',
    location: 'Amsterdam, Netherlands',
    period: { start: '2019-08', end: '2022-02', ongoing: false },
    summary: '',
    bullets: [
      {
        id: newId(),
        text: 'Designed thoughtful digital services for education and culture, from discovery workshops to launch.',
      },
    ],
  });
  profile.work = [work, previous];
  const education = evidence('education');
  Object.assign(education, {
    title: 'BA, Communication Design',
    institution: 'Westbridge School of Design',
    qualification: 'Bachelor of Arts',
    period: { start: '2015-09', end: '2019-06', ongoing: false },
    bullets: [],
  });
  profile.education = [education];
  const skills = evidence('skills');
  Object.assign(skills, {
    title: 'Design & collaboration',
    keywords: [
      'Product strategy',
      'Interaction design',
      'User research',
      'Design systems',
      'Prototyping',
      'Figma',
    ],
    bullets: [],
  });
  profile.skills = [skills];
  const project = evidence('projects');
  Object.assign(project, {
    title: 'Open Atlas',
    summary:
      'An accessible neighborhood guide, created with a community of local makers.',
    bullets: [],
  });
  profile.projects = [project];
  const variant = createVariant(profile, 'Product Designer · 2026');
  variant.sectionOrder = [
    'summary',
    'work',
    'education',
    'skills',
    'projects',
    ...variant.sectionOrder.filter(
      (s) =>
        !['summary', 'work', 'education', 'skills', 'projects'].includes(s),
    ),
  ];
  variant.template.sectionOrder = variant.sectionOrder;
  variant.template.accentColor = '#173954';
  const second = createVariant(profile, 'Design Lead · Selected experience');
  second.template.templateId = 'modern';
  second.template.accentColor = '#373345';
  second.template.typography = 'serif';
  return {
    format: 'vlr-backup',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profiles: [profile],
    variants: [variant, second],
    revisions: [],
    metadata: { application: 'VLR Resume Studio' },
  };
}
