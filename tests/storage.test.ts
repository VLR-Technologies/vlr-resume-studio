import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { StudioDatabase } from '@/services/storage/database';
import { StudioRepository, storageError } from '@/services/storage/repository';
import { createDemo } from '@/data/demo';
import { createVariant, newId } from '@/domain/factories';
let database: StudioDatabase;
let repo: StudioRepository;
beforeEach(() => {
  database = new StudioDatabase(`test-${crypto.randomUUID()}`);
  repo = new StudioRepository(database);
});
afterEach(async () => {
  await database.delete();
});
describe('IndexedDB persistence and integrity', () => {
  it('creates and retrieves blank profiles', async () => {
    const p = await repo.createBlankProfile();
    expect(await repo.getProfile(p.id)).toEqual(p);
    expect(await repo.listProfiles()).toHaveLength(1);
  });
  it('persists profiles and resumes across a closed and reopened database', async () => {
    const profile = await repo.createDemo();
    const [variant] = await repo.listVariants();
    database.close();
    await database.open();
    expect(await repo.getProfile(profile.id)).toEqual(profile);
    expect(await repo.getVariant(variant!.id)).toEqual(variant);
  });
  it('updates profile metadata and keeps stable identity', async () => {
    const p = await repo.createBlankProfile();
    const next = await repo.saveProfile(
      { ...p, label: 'Changed' },
      p.updatedAt,
    );
    expect(next.id).toBe(p.id);
    expect(next.updatedAt > p.updatedAt).toBe(true);
    expect((await repo.getProfile(p.id)).label).toBe('Changed');
  });
  it('saves multiple variants and revisions without changing the master', async () => {
    const p = await repo.createDemo();
    const a = await repo.createResume(p.id, 'Another', 'Researcher');
    await repo.saveVariant({ ...a, title: 'Edited' }, a.updatedAt);
    expect(await repo.getProfile(p.id)).toEqual(p);
    expect(await repo.listVariants()).toHaveLength(2);
    const revisions = await database.revisions.toArray();
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.snapshot.title).toBe('Another');
  });
  it('keeps at most twenty independent variant revisions', async () => {
    const p = await repo.createBlankProfile();
    let v = await repo.createResume(p.id, 'Resume', '');
    for (let i = 0; i < 22; i++)
      v = await repo.saveVariant({ ...v, title: `Revision ${i}` }, v.updatedAt);
    expect(await database.revisions.count()).toBe(20);
    expect((await repo.getVariant(v.id)).title).toBe('Revision 21');
  });
  it('rejects stale cross-tab writes', async () => {
    const p = await repo.createBlankProfile();
    await repo.saveProfile({ ...p, label: 'First' }, p.updatedAt);
    await expect(
      repo.saveProfile({ ...p, label: 'Stale' }, p.updatedAt),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await repo.getProfile(p.id)).label).toBe('First');
    const v = await repo.createResume(p.id, 'Resume', '');
    await repo.saveVariant({ ...v, title: 'First' }, v.updatedAt);
    await expect(
      repo.saveVariant({ ...v, title: 'Stale' }, v.updatedAt),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
  it('preserves valid records when validation rejects a write', async () => {
    const p = await repo.createBlankProfile();
    await expect(
      repo.saveProfile({ ...p, identity: { email: 'invalid' } }, p.updatedAt),
    ).rejects.toMatchObject({ code: 'INVALID_DATA' });
    await expect(
      repo.saveProfile({ ...p, schemaVersion: 2 }, p.updatedAt),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_VERSION' });
    expect(await repo.getProfile(p.id)).toEqual(p);
  });
  it('rejects corrupt reads without deleting the stored copy', async () => {
    const p = await repo.createBlankProfile();
    await database.profiles.update(p.id, { schemaVersion: 2 as 1 });
    await expect(repo.listProfiles()).rejects.toMatchObject({
      code: 'UNSUPPORTED_VERSION',
    });
    expect((await database.profiles.get(p.id))?.schemaVersion).toBe(2);
  });
  it('deletes an explicitly selected variant and preserves its profile', async () => {
    const p = await repo.createDemo();
    const v = (await repo.listVariants())[0]!;
    await repo.saveVariant({ ...v, title: 'New' }, v.updatedAt);
    await repo.deleteVariant(v.id);
    expect(await repo.listVariants()).toHaveLength(0);
    expect(await database.revisions.count()).toBe(0);
    expect(await repo.getProfile(p.id)).toEqual(p);
  });
  it('protects linked profiles and supports explicit profile deletion', async () => {
    const p = await repo.createDemo();
    await expect(repo.deleteProfile(p.id)).rejects.toMatchObject({
      code: 'REFERENCE',
    });
    await repo.deleteVariant((await repo.listVariants())[0]!.id);
    await repo.deleteProfile(p.id);
    expect(await repo.listProfiles()).toHaveLength(0);
  });
  it('reports missing records explicitly', async () => {
    await expect(repo.getProfile(newId())).rejects.toMatchObject({
      code: 'MISSING',
    });
    await expect(repo.getVariant(newId())).rejects.toMatchObject({
      code: 'MISSING',
    });
    await expect(
      repo.createResume(newId(), 'Missing', ''),
    ).rejects.toMatchObject({ code: 'MISSING' });
  });
  it('retains missing source snapshots but rejects newly invented references', async () => {
    const p = await repo.createDemo();
    const v = (await repo.listVariants())[0]!;
    await repo.saveProfile({ ...p, projects: [] }, p.updatedAt);
    const updated = await repo.saveVariant(
      { ...v, title: 'Still here' },
      v.updatedAt,
    );
    expect(updated.selections.length).toBe(v.selections.length);
    const invalid = createVariant(createDemo().profile);
    await expect(
      repo.saveVariant(
        {
          ...updated,
          selections: [...updated.selections, invalid.selections[0]!],
        },
        updated.updatedAt,
      ),
    ).rejects.toMatchObject({ code: 'REFERENCE' });
  });
  it('rolls back an entire demo pair if the second record write fails', async () => {
    vi.spyOn(database.variants, 'add').mockRejectedValueOnce(
      new DOMException('full', 'QuotaExceededError'),
    );
    await expect(repo.createDemo()).rejects.toMatchObject({ code: 'QUOTA' });
    expect(await database.profiles.count()).toBe(0);
    expect(await database.variants.count()).toBe(0);
  });
  it('rolls back revision creation if variant saving fails', async () => {
    const p = await repo.createBlankProfile();
    const v = await repo.createResume(p.id, 'Original', '');
    vi.spyOn(database.variants, 'put').mockRejectedValueOnce(
      new Error('write rejected'),
    );
    await expect(
      repo.saveVariant({ ...v, title: 'Rejected' }, v.updatedAt),
    ).rejects.toMatchObject({ code: 'STORAGE' });
    expect(await database.revisions.count()).toBe(0);
    expect(await repo.getVariant(v.id)).toEqual(v);
  });
  it('creates the demo idempotently and deletes only sample-linked records', async () => {
    const mine = await repo.createBlankProfile('Keep me');
    const demo = await repo.createDemo();
    await repo.createDemo();
    await repo.createResume(demo.id, 'Custom from demo', '');
    expect(await repo.listProfiles()).toHaveLength(2);
    expect(await repo.deleteDemo()).toBe(1);
    expect(await repo.listProfiles()).toEqual([mine]);
    expect(await repo.listVariants()).toHaveLength(0);
  });
  it('maps quota and unavailable storage failures to useful errors', async () => {
    vi.spyOn(database.profiles, 'add').mockRejectedValueOnce(
      new DOMException('blocked', 'SecurityError'),
    );
    await expect(repo.createBlankProfile()).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
    expect(
      storageError(new DOMException('full', 'QuotaExceededError')).code,
    ).toBe('QUOTA');
  });
});
