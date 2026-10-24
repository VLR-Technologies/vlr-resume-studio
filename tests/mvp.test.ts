import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { stringify } from 'yaml';
import { StudioDatabase } from '@/services/storage/database';
import { StudioRepository } from '@/services/storage/repository';
import { createDemo } from '@/data/demo';
import { createProfile, createVariant, newId } from '@/domain/factories';
import {
  createEvidence,
  updateContent,
  effectiveEvidence,
  applyPreset,
} from '@/domain/editor';
import { profileSchema, variantSchema, type Evidence } from '@/domain/schemas';
import { buildRenderModel } from '@/services/rendering/model';
import { serializeBackup } from '@/services/interoperability/contracts';
import {
  parseImport,
  serializeYaml,
  remapBackup,
  projectVariant,
  makeBackup,
} from '@/services/interoperability/portability';

let database: StudioDatabase;
let repo: StudioRepository;
beforeEach(() => {
  database = new StudioDatabase(`mvp-${newId()}`);
  repo = new StudioRepository(database);
});
afterEach(async () => {
  await database.delete();
});
const fingerprint = (
  b: Awaited<ReturnType<StudioRepository['exportWorkspace']>>,
) => JSON.stringify([b.profiles, b.variants, b.revisions]);
async function seed() {
  const { profile, variant } = createDemo();
  await repo.addProfile(profile);
  await database.variants.add(variant);
  return { profile, variant };
}

describe('complete profile and resume contracts', () => {
  it('persists all evidence types, partial fields, stable bullets, and order through reconnect', async () => {
    const p = createProfile('Blank to complete');
    for (const kind of [
      'education',
      'work',
      'internships',
      'projects',
      'skills',
      'certifications',
      'languages',
      'publications',
      'awards',
      'volunteer',
      'custom',
      'links',
    ] as const) {
      const e = createEvidence(kind);
      e.title = `My ${kind}`;
      e.bullets = [{ id: newId(), text: 'A real accomplishment' }];
      if (e.kind === 'links') e.url = 'https://github.com/example';
      (p[kind] as Evidence[]).push(e);
    }
    p.identity = { name: 'Zoë Müller', email: 'zoe@example.com' };
    p.projects[0]!.technologies = ['Python', 'TypeScript'];
    await repo.addProfile(p);
    database.close();
    await database.open();
    expect(await repo.getProfile(p.id)).toEqual(profileSchema.parse(p));
  });
  it('isolates full entry wording, new bullets, summary, and contact details from master and sibling', async () => {
    const { profile, variant } = await seed();
    const sibling = await repo.duplicateVariant(variant.id);
    const selection = variant.selections.find((s) => s.section === 'projects')!;
    let changed = updateContent(variant, selection.id, {
      ...selection.snapshot,
      title: 'Tailored project',
      bullets: [{ id: newId(), text: 'A real tailored bullet' }],
    });
    changed = {
      ...changed,
      summarySnapshot: 'Targeted summary',
      identityOverride: { name: 'Zoë' },
      template: { ...changed.template, templateId: 'modern' },
    };
    const saved = await repo.saveVariant(changed, variant.updatedAt);
    expect(
      effectiveEvidence(
        saved,
        saved.selections.find((s) => s.id === selection.id)!,
      ).title,
    ).toBe('Tailored project');
    expect(await repo.getProfile(profile.id)).toEqual(profile);
    expect(await repo.getVariant(sibling.id)).toEqual(sibling);
    expect(buildRenderModel(profile, saved).identity.name).toBe('Zoë');
    expect(buildRenderModel(profile, sibling).identity.name).toBe(
      'Alex Morgan',
    );
  });
  it('keeps content and snapshots across all four templates, visibility changes, and orders', () => {
    const { profile, variant } = createDemo();
    const content = buildRenderModel(profile, variant).sections;
    for (const templateId of [
      'classic',
      'european',
      'modern',
      'academic',
    ] as const)
      expect(
        buildRenderModel(profile, {
          ...variant,
          template: { ...variant.template, templateId },
        }).sections,
      ).toEqual(content);
    const reversed = {
      ...variant,
      sectionOrder: [...variant.sectionOrder].reverse(),
      template: { ...variant.template, hiddenSections: ['education' as const] },
    };
    expect(
      buildRenderModel(profile, reversed).sections.some(
        (s) => s.id === 'education',
      ),
    ).toBe(false);
    expect(reversed.selections).toEqual(variant.selections);
  });
  it('reports source drift and missing evidence, and keeps historical identity and wording', () => {
    const { profile, variant } = createDemo();
    profile.identity.name = 'Changed name';
    profile.projects = [];
    const model = buildRenderModel(profile, variant);
    expect(model.identity.name).toBe('Alex Morgan');
    expect(
      model.sections.find((s) => s.id === 'projects')?.entries[0]?.title,
    ).toBe('Open Garden Classifier');
    expect(model.warnings.join(' ')).toContain('Source removed');
  });
  it('restores old snapshots after profile deletion of entries and retains the version replaced', async () => {
    const { profile, variant } = await seed();
    const saved = await repo.saveVariant(
      { ...variant, title: 'New title', selections: [], overrides: [] },
      variant.updatedAt,
    );
    await repo.saveProfile(
      { ...profile, projects: [], education: [], skills: [], languages: [] },
      profile.updatedAt,
    );
    const revision = (await repo.listRevisions(variant.id))[0]!;
    const restored = await repo.restoreRevision(revision.id, saved.updatedAt);
    expect(restored.title).toBe(variant.title);
    expect(restored.selections).toEqual(variant.selections);
    expect(
      (await repo.listRevisions(variant.id)).some(
        (r) => r.reason === 'restore' && r.snapshot.title === 'New title',
      ),
    ).toBe(true);
  });
  it('rejects stale restores, forged overrides and out-of-bound designs', async () => {
    const { variant } = await seed();
    await repo.saveVariant({ ...variant, title: 'Changed' }, variant.updatedAt);
    const revision = (await repo.listRevisions(variant.id))[0]!;
    await expect(
      repo.restoreRevision(revision.id, variant.updatedAt),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    const selection = variant.selections[0]!;
    const forged = updateContent(variant, selection.id, {
      ...selection.snapshot,
      id: newId(),
    });
    expect(variantSchema.safeParse(forged).success).toBe(false);
    expect(
      variantSchema.safeParse({
        ...variant,
        template: { ...variant.template, bodyFontSize: 100 },
      }).success,
    ).toBe(false);
  });
  it.each(['internship', 'working-student', 'research'] as const)(
    'applies an editable %s recommendation without removing any evidence',
    (category) => {
      const { variant } = createDemo();
      const v = applyPreset(
        { ...variant, employmentCategory: { kind: category } },
        'AI / Machine Learning Engineer',
      );
      expect(v.sectionOrder[1]).toBe('education');
      expect(v.template.templateId).toBe(
        category === 'research' ? 'academic' : 'classic',
      );
      expect(v.selections).toEqual(variant.selections);
    },
  );
});

describe('safe complete portability', () => {
  it('keeps cleared optional contact details cleared through native JSON/YAML and standard export', () => {
    const { profile, variant } = createDemo();
    variant.identityOverride = {
      ...profile.identity,
      email: undefined,
      location: undefined,
    };
    const original = makeBackup([profile], [variant]);
    for (const [source, file] of [
      [serializeBackup(original), 'backup.json'],
      [serializeYaml(original), 'backup.yaml'],
    ]) {
      const imported = parseImport(source!, file!).backup;
      const p = imported.profiles[0]!,
        v = imported.variants[0]!;
      const model = buildRenderModel(p, v);
      expect(model.identity.name).toBe('Alex Morgan');
      expect(model.identity.email).toBeUndefined();
      expect(model.identity.location).toBeUndefined();
      expect(projectVariant(p, v).data.basics.email).toBeUndefined();
    }
  });
  it('imports standard YAML education, project technologies, and professional links without guessing facts', () => {
    const result = parseImport(
      stringify({
        basics: {
          name: 'Zoë',
          url: 'https://example.com',
          profiles: [{ network: 'GitHub', url: 'https://github.com/example' }],
        },
        education: [
          {
            institution: 'Example university',
            area: 'Computer Science',
            studyType: 'MSc',
            location: 'Berlin',
            summary: 'A real degree',
          },
        ],
        projects: [{ name: 'A real project', keywords: ['TypeScript'] }],
      }),
      'resume.yaml',
    );
    const p = result.backup.profiles[0]!;
    expect(p.education[0]).toMatchObject({
      title: 'Computer Science',
      qualification: 'MSc',
      location: 'Berlin',
      summary: 'A real degree',
    });
    expect(p.projects[0]?.technologies).toEqual(['TypeScript']);
    expect(p.links).toHaveLength(2);
  });
  it('rejects a backup exceeding the supported revision count instead of silently pruning imports', () => {
    const { profile, variant } = createDemo();
    const b = makeBackup([profile], [variant]);
    b.revisions = Array.from({ length: 21 }, () => ({
      id: newId(),
      schemaVersion: 1 as const,
      variantId: variant.id,
      createdAt: variant.updatedAt,
      reason: 'metadata-update' as const,
      snapshot: variant,
    }));
    expect(() => parseImport(JSON.stringify(b), 'backup.json')).toThrow();
  });
  it.each(['json', 'yaml'])(
    'round-trips native %s with overrides, all design settings, and revisions into a clean database',
    async (format) => {
      const { profile, variant } = await seed();
      const selection = variant.selections.find(
        (s) => s.section === 'projects',
      )!;
      let v = updateContent(variant, selection.id, {
        ...selection.snapshot,
        summary: 'Selected wording',
      });
      v = {
        ...v,
        identityOverride: { headline: 'Research engineer' },
        template: {
          ...v.template,
          templateId: 'modern',
          accentColor: '#112233',
          margins: { top: 10, right: 15, bottom: 12, left: 17 },
        },
      };
      await repo.saveVariant(v, variant.updatedAt);
      const original = await repo.exportWorkspace();
      const parsed = parseImport(
        format === 'json' ? serializeBackup(original) : serializeYaml(original),
        `backup.${format}`,
      ).backup;
      expect(JSON.parse(JSON.stringify(parsed))).toEqual(
        JSON.parse(JSON.stringify(original)),
      );
      const clean = new StudioDatabase(`import-${newId()}`);
      const other = new StudioRepository(clean);
      try {
        await other.applyImport(
          parsed,
          'replace',
          fingerprint(await other.exportWorkspace()),
        );
        expect(await other.getProfile(profile.id)).toEqual(profile);
        expect(await other.getVariant(v.id)).toEqual(
          await repo.getVariant(v.id),
        );
        expect(await other.listRevisions(v.id)).toEqual(
          await repo.listRevisions(v.id),
        );
      } finally {
        await clean.delete();
      }
    },
  );
  it('remaps IDs consistently for new records and keeps original data intact', async () => {
    const { profile, variant } = await seed();
    const current = await repo.exportWorkspace();
    const incoming = remapBackup(current);
    await repo.applyImport(incoming, 'new', fingerprint(current));
    expect((await repo.listProfiles()).length).toBe(2);
    expect((await repo.listVariants()).length).toBe(2);
    expect(incoming.variants[0]!.sourceProfileId).toBe(
      incoming.profiles[0]!.id,
    );
    expect(incoming.variants[0]!.selections[0]!.sourceEntryId).toBe(
      incoming.variants[0]!.selections[0]!.snapshot.id,
    );
    expect(await repo.getProfile(profile.id)).toEqual(profile);
    expect(await repo.getVariant(variant.id)).toEqual(variant);
  });
  it('merges identical records, rejects conflicts, and rolls back a replace if any write fails', async () => {
    await seed();
    const current = await repo.exportWorkspace();
    await repo.applyImport(current, 'merge', fingerprint(current));
    await expect(
      repo.applyImport(
        {
          ...current,
          profiles: current.profiles.map((p) => ({
            ...p,
            label: 'Conflicting name',
          })),
        },
        'merge',
        fingerprint(current),
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    const fresh = makeBackup([createProfile('Replacement')]);
    vi.spyOn(database.profiles, 'add').mockRejectedValueOnce(
      new Error('Injected failure'),
    );
    await expect(
      repo.applyImport(fresh, 'replace', fingerprint(current)),
    ).rejects.toThrow();
    expect(fingerprint(await repo.exportWorkspace())).toBe(
      fingerprint(current),
    );
  });
  it('rejects applying a stale reviewed proposal', async () => {
    const { profile } = await seed();
    const current = await repo.exportWorkspace();
    await repo.saveProfile(
      { ...profile, label: 'External edit' },
      profile.updatedAt,
    );
    await expect(
      repo.applyImport(current, 'replace', fingerprint(current)),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await repo.getProfile(profile.id)).label).toBe('External edit');
  });
  it.each([
    ['bad.json', '{broken'],
    ['bad.yaml', 'a: &a [*a]'],
    ['bad.yaml', 'a: !!js/function function(){}'],
    ['bad.yaml', 'a: 1\na: 2'],
    ['bad.json', '{"__proto__":{"polluted":true}}'],
    ['bad.json', '{"a":'.repeat(45) + '0' + '}'.repeat(45)],
    ['bad.json', JSON.stringify({ format: 'vlr-backup', schemaVersion: 99 })],
    ['bad.json', ' '.repeat(5 * 1024 * 1024 + 1)],
  ])(
    'rejects unsafe or invalid %s before any stored changes',
    async (name, text) => {
      await seed();
      const original = fingerprint(await repo.exportWorkspace());
      expect(() => parseImport(text, name)).toThrow();
      expect(fingerprint(await repo.exportWorkspace())).toBe(original);
      expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    },
  );
  it('exports selected variant wording to standard JSON Resume and reimports supported content', () => {
    const { profile, variant } = createDemo();
    const selection = variant.selections.find((s) => s.section === 'projects')!;
    const v = updateContent(variant, selection.id, {
      ...selection.snapshot,
      title: 'Tailored standard project',
    });
    const result = projectVariant(profile, v);
    expect(result.data.projects[0]?.name).toBe('Tailored standard project');
    const incoming = parseImport(JSON.stringify(result.data), 'resume.json');
    expect(incoming.backup.profiles[0]?.projects[0]?.title).toBe(
      'Tailored standard project',
    );
    expect(incoming.warnings.length).toBeGreaterThan(0);
  });
  it('rejects broken native relationships before replacing valid data', async () => {
    await seed();
    const current = await repo.exportWorkspace();
    const bad = { ...current, profiles: [] };
    await expect(
      repo.applyImport(bad, 'replace', fingerprint(current)),
    ).rejects.toThrow();
    expect(fingerprint(await repo.exportWorkspace())).toBe(
      fingerprint(current),
    );
  });
  it('reads Stage 0 records without requiring a database upgrade', () => {
    const { variant } = createDemo();
    delete variant.identitySnapshot;
    expect(variantSchema.parse(variant)).toEqual(variant);
    expect(createVariant(createProfile()).identitySnapshot).toEqual({});
  });
});
