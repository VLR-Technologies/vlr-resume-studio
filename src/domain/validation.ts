import { z } from 'zod';
import { SCHEMA_VERSION } from './schemas';
export type DataErrorCode =
  | 'INVALID_DATA'
  | 'UNSUPPORTED_VERSION'
  | 'MISSING'
  | 'CONFLICT'
  | 'REFERENCE'
  | 'QUOTA'
  | 'UNAVAILABLE'
  | 'STORAGE';
export class DataError extends Error {
  constructor(
    public readonly code: DataErrorCode,
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'StudioDataError';
  }
}
export function identifyVersion(value: unknown): number {
  if (
    !value ||
    typeof value !== 'object' ||
    !('schemaVersion' in value) ||
    typeof value.schemaVersion !== 'number'
  )
    throw new DataError('INVALID_DATA', 'Record has no schema version.');
  return value.schemaVersion;
}
export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  if (
    !(
      (schema.meta()?.supportedVersions as number[] | undefined) ?? [
        SCHEMA_VERSION,
      ]
    ).includes(identifyVersion(value))
  )
    throw new DataError(
      'UNSUPPORTED_VERSION',
      'This record uses an unsupported schema version. Your stored copy has been preserved.',
    );
  const result = schema.safeParse(value);
  if (!result.success)
    throw new DataError(
      'INVALID_DATA',
      'The record contains invalid data or unsupported version metadata. Nothing was saved.',
      result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    );
  return result.data;
}
/** Future migrations return a new value. Persist a validated backup and result atomically. */
export interface Migration {
  from: number;
  to: number;
  migrate: (original: unknown) => unknown;
}
export function prepareMigration<T>(
  original: unknown,
  migration: Migration,
  target: z.ZodType<T>,
): { original: unknown; migrated: T } {
  if (
    identifyVersion(original) !== migration.from ||
    migration.to <= migration.from
  )
    throw new DataError(
      'UNSUPPORTED_VERSION',
      'No compatible forward migration.',
    );
  const backup: unknown = structuredClone(original);
  const migrated: unknown = migration.migrate(structuredClone(original));
  if (identifyVersion(migrated) !== migration.to)
    throw new DataError(
      'INVALID_DATA',
      'Migration returned the wrong version.',
    );
  const result = target.safeParse(migrated);
  if (!result.success)
    throw new DataError(
      'INVALID_DATA',
      'Migration failed validation; original preserved.',
    );
  return { original: backup, migrated: result.data };
}
