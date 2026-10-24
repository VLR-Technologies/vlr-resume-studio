import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  createEvidence,
  rolePresets,
  applyPreset,
  presetAdvice,
} from '@/domain/editor';
import type { Evidence } from '@/domain/schemas';
import { EvidenceEditor } from '@/features/editor/evidence-editor';
import {
  parseImport,
  makeBackup,
  remapBackup,
} from '@/services/interoperability/portability';
import { qaWorkspace } from './fixtures/qa-profiles';
import { StudioDatabase } from '@/services/storage/database';
import { StudioRepository } from '@/services/storage/repository';
import { documentAccent, whiteContrast } from '@/services/rendering/colors';
import { serializeBackup } from '@/services/interoperability/contracts';
import { serializeYaml } from '@/services/interoperability/portability';
import { newId } from '@/domain/factories';

const databases: StudioDatabase[] = [];
afterEach(async () => {
  for (const database of databases.splice(0)) await database.delete();
});
function Entry({ kind }: { kind: Evidence['kind'] }) {
  const [entry, setEntry] = useState(createEvidence(kind));
  return (
    <>
      <EvidenceEditor entry={entry} onChange={setEntry} onDelete={() => {}} />
      <output data-testid="entry-data">{JSON.stringify(entry)}</output>
    </>
  );
}
describe('Stage 1.5 discovered regressions', () => {
  it.each(['skills', 'projects'] as const)(
    'QA-001: preserves typed spaces in %s lists',
    async (kind) => {
      const user = userEvent.setup();
      render(<Entry kind={kind} />);
      const field = screen.getByLabelText(
        kind === 'skills'
          ? 'Skills (comma separated)'
          : 'Technologies (comma separated)',
      );
      await user.type(field, 'Machine Learning, GitHub Actions');
      await user.tab();
      expect(field).toHaveValue('Machine Learning, GitHub Actions');
      const entry = JSON.parse(
        screen.getByTestId('entry-data').textContent || '{}',
      ) as Evidence;
      expect(
        entry.kind === 'skills'
          ? entry.keywords
          : entry.kind === 'projects'
            ? entry.technologies
            : [],
      ).toEqual(['Machine Learning', 'GitHub Actions']);
    },
  );
  it('QA-002: new-record import remaps identifiers without rewriting UUID-shaped career text', () => {
    const { profile, variant } = qaWorkspace();
    profile.summary = profile.id;
    variant.summarySnapshot = profile.id;
    variant.title = profile.id;
    const copy = remapBackup(makeBackup([profile], [variant]));
    expect(copy.profiles[0]!.id).not.toBe(profile.id);
    expect(copy.profiles[0]!.summary).toBe(profile.id);
    expect(copy.variants[0]!.summarySnapshot).toBe(profile.id);
    expect(copy.variants[0]!.title).toBe(profile.id);
    expect(copy.variants[0]!.sourceProfileId).toBe(copy.profiles[0]!.id);
  });
  it('QA-003: rejects duplicate JSON keys, including escaped equivalent names, before review', () => {
    expect(() =>
      parseImport(
        '{"basics":{"name":"First","name":"Second"}}',
        'duplicate.json',
      ),
    ).toThrow(/duplicate/i);
    expect(() =>
      parseImport(
        '{"basics":{"name":"First","na\\u006de":"Second"}}',
        'duplicate.json',
      ),
    ).toThrow(/duplicate/i);
  });
  it('QA-004: safe merge cannot silently remove existing revisions at the history bound', async () => {
    const database = new StudioDatabase(`qa-${newId()}`);
    databases.push(database);
    const repo = new StudioRepository(database);
    const { profile, variant } = qaWorkspace();
    await repo.addProfile(profile);
    await database.variants.add(variant);
    for (let i = 0; i < 20; i++)
      await repo.saveVariant(
        { ...(await repo.getVariant(variant.id)), targetRole: `role ${i}` },
        (await repo.getVariant(variant.id)).updatedAt,
      );
    const before = await repo.exportWorkspace();
    const incoming = structuredClone(before);
    incoming.revisions = incoming.revisions.map((r) => ({ ...r, id: newId() }));
    await expect(
      repo.applyImport(
        incoming,
        'merge',
        JSON.stringify([before.profiles, before.variants, before.revisions]),
      ),
    ).rejects.toThrow(/revision|history|conflict/i);
    expect(
      (await repo.listRevisions(variant.id)).map((r) => r.id).sort(),
    ).toEqual(before.revisions.map((r) => r.id).sort());
  });
});

describe('all employment/role recommendation combinations', () => {
  const categories = [
    'internship',
    'working-student',
    'graduate',
    'full-time',
    'research',
    'custom',
  ] as const;
  it.each(
    categories.flatMap((kind) => rolePresets.map((role) => ({ kind, role }))),
  )('QA-009: $kind / $role.name preserves authored data', ({ kind, role }) => {
    const { variant } = qaWorkspace();
    variant.targetRole = 'Tailored target';
    variant.summarySnapshot = 'Authored summary';
    variant.employmentCategory =
      kind === 'custom' ? { kind, label: 'Consulting contract' } : { kind };
    const next = applyPreset(variant, role.name);
    expect(next.targetRole).toBe(variant.targetRole);
    expect(next.summarySnapshot).toBe(variant.summarySnapshot);
    expect(next.selections).toEqual(variant.selections);
    expect(next.overrides).toEqual(variant.overrides);
    expect(next.employmentCategory).toEqual(variant.employmentCategory);
    expect(new Set(next.sectionOrder).size).toBe(next.sectionOrder.length);
    expect(next.template.templateId).toBe(presetAdvice(kind).template);
    expect(presetAdvice(kind).length).toBeTruthy();
    expect(presetAdvice(kind).optional).toBeTruthy();
    expect(role.emphasis).toBeTruthy();
  });
});

it.each(['#ffffff', '#eeeeee', '#ffff00', '#245b4b', '#000000'])(
  'QA-010: %s produces readable white-paper ink without changing stored settings',
  (accentColor) => {
    const template = { templateId: 'modern', accentColor };
    const rendered = documentAccent(template);
    expect(whiteContrast(rendered)).toBeGreaterThanOrEqual(4.5);
    expect(template.accentColor).toBe(accentColor);
  },
);
it('native round trips preserve multiple profiles, all evidence fields, overridden contact visibility, and transactional restore after interruption', async () => {
  const database = new StudioDatabase(`qa-portability-${newId()}`);
  databases.push(database);
  const repo = new StudioRepository(database);
  const a = qaWorkspace('professional'),
    b = qaWorkspace('researcher');
  await repo.addProfile(a.profile);
  await repo.addProfile(b.profile);
  await database.variants.bulkAdd([a.variant, b.variant]);
  const tailored = {
    ...a.variant,
    identityOverride: { ...a.profile.identity, email: undefined },
    hiddenIdentityFields: ['phone' as const],
    template: {
      ...a.variant.template,
      templateId: 'modern' as const,
      margins: { top: 9, right: 12, bottom: 14, left: 20 },
      sectionSpacing: 9,
      accentColor: '#225577',
    },
  };
  await repo.saveVariant(tailored, a.variant.updatedAt);
  const before = await repo.exportWorkspace();
  for (const [source, name] of [
    [serializeBackup(before), 'data.json'],
    [serializeYaml(before), 'data.yaml'],
  ])
    expect(
      JSON.parse(JSON.stringify(parseImport(source!, name!).backup)),
    ).toEqual(JSON.parse(JSON.stringify(before)));
  vi.spyOn(database.variants, 'add').mockRejectedValueOnce(
    new DOMException('QA interrupted write', 'AbortError'),
  );
  await expect(
    repo.applyImport(
      remapBackup(before),
      'replace',
      JSON.stringify([before.profiles, before.variants, before.revisions]),
    ),
  ).rejects.toThrow();
  const after = await repo.exportWorkspace();
  expect([after.profiles, after.variants, after.revisions]).toEqual([
    before.profiles,
    before.variants,
    before.revisions,
  ]);
});
it.each([
  '{"basics":{"name":"QA"},"__proto__":{"injected":true}}',
  '{"basics":{"constructor":{"prototype":{"injected":true}}}}',
  '{"schemaType":"vlr-backup","schemaVersion":99,"data":{}}',
])(
  'rejects unsafe/future structured input without evaluating it: %s',
  (source) => {
    expect(() => parseImport(source, 'unsafe.json')).toThrow();
    expect(({} as { injected?: boolean }).injected).toBeUndefined();
  },
);
