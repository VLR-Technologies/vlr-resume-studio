import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createProfile } from '@/domain/factories';
import { createEvidence } from '@/domain/editor';
import { profileSchema, type MasterCareerProfile } from '@/domain/schemas';
import { validate } from '@/domain/validation';

GlobalWorkerOptions.workerSrc = workerUrl;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 100;
const MAX_EXTRACTED_CHARS = 250_000;

type PageLine = { x: number; y: number; text: string };
type ParsedPeriod = { start?: string; end?: string; ongoing: boolean };
type ParsedSection =
  | 'summary'
  | 'work'
  | 'internships'
  | 'education'
  | 'projects'
  | 'skills'
  | 'professionalSkills'
  | 'certifications'
  | 'languages'
  | 'publications'
  | 'awards'
  | 'volunteer';

const headingAliases: Record<ParsedSection, string[]> = {
  summary: [
    'summary',
    'professional summary',
    'profile',
    'personal profile',
    'about me',
    'executive summary',
    'profil',
    'über mich',
    'persönliches profil',
    'profil professionnel',
    'perfil profesional',
  ],
  work: [
    'experience',
    'work experience',
    'professional experience',
    'employment history',
    'career history',
    'berufserfahrung',
    'beruflicher werdegang',
    'erfahrung',
    'experiencia laboral',
    'expériences professionnelles',
    'esperienza professionale',
  ],
  internships: ['internships', 'internship experience', 'praktika', 'stages'],
  education: [
    'education',
    'academic background',
    'qualifications',
    'ausbildung',
    'studium',
    'formation',
    'educación',
    'educacion',
    'education and training',
  ],
  projects: [
    'projects',
    'selected projects',
    'project experience',
    'portfolio',
  ],
  skills: [
    'skills',
    'technical skills',
    'key skills',
    'core competencies',
    'competencies',
    'kenntnisse',
    'fähigkeiten',
    'faehigkeiten',
    'kompetenzen',
    'compétences',
    'habilidades',
    'competenze',
  ],
  professionalSkills: [
    'professional skills',
    'soft skills',
    'interpersonal skills',
    'social skills',
  ],
  certifications: [
    'certifications',
    'certificates',
    'licenses',
    'zertifikate',
    'certifications et formations',
  ],
  languages: ['languages', 'language skills', 'sprachen', 'langues', 'idiomas'],
  publications: ['publications', 'research publications', 'publikationen'],
  awards: ['awards', 'honors', 'honours', 'achievements', 'auszeichnungen'],
  volunteer: [
    'volunteering',
    'volunteer experience',
    'volunteer work',
    'ehrenamt',
    'bénévolat',
  ],
};
const normalizeHeading = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[|:：]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
function classifyHeading(line: string): ParsedSection | undefined {
  const normalized = normalizeHeading(line);
  for (const [section, aliases] of Object.entries(headingAliases) as [
    ParsedSection,
    string[],
  ][]) {
    if (aliases.some((alias) => normalizeHeading(alias) === normalized))
      return section;
  }
  return undefined;
}

function dateValue(value: string): string | undefined {
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  if (iso) {
    const month = iso[2] ? Number(iso[2]) : undefined;
    const day = iso[3] ? Number(iso[3]) : undefined;
    if (!month || (month >= 1 && month <= 12))
      return `${iso[1]}${month ? `-${String(month).padStart(2, '0')}` : ''}${day ? `-${String(day).padStart(2, '0')}` : ''}`;
  }
  const numeric = raw.match(/^(\d{1,2})[./](\d{4})$/);
  if (numeric && Number(numeric[1]) >= 1 && Number(numeric[1]) <= 12)
    return `${numeric[2]}-${String(Number(numeric[1])).padStart(2, '0')}`;
  const month = raw.match(
    /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{4})$/i,
  );
  if (month) {
    const index =
      'jan feb mar apr may jun jul aug sep oct nov dec'
        .split(' ')
        .indexOf(month[1]!.slice(0, 3).toLowerCase()) + 1;
    return `${month[2]}-${String(index).padStart(2, '0')}`;
  }
  return undefined;
}
function extractPeriod(
  line: string,
): { period: ParsedPeriod; remainder: string } | undefined {
  const match = line.match(
    /((?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?\.?\s+)?\d{4}(?:[-/.]\d{1,2})?(?:[-/.]\d{1,2})?|\d{1,2}[./]\d{4})\s*(?:–|—|\bto\b|\s-\s)\s*(?:(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?\.?\s+)?\d{4}(?:[-/.]\d{1,2})?(?:[-/.]\d{1,2})?|\d{1,2}[./]\d{4})|present|current|now|today|heute|aktuell|actuel|en cours))/i,
  );
  if (!match) return undefined;
  const parts = match[1]!.split(/\s*(?:–|—|\bto\b|\s-\s)\s*/i);
  const start = dateValue(parts[0] ?? '');
  const end = dateValue(parts[1] ?? '');
  const ongoing =
    !!parts[1] &&
    /^(present|current|now|today|heute|aktuell|actuel|en cours)$/i.test(
      parts[1].trim(),
    );
  return {
    period: { start, end, ongoing },
    remainder:
      `${line.slice(0, match.index ?? 0)} ${line.slice((match.index ?? 0) + match[0].length)}`
        .replace(/[|,;–—-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
  };
}

function isTextItem(item: unknown): item is TextItem {
  return (
    !!item && typeof item === 'object' && 'str' in item && 'transform' in item
  );
}
function pageLines(items: unknown[], width: number): string[] {
  const textItems = items
    .filter(isTextItem)
    .map((item) => ({
      x: item.transform[4]!,
      y: item.transform[5]!,
      text: item.str.trim(),
    }))
    .filter((item) => item.text);
  if (!textItems.length) return [];
  const xs = textItems.map((item) => item.x).sort((a, b) => a - b);
  let splitAt: number | undefined;
  let splitGap = width * 0.18;
  for (let i = 1; i < xs.length; i++) {
    const gap = xs[i]! - xs[i - 1]!;
    if (gap > splitGap) {
      const leftCount = textItems.filter((item) => item.x < xs[i]!).length;
      const rightCount = textItems.length - leftCount;
      if (leftCount >= 5 && rightCount >= 5) {
        splitGap = gap;
        splitAt = (xs[i - 1]! + xs[i]!) / 2;
      }
    }
  }
  const columns = splitAt
    ? [
        textItems.filter((item) => item.x < splitAt!),
        textItems.filter((item) => item.x >= splitAt!),
      ]
    : [textItems];
  return columns.flatMap((column) => {
    const sorted = [...column].sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: PageLine[][] = [];
    for (const item of sorted) {
      const row = rows.find(
        (candidate) => Math.abs(candidate[0]!.y - item.y) <= 2.5,
      );
      if (row) row.push(item);
      else rows.push([item]);
    }
    return rows.map((row) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
  });
}

export async function extractPdfText(file: Blob): Promise<string> {
  if (!file.size) throw new Error('The selected PDF is empty.');
  if (file.size > MAX_PDF_BYTES)
    throw new Error('PDF files must be 5 MiB or smaller.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-')
    throw new Error('This file does not have a valid PDF header.');
  let document: PDFDocumentProxy | undefined;
  let loadingTask: ReturnType<typeof getDocument> | undefined;
  try {
    loadingTask = getDocument({ data: bytes });
    document = await loadingTask.promise;
    if (document.numPages > MAX_PDF_PAGES)
      throw new Error(`PDFs are limited to ${MAX_PDF_PAGES} pages for import.`);
    const pages: string[] = [];
    let total = 0;
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      const lines = pageLines(content.items, page.view[2] ?? 600);
      const pageText = lines.join('\n');
      pages.push(pageText);
      total += pageText.length;
      if (total > MAX_EXTRACTED_CHARS)
        throw new Error('This PDF contains too much text to import safely.');
    }
    const result = pages.join('\n\n').trim();
    if (result.replace(/\s/g, '').length < 40)
      throw new Error(
        'This PDF has little or no selectable text. Scanned PDFs need OCR, which is not available in this local import flow. No resume data was created.',
      );
    return result;
  } catch (error) {
    if (error instanceof Error && error.message) {
      if (error.name === 'PasswordException')
        throw new Error(
          'This PDF is password-protected. Unlock it and try again.',
          { cause: error },
        );
      throw error;
    }
    throw new Error(
      'Could not read this PDF. It may be corrupt or password-protected.',
      { cause: error },
    );
  } finally {
    await loadingTask?.destroy();
  }
}

type WorkItem = {
  lines: string[];
  bullets: string[];
  period: ParsedPeriod;
};
function makeWorkItems(lines: string[]): WorkItem[] {
  const result: WorkItem[] = [];
  let current: WorkItem | undefined;
  const flush = () => {
    if (current && (current.lines.length || current.bullets.length))
      result.push(current);
    current = undefined;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^(?:[•●▪◦‣*–-])\s*(.+)$/);
    if (bullet) {
      current ??= { lines: [], bullets: [], period: { ongoing: false } };
      current.bullets.push(bullet[1]!.trim());
      continue;
    }
    const dated = extractPeriod(line);
    if (dated) {
      if (current && current.period.start) flush();
      current ??= { lines: [], bullets: [], period: { ongoing: false } };
      current.period = dated.period;
      if (dated.remainder) current.lines.push(dated.remainder);
      continue;
    }
    current ??= { lines: [], bullets: [], period: { ongoing: false } };
    if (current.lines.length >= 3 && current.bullets.length) flush();
    current ??= { lines: [], bullets: [], period: { ongoing: false } };
    current.lines.push(line.replace(/^[•●▪◦‣*–-]\s*/, '').trim());
  }
  flush();
  return result;
}
function splitTitleAndOrganization(value: string): [string, string?] {
  const parts = value.split(/\s+(?:\||·|@|–|—)\s+/).filter(Boolean);
  return [parts[0] ?? value, parts[1]];
}
function cleanEntryText(lines: string[]) {
  return lines
    .map((line) => line.replace(/^[•●▪◦‣*–-]\s*/, '').trim())
    .filter(Boolean);
}
function makeSectionEntries(
  profile: MasterCareerProfile,
  section: Exclude<
    ParsedSection,
    'summary' | 'skills' | 'professionalSkills' | 'languages'
  >,
  lines: string[],
) {
  for (const item of makeWorkItems(lines)) {
    const clean = cleanEntryText(item.lines);
    if (!clean.length && !item.bullets.length) continue;
    const first = clean[0] ?? '';
    const [title, orgFromTitle] = splitTitleAndOrganization(first);
    const second = clean[1];
    const summary = clean
      .slice(orgFromTitle ? 1 : 2)
      .join(' ')
      .trim();
    const kind =
      section === 'work'
        ? 'work'
        : section === 'internships'
          ? 'internships'
          : section;
    const entry = createEvidence(kind) as unknown as Record<string, unknown>;
    entry.title = title.slice(0, 200);
    entry.summary = summary || undefined;
    entry.bullets = item.bullets.map((text) => ({
      id: crypto.randomUUID(),
      text: text.slice(0, 10_000),
    }));
    if ('period' in entry) entry.period = item.period;
    if (kind === 'work' || kind === 'internships' || kind === 'volunteer') {
      entry.organization = (orgFromTitle ?? second ?? '').slice(0, 200);
      if (kind !== 'volunteer' && second && second !== entry.organization)
        entry.location = second.slice(0, 200);
    }
    if (kind === 'education') {
      entry.institution = (orgFromTitle ?? second ?? '').slice(0, 200);
      entry.qualification = title.slice(0, 200) || undefined;
      if (second && second !== entry.institution)
        entry.location = second.slice(0, 200);
    }
    if (kind === 'projects') {
      const url = clean.find((line) => /^https?:\/\//i.test(line));
      if (url) entry.url = url.split(/\s/)[0];
      entry.technologies = [];
    }
    if (kind === 'certifications') {
      const url = clean.find((line) => /^https?:\/\//i.test(line));
      if (url) entry.url = url.split(/\s/)[0];
      entry.issuer = second;
      const date = item.period.start;
      if (date) entry.date = date;
    }
    if (kind === 'publications') entry.publisher = second;
    if (kind === 'awards') entry.awarder = second;
    (profile[section] as unknown as unknown[]).push(entry);
  }
}

export function parseResumeText(source: string): {
  profile: MasterCareerProfile;
  warnings: string[];
} {
  const lines = source
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
  if (lines.join('').length < 40)
    throw new Error('Not enough readable text was found to build a resume.');
  const sections = new Map<ParsedSection, string[]>();
  const intro: string[] = [];
  const unrecognizedSections = new Set<string>();
  let active: ParsedSection | undefined;
  let recognizedHeadings = 0;
  for (const line of lines) {
    const section = classifyHeading(line.replace(/[:：]$/, '').trim());
    if (section) {
      active = section;
      recognizedHeadings++;
      if (!sections.has(section)) sections.set(section, []);
      continue;
    }
    if (
      active &&
      line.length < 45 &&
      /^(references?|referees?|interests?|hobbies|personal details|personal data|photo|photograph|additional information)\s*[:：]?$/i.test(
        line,
      )
    ) {
      unrecognizedSections.add(line.replace(/[:：]$/, '').trim());
      active = undefined;
      continue;
    }
    if (active) sections.get(active)!.push(line);
    else intro.push(line);
  }

  const email = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phoneCandidates =
    source.match(/(?:\+\d[\d ()./-]{6,}\d|\b\d[\d ()./-]{7,}\d\b)/g) ?? [];
  const phone = phoneCandidates
    .find((candidate) => candidate.replace(/\D/g, '').length >= 8)
    ?.trim();
  const urls = [...source.matchAll(/(?:https?:\/\/|www\.)[^\s|,)]+/gi)]
    .map((match) => match[0]!.replace(/[.,;]+$/, ''))
    .filter((value, index, values) => values.indexOf(value) === index);
  const emailLine = (line: string) => /@/.test(line);
  const phoneLine = (line: string) =>
    line.replace(/\D/g, '').length >= 8 && /[+\d]/.test(line);
  const urlLine = (line: string) => /(?:https?:\/\/|www\.)/i.test(line);
  const isHeading = (line: string) => !!classifyHeading(line);
  const header = intro.filter(
    (line) => !emailLine(line) && !phoneLine(line) && !urlLine(line),
  );
  const name = header.find((line) => line.length <= 90 && !isHeading(line));
  const headline = name
    ? header.slice(header.indexOf(name) + 1).find((line) => line.length <= 110)
    : undefined;
  const locationLine = intro.find((line) =>
    /^(?:location|address|standort|wohnort|adresse)\s*[:：]/i.test(line),
  );
  const profile = createProfile(
    name ? `${name.slice(0, 170)} · imported` : 'Imported career profile',
  );
  profile.identity = {
    name,
    headline: headline && headline !== name ? headline : undefined,
    email,
    phone,
    location: locationLine?.replace(/^[^:：]+[:：]\s*/, '').slice(0, 200),
  };
  const summaryLines = sections.get('summary') ?? [];
  const introSummary = intro
    .filter(
      (line) =>
        line !== name &&
        line !== headline &&
        !emailLine(line) &&
        !phoneLine(line) &&
        !urlLine(line) &&
        line !== locationLine,
    )
    .filter((line) => line.length > 20);
  profile.summary =
    (summaryLines.length ? summaryLines : introSummary)
      .join(' ')
      .slice(0, 10_000) || undefined;
  for (const url of urls) {
    try {
      const normalized = url.startsWith('www.') ? `https://${url}` : url;
      const parsed = new URL(normalized);
      if (!['http:', 'https:'].includes(parsed.protocol)) continue;
      const entry = createEvidence('links') as unknown as Record<
        string,
        unknown
      >;
      entry.title = /linkedin/i.test(url)
        ? 'LinkedIn'
        : /github/i.test(url)
          ? 'GitHub'
          : 'Website';
      entry.url = parsed.href;
      profile.links.push(
        entry as unknown as MasterCareerProfile['links'][number],
      );
    } catch {
      // Invalid links remain visible in the warnings below, not in canonical data.
    }
  }
  for (const section of [
    'work',
    'internships',
    'education',
    'projects',
    'certifications',
    'publications',
    'awards',
    'volunteer',
  ] as const)
    makeSectionEntries(profile, section, sections.get(section) ?? []);
  for (const [section, category] of [
    ['skills', 'technical'],
    ['professionalSkills', 'professional'],
  ] as const) {
    const skillWords = (sections.get(section) ?? [])
      .flatMap((line) => line.split(/[,;•|]/))
      .map((word) => word.trim().replace(/^[-–*]\s*/, ''))
      .filter((word) => word.length > 1);
    if (!skillWords.length) continue;
    const skills = createEvidence('skills') as unknown as Record<
      string,
      unknown
    >;
    skills.title =
      category === 'technical' ? 'Technical skills' : 'Professional skills';
    skills.category = category;
    skills.keywords = [...new Set(skillWords)].slice(0, 100);
    profile.skills.push(
      skills as unknown as MasterCareerProfile['skills'][number],
    );
  }
  for (const line of sections.get('languages') ?? []) {
    const parts = line.split(/\s*(?:[–—|:]|\s-\s)\s*/);
    const language = parts[0]?.trim();
    if (!language) continue;
    const entry = createEvidence('languages') as unknown as Record<
      string,
      unknown
    >;
    entry.title = language.slice(0, 200);
    entry.proficiency = parts[1]?.slice(0, 200);
    profile.languages.push(
      entry as unknown as MasterCareerProfile['languages'][number],
    );
  }
  const warnings: string[] = [];
  if (!recognizedHeadings)
    warnings.push(
      'No familiar section headings were found. Check that the imported content was mapped to the right fields.',
    );
  if (!name)
    warnings.push('A full name could not be identified from the PDF text.');
  if (!email)
    warnings.push('No email address was found in selectable PDF text.');
  if (unrecognizedSections.size)
    warnings.push(
      `These sections were not mapped into career profile fields: ${[...unrecognizedSections].join(', ')}. Review the source PDF before discarding it.`,
    );
  if (!sections.size && !name && !email)
    throw new Error(
      'The PDF text does not look like a resume. No profile was created.',
    );
  if (urls.length !== profile.links.length)
    warnings.push('One or more web links could not be safely imported.');
  if (
    profile.work.length + profile.internships.length > 0 &&
    profile.work.length + profile.internships.length <
      (sections.get('work')?.length ?? 0) / 3
  )
    warnings.push(
      'Some work history lines may need manual review; date and entry boundaries in PDFs are uncertain.',
    );
  profile.updatedAt = profile.createdAt;
  return { profile: validate(profileSchema, profile), warnings };
}

export async function importPdfResume(file: Blob) {
  const text = await extractPdfText(file);
  return parseResumeText(text);
}
