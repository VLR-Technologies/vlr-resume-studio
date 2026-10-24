import { useState } from 'react';
import { Download, Upload, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/primitives';
import { Dialog } from '@/components/ui/dialog';
import { useWorkspace } from '@/app/workspace-context';
import { SelectField } from '@/features/editor/fields';
import { repository } from '@/services/storage/repository';
import { DataError } from '@/domain/validation';
import {
  type VlrBackup,
  serializeBackup,
} from '@/services/interoperability/contracts';
import {
  AI_EDITING_INSTRUCTIONS,
  MAX_IMPORT_BYTES,
  parseImport,
  serializeYaml,
  remapBackup,
  projectVariant,
} from '@/services/interoperability/portability';
import { projectProfileToJsonResume } from '@/services/interoperability/json-resume';
import { downloadText } from '@/services/download';
import { hasUnsavedDrafts } from '@/features/editor/use-autosave';

function changes(
  before: unknown,
  after: unknown,
  path = '',
  result: { path: string; before: string; after: string }[] = [],
) {
  if (result.length >= 300 || JSON.stringify(before) === JSON.stringify(after))
    return result;
  if (Array.isArray(before) || Array.isArray(after)) {
    const a: unknown[] = Array.isArray(before) ? before : [];
    const b: unknown[] = Array.isArray(after) ? after : [];
    const keyed = (values: unknown[]) =>
      new Map(
        values.map((v, i) => [
          v && typeof v === 'object' && 'id' in v ? String(v.id) : String(i),
          v,
        ]),
      );
    const old = keyed(a),
      incoming = keyed(b);
    for (const key of new Set([...old.keys(), ...incoming.keys()]))
      changes(old.get(key), incoming.get(key), `${path}[${key}]`, result);
    if (
      a.length &&
      b.length &&
      JSON.stringify([...old.keys()]) !== JSON.stringify([...incoming.keys()])
    )
      result.push({
        path: `${path} order`,
        before: [...old.keys()].join(', '),
        after: [...incoming.keys()].join(', '),
      });
  } else if (
    (before && typeof before === 'object') ||
    (after && typeof after === 'object')
  ) {
    const a = (before && typeof before === 'object' ? before : {}) as Record<
        string,
        unknown
      >,
      b = (after && typeof after === 'object' ? after : {}) as Record<
        string,
        unknown
      >;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
      changes(a[key], b[key], path ? `${path}.${key}` : key, result);
  } else
    result.push({
      path,
      before: before === undefined ? '—' : JSON.stringify(before),
      after: after === undefined ? '—' : JSON.stringify(after),
    });
  return result;
}
export default function PortabilityPanel() {
  const { profiles, variants } = useWorkspace();
  const [selected, setSelected] = useState('');
  const [review, setReview] = useState<{
    incoming: VlrBackup;
    current: VlrBackup;
    warnings: string[];
    format: string;
  }>();
  const [mode, setMode] = useState<'new' | 'merge' | 'replace'>('new');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [ack, setAck] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof DataError
          ? [e.message, ...e.details].join('\n')
          : e instanceof Error
            ? e.message
            : 'Operation failed.',
      );
    } finally {
      setBusy(false);
    }
  }
  const filename = `VLR-Resume-Studio-${new Date().toISOString().slice(0, 10)}`;
  const exportSnapshot = () => {
    if (hasUnsavedDrafts())
      throw new Error(
        'An editor has unsaved changes. Return to it and save or reload the stored version before importing or exporting.',
      );
    return repository.exportWorkspace();
  };
  const sourceId =
    selected ||
    (variants[0]
      ? `v:${variants[0].id}`
      : profiles[0]
        ? `p:${profiles[0].id}`
        : '');
  const variant = variants.find((v) => sourceId === `v:${v.id}`);
  const profile = profiles.find(
    (p) => p.id === (variant?.sourceProfileId ?? sourceId.slice(2)),
  );
  const standard = profile
    ? variant
      ? projectVariant(profile, variant)
      : projectProfileToJsonResume(profile)
    : undefined;
  const diffs = review
    ? [...review.incoming.profiles, ...review.incoming.variants].flatMap(
        (row) => {
          const original = [
            ...review.current.profiles,
            ...review.current.variants,
          ].find((r) => r.id === row.id);
          return changes(original, row, 'label' in row ? row.label : row.title);
        },
      )
    : [];
  if (review && mode === 'replace') {
    for (const row of [
      ...review.current.profiles,
      ...review.current.variants,
    ]) {
      if (
        ![...review.incoming.profiles, ...review.incoming.variants].some(
          (r) => r.id === row.id,
        )
      )
        diffs.push({
          path: 'label' in row ? row.label : row.title,
          before: 'Existing record',
          after: 'Will be removed',
        });
    }
  }
  return (
    <Card className="portability-card">
      <div className="editor-section-heading">
        <div>
          <p className="eyebrow">TAKE YOUR WORK WITH YOU</p>
          <h2>Import & export</h2>
        </div>
        <Download size={22} />
      </div>
      <p>
        Native backups include all profiles, resumes, selections, tailored
        wording, designs, and saved revisions.
      </p>
      <div className="portability-actions">
        <Button
          disabled={busy}
          variant="outline"
          onClick={() =>
            void run(async () => {
              downloadText(
                serializeBackup(await exportSnapshot()),
                `${filename}.json`,
              );
              setStatus('Native JSON backup downloaded.');
            })
          }
        >
          <Download size={15} />
          Export VLR JSON
        </Button>
        <Button
          disabled={busy}
          variant="outline"
          onClick={() =>
            void run(async () => {
              downloadText(
                serializeYaml(await exportSnapshot()),
                `${filename}.yaml`,
                'application/yaml',
              );
              setStatus('Native YAML backup downloaded.');
            })
          }
        >
          <Download size={15} />
          Export VLR YAML
        </Button>
      </div>
      <div className="standard-export">
        <SelectField
          label="JSON Resume source"
          value={sourceId}
          onChange={setSelected}
          options={[
            ...variants.map((v) => ({
              value: `v:${v.id}`,
              label: `Resume: ${v.title}`,
            })),
            ...profiles.map((p) => ({
              value: `p:${p.id}`,
              label: `Profile: ${p.label}`,
            })),
          ]}
        />
        <Button
          variant="outline"
          disabled={!standard || busy}
          onClick={() => {
            if (hasUnsavedDrafts()) {
              setError(
                'An editor has unsaved changes. Save or reload it before exporting.',
              );
              return;
            }
            if (standard) {
              downloadText(
                JSON.stringify(standard.data, null, 2),
                `${filename}-standard.json`,
              );
              setStatus('Standard JSON Resume downloaded.');
            }
          }}
        >
          Export standard JSON Resume
        </Button>
        <details>
          <summary>Standard export limitations</summary>
          <ul>
            {(
              standard?.warnings ?? [
                'Standard JSON Resume cannot preserve VLR designs, variants, revisions, IDs, or custom sections.',
              ]
            ).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      </div>
      <div className="import-area">
        <h3>
          <Upload size={17} />
          Import a resume or backup
        </h3>
        <p>
          JSON or YAML, up to 5 MiB. Files are parsed locally and reviewed
          before any changes are applied.
        </p>
        <label className="file-picker">
          Choose JSON or YAML
          <input
            aria-label="Import JSON or YAML"
            type="file"
            accept=".json,.yaml,.yml,application/json,application/yaml"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              void run(async () => {
                if (file.size > MAX_IMPORT_BYTES)
                  throw new Error('File exceeds the 5 MiB limit.');
                const incoming = parseImport(await file.text(), file.name);
                const current = await exportSnapshot();
                setMode('new');
                setAck(false);
                setReview({
                  incoming: incoming.backup,
                  current,
                  warnings: incoming.warnings,
                  format: incoming.format,
                });
              });
            }}
          />
        </label>
      </div>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            try {
              await navigator.clipboard.writeText(AI_EDITING_INSTRUCTIONS);
              setStatus(
                'AI editing instructions copied. Export a native backup and supply it with your job description to your chosen model.',
              );
            } catch {
              setInstructions(true);
            }
          })
        }
      >
        <Copy size={15} />
        Copy AI Editing Instructions
      </Button>
      {status && (
        <p role="status" className="portability-status">
          {status}
        </p>
      )}
      {error && !review && (
        <p role="alert" className="validation-errors">
          {error}
        </p>
      )}
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!busy && !open) setReview(undefined);
        }}
        title="Review incoming data"
        className="import-dialog"
        description={
          review
            ? `${review.format}: ${review.incoming.profiles.length} profiles, ${review.incoming.variants.length} resumes, ${review.incoming.revisions.length} revisions. Nothing has been written yet.`
            : ''
        }
      >
        {review && (
          <>
            {error && (
              <p role="alert" className="validation-errors">
                {error}
              </p>
            )}
            <SelectField
              label="Import behavior"
              value={mode}
              onChange={(v) => {
                setMode(v as typeof mode);
                setAck(false);
              }}
              options={[
                {
                  value: 'new',
                  label: 'Create new records — keep existing work',
                },
                {
                  value: 'merge',
                  label:
                    'Merge non-conflicting records — identical IDs must match',
                },
                {
                  value: 'replace',
                  label:
                    'Replace this workspace — download recovery backup first',
                },
              ]}
            />
            <p className="form-note">
              Existing workspace: {review.current.profiles.length} profiles and{' '}
              {review.current.variants.length} resumes.{' '}
              {mode === 'new'
                ? 'Incoming IDs and every reference are remapped together.'
                : mode === 'merge'
                  ? 'Conflicting records are rejected atomically. No field is guessed or silently overwritten.'
                  : 'All current records will be replaced. A recovery JSON backup is downloaded before the transaction.'}
            </p>
            {review.warnings.map((w, i) => (
              <p key={i} className="reference-warning">
                {w}
              </p>
            ))}
            <div className="import-diff">
              <table>
                <thead>
                  <tr>
                    <th>Record / field</th>
                    <th>Current</th>
                    <th>Incoming</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d, i) => (
                    <tr key={i}>
                      <th>{d.path}</th>
                      <td>{d.before}</td>
                      <td>{d.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!diffs.length && (
                <p>
                  Profile and resume content is identical. Revisions are
                  validated and included.
                </p>
              )}
            </div>
            <p className="form-note">
              Review includes up to 300 field differences per record.{' '}
              {mode === 'replace' &&
                'Existing records absent from this backup will be removed.'}
            </p>
            <label className="check-field">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              {mode === 'replace'
                ? 'I reviewed the data and will keep the downloaded recovery backup.'
                : 'I reviewed the incoming data and import behavior.'}
            </label>
            <div className="dialog-actions">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setReview(undefined)}
              >
                Cancel
              </Button>
              <Button
                disabled={!ack || busy}
                onClick={() =>
                  void run(async () => {
                    if (mode === 'replace')
                      downloadText(
                        serializeBackup(review.current),
                        `${filename}-before-import.json`,
                      );
                    const incoming =
                      mode === 'new'
                        ? remapBackup(review.incoming)
                        : review.incoming;
                    if (hasUnsavedDrafts())
                      throw new Error(
                        'An editor has unsaved changes. Return to it and save or reload before importing.',
                      );
                    await repository.applyImport(
                      incoming,
                      mode,
                      JSON.stringify([
                        review.current.profiles,
                        review.current.variants,
                        review.current.revisions,
                      ]),
                    );
                    setReview(undefined);
                    setStatus(
                      'Import complete. Validated records are saved in this browser.',
                    );
                  })
                }
              >
                {busy ? 'Importing…' : 'Confirm import'}
              </Button>
            </div>
          </>
        )}
      </Dialog>
      <Dialog
        open={instructions}
        onOpenChange={setInstructions}
        title="AI editing instructions"
        description="Clipboard access is unavailable. Copy these instructions and supply them with your native backup and job description."
      >
        <textarea
          aria-label="AI editing instructions"
          readOnly
          rows={12}
          value={AI_EDITING_INSTRUCTIONS}
          onFocus={(e) => e.target.select()}
        />
      </Dialog>
    </Card>
  );
}
