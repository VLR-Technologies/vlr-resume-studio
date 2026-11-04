import type { StandardJsonResume } from './json-resume';

type RecordLike = Record<string, unknown>;
type ResumeSection = keyof Pick<
  StandardJsonResume,
  | 'education'
  | 'work'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'certificates'
  | 'publications'
  | 'volunteer'
  | 'awards'
>;

const isRecord = (value: unknown): value is RecordLike =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};
const firstText = (source: RecordLike, ...keys: string[]) => {
  for (const key of keys) {
    const found = text(source[key]);
    if (found) return found;
  }
  return undefined;
};
const list = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value == null ? [] : [value];
function safeDate(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const iso = raw.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  if (iso) {
    const year = Number(iso[1]);
    const month = iso[2] ? Number(iso[2]) : undefined;
    const day = iso[3] ? Number(iso[3]) : undefined;
    if (year > 0 && (!month || (month >= 1 && month <= 12)))
      return `${iso[1]}${month ? `-${String(month).padStart(2, '0')}` : ''}${day ? `-${String(day).padStart(2, '0')}` : ''}`;
  }
  const numeric = raw.match(/^(\d{1,2})[./](\d{4})$/);
  if (numeric && Number(numeric[1]) >= 1 && Number(numeric[1]) <= 12)
    return `${numeric[2]}-${String(Number(numeric[1])).padStart(2, '0')}`;
  const monthYear = raw.match(
    /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{4})$/i,
  );
  if (monthYear) {
    const month =
      'jan feb mar apr may jun jul aug sep oct nov dec'
        .split(' ')
        .indexOf(monthYear[1]!.slice(0, 3).toLowerCase()) + 1;
    return `${monthYear[2]}-${String(month).padStart(2, '0')}`;
  }
  return undefined;
}
function locationText(value: unknown): string | undefined {
  if (typeof value === 'string') return text(value);
  if (!isRecord(value)) return undefined;
  return (
    [
      firstText(value, 'address'),
      firstText(value, 'city', 'locality', 'town'),
      firstText(value, 'region', 'state', 'province'),
      firstText(value, 'postalCode', 'postal_code', 'zip'),
      firstText(value, 'countryCode', 'country', 'countryName'),
    ]
      .filter(Boolean)
      .join(', ') || undefined
  );
}
function normalizedLocation(
  value: unknown,
): StandardJsonResume['basics']['location'] {
  if (typeof value === 'string') return { city: value.trim() };
  if (!isRecord(value)) return {};
  return {
    address: firstText(value, 'address', 'street'),
    city: firstText(value, 'city', 'locality', 'town'),
    region: firstText(value, 'region', 'state', 'province'),
    postalCode: firstText(value, 'postalCode', 'postal_code', 'zip'),
    countryCode: firstText(value, 'countryCode', 'country_code', 'country'),
  };
}
function normalizedEntries(
  value: unknown,
  section: ResumeSection,
): RecordLike[] {
  const values = list(value);
  if (
    section === 'skills' &&
    values.length &&
    values.every((item) => typeof item === 'string')
  )
    return [
      {
        name: 'Skills',
        keywords: values.map(text).filter((item): item is string => !!item),
      },
    ];
  return values
    .map((raw) => {
      if (typeof raw === 'string') {
        const value = raw.trim();
        if (!value) return undefined;
        if (section === 'skills') return { name: 'Skills', keywords: [value] };
        if (section === 'languages') return { language: value };
        return { name: value };
      }
      return isRecord(raw) ? raw : undefined;
    })
    .filter((value): value is RecordLike => !!value)
    .map((entry) => {
      const location = locationText(entry.location ?? entry.address);
      const dates = firstText(entry, 'dates', 'dateRange', 'period');
      let startDate = safeDate(
        entry.startDate ?? entry.start_date ?? entry.from ?? entry.start,
      );
      let endDate = safeDate(
        entry.endDate ?? entry.end_date ?? entry.to ?? entry.end,
      );
      if (dates) {
        const parts = dates.split(/\s*(?:–|—|\bto\b|\s-\s)\s*/i);
        startDate ??= safeDate(parts[0]);
        endDate ??= safeDate(parts[1]);
      }
      const highlights = list(
        entry.highlights ??
          entry.achievements ??
          entry.responsibilities ??
          entry.bullets,
      )
        .map(text)
        .filter((item): item is string => !!item);
      const keywords = list(
        entry.keywords ?? entry.skills ?? entry.technologies,
      )
        .map(text)
        .filter((item): item is string => !!item);
      const sectionFields: RecordLike = {};
      const name = firstText(entry, 'name', 'title', 'degree', 'qualification');
      const position = firstText(
        entry,
        'position',
        'role',
        'jobTitle',
        'job_title',
        'degree',
      );
      const description = firstText(
        entry,
        'summary',
        'description',
        'details',
        'objective',
      );
      const institution = firstText(entry, 'institution', 'school', 'college');
      const organization = firstText(
        entry,
        'organization',
        'company',
        'employer',
        'name',
      );
      if (name) sectionFields.name = name;
      if (position) sectionFields.position = position;
      if (description) sectionFields.summary = description;
      if (institution) sectionFields.institution = institution;
      if (organization) sectionFields.organization = organization;
      if (firstText(entry, 'area', 'field', 'major'))
        sectionFields.area = firstText(entry, 'area', 'field', 'major');
      if (firstText(entry, 'studyType', 'study_type', 'qualification'))
        sectionFields.studyType = firstText(
          entry,
          'studyType',
          'study_type',
          'qualification',
        );
      if (location) sectionFields.location = location;
      if (startDate) sectionFields.startDate = startDate;
      if (endDate) sectionFields.endDate = endDate;
      if (highlights.length) sectionFields.highlights = highlights;
      if (keywords.length) sectionFields.keywords = keywords;
      if (firstText(entry, 'language'))
        sectionFields.language = firstText(entry, 'language');
      if (firstText(entry, 'fluency', 'proficiency', 'level'))
        sectionFields.fluency = firstText(
          entry,
          'fluency',
          'proficiency',
          'level',
        );
      if (firstText(entry, 'issuer', 'awarder'))
        sectionFields.issuer = firstText(entry, 'issuer', 'awarder');
      if (safeDate(entry.date)) sectionFields.date = safeDate(entry.date);
      if (firstText(entry, 'url', 'website'))
        sectionFields.url = firstText(entry, 'url', 'website');
      if (firstText(entry, 'publisher'))
        sectionFields.publisher = firstText(entry, 'publisher');
      if (safeDate(entry.releaseDate ?? entry.release_date))
        sectionFields.releaseDate = safeDate(
          entry.releaseDate ?? entry.release_date,
        );
      if (firstText(entry, 'awarder', 'organization'))
        sectionFields.awarder = firstText(entry, 'awarder', 'organization');
      if (section === 'skills' && !sectionFields.keywords && name)
        sectionFields.keywords = [name];
      if (section === 'languages' && !sectionFields.language && name)
        sectionFields.language = name;
      return sectionFields;
    });
}

const sectionAliases: Record<ResumeSection, string[]> = {
  education: ['education', 'qualifications', 'academicBackground'],
  work: ['work', 'experience', 'employment', 'professionalExperience'],
  projects: ['projects', 'portfolio'],
  skills: ['skills', 'competencies', 'technicalSkills'],
  languages: ['languages', 'languageSkills'],
  certificates: ['certificates', 'certifications', 'licenses'],
  publications: ['publications', 'research'],
  volunteer: ['volunteer', 'volunteering', 'volunteerExperience'],
  awards: ['awards', 'honors', 'honours'],
};

export function normalizeResumeObject(input: unknown): {
  standard: StandardJsonResume;
  warnings: string[];
  format: 'JSON Resume' | 'Resume JSON/YAML';
  internshipIndexes: number[];
} {
  if (!isRecord(input)) throw new Error('Expected a resume data object.');
  const root = input;
  const basics = isRecord(root.basics)
    ? root.basics
    : isRecord(root.identity)
      ? root.identity
      : root;
  const warnings: string[] = [];
  const hasJsonResumeShape = isRecord(root.basics);
  const name = firstText(basics, 'name', 'fullName', 'full_name');
  const loc = basics.location ?? basics.address;
  const profiles: { network: string; url: string }[] = [];
  const website = firstText(basics, 'url', 'website', 'portfolio');
  for (const raw of list(basics.profiles ?? basics.links)) {
    if (!isRecord(raw)) continue;
    const url = firstText(raw, 'url', 'href');
    if (url && url !== website)
      profiles.push({
        network:
          firstText(raw, 'network', 'label', 'title', 'type') ?? 'Website',
        url,
      });
  }
  const summary = firstText(
    basics,
    'summary',
    'profile',
    'professionalSummary',
    'objective',
    'about',
  );
  const standard: StandardJsonResume = {
    basics: {
      name,
      label: firstText(
        basics,
        'label',
        'headline',
        'professionalTitle',
        'jobTitle',
      ),
      email: firstText(basics, 'email', 'emailAddress', 'email_address'),
      phone: firstText(basics, 'phone', 'telephone', 'mobile'),
      summary,
      url: website,
      location: normalizedLocation(loc),
      profiles,
    },
    education: [],
    work: [],
    projects: [],
    skills: [],
    languages: [],
    certificates: [],
    publications: [],
    volunteer: [],
    awards: [],
  };
  for (const section of Object.keys(sectionAliases) as ResumeSection[]) {
    const sourceKey = sectionAliases[section].find((key) => key in root);
    const value = sourceKey ? root[sourceKey] : undefined;
    if (sourceKey && sourceKey !== section)
      warnings.push(`Mapped “${sourceKey}” into the ${section} section.`);
    standard[section] = normalizedEntries(value, section) as never;
  }
  const internshipRows = normalizedEntries(root.internships, 'work');
  const internshipIndexes = internshipRows.map(
    (_entry, index) => standard.work.length + index,
  );
  standard.work = [
    ...standard.work,
    ...internshipRows,
  ] as StandardJsonResume['work'];
  if (typeof loc === 'string' && hasJsonResumeShape)
    warnings.push(
      'Converted the free-form location into a standard location field.',
    );
  if (
    !name &&
    !summary &&
    Object.values(standard).every((v) => !Array.isArray(v) || !v.length)
  )
    throw new Error('No recognizable resume information was found.');
  return {
    standard,
    warnings,
    format: hasJsonResumeShape ? 'JSON Resume' : 'Resume JSON/YAML',
    internshipIndexes,
  };
}
