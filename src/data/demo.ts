import { createProfile, createVariant, newId } from '@/domain/factories';
import { profileSchema } from '@/domain/schemas';
import { validate } from '@/domain/validation';
export function createDemo() {
  const profile = createProfile('Alex Morgan · sample profile');
  profile.isDemo = true;
  profile.identity = {
    name: 'Alex Morgan',
    headline: 'AI Engineer Intern',
    email: 'alex@example.com',
    location: 'Berlin, Germany',
  };
  profile.summary =
    'Fictional computer science student exploring practical machine learning and thoughtful, accessible software.';
  profile.education.push({
    id: newId(),
    kind: 'education',
    title: 'BSc Computer Science',
    institution: 'Northbridge Institute (fictional)',
    qualification: 'Bachelor of Science',
    period: { start: '2023', ongoing: true },
    bullets: [],
  });
  profile.projects.push({
    id: newId(),
    kind: 'projects',
    title: 'Open Garden Classifier',
    summary:
      'A fictional learning project for classifying plant images with a small, documented dataset.',
    period: { start: '2025-03', end: '2025-06', ongoing: false },
    bullets: [
      {
        id: newId(),
        text: 'Compared baseline models and documented their limitations.',
      },
      {
        id: newId(),
        text: 'Built an accessible interface for exploring sample predictions.',
      },
    ],
  });
  profile.skills.push({
    id: newId(),
    kind: 'skills',
    title: 'Engineering',
    category: 'technical',
    keywords: ['Python', 'PyTorch', 'TypeScript', 'Git'],
    bullets: [],
  });
  profile.languages.push({
    id: newId(),
    kind: 'languages',
    title: 'English',
    proficiency: 'Fluent',
    bullets: [],
  });
  const valid = validate(profileSchema, profile);
  const variant = createVariant(
    valid,
    'AI Engineer Internship',
    'AI Engineer Intern',
  );
  variant.employmentCategory = { kind: 'internship' };
  return { profile: valid, variant };
}
