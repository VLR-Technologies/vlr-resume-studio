import { useEffect, useState } from 'react';
import {
  Plus,
  ChevronDown,
  UserRound,
  EyeOff,
  AlignLeft,
  BriefcaseBusiness,
  GraduationCap,
  Shapes,
  FolderOpen,
  Award,
  Languages,
  Link2,
  HeartHandshake,
  BookOpen,
  Trophy,
  UsersRound,
  FileText,
} from 'lucide-react';
import { StudioHeading } from '@/components/ui/studio-heading';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { IdentityFields, TextField } from '@/features/editor/fields';
import { EvidenceEditor } from '@/features/editor/evidence-editor';
import { SortableList } from '@/features/editor/sortable-list';
import {
  createEvidence,
  effectiveEvidence,
  updateContent,
  sectionNames,
} from '@/domain/editor';
import { newId } from '@/domain/factories';
import { DataError } from '@/domain/validation';
import {
  sections,
  type Section,
  type Evidence,
  type MasterCareerProfile,
  type ResumeVariant,
} from '@/domain/schemas';

const entryDrafts = new Map<string, Evidence>();
const standard: Section[] = [
  'summary',
  'work',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
];
const resumeSectionTitles = {
  ...sectionNames,
  work: 'Experience',
  summary: 'Professional Summary',
};
const sectionIcons = {
  summary: AlignLeft,
  work: BriefcaseBusiness,
  internships: BriefcaseBusiness,
  education: GraduationCap,
  skills: Shapes,
  projects: FolderOpen,
  certifications: Award,
  languages: Languages,
  links: Link2,
  volunteering: HeartHandshake,
  publications: BookOpen,
  awards: Trophy,
  references: UsersRound,
};
export function ResumeContent({
  variant: v,
  profile,
  onChange,
  onAdd,
}: {
  variant: ResumeVariant;
  profile: MasterCareerProfile;
  onChange: (v: ResumeVariant) => void;
  onAdd: (entry: Evidence) => Promise<void>;
}) {
  const [newEntry, setNewEntry] = useState<Evidence | undefined>(() =>
    entryDrafts.get(v.id),
  );
  useEffect(() => {
    if (newEntry) entryDrafts.set(v.id, newEntry);
    else entryDrafts.delete(v.id);
    const guard = (event: BeforeUnloadEvent) => {
      if (newEntry) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [newEntry, v.id]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [sectionPicker, setSectionPicker] = useState(false);
  const [opened, setOpened] = useState<Set<Section>>(new Set());
  const visible = v.sectionOrder.filter(
    (s) =>
      !v.template.hiddenSections.includes(s) &&
      (standard.includes(s) || v.selections.some((e) => e.section === s)),
  );
  function hide(section: Section) {
    onChange({
      ...v,
      template: {
        ...v.template,
        hiddenSections: [...new Set([...v.template.hiddenSections, section])],
      },
    });
  }
  async function add() {
    if (!newEntry) return;
    setAdding(true);
    setError('');
    try {
      await onAdd(newEntry);
      setOpened(new Set([...opened, newEntry.kind]));
      setNewEntry(undefined);
    } catch (cause) {
      setError(
        cause instanceof DataError
          ? [cause.message, ...cause.details].join('\n')
          : cause instanceof Error
            ? cause.message
            : 'Could not add this entry.',
      );
    } finally {
      setAdding(false);
    }
  }
  return (
    <div className="resume-content">
      <StudioHeading
        title="Content"
        description="Your experience, thoughtfully composed."
      />
      <details className="content-accordion personal-accordion" open>
        <summary>
          <span className="accordion-icon">
            <UserRound size={18} />
          </span>
          <span>
            Personal Details<small>Your name and contact information</small>
          </span>
          <ChevronDown size={18} />
        </summary>
        <div className="accordion-body">
          <IdentityFields
            identity={
              v.identityOverride ?? v.identitySnapshot ?? profile.identity
            }
            onChange={(identityOverride) =>
              onChange({ ...v, identityOverride })
            }
          />
          <details className="quiet-disclosure">
            <summary>Visibility</summary>
            <div className="visibility-options">
              {(
                ['name', 'headline', 'email', 'phone', 'location'] as const
              ).map((key) => (
                <label key={key} className="check-field">
                  <input
                    type="checkbox"
                    aria-label={`Show ${key} on resume`}
                    checked={!v.hiddenIdentityFields?.includes(key)}
                    onChange={(e) =>
                      onChange({
                        ...v,
                        hiddenIdentityFields: e.target.checked
                          ? v.hiddenIdentityFields?.filter((k) => k !== key)
                          : [...(v.hiddenIdentityFields ?? []), key],
                      })
                    }
                  />
                  {key}
                </label>
              ))}
            </div>
          </details>
        </div>
      </details>
      <SortableList
        items={visible.map((id) => ({ id }))}
        label={(s) => resumeSectionTitles[s.id]}
        onChange={(items) => {
          const order = [
            ...items.map((s) => s.id),
            ...v.sectionOrder.filter((s) => !visible.includes(s)),
          ];
          onChange({
            ...v,
            sectionOrder: order,
            template: { ...v.template, sectionOrder: order },
          });
        }}
      >
        {({ id: section }) => {
          const Icon =
            sectionIcons[section as keyof typeof sectionIcons] ?? FileText;
          return (
            <details
              className="content-accordion"
              data-section={section}
              open={opened.has(section)}
              onToggle={(event) => {
                const open = event.currentTarget.open;
                setOpened((prev) => {
                  if (prev.has(section) === open) return prev;
                  const next = new Set(prev);
                  if (open) next.add(section);
                  else next.delete(section);
                  return next;
                });
              }}
            >
              <summary>
                <span className="accordion-icon">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span>
                  {resumeSectionTitles[section]}
                  <small>
                    {section === 'summary'
                      ? 'A short introduction'
                      : `${v.selections.filter((s) => s.section === section).length} entries`}
                  </small>
                </span>
                <ChevronDown size={18} />
              </summary>
              {opened.has(section) && (
                <div className="accordion-body">
                  {section === 'summary' ? (
                    <TextField
                      label="Professional summary for this resume"
                      multiline
                      value={v.summarySnapshot}
                      onChange={(summarySnapshot) =>
                        onChange({ ...v, summarySnapshot })
                      }
                    />
                  ) : (
                    <>
                      <SortableList
                        items={v.selections.filter(
                          (s) => s.section === section,
                        )}
                        label={(s) => effectiveEvidence(v, s).title || 'entry'}
                        onChange={(items) =>
                          onChange({
                            ...v,
                            selections: [
                              ...v.selections.filter(
                                (s) => s.section !== section,
                              ),
                              ...items,
                            ],
                          })
                        }
                      >
                        {(selection) => (
                          <details className="resume-entry-disclosure" open>
                            <summary>
                              {effectiveEvidence(v, selection).title ||
                                'Untitled entry'}
                              <ChevronDown size={15} />
                            </summary>
                            <EvidenceEditor
                              entry={effectiveEvidence(v, selection)}
                              onChange={(entry) =>
                                onChange(updateContent(v, selection.id, entry))
                              }
                              onDelete={() =>
                                onChange({
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
                          </details>
                        )}
                      </SortableList>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setError('');
                          setNewEntry(createEvidence(section));
                        }}
                      >
                        <Plus size={15} />
                        Add{' '}
                        {section === 'work'
                          ? 'experience'
                          : section === 'education'
                            ? 'education'
                            : section === 'skills'
                              ? 'skills'
                              : 'entry'}
                      </Button>
                      {profile[section].some(
                        (e) =>
                          !v.selections.some((s) => s.sourceEntryId === e.id),
                      ) && (
                        <details className="quiet-disclosure">
                          <summary>Choose from career profile</summary>
                          {profile[section]
                            .filter(
                              (e) =>
                                !v.selections.some(
                                  (s) => s.sourceEntryId === e.id,
                                ),
                            )
                            .map((entry) => (
                              <Button
                                key={entry.id}
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  onChange({
                                    ...v,
                                    selectedSections: [
                                      ...new Set([
                                        ...v.selectedSections,
                                        section,
                                      ]),
                                    ],
                                    selections: [
                                      ...v.selections,
                                      {
                                        id: newId(),
                                        section,
                                        sourceEntryId: entry.id,
                                        sourceProfileUpdatedAt:
                                          profile.updatedAt,
                                        snapshot: structuredClone(entry),
                                      },
                                    ],
                                  })
                                }
                              >
                                <Plus size={14} />
                                {entry.title || 'Untitled entry'}
                              </Button>
                            ))}
                        </details>
                      )}
                    </>
                  )}
                  <button
                    className="remove-section"
                    onClick={() => hide(section)}
                  >
                    <EyeOff size={13} />
                    Hide section
                  </button>
                </div>
              )}
            </details>
          );
        }}
      </SortableList>
      <Button
        variant="outline"
        className="add-section-button"
        onClick={() => setSectionPicker(true)}
      >
        <Plus size={17} />
        Add Section
      </Button>
      <Dialog
        open={sectionPicker}
        onOpenChange={setSectionPicker}
        title="Add a section"
        description="Choose what belongs in your story."
      >
        <div className="add-section-grid">
          {sections
            .filter((s) => !visible.includes(s))
            .map((section) => (
              <Button
                key={section}
                variant="outline"
                onClick={() => {
                  onChange({
                    ...v,
                    selectedSections: [
                      ...new Set([...v.selectedSections, section]),
                    ],
                    template: {
                      ...v.template,
                      hiddenSections: v.template.hiddenSections.filter(
                        (s) => s !== section,
                      ),
                    },
                  });
                  setOpened(new Set([...opened, section]));
                  setSectionPicker(false);
                  if (
                    section !== 'summary' &&
                    !v.selections.some((s) => s.section === section)
                  )
                    setNewEntry(createEvidence(section));
                }}
              >
                <Plus size={15} />
                {resumeSectionTitles[section]}
              </Button>
            ))}
        </div>
        {!sections.some((s) => !visible.includes(s)) && (
          <p>All sections are already available.</p>
        )}
      </Dialog>
      <Dialog
        open={!!newEntry}
        busy={adding}
        onOpenChange={(open) => {
          if (!open && !adding) setNewEntry(undefined);
        }}
        title={
          newEntry
            ? `Add ${newEntry.kind === 'work' ? 'experience' : resumeSectionTitles[newEntry.kind].toLowerCase()}`
            : 'Add entry'
        }
        description="Add your details. You can tailor them anytime."
        className="entry-dialog"
      >
        {newEntry && (
          <>
            <EvidenceEditor
              entry={newEntry}
              onChange={setNewEntry}
              onDelete={() => setNewEntry(undefined)}
            />
            {error && (
              <p role="alert" className="validation-errors">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Button
                variant="outline"
                disabled={adding}
                onClick={() => setNewEntry(undefined)}
              >
                Cancel
              </Button>
              <Button disabled={adding} onClick={() => void add()}>
                {adding ? 'Adding…' : 'Add to resume'}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
