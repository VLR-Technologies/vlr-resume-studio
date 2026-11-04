import { describe, expect, it } from 'vitest';
import {
  parseImport,
  makeBackup,
  serializeYaml,
} from '@/services/interoperability/portability';
import { createDemo } from '@/data/demo';

describe('resume import normalization', () => {
  it('keeps native JSON and YAML backups on the strict backup path', () => {
    const { profile, variant } = createDemo();
    const backup = makeBackup([profile], [variant]);
    expect(parseImport(JSON.stringify(backup), 'native.json').backup).toEqual(
      backup,
    );
    expect(parseImport(serializeYaml(backup), 'native.yaml').backup).toEqual(
      backup,
    );
  });

  it('imports a standard JSON Resume with standard fields and a structured location', () => {
    const parsed = parseImport(
      JSON.stringify({
        basics: {
          name: 'Ada Lovelace',
          label: 'Analytical Engineer',
          email: 'ada@example.org',
          location: { city: 'London', region: 'England', countryCode: 'GB' },
        },
        work: [
          {
            name: 'Engine Co',
            position: 'Engineer',
            startDate: '2020-01',
            endDate: '2024-03',
            highlights: ['Built a compiler'],
          },
        ],
      }),
      'resume.json',
    );
    expect(parsed.format).toBe('JSON Resume');
    expect(parsed.backup.profiles[0]?.identity.location).toBe(
      'London, England, GB',
    );
    expect(parsed.backup.profiles[0]?.work[0]?.title).toBe('Engineer');
    expect(parsed.backup.profiles[0]?.work[0]?.period).toEqual({
      start: '2020-01',
      end: '2024-03',
      ongoing: false,
    });
  });

  it('normalizes JSON Resume free-form locations and missing arrays', () => {
    const parsed = parseImport(
      JSON.stringify({
        basics: {
          name: 'Grace Hopper',
          email: 'grace@example.org',
          location: 'New York, NY',
        },
        work: [],
      }),
      'resume.json',
    );
    expect(parsed.backup.profiles[0]?.identity.location).toBe('New York, NY');
    expect(parsed.backup.profiles[0]?.education).toEqual([]);
    expect(parsed.warnings.join(' ')).toContain('free-form location');
  });

  it('normalizes ordinary JSON and YAML aliases, string locations, skills, and date formats', () => {
    const ordinary = {
      fullName: 'Sam Rivera',
      headline: 'Data Analyst',
      email: 'sam@example.com',
      location: 'Berlin, Germany',
      summary: 'Analyst focused on useful reporting.',
      experience: [
        {
          role: 'Analyst',
          company: 'Example GmbH',
          from: '01/2021',
          to: 'Present',
          achievements: ['Created monthly reports'],
        },
      ],
      internships: [{ role: 'Research Intern', employer: 'Lab Co' }],
      education: [{ degree: 'BSc Statistics', school: 'North University' }],
      skills: ['SQL', 'Python'],
      projects: [{ title: 'Forecasting', description: 'Built a forecast.' }],
    };
    const parsed = parseImport(JSON.stringify(ordinary), 'ordinary.json');
    const profile = parsed.backup.profiles[0]!;
    expect(parsed.format).toBe('Resume JSON/YAML');
    expect(profile.identity.location).toBe('Berlin, Germany');
    expect(profile.work[0]).toMatchObject({
      title: 'Analyst',
      organization: 'Example GmbH',
      period: { start: '2021-01', ongoing: true },
    });
    expect(profile.internships[0]).toMatchObject({
      title: 'Research Intern',
      organization: 'Lab Co',
    });
    expect(profile.skills[0]?.keywords).toEqual(['SQL', 'Python']);
    expect(profile.education[0]?.institution).toBe('North University');

    const yaml = `name: Mira Chen\nemail: mira@example.com\nexperience:\n  - title: Researcher\n    organization: Lab\n    startDate: Jan 2020\nskills: [Python, R]\n`;
    expect(
      parseImport(yaml, 'ordinary.yaml').backup.profiles[0]?.work[0],
    ).toMatchObject({
      title: 'Researcher',
      organization: 'Lab',
      period: { start: '2020-01' },
    });
  });

  it('returns field-level schema details for invalid canonical profile data', () => {
    expect(() =>
      parseImport(
        JSON.stringify({
          name: 'R',
          email: 'not an email',
          experience: [{ title: 'Role' }],
        }),
        'bad.json',
      ),
    ).toThrow();
  });
});
