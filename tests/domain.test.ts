import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createProfile,
  createVariant,
  createTemplate,
  newId,
  resolveSelections,
} from '@/domain/factories';
import {
  careerDateSchema,
  employmentCategorySchema,
  profileSchema,
  variantSchema,
  templateConfigSchema,
  periodSchema,
} from '@/domain/schemas';
import {
  validate,
  identifyVersion,
  prepareMigration,
  DataError,
} from '@/domain/validation';
import { createDemo } from '@/data/demo';
describe('versioned career domain', () => {
  it('creates a completely blank profile without personal fields', () => {
    const p = createProfile();
    expect(p.identity).toEqual({});
    expect(p.education).toEqual([]);
    expect(p.isDemo).toBe(false);
    expect(profileSchema.parse(p)).toEqual(p);
  });
  it('creates explicitly fictional, valid sample evidence', () => {
    const { profile, variant } = createDemo();
    expect(profile.isDemo).toBe(true);
    expect(profile.identity.email).toBe('alex@example.com');
    expect(profileSchema.safeParse(profile).success).toBe(true);
    expect(variant.sourceProfileId).toBe(profile.id);
  });
  it('uses unique stable UUIDs for profiles, entries, and individual bullets', () => {
    const { profile } = createDemo();
    const ids = [
      profile.id,
      ...profile.projects.map((e) => e.id),
      ...profile.projects.flatMap((e) => e.bullets.map((b) => b.id)),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => z.uuid().safeParse(id).success)).toBe(true);
    expect(createProfile().id).not.toBe(createProfile().id);
    expect(profileSchema.parse(profile).projects[0]?.id).toBe(
      profile.projects[0]?.id,
    );
  });
  it('rejects duplicate nested evidence IDs', () => {
    const { profile } = createDemo();
    profile.education[0]!.id = profile.projects[0]!.bullets[0]!.id;
    expect(profileSchema.safeParse(profile).success).toBe(false);
  });
  it.each(['2024', '2024-02', '2024-02-29', '0001-01-01'])(
    'accepts calendar date %s without timezone conversion',
    (date) => {
      expect(careerDateSchema.parse(date)).toBe(date);
    },
  );
  it.each([
    '2023-02-29',
    '2024-13',
    '2024-04-31',
    '0000',
    '2024-00-01',
    '2024-01-00',
    '2024-1',
    '2024-01-01T00:00:00Z',
  ])('rejects calendar date %s', (date) => {
    expect(careerDateSchema.safeParse(date).success).toBe(false);
  });
  it('validates ongoing positions and chronological periods', () => {
    expect(
      periodSchema.safeParse({ start: '2024', ongoing: true }).success,
    ).toBe(true);
    expect(
      periodSchema.safeParse({ start: '2024', end: '2023', ongoing: false })
        .success,
    ).toBe(false);
    expect(periodSchema.safeParse({ end: '2025', ongoing: true }).success).toBe(
      false,
    );
  });
  it.each([
    'internship',
    'working-student',
    'graduate',
    'full-time',
    'research',
  ])('supports employment category %s', (kind) => {
    expect(employmentCategorySchema.safeParse({ kind }).success).toBe(true);
  });
  it('requires an explicit custom category and rejects unknown categories', () => {
    expect(
      employmentCategorySchema.safeParse({
        kind: 'custom',
        label: 'Apprenticeship',
      }).success,
    ).toBe(true);
    expect(employmentCategorySchema.safeParse({ kind: 'custom' }).success).toBe(
      false,
    );
    expect(
      employmentCategorySchema.safeParse({ kind: 'invented' }).success,
    ).toBe(false);
  });
  it('identifies versions and safely rejects unsupported or malformed records', () => {
    const p = createProfile();
    expect(identifyVersion(p)).toBe(1);
    expect(() => validate(profileSchema, { ...p, schemaVersion: 99 })).toThrow(
      DataError,
    );
    expect(() => identifyVersion({})).toThrow();
    expect(() => validate(profileSchema, { ...p, id: 'bad' })).toThrow();
    expect(() =>
      validate(profileSchema, { ...p, unexpected: 'field' }),
    ).toThrow();
  });
  it('prepares a migration with an untouched original and validates output', () => {
    const original = { schemaVersion: 0, label: 'Original' };
    const result = prepareMigration(
      original,
      { from: 0, to: 1, migrate: () => createProfile() },
      profileSchema,
    );
    expect(result.original).toEqual(original);
    expect(result.migrated.schemaVersion).toBe(1);
    expect(original).toEqual({ schemaVersion: 0, label: 'Original' });
    expect(() =>
      prepareMigration(
        original,
        { from: 0, to: 1, migrate: () => ({ schemaVersion: 1 }) },
        profileSchema,
      ),
    ).toThrow();
  });
  it('validates bounded templates and rejects executable styling', () => {
    const template = createTemplate();
    expect(template.pageSize).toBe('A4');
    expect(
      templateConfigSchema.safeParse({
        ...template,
        accentColor: 'url(javascript:alert(1))',
      }).success,
    ).toBe(false);
    expect(
      templateConfigSchema.safeParse({ ...template, bodyFontSize: 99 }).success,
    ).toBe(false);
    expect(
      templateConfigSchema.safeParse({ ...template, css: 'body {}' }).success,
    ).toBe(false);
  });
});
describe('resume isolation and provenance', () => {
  it('links multiple independent variants to one master profile', () => {
    const { profile } = createDemo();
    const original = structuredClone(profile);
    const a = createVariant(profile, 'A');
    const b = createVariant(profile, 'B');
    a.selections[0]!.snapshot.title = 'Variant wording';
    expect(a.id).not.toBe(b.id);
    expect(a.sourceProfileId).toBe(b.sourceProfileId);
    expect(profile).toEqual(original);
    expect(b.selections[0]!.snapshot.title).not.toBe('Variant wording');
  });
  it('keeps stable source references after reordering', () => {
    const { profile, variant } = createDemo();
    profile.projects.reverse();
    expect(
      resolveSelections(profile, variant).every((r) => r.status === 'current'),
    ).toBe(true);
    expect(
      variant.selections.find((s) => s.section === 'projects')?.sourceEntryId,
    ).toBe(profile.projects[0]?.id);
  });
  it('retains pinned evidence and flags changed and deleted sources', () => {
    const { profile, variant } = createDemo();
    const old = variant.selections.find((s) => s.section === 'projects')!
      .snapshot.title;
    profile.projects[0]!.title = 'Changed';
    expect(
      resolveSelections(profile, variant).find(
        (r) => r.selection.section === 'projects',
      )?.status,
    ).toBe('changed');
    profile.projects = [];
    const resolved = resolveSelections(profile, variant).find(
      (r) => r.selection.section === 'projects',
    );
    expect(resolved?.status).toBe('missing');
    expect(resolved?.evidence.title).toBe(old);
    expect(() => resolveSelections(createProfile(), variant)).toThrow();
  });
  it('validates entry-specific wording without mutating its source', () => {
    const { profile, variant } = createDemo();
    const s = variant.selections.find((s) => s.section === 'projects')!;
    variant.overrides.push({
      id: newId(),
      selectionId: s.id,
      title: 'Tailored title',
      bullets: [
        { sourceBulletId: s.snapshot.bullets[0]!.id, text: 'Focused wording' },
      ],
      provenance: { origin: 'user', evidenceIds: [s.sourceEntryId] },
    });
    expect(variantSchema.safeParse(variant).success).toBe(true);
    expect(profile.projects[0]?.title).not.toBe('Tailored title');
    variant.overrides[0]!.bullets[0]!.sourceBulletId = newId();
    expect(variantSchema.safeParse(variant).success).toBe(false);
  });
  it('rejects unsupported overrides and mismatched selections explicitly', () => {
    const { variant } = createDemo();
    variant.selections[0]!.sourceEntryId = newId();
    expect(variantSchema.safeParse(variant).success).toBe(false);
    const other = createDemo().variant;
    other.overrides.push({
      id: newId(),
      selectionId: newId(),
      bullets: [],
      provenance: { origin: 'user', evidenceIds: [newId()] },
    });
    expect(variantSchema.safeParse(other).success).toBe(false);
  });
});
