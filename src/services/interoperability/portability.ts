import { parseDocument, stringify, visit, isAlias, isNode } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import standardSchema from '@jsonresume/schema/schema.json';
import {
  backupSchema,
  serializeBackup,
  yamlEnvelopeSchema,
  type VlrBackup,
} from './contracts';
import {
  projectProfileToJsonResume,
  type StandardJsonResume,
} from './json-resume';
import { createProfile, createVariant, newId } from '@/domain/factories';
import { createEvidence, effectiveEvidence } from '@/domain/editor';
import {
  type MasterCareerProfile,
  type ResumeVariant,
  entrySectionSchema,
  profileSchema,
} from '@/domain/schemas';
import { DataError, validate } from '@/domain/validation';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validateStandard = ajv.compile(standardSchema);
export function assertPlainData(
  value: unknown,
  depth = 0,
  budget = { nodes: 0 },
) {
  if (depth > 40 || ++budget.nodes > 200000)
    throw new DataError(
      'INVALID_DATA',
      'Data is too deeply nested or contains too many values.',
    );
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key))
      throw new DataError('INVALID_DATA', `Unsafe data key: ${key}.`);
    assertPlainData(child, depth + 1, budget);
  }
}
export function serializeYaml(backup: VlrBackup) {
  // JSON normalization omits optional undefined properties rather than emitting non-standard tags.
  const data = JSON.parse(serializeBackup(backup)) as VlrBackup;
  const result = stringify(
    { schemaType: 'vlr-backup', schemaVersion: 1, data },
    { lineWidth: 100, aliasDuplicateObjects: false },
  );
  if (new TextEncoder().encode(result).length > MAX_IMPORT_BYTES)
    throw new DataError('INVALID_DATA', 'YAML exceeds the 5 MiB limit.');
  return result;
}
export function makeBackup(
  profiles: MasterCareerProfile[],
  variants: ResumeVariant[] = [],
): VlrBackup {
  return validate(backupSchema, {
    format: 'vlr-backup',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profiles,
    variants,
    revisions: [],
    metadata: { application: 'VLR Resume Studio' },
  });
}
export function parseImport(
  source: string,
  filename: string,
): { backup: VlrBackup; warnings: string[]; format: string } {
  if (new TextEncoder().encode(source).length > MAX_IMPORT_BYTES)
    throw new DataError('INVALID_DATA', 'File exceeds the 5 MiB limit.');
  let value: unknown;
  try {
    if (/\.ya?ml$/i.test(filename)) {
      const doc = parseDocument(source, {
        schema: 'core',
        uniqueKeys: true,
        customTags: [],
        strict: true,
      });
      if (doc.errors.length || doc.warnings.length)
        throw new Error('Invalid YAML, unsupported tags, or duplicate keys.');
      visit(doc, (_key, node) => {
        if (
          isAlias(node) ||
          (isNode(node) &&
            node.tag &&
            ![
              'tag:yaml.org,2002:str',
              'tag:yaml.org,2002:int',
              'tag:yaml.org,2002:float',
              'tag:yaml.org,2002:bool',
              'tag:yaml.org,2002:null',
              'tag:yaml.org,2002:map',
              'tag:yaml.org,2002:seq',
            ].includes(node.tag))
        )
          throw new Error('YAML aliases and custom tags are not supported.');
      });
      value = doc.toJS({ maxAliasCount: 0 });
    } else value = JSON.parse(source);
  } catch (error) {
    throw new DataError(
      'INVALID_DATA',
      error instanceof Error ? error.message : 'Cannot parse this file.',
    );
  }
  assertPlainData(value);
  if (!value || typeof value !== 'object')
    throw new DataError('INVALID_DATA', 'Expected a resume data object.');
  if ('schemaType' in value) {
    const envelope = validate(yamlEnvelopeSchema, value);
    return {
      backup: validate(backupSchema, envelope.data),
      warnings: [],
      format: 'VLR YAML',
    };
  }
  if ('format' in value || 'schemaVersion' in value)
    return {
      backup: validate(backupSchema, value),
      warnings: [],
      format: 'VLR JSON',
    };
  if (!validateStandard(value))
    throw new DataError(
      'INVALID_DATA',
      'Invalid JSON Resume.',
      (validateStandard.errors ?? [])
        .slice(0, 20)
        .map((e) => `${e.instancePath}: ${e.message}`),
    );
  if (
    !Object.keys(value).some((k) =>
      [
        'basics',
        'work',
        'education',
        'projects',
        'skills',
        'languages',
        'certificates',
        'publications',
        'volunteer',
        'awards',
      ].includes(k),
    )
  )
    throw new DataError('INVALID_DATA', 'Unrecognized resume format.');
  const p = importStandard(value as StandardJsonResume);
  const variant = createVariant(p, 'Imported resume');
  return {
    backup: makeBackup([p], [variant]),
    warnings: [
      'Standard JSON Resume has no VLR IDs, design, revisions, or variant selections. New records are created.',
      'Supported career fields are mapped. Images, references, interests, detailed addresses, and unknown extensions are not imported. Review the proposed profile before confirming.',
    ],
    format: 'JSON Resume',
  };
}
function importStandard(s: StandardJsonResume) {
  const p = createProfile(
    s.basics?.name
      ? `${s.basics.name.slice(0, 170)} · imported`
      : 'Imported career profile',
  );
  p.identity = {
    name: s.basics?.name,
    headline: s.basics?.label,
    email: s.basics?.email || undefined,
    phone: s.basics?.phone,
    location: s.basics?.location
      ? [
          s.basics.location.city,
          s.basics.location.region,
          s.basics.location.countryCode,
        ]
          .filter(Boolean)
          .join(', ') || undefined
      : undefined,
  };
  p.summary = s.basics?.summary;
  if (s.basics?.url)
    p.links.push({
      ...createEvidence('links'),
      kind: 'links',
      title: 'Website',
      url: s.basics.url,
    });
  for (const e of s.basics?.profiles ?? [])
    p.links.push({
      ...createEvidence('links'),
      kind: 'links',
      title: e.network || 'Website',
      url: e.url,
    });
  for (const [key, kind] of [
    ['education', 'education'],
    ['work', 'work'],
    ['projects', 'projects'],
    ['skills', 'skills'],
    ['languages', 'languages'],
    ['certificates', 'certifications'],
    ['publications', 'publications'],
    ['volunteer', 'volunteer'],
    ['awards', 'awards'],
  ] as const) {
    for (const e of s[key] ?? []) {
      const entry = createEvidence(kind);
      entry.title =
        e.position ??
        e.title ??
        e.language ??
        e.name ??
        e.area ??
        e.studyType ??
        '';
      entry.summary = e.summary ?? e.description;
      entry.bullets = (e.highlights ?? []).map((text) => ({
        id: newId(),
        text,
      }));
      if ('period' in entry)
        entry.period = {
          start: e.startDate || undefined,
          end: e.endDate || undefined,
          ongoing: !!e.startDate && !e.endDate,
        };
      if (entry.kind === 'education') {
        entry.institution = e.institution ?? '';
        entry.qualification = e.studyType;
      }
      if (
        entry.kind === 'education' ||
        entry.kind === 'work' ||
        entry.kind === 'internships'
      )
        entry.location = e.location;
      if ('organization' in entry)
        entry.organization = e.organization ?? e.name ?? '';
      if (entry.kind === 'skills') entry.keywords = e.keywords ?? [];
      if (entry.kind === 'languages') entry.proficiency = e.fluency;
      if (entry.kind === 'certifications') {
        entry.issuer = e.issuer;
        entry.date = e.date;
        entry.url = e.url || undefined;
      }
      if (entry.kind === 'publications') {
        entry.publisher = e.publisher;
        entry.date = e.releaseDate;
        entry.url = e.url || undefined;
      }
      if (entry.kind === 'awards') {
        entry.awarder = e.awarder;
        entry.date = e.date;
      }
      if (entry.kind === 'projects') {
        entry.url = e.url || undefined;
        entry.technologies = e.keywords;
      }
      // The discriminant above is checked by the complete profile schema below.
      (p[kind] as (typeof entry)[]).push(entry);
    }
  }
  return validate(profileSchema, p);
}
export function projectVariant(
  profile: MasterCareerProfile,
  variant: ResumeVariant,
) {
  const p = structuredClone(profile);
  p.identity = {
    ...(variant.identityOverride ??
      variant.identitySnapshot ??
      profile.identity),
  };
  for (const field of variant.hiddenIdentityFields ?? [])
    delete p.identity[field];
  p.summary =
    variant.selectedSections.includes('summary') &&
    !variant.template.hiddenSections.includes('summary')
      ? variant.summarySnapshot
      : undefined;
  for (const section of entrySectionSchema.options)
    (p[section] as unknown[]) = variant.template.hiddenSections.includes(
      section,
    )
      ? []
      : variant.selections
          .filter((s) => s.section === section)
          .map((s) => effectiveEvidence(variant, s));
  return projectProfileToJsonResume(p);
}
export function remapBackup(backup: VlrBackup): VlrBackup {
  const ids = new Map<string, string>();
  const remap = (value: unknown): unknown => {
    if (
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      if (!ids.has(value)) ids.set(value, newId());
      return ids.get(value);
    }
    if (Array.isArray(value)) return value.map(remap);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, remap(v)]),
      );
    return value;
  };
  return validate(backupSchema, remap(backup));
}
export const AI_EDITING_INSTRUCTIONS = `You are editing a VLR Resume Studio native backup supplied separately with a job description.
Analyze the job description, prioritize relevant existing evidence, and rewrite selected resume wording professionally. Never invent employers, dates, experience, projects, skills, qualifications, or results. List missing information separately instead of guessing.
Return a complete valid native JSON backup (format: "vlr-backup", schemaVersion: 1), or the equivalent VLR YAML envelope. Preserve ALL records, IDs, source references, snapshots, order arrays, template design settings, and existing revisions. Do not add unknown keys or change the schema version. Preserve UUIDs, ISO timestamps, and supported date formats (YYYY, YYYY-MM, YYYY-MM-DD).
Do not rewrite the master profiles or evidence snapshots. Change only a variant's summarySnapshot, targetRole, selection/section order, visibility, and supported wording overrides. Each override must refer to an existing selectionId and retain its id if present. To edit a full entry, use override.content with the SAME id and kind as that selection's snapshot; preserve bullet IDs. Set override.bullets to [] when using content. Provenance for new machine wording must be {"origin":"ai-suggestion","evidenceIds":[the sourceEntryId]}; do not invent provider/model identifiers or claim machine output is verified evidence. Preserve any untouched fields exactly.
Keep native template IDs within classic, european, modern, academic; do not put HTML, executable tags, or CSS into data. Do not wrap the structured file in Markdown fences. Supply your explanation and missing-information list separately from the import file. The user will review a diff before importing. This works with ChatGPT, Claude, Gemini, or a local model; no API connection is needed.`;
