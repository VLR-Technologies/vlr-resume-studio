import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioDatabase } from '@/services/storage/database';
import { StudioRepository } from '@/services/storage/repository';
import { newId } from '@/domain/factories';
import {
  createEvidence,
  updateContent,
  effectiveEvidence,
} from '@/domain/editor';
let database: StudioDatabase;
let repo: StudioRepository;
beforeEach(() => {
  database = new StudioDatabase(`flow-ui-${newId()}`);
  repo = new StudioRepository(database);
});
afterEach(() => database.delete());
describe('direct resume authoring', () => {
  it('creates a valid blank source and linked resume atomically', async () => {
    const v = await repo.startResume();
    const p = await repo.getProfile(v.sourceProfileId);
    expect(p.identity).toEqual({});
    expect(v.selections).toEqual([]);
    expect(v.sectionOrder.slice(0, 3)).toEqual([
      'summary',
      'work',
      'education',
    ]);
  });
  it('adds canonical evidence and a selection, while tailored edits stay independent', async () => {
    const initial = await repo.startResume();
    const work = createEvidence('work');
    work.title = 'Engineer';
    const v = await repo.addResumeEntry(initial.id, initial.updatedAt, work);
    expect((await repo.getProfile(v.sourceProfileId)).work[0]?.id).toBe(
      work.id,
    );
    const tailored = updateContent(v, v.selections[0]!.id, {
      ...work,
      title: 'Senior Engineer',
    });
    const saved = await repo.saveVariant(tailored, v.updatedAt);
    expect(effectiveEvidence(saved, saved.selections[0]!).title).toBe(
      'Senior Engineer',
    );
    expect((await repo.getProfile(v.sourceProfileId)).work[0]?.title).toBe(
      'Engineer',
    );
  });
  it('rolls back the source write if the resume has changed in another tab', async () => {
    const v = await repo.startResume();
    await repo.saveVariant({ ...v, title: 'Other tab' }, v.updatedAt);
    await expect(
      repo.addResumeEntry(v.id, v.updatedAt, createEvidence('work')),
    ).rejects.toThrow(/another tab/);
    expect((await repo.getProfile(v.sourceProfileId)).work).toEqual([]);
  });
  it('does not leave an orphan profile when creating a resume fails', async () => {
    vi.spyOn(database.variants, 'add').mockRejectedValueOnce(
      new Error('failed'),
    );
    await expect(repo.startResume()).rejects.toThrow();
    expect(await database.profiles.count()).toBe(0);
  });
});
