import { createProfile, createVariant, newId } from '@/domain/factories';
import { profileSchema, revisionSchema, variantSchema } from '@/domain/schemas';
import { DataError, validate } from '@/domain/validation';
import { createDemo } from '@/data/demo';
import { db, type StudioDatabase } from './database';
import {
  backupSchema,
  type VlrBackup,
} from '@/services/interoperability/contracts';
export function storageError(error: unknown): DataError {
  if (error instanceof DataError) return error;
  const name =
    error &&
    typeof error === 'object' &&
    'name' in error &&
    typeof error.name === 'string'
      ? error.name
      : '';
  if (name === 'QuotaExceededError')
    return new DataError(
      'QUOTA',
      'Browser storage is full. Free space and try again; existing records were preserved.',
    );
  if (
    [
      'SecurityError',
      'MissingAPIError',
      'InvalidStateError',
      'OpenFailedError',
      'UnknownError',
      'VersionError',
    ].includes(name)
  )
    return new DataError(
      'UNAVAILABLE',
      'Browser storage is unavailable. Check browser permissions or private browsing settings, then retry.',
    );
  return new DataError(
    'STORAGE',
    'The local storage operation failed. No success was recorded. Please retry.',
  );
}
async function safely<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw storageError(error);
  }
}
function tick(previous: string) {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}
export class StudioRepository {
  constructor(public readonly database: StudioDatabase) {}
  listProfiles() {
    return safely(async () =>
      (await this.database.profiles.toArray()).map((p) =>
        validate(profileSchema, p),
      ),
    );
  }
  listVariants() {
    return safely(async () =>
      (await this.database.variants.toArray()).map((v) =>
        validate(variantSchema, v),
      ),
    );
  }
  getProfile(id: string) {
    return safely(async () => {
      const row = await this.database.profiles.get(id);
      if (!row)
        throw new DataError('MISSING', 'Career profile no longer exists.');
      return validate(profileSchema, row);
    });
  }
  getVariant(id: string) {
    return safely(async () => {
      const row = await this.database.variants.get(id);
      if (!row) throw new DataError('MISSING', 'Resume no longer exists.');
      return validate(variantSchema, row);
    });
  }
  createBlankProfile(label?: string) {
    return this.addProfile(createProfile(label));
  }
  addProfile(input: unknown) {
    return safely(async () => {
      const profile = validate(profileSchema, input);
      await this.database.profiles.add(profile);
      return profile;
    });
  }
  saveProfile(input: unknown, expectedUpdatedAt: string) {
    return safely(async () => {
      const profile = validate(profileSchema, input);
      return this.database.transaction(
        'rw',
        this.database.profiles,
        async () => {
          const previous = await this.getProfile(profile.id);
          if (previous.updatedAt !== expectedUpdatedAt)
            throw new DataError(
              'CONFLICT',
              'This profile changed in another tab. Reload before saving.',
            );
          if (
            profile.createdAt !== previous.createdAt ||
            profile.isDemo !== previous.isDemo
          )
            throw new DataError(
              'INVALID_DATA',
              'Profile identity metadata cannot be changed.',
            );
          const next = validate(profileSchema, {
            ...profile,
            updatedAt: tick(previous.updatedAt),
          });
          await this.database.profiles.put(next);
          return next;
        },
      );
    });
  }
  createResume(profileId: string, title: string, targetRole: string) {
    return safely(() =>
      this.database.transaction(
        'rw',
        this.database.profiles,
        this.database.variants,
        async () => {
          const profile = await this.getProfile(profileId);
          const variant = createVariant(profile, title, targetRole);
          await this.database.variants.add(variant);
          return variant;
        },
      ),
    );
  }
  saveVariant(
    input: unknown,
    expectedUpdatedAt: string,
    restoreRevisionId?: string,
  ) {
    return safely(async () => {
      const variant = validate(variantSchema, input);
      return this.database.transaction(
        'rw',
        this.database.profiles,
        this.database.variants,
        this.database.revisions,
        async () => {
          const previous = await this.getVariant(variant.id);
          if (previous.updatedAt !== expectedUpdatedAt)
            throw new DataError(
              'CONFLICT',
              'This resume changed in another tab. Reload before saving.',
            );
          if (
            variant.sourceProfileId !== previous.sourceProfileId ||
            variant.createdAt !== previous.createdAt
          )
            throw new DataError(
              'REFERENCE',
              'Resume source identity cannot be changed.',
            );
          const profile = await this.getProfile(variant.sourceProfileId);
          const restored = restoreRevisionId
            ? validate(
                revisionSchema,
                await this.database.revisions.get(restoreRevisionId),
              )
            : undefined;
          if (
            restored &&
            (restored.variantId !== variant.id ||
              JSON.stringify(restored.snapshot) !== JSON.stringify(variant))
          )
            throw new DataError(
              'REFERENCE',
              'Restore must match a saved revision.',
            );
          for (const selection of variant.selections) {
            if (restored) continue;
            const prior = previous.selections.find(
              (s) => s.id === selection.id,
            );
            if (prior && JSON.stringify(prior) === JSON.stringify(selection))
              continue;
            const source = profile[selection.section].find(
              (e) => e.id === selection.sourceEntryId,
            );
            if (
              !source ||
              JSON.stringify(source) !== JSON.stringify(selection.snapshot)
            )
              throw new DataError(
                'REFERENCE',
                'New or changed selections require matching career evidence.',
              );
          }
          const revision = validate(revisionSchema, {
            id: newId(),
            schemaVersion: 1,
            variantId: previous.id,
            createdAt: tick(previous.updatedAt),
            reason: restored ? 'restore' : 'metadata-update',
            snapshot: previous,
          });
          const next = validate(variantSchema, {
            ...variant,
            updatedAt: revision.createdAt,
          });
          await this.database.revisions.add(revision);
          await this.database.variants.put(next);
          const older = (
            await this.database.revisions
              .where('variantId')
              .equals(variant.id)
              .sortBy('createdAt')
          ).slice(0, -20);
          await this.database.revisions.bulkDelete(older.map((r) => r.id));
          return next;
        },
      );
    });
  }
  listRevisions(variantId: string) {
    return safely(async () =>
      (
        await this.database.revisions
          .where('variantId')
          .equals(variantId)
          .reverse()
          .sortBy('createdAt')
      ).map((r) => validate(revisionSchema, r)),
    );
  }
  async restoreRevision(revisionId: string, expectedUpdatedAt: string) {
    return safely(() =>
      this.database.transaction(
        'rw',
        this.database.profiles,
        this.database.variants,
        this.database.revisions,
        async () => {
          const revision = validate(
            revisionSchema,
            await this.database.revisions.get(revisionId),
          );
          return this.saveVariant(
            revision.snapshot,
            expectedUpdatedAt,
            revisionId,
          );
        },
      ),
    );
  }
  duplicateVariant(id: string) {
    return safely(() =>
      this.database.transaction(
        'rw',
        this.database.profiles,
        this.database.variants,
        async () => {
          const source = await this.getVariant(id);
          await this.getProfile(source.sourceProfileId);
          const now = new Date().toISOString();
          const copy = validate(variantSchema, {
            ...source,
            id: newId(),
            title: `${source.title.slice(0, 190)} (copy)`,
            createdAt: now,
            updatedAt: now,
          });
          await this.database.variants.add(copy);
          return copy;
        },
      ),
    );
  }
  exportWorkspace() {
    return safely(() =>
      this.database.transaction(
        'r',
        this.database.profiles,
        this.database.variants,
        this.database.revisions,
        async () =>
          validate(backupSchema, {
            format: 'vlr-backup',
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            profiles: await this.listProfiles(),
            variants: await this.listVariants(),
            revisions: (await this.database.revisions.toArray()).map((r) =>
              validate(revisionSchema, r),
            ),
            metadata: { application: 'VLR Resume Studio' },
          }),
      ),
    );
  }
  /** Fingerprint guards the detached review against edits from other tabs. All writes are atomic. */
  applyImport(
    input: VlrBackup,
    mode: 'replace' | 'merge' | 'new',
    expectedFingerprint: string,
  ) {
    return safely(async () => {
      const proposed = validate(backupSchema, input);
      return this.database.transaction(
        'rw',
        this.database.profiles,
        this.database.variants,
        this.database.revisions,
        async () => {
          const current = await this.exportWorkspace();
          const fingerprint = JSON.stringify([
            current.profiles,
            current.variants,
            current.revisions,
          ]);
          if (fingerprint !== expectedFingerprint)
            throw new DataError(
              'CONFLICT',
              'Workspace changed after import review. Review the file again.',
            );
          if (mode === 'replace') {
            await this.database.revisions.clear();
            await this.database.variants.clear();
            await this.database.profiles.clear();
          }
          for (const [table, rows] of [
            [this.database.profiles, proposed.profiles],
            [this.database.variants, proposed.variants],
            [this.database.revisions, proposed.revisions],
          ] as const) {
            for (const row of rows) {
              const existing = await table.get(row.id);
              if (existing) {
                if (
                  mode === 'merge' &&
                  JSON.stringify(existing) === JSON.stringify(row)
                )
                  continue;
                throw new DataError(
                  'CONFLICT',
                  'Import contains conflicting record IDs. Choose new records or replace after backing up.',
                );
              }
              // Each row was validated as part of the complete reference-checked backup.
              await (
                table as unknown as {
                  add: (value: unknown) => Promise<unknown>;
                }
              ).add(row);
            }
          }
          for (const variant of proposed.variants) {
            const older = (
              await this.database.revisions
                .where('variantId')
                .equals(variant.id)
                .sortBy('createdAt')
            ).slice(0, -20);
            await this.database.revisions.bulkDelete(older.map((r) => r.id));
          }
        },
      );
    });
  }
  deleteVariant(id: string) {
    return safely(() =>
      this.database.transaction(
        'rw',
        this.database.variants,
        this.database.revisions,
        async () => {
          await this.getVariant(id);
          await this.database.revisions.where('variantId').equals(id).delete();
          await this.database.variants.delete(id);
        },
      ),
    );
  }
  deleteProfile(id: string) {
    return safely(() =>
      this.database.transaction(
        'rw',
        this.database.profiles,
        this.database.variants,
        async () => {
          await this.getProfile(id);
          if (
            await this.database.variants
              .where('sourceProfileId')
              .equals(id)
              .count()
          )
            throw new DataError(
              'REFERENCE',
              'Remove the resumes linked to this profile before deleting it.',
            );
          await this.database.profiles.delete(id);
        },
      ),
    );
  }
  createDemo() {
    return safely(() =>
      this.database.transaction(
        'rw',
        this.database.profiles,
        this.database.variants,
        async () => {
          const existing = (await this.listProfiles()).find((p) => p.isDemo);
          if (existing) return existing;
          const { profile, variant } = createDemo();
          await this.database.profiles.add(validate(profileSchema, profile));
          await this.database.variants.add(validate(variantSchema, variant));
          return profile;
        },
      ),
    );
  }
  deleteDemo() {
    return safely(() =>
      this.database.transaction(
        'rw',
        this.database.profiles,
        this.database.variants,
        this.database.revisions,
        async () => {
          const profiles = (await this.listProfiles()).filter((p) => p.isDemo);
          for (const profile of profiles) {
            const variants = await this.database.variants
              .where('sourceProfileId')
              .equals(profile.id)
              .toArray();
            for (const variant of variants) {
              await this.database.revisions
                .where('variantId')
                .equals(variant.id)
                .delete();
              await this.database.variants.delete(variant.id);
            }
            await this.database.profiles.delete(profile.id);
          }
          return profiles.length;
        },
      ),
    );
  }
}
export const repository = new StudioRepository(db);
