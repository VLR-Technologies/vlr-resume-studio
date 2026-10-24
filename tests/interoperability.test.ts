import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import standardSchema from '@jsonresume/schema/schema.json';
import { createDemo } from '@/data/demo';
import {
  parseBackup,
  serializeBackup,
  yamlEnvelopeSchema,
} from '@/services/interoperability/contracts';
import { projectProfileToJsonResume } from '@/services/interoperability/json-resume';
function backup() {
  const { profile, variant } = createDemo();
  return {
    format: 'vlr-backup' as const,
    schemaVersion: 1 as const,
    exportedAt: new Date().toISOString(),
    profiles: [profile],
    variants: [variant],
    revisions: [],
    metadata: { application: 'VLR Resume Studio' as const },
  };
}
describe('structured portability boundaries', () => {
  it('round-trips full-fidelity native JSON without losing IDs or template settings', () => {
    const original = backup();
    expect(parseBackup(serializeBackup(original))).toEqual(original);
  });
  it('rejects future versions and malformed JSON before any write', () => {
    expect(() => parseBackup('{broken')).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...backup(), schemaVersion: 2 })),
    ).toThrow(/unsupported/);
  });
  it('rejects duplicate records and orphan references', () => {
    const b = backup();
    expect(() =>
      serializeBackup({ ...b, profiles: [...b.profiles, ...b.profiles] }),
    ).toThrow();
    expect(() => serializeBackup({ ...b, profiles: [] })).toThrow();
  });
  it('limits import size before parsing', () => {
    expect(() => parseBackup(' '.repeat(5 * 1024 * 1024 + 1))).toThrow(/limit/);
  });
  it('declares and validates a YAML envelope without claiming a YAML parser exists', () => {
    const b = backup();
    expect(
      yamlEnvelopeSchema.safeParse({
        schemaType: 'vlr-backup',
        schemaVersion: 1,
        data: b,
      }).success,
    ).toBe(true);
    expect(
      yamlEnvelopeSchema.safeParse({
        schemaType: 'json-resume',
        schemaVersion: 1,
        data: b,
      }).success,
    ).toBe(false);
  });
  it('validates the profile projection against maintained @jsonresume/schema 1.7.0', () => {
    const projection = projectProfileToJsonResume(createDemo().profile);
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    const validateStandard = ajv.compile(standardSchema);
    const json = JSON.parse(JSON.stringify(projection.data)) as unknown;
    expect(
      validateStandard(json),
      JSON.stringify(validateStandard.errors),
    ).toBe(true);
    expect(projection.warnings.length).toBeGreaterThan(0);
    expect(JSON.stringify(json)).not.toContain('templateId');
  });
});
