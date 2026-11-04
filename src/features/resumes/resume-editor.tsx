import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  Download,
  Undo2,
  History,
  RefreshCw,
  MoreHorizontal,
  FileText,
  Palette,
  LayoutTemplate,
  Settings2,
} from 'lucide-react';
import { useWorkspace } from '@/app/workspace-context';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  type MasterCareerProfile,
  type ResumeVariant,
  variantSchema,
} from '@/domain/schemas';
import { rolePresets, presetAdvice, applyPreset } from '@/domain/editor';
import type { CompiledDocument } from '@/services/rendering/render';
import type { ResumeRenderModel } from '@/services/rendering/model';
import { buildRenderModel, pdfFilename } from '@/services/rendering/model';
import { repository } from '@/services/storage/repository';
import { downloadBlob } from '@/services/download';
import { useAutosave } from '@/features/editor/use-autosave';
import { TextField, SelectField, SaveStatus } from '@/features/editor/fields';
import { DesignEditor } from './design-editor';
import { ResumePreview } from './resume-preview';
import { ResumeContent } from './resume-content';
import { TemplateGallery } from './template-gallery';
import { selectTemplate } from '@/domain/templates';

function Editor({
  variant,
  profile,
}: {
  variant: ResumeVariant;
  profile: MasterCareerProfile;
}) {
  const editor = useAutosave(
    variant,
    (value, expected) => repository.saveVariant(value, expected),
    'variant',
  );
  const v = editor.draft;
  const [tab, setTab] = useState<
    'content' | 'design' | 'templates' | 'preview'
  >('content');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.('(max-width: 800px)').matches ?? false,
  );
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 800px)');
    if (!query) return;
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const activeTab = mobile && tab === 'templates' ? 'design' : tab;
  const tabsId = useId();
  const editingPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    editingPanel.current?.scrollTo({ top: 0 });
  }, [tab]);
  const [restoring, setRestoring] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');
  const [lastPdf, setLastPdf] = useState<CompiledDocument>();
  const [failedPdfModel, setFailedPdfModel] = useState<ResumeRenderModel>();
  const [actionError, setActionError] = useState('');
  const revisions = useLiveQuery(() => repository.listRevisions(v.id), [v.id]);
  const [role, setRole] = useState(rolePresets[0]!.name);
  const checked = useMemo(() => variantSchema.safeParse(v), [v]);
  // Saving updates record timestamps, but must not replace an identical proof
  // model or make recovery actions disappear between pointer down and up.
  const modelJson = useMemo(
    () =>
      JSON.stringify(
        buildRenderModel(profile, checked.success ? checked.data : variant),
      ),
    [profile, checked, variant],
  );
  const model = useMemo(
    () => JSON.parse(modelJson) as ResumeRenderModel,
    [modelJson],
  );
  const advice = presetAdvice(v.employmentCategory.kind);
  const hasDocumentContent =
    model.sections.length > 0 || Object.values(model.identity).some(Boolean);
  async function download() {
    setPdfStatus('Preparing PDF…');
    setActionError('');
    try {
      if (!checked.success)
        throw new Error('Correct invalid fields before exporting.');
      const { renderPdf } = await import('@/services/rendering/render');
      const blob = await renderPdf(model);
      setLastPdf({ model, blob });
      setFailedPdfModel(undefined);
      downloadBlob(blob, pdfFilename(model));
      setPdfStatus('PDF ready');
    } catch (error) {
      setFailedPdfModel(model);
      setActionError(
        error instanceof Error ? error.message : 'PDF generation failed.',
      );
      setPdfStatus('');
    }
  }
  return (
    <div className={`studio flow-studio studio-tab-${tab}`}>
      <header className="studio-heading">
        <h1 className="sr-only">{v.title}</h1>
        <Link
          to="/resumes"
          className="editor-back"
          aria-label="Back to resumes"
        >
          <ArrowLeft size={19} />
        </Link>
        <div className="editor-title">
          <input
            aria-label="Resume title"
            value={v.title}
            onChange={(e) => editor.change({ ...v, title: e.target.value })}
            maxLength={200}
          />
          <SaveStatus
            status={editor.status}
            compact
            errors={editor.errors}
            retry={() => void editor.flush()}
          />
        </div>
        <div className="row-actions">
          <Button
            variant="ghost"
            size="sm"
            disabled={!editor.undoCount}
            aria-label="Undo"
            onClick={editor.undo}
          >
            <Undo2 size={16} />
            <span>Undo</span>
          </Button>
          <details className="editor-options">
            <summary aria-label="Resume options">
              <MoreHorizontal size={20} />
            </summary>
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
              >
                <History size={15} />
                Revisions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 size={15} />
                Resume settings
              </Button>
              <Link to="/profile">Career Profile</Link>
              <Link to="/settings">Advanced Settings</Link>
            </div>
          </details>
          <Button
            onClick={() => void download()}
            disabled={
              pdfStatus === 'Preparing PDF…' ||
              !checked.success ||
              !hasDocumentContent
            }
          >
            <Download size={16} />
            {pdfStatus === 'Preparing PDF…' ? pdfStatus : 'Download PDF'}
          </Button>
        </div>
      </header>
      {!!editor.errors.length && (
        <details className="save-error-banner" open>
          <summary>Review your changes</summary>
          <ul>
            {editor.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          <button onClick={() => void editor.flush()}>Retry save</button>
        </details>
      )}
      {actionError && !historyOpen && (
        <p className="validation-errors editor-alert" role="alert">
          {actionError}
        </p>
      )}
      {lastPdf && lastPdf.model !== model && failedPdfModel === model && (
        <div className="stale-pdf-notice" role="status">
          The latest PDF could not be compiled. Your previous PDF is available.
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadBlob(
                lastPdf.blob,
                `Previous-${pdfFilename(lastPdf.model)}`,
              )
            }
          >
            Download last valid PDF (earlier version)
          </Button>
        </div>
      )}
      {pdfStatus && (
        <span role="status" className="sr-only">
          {pdfStatus}
        </span>
      )}
      <div
        className="studio-columns"
        id={`${tabsId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-${activeTab}`}
      >
        <nav className="studio-rail studio-tabs" aria-label="Resume tools">
          <Link to="/resumes" className="rail-brand" aria-label="My Resumes">
            V
          </Link>
          <div
            className="rail-tabs"
            role="tablist"
            aria-label="Resume workspace"
          >
            {(['content', 'design', 'templates', 'preview'] as const).map(
              (t) => {
                const Icon =
                  t === 'content'
                    ? FileText
                    : t === 'design'
                      ? Palette
                      : t === 'templates'
                        ? LayoutTemplate
                        : FileText;
                return (
                  <button
                    key={t}
                    role="tab"
                    id={`${tabsId}-${t}`}
                    aria-controls={`${tabsId}-panel`}
                    className={`rail-${t}`}
                    tabIndex={activeTab === t ? 0 : -1}
                    aria-selected={activeTab === t}
                    onClick={() => setTab(t)}
                    onKeyDown={(event) => {
                      if (
                        ![
                          'ArrowLeft',
                          'ArrowRight',
                          'ArrowUp',
                          'ArrowDown',
                          'Home',
                          'End',
                        ].includes(event.key)
                      )
                        return;
                      event.preventDefault();
                      const buttons = [
                        ...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                          '[role="tab"]',
                        ),
                      ].filter((b) => b.getClientRects().length > 0);
                      const at = buttons.indexOf(event.currentTarget);
                      const index =
                        event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? buttons.length - 1
                            : (at +
                                (['ArrowRight', 'ArrowDown'].includes(event.key)
                                  ? 1
                                  : -1) +
                                buttons.length) %
                              buttons.length;
                      buttons[index]?.focus();
                      buttons[index]?.click();
                    }}
                  >
                    <Icon size={21} />
                    <span>{t[0]!.toUpperCase() + t.slice(1)}</span>
                  </button>
                );
              },
            )}
          </div>
          <Link
            to="/settings"
            className="rail-settings"
            aria-label="Advanced Settings"
          >
            <Settings2 size={20} />
          </Link>
        </nav>
        <section
          className="studio-content"
          ref={editingPanel}
          aria-label="Resume editing controls"
        >
          {variant.updatedAt !== v.updatedAt && (
            <p className="reference-warning">
              A newer stored version is available.{' '}
              <button onClick={() => editor.reload(variant)}>
                Reload stored resume (discard local edits)
              </button>
            </p>
          )}
          {tab === 'design' ? (
            <>
              <DesignEditor
                template={v.template}
                onChange={(template) => editor.change({ ...v, template })}
              />
              <Button
                variant="outline"
                className="browse-templates"
                onClick={() => setTab('templates')}
              >
                <LayoutTemplate size={16} />
                Browse all templates
              </Button>
            </>
          ) : tab === 'templates' ? (
            <>
              <div className="panel-heading">
                <p className="dashboard-kicker">A FORMAT FOR EVERY STORY</p>
                <h2>Templates</h2>
                <p>Choose a look. Keep every word.</p>
              </div>
              <TemplateGallery
                selected={v.template.templateId}
                onSelect={(id) =>
                  editor.change({
                    ...v,
                    template: selectTemplate(v.template, id),
                  })
                }
              />
              <Button
                className="mobile-template-back"
                variant="outline"
                onClick={() => setTab('design')}
              >
                Back to Design
              </Button>
            </>
          ) : (
            <ResumeContent
              variant={v}
              profile={profile}
              onChange={editor.change}
              onAdd={async (entry) => {
                if (!(await editor.flush()))
                  throw new Error(
                    'Correct the current draft before adding an entry.',
                  );
                const saved = await repository.addResumeEntry(
                  v.id,
                  editor.savedToken(),
                  entry,
                );
                editor.reload(saved);
              }}
            />
          )}
          {!!model.warnings.length && (
            <details className="source-review">
              <summary>
                {model.warnings.length} source changes to review
              </summary>
              <ul>
                {model.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRefreshOpen(true)}
              >
                <RefreshCw size={14} />
                Review source refresh
              </Button>
            </details>
          )}
        </section>
        <section className="studio-preview" aria-label="Document preview">
          <ResumePreview
            model={model}
            onCompiled={setLastPdf}
            onFailure={setFailedPdfModel}
          />
          {!checked.success && (
            <p role="alert" className="validation-errors">
              Preview shows the last valid version until invalid fields are
              corrected.
            </p>
          )}
        </section>
      </div>
      <Dialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Resume settings"
        description="Details and optional starting points for this resume."
      >
        <>
          <TextField
            label="Resume title"
            value={v.title}
            onChange={(title) => editor.change({ ...v, title })}
          />
          <TextField
            label="Target role"
            value={v.targetRole}
            onChange={(targetRole) => editor.change({ ...v, targetRole })}
          />
          <SelectField
            label="Employment category"
            value={v.employmentCategory.kind}
            options={[
              { value: 'internship', label: 'Internship' },
              {
                value: 'working-student',
                label: 'Working Student / Werkstudent',
              },
              { value: 'graduate', label: 'Graduate / Entry-Level' },
              { value: 'full-time', label: 'Full-Time Professional' },
              { value: 'research', label: 'Research / Academic' },
              { value: 'custom', label: 'Custom' },
            ]}
            onChange={(kind) =>
              editor.change({
                ...v,
                employmentCategory:
                  kind === 'custom'
                    ? { kind: 'custom', label: 'Custom' }
                    : {
                        kind: kind as Exclude<
                          ResumeVariant['employmentCategory']['kind'],
                          'custom'
                        >,
                      },
              })
            }
          />
          {v.employmentCategory.kind === 'custom' && (
            <TextField
              label="Custom category"
              value={v.employmentCategory.label}
              onChange={(label) =>
                editor.change({
                  ...v,
                  employmentCategory: { kind: 'custom', label },
                })
              }
            />
          )}
          <SelectField
            label="Role preset"
            value={role}
            onChange={setRole}
            options={rolePresets.map((p) => ({
              value: p.name,
              label: p.name,
            }))}
          />
          <div className="preset-advice">
            <h3>Recommended starting point</h3>
            <p>{rolePresets.find((p) => p.name === role)?.emphasis}</p>
            <p>{advice.length}</p>
            <p>
              <strong>Optional:</strong> {advice.optional}
            </p>
            <Button
              variant="outline"
              onClick={() => editor.change(applyPreset(v, role))}
            >
              Apply recommended order & template
            </Button>
            <p className="form-note">
              Recommendations stay editable and preserve every entry.
            </p>
          </div>
        </>
      </Dialog>
      <Dialog
        open={historyOpen}
        busy={restoring}
        onOpenChange={setHistoryOpen}
        title="Saved resume revisions"
        description="Restore a previous version. Your current saved resume is retained as another revision. Up to 20 versions are kept."
      >
        {actionError && (
          <p role="alert" className="validation-errors">
            {actionError}
          </p>
        )}
        <div className="revision-list">
          {!revisions?.length && <p>No previous revisions yet.</p>}
          {revisions?.map((r) => (
            <div key={r.id}>
              <div>
                <strong>{r.snapshot.title}</strong>
                <p>
                  {new Date(r.createdAt).toLocaleString()} · {r.reason}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={restoring}
                onClick={async () => {
                  setRestoring(true);
                  setActionError('');
                  try {
                    if (!(await editor.flush())) {
                      setActionError(
                        'Save or correct the current draft before restoring a revision.',
                      );
                      return;
                    }
                    const restored = await repository.restoreRevision(
                      r.id,
                      editor.savedToken(),
                    );
                    editor.reload(restored);
                    setHistoryOpen(false);
                  } catch (error) {
                    setActionError(
                      error instanceof Error
                        ? error.message
                        : 'Restore failed.',
                    );
                  } finally {
                    setRestoring(false);
                  }
                }}
              >
                Restore
              </Button>
            </div>
          ))}
        </div>
      </Dialog>
      <Dialog
        open={refreshOpen}
        onOpenChange={setRefreshOpen}
        title="Use the current master evidence?"
        description="This resets tailored wording for entries that still exist in your profile and refreshes personal details and summary. Missing source entries remain pinned. Your previous resume is saved as a revision."
      >
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setRefreshOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              editor.change({
                ...v,
                identitySnapshot: structuredClone(profile.identity),
                identityOverride: undefined,
                summarySnapshot: profile.summary,
                selections: v.selections.map((s) => {
                  const current = profile[s.section].find(
                    (e) => e.id === s.sourceEntryId,
                  );
                  return current
                    ? {
                        ...s,
                        sourceProfileUpdatedAt: profile.updatedAt,
                        snapshot: structuredClone(current),
                      }
                    : s;
                }),
                overrides: v.overrides.filter((o) => {
                  const s = v.selections.find((s) => s.id === o.selectionId);
                  return (
                    s &&
                    !profile[s.section].some((e) => e.id === s.sourceEntryId)
                  );
                }),
              });
              setRefreshOpen(false);
            }}
          >
            Use current source
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
export function ResumeEditorPage() {
  const { id } = useParams();
  const { profiles, variants } = useWorkspace();
  const variant = variants.find((v) => v.id === id);
  const profile = profiles.find((p) => p.id === variant?.sourceProfileId);
  if (!variant || !profile)
    return (
      <div>
        <h1>Resume unavailable</h1>
        <p>
          The resume or its source profile is missing. Stored snapshots have not
          been removed.
        </p>
        <Link to="/resumes">Back to My Resumes</Link>
      </div>
    );
  return <Editor key={variant.id} variant={variant} profile={profile} />;
}
