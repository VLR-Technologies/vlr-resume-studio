import { z } from 'zod';
import { profileSchema, variantSchema, revisionSchema } from '@/domain/schemas';
import { DataError, validate } from '@/domain/validation';
export const backupSchema = z
  .strictObject({
    format: z.literal('vlr-backup'),
    schemaVersion: z.literal(1),
    exportedAt: z.iso.datetime(),
    profiles: z.array(profileSchema).max(100),
    variants: z.array(variantSchema).max(1000),
    revisions: z.array(revisionSchema).max(20_000),
    metadata: z.strictObject({ application: z.literal('VLR Resume Studio') }),
  })
  .superRefine((v, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const rows of [v.profiles, v.variants, v.revisions])
      if (new Set(rows.map((r) => r.id)).size !== rows.length)
        fail('Duplicate record IDs.');
    for (const variant of v.variants)
      if (!v.profiles.some((p) => p.id === variant.sourceProfileId))
        fail('Backup contains an orphan variant.');
    for (const variant of v.variants)
      if (v.revisions.filter((r) => r.variantId === variant.id).length > 20)
        fail('A resume backup supports at most 20 saved revisions.');
    for (const revision of v.revisions) {
      const variant = v.variants.find((r) => r.id === revision.variantId);
      if (
        !variant ||
        revision.snapshot.sourceProfileId !== variant.sourceProfileId
      )
        fail('Backup contains an orphan revision.');
    }
  });
export type VlrBackup = z.infer<typeof backupSchema>;
const MAX_BYTES = 5 * 1024 * 1024;
export function serializeBackup(input: unknown): string {
  const json = JSON.stringify(validate(backupSchema, input), null, 2);
  if (new TextEncoder().encode(json).length > MAX_BYTES)
    throw new DataError('INVALID_DATA', 'Backup exceeds the 5 MiB limit.');
  return json;
}
export function parseBackup(json: string): VlrBackup {
  if (new TextEncoder().encode(json).length > MAX_BYTES)
    throw new DataError('INVALID_DATA', 'Backup exceeds the 5 MiB limit.');
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new DataError('INVALID_DATA', 'This is not valid JSON.');
  }
  return validate(backupSchema, value);
}
/** Standard JSON Resume conversion is intentionally lossy; VLR metadata stays in a native backup. */
export interface ConversionResult<T> {
  data: T;
  warnings: string[];
}
export interface StructuredAdapter<T> {
  format: 'json-resume' | 'vlr-yaml';
  parse: (untrusted: string) => ConversionResult<T>;
  serialize: (validated: T) => ConversionResult<string>;
}
export const yamlEnvelopeSchema = z.strictObject({
  schemaType: z.literal('vlr-backup'),
  schemaVersion: z.literal(1),
  data: backupSchema,
});
/** No import is applied by parsing. Future adapters produce a diff for explicit acceptance. */
export interface ImportProposal<T> {
  original: T;
  proposed: T;
  warnings: string[];
}
