import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Download, Undo2, History, RefreshCw } from 'lucide-react';
import { useWorkspace } from '@/app/workspace-context';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  type MasterCareerProfile,
  type ResumeVariant,
  type Section,
  variantSchema,
} from '@/domain/schemas';
import { newId } from '@/domain/factories';
import {
  effectiveEvidence,
  updateContent,
  sectionNames,
  rolePresets,
  presetAdvice,
  applyPreset,
} from '@/domain/editor';
import { buildRenderModel, pdfFilename } from '@/services/rendering/model';
import { repository } from '@/services/storage/repository';
import { downloadBlob } from '@/services/download';
import { useAutosave } from '@/features/editor/use-autosave';
import {
  TextField,
  SelectField,
  IdentityFields,
  SaveStatus,
} from '@/features/editor/fields';
import { EvidenceEditor } from '@/features/editor/evidence-editor';
import { SortableList } from '@/features/editor/sortable-list';
import { DesignEditor } from './design-editor';
import { ResumePreview } from './resume-preview';

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
  const [section, setSection] = useState<Section | 'identity' | 'settings'>(
    'identity',
  );
  const [tab, setTab] = useState<'content' | 'design' | 'preview'>('content');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');
  const [actionError, setActionError] = useState('');
  const revisions = useLiveQuery(() => repository.listRevisions(v.id), [v.id]);
  const [role, setRole] = useState(rolePresets[0]!.name);
  const checked = useMemo(() => variantSchema.safeParse(v), [v]);
  const model = useMemo(
    () => buildRenderModel(profile, checked.success ? checked.data : variant),
    [profile, checked, variant],
  );
  const advice = presetAdvice(v.employmentCategory.kind);
  const hasDocumentContent =
    model.sections.length > 0 || Object.values(model.identity).some(Boolean);
  function hideSection(s: Section, hidden: boolean) {
    editor.change({
      ...v,
      template: {
        ...v.template,
        hiddenSections: hidden
          ? [...new Set([...v.template.hiddenSections, s])]
          : v.template.hiddenSections.filter((x) => x !== s),
      },
    });
  }
  async function download() {
    setPdfStatus('Preparing PDF…');
    setActionError('');
    try {
      if (!checked.success)
        throw new Error('Correct invalid fields before exporting.');
      const { generatePdf } = await import('@/services/rendering/pdf');
      downloadBlob(await generatePdf(model), pdfFilename(model));
      setPdfStatus('PDF ready');
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'PDF generation failed.',
      );
      setPdfStatus('');
    }
  }
  return (
    <div className={`studio studio-tab-${tab}`}>
      <header className="studio-heading">
        <div>
          <Link to="/resumes" className="back-link">
            <ArrowLeft size={14} />
            My Resumes
          </Link>
          <h1>{v.title}</h1>
          <SaveStatus
            status={editor.status}
            errors={editor.errors}
            retry={() => void editor.flush()}
          />
        </div>
        <div className="row-actions">
          <Button
            variant="ghost"
            size="sm"
            disabled={!editor.undoCount}
            onClick={editor.undo}
          >
            <Undo2 size={15} />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryOpen(true)}
          >
            <History size={15} />
            Revisions
          </Button>
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
      {actionError && !historyOpen && (
        <p className="validation-errors" role="alert">
          {actionError}
        </p>
      )}
      {pdfStatus && (
        <span role="status" className="sr-only">
          {pdfStatus}
        </span>
      )}
      <div className="studio-tabs" role="tablist" aria-label="Resume workspace">
        {(['content', 'design', 'preview'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t[0]!.toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="studio-columns">
        <aside className="studio-sections" aria-label="Resume sections">
          <p className="eyebrow">YOUR RESUME</p>
          <button
            className={`section-button ${section === 'settings' ? 'selected' : ''}`}
            onClick={() => {
              setSection('settings');
              setTab('content');
            }}
          >
            Resume settings & presets
          </button>
          <button
            className={`section-button ${section === 'identity' ? 'selected' : ''}`}
            onClick={() => {
              setSection('identity');
              setTab('content');
            }}
          >
            Personal details
          </button>
          <div className="section-nav">
            <SortableList
              items={v.sectionOrder.map((id) => ({ id }))}
              label={(s) => sectionNames[s.id]}
              onChange={(items) =>
                editor.change({
                  ...v,
                  sectionOrder: items.map((i) => i.id),
                  template: {
                    ...v.template,
                    sectionOrder: items.map((i) => i.id),
                  },
                })
              }
            >
              {(s) => (
                <div className="section-choice">
                  <button
                    className={section === s.id ? 'selected' : ''}
                    onClick={() => {
                      setSection(s.id);
                      setTab('content');
                    }}
                  >
                    {sectionNames[s.id]}
                  </button>
                  <input
                    type="checkbox"
                    aria-label={`Show ${sectionNames[s.id]}`}
                    checked={
                      v.selectedSections.includes(s.id) &&
                      !v.template.hiddenSections.includes(s.id)
                    }
                    onChange={(e) => {
                      if (!v.selectedSections.includes(s.id))
                        editor.change({
                          ...v,
                          selectedSections: [...v.selectedSections, s.id],
                          template: {
                            ...v.template,
                            hiddenSections: v.template.hiddenSections.filter(
                              (x) => x !== s.id,
                            ),
                          },
                        });
                      else hideSection(s.id, !e.target.checked);
                    }}
                  />
                </div>
              )}
            </SortableList>
          </div>
          <p className="form-note">
            Drag a handle or use the arrow buttons to organize your sections.
          </p>
        </aside>
        <section
          className="studio-content"
          aria-label="Resume editing controls"
        >
          {tab === 'design' ? (
            <DesignEditor
              template={v.template}
              onChange={(template) => editor.change({ ...v, template })}
            />
          ) : (
            <>
              <div className="editor-section-heading">
                <div>
                  <p className="eyebrow">TAILORED TO THIS OPPORTUNITY</p>
                  <h2>
                    {section === 'identity'
                      ? 'Personal details'
                      : section === 'settings'
                        ? 'Resume settings'
                        : sectionNames[section]}
                  </h2>
                </div>
              </div>
              <p className="form-note">
                Edits here belong to this resume. Your master career profile
                stays separate.
              </p>
              {variant.updatedAt !== v.updatedAt && (
                <p className="reference-warning">
                  A newer stored version is available.{' '}
                  <button onClick={() => editor.reload(variant)}>
                    Reload stored resume (discard local edits)
                  </button>
                </p>
              )}
              {section === 'settings' ? (
                <>
                  <TextField
                    label="Resume title"
                    value={v.title}
                    onChange={(title) => editor.change({ ...v, title })}
                  />
                  <TextField
                    label="Target role"
                    value={v.targetRole}
                    onChange={(targetRole) =>
                      editor.change({ ...v, targetRole })
                    }
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
              ) : section === 'identity' ? (
                <>
                  <IdentityFields
                    identity={
                      v.identityOverride ??
                      v.identitySnapshot ??
                      profile.identity
                    }
                    onChange={(identityOverride) =>
                      editor.change({ ...v, identityOverride })
                    }
                  />
                  <h3>Show on this resume</h3>
                  <div className="visibility-options">
                    {(
                      [
                        'name',
                        'headline',
                        'email',
                        'phone',
                        'location',
                      ] as const
                    ).map((key) => (
                      <label key={key} className="check-field">
                        <input
                          type="checkbox"
                          aria-label={`Show ${key} on resume`}
                          checked={!v.hiddenIdentityFields?.includes(key)}
                          onChange={(e) =>
                            editor.change({
                              ...v,
                              hiddenIdentityFields: e.target.checked
                                ? v.hiddenIdentityFields?.filter(
                                    (k) => k !== key,
                                  )
                                : [...(v.hiddenIdentityFields ?? []), key],
                            })
                          }
                        />
                        {key[0]!.toUpperCase() + key.slice(1)}
                      </label>
                    ))}
                  </div>
                </>
              ) : section === 'summary' ? (
                <TextField
                  label="Professional summary for this resume"
                  multiline
                  value={v.summarySnapshot}
                  onChange={(summarySnapshot) =>
                    editor.change({ ...v, summarySnapshot })
                  }
                />
              ) : (
                <>
                  <details className="entry-selection" open>
                    <summary>Select from career profile</summary>
                    {!profile[section].length && (
                      <p>
                        No entries yet.{' '}
                        <Link to="/profile">
                          Add them to your career profile.
                        </Link>
                      </p>
                    )}
                    {profile[section].map((entry) => (
                      <label className="check-field" key={entry.id}>
                        <input
                          type="checkbox"
                          checked={v.selections.some(
                            (s) => s.sourceEntryId === entry.id,
                          )}
                          onChange={(e) => {
                            const existing = v.selections.find(
                              (s) => s.sourceEntryId === entry.id,
                            );
                            editor.change({
                              ...v,
                              selectedSections: [
                                ...new Set([...v.selectedSections, section]),
                              ],
                              selections: e.target.checked
                                ? [
                                    ...v.selections,
                                    {
                                      id: newId(),
                                      section,
                                      sourceEntryId: entry.id,
                                      sourceProfileUpdatedAt: profile.updatedAt,
                                      snapshot: structuredClone(entry),
                                    },
                                  ]
                                : v.selections.filter(
                                    (s) => s.sourceEntryId !== entry.id,
                                  ),
                              overrides: existing
                                ? v.overrides.filter(
                                    (o) => o.selectionId !== existing.id,
                                  )
                                : v.overrides,
                            });
                          }}
                        />
                        {entry.title || 'Untitled entry'}
                      </label>
                    ))}
                  </details>
                  <SortableList
                    items={v.selections.filter((s) => s.section === section)}
                    label={(s) => effectiveEvidence(v, s).title || 'entry'}
                    onChange={(items) =>
                      editor.change({
                        ...v,
                        selections: [
                          ...v.selections.filter((s) => s.section !== section),
                          ...items,
                        ],
                      })
                    }
                  >
                    {(selection) => (
                      <EvidenceEditor
                        entry={effectiveEvidence(v, selection)}
                        onChange={(entry) =>
                          editor.change(updateContent(v, selection.id, entry))
                        }
                        onDelete={() =>
                          editor.change({
                            ...v,
                            selections: v.selections.filter(
                              (s) => s.id !== selection.id,
                            ),
                            overrides: v.overrides.filter(
                              (o) => o.selectionId !== selection.id,
                            ),
                          })
                        }
                      />
                    )}
                  </SortableList>
                </>
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
            </>
          )}
        </section>
        <section className="studio-preview" aria-label="Document preview">
          <ResumePreview model={model} />
          {!checked.success && (
            <p role="alert" className="validation-errors">
              Preview shows the last valid saved version until invalid fields
              are corrected.
            </p>
          )}
        </section>
      </div>
      <Dialog
        open={historyOpen}
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
                onClick={async () => {
                  if (!(await editor.flush())) return;
                  try {
                    const current = await repository.getVariant(v.id);
                    const restored = await repository.restoreRevision(
                      r.id,
                      current.updatedAt,
                    );
                    editor.reload(restored);
                    setHistoryOpen(false);
                  } catch (error) {
                    setActionError(
                      error instanceof Error
                        ? error.message
                        : 'Restore failed.',
                    );
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
