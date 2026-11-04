import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { Evidence, MasterCareerProfile } from '@/domain/schemas';
import { entrySectionSchema, profileSchema } from '@/domain/schemas';
import { sectionNames } from '@/domain/editor';
import { templateRegistry } from '@/domain/templates';
import type { TemplateId } from '@/domain/template-ids';
import { repository } from '@/services/storage/repository';
import { DataError, validate } from '@/domain/validation';
import { hasUnsavedDrafts } from '@/features/editor/use-autosave';
import { TemplateGallery } from '@/features/resumes/template-gallery';

type EntrySection = (typeof entrySectionSchema.options)[number];

const sectionFields: Partial<Record<Evidence['kind'], [string, string][]>> = {
  education: [
    ['institution', 'Institution'],
    ['qualification', 'Qualification'],
    ['location', 'Location'],
    ['period.start', 'Start date'],
    ['period.end', 'End date'],
  ],
  work: [
    ['organization', 'Employer'],
    ['location', 'Location'],
    ['period.start', 'Start date'],
    ['period.end', 'End date'],
  ],
  internships: [
    ['organization', 'Employer'],
    ['location', 'Location'],
    ['period.start', 'Start date'],
    ['period.end', 'End date'],
  ],
  projects: [
    ['url', 'Project link'],
    ['technologies', 'Technologies (comma separated)'],
  ],
  skills: [['keywords', 'Skills (comma separated)']],
  languages: [['proficiency', 'Proficiency']],
  certifications: [
    ['issuer', 'Issuer'],
    ['date', 'Date'],
    ['url', 'Certification link'],
  ],
  publications: [
    ['publisher', 'Publisher'],
    ['date', 'Date'],
    ['url', 'Publication link'],
  ],
  volunteer: [
    ['organization', 'Organization'],
    ['period.start', 'Start date'],
    ['period.end', 'End date'],
  ],
  awards: [
    ['awarder', 'Awarded by'],
    ['date', 'Date'],
  ],
  links: [['url', 'URL']],
};
const identityFields = [
  ['name', 'Full name'],
  ['headline', 'Professional headline'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['location', 'Location'],
] as const;
const inputValue = (value: unknown) =>
  Array.isArray(value)
    ? value.join(', ')
    : typeof value === 'string'
      ? value
      : '';

function EvidenceEditor({
  section,
  entry,
  onChange,
  onRemove,
}: {
  section: EntrySection;
  entry: Evidence;
  onChange: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const fields = sectionFields[entry.kind] ?? [];
  const valueAt = (path: string) =>
    path.split('.').reduce<unknown>((value, key) => {
      if (!value || typeof value !== 'object') return undefined;
      return (value as Record<string, unknown>)[key];
    }, entry);
  const write = (path: string, value: string) => {
    if (path.includes('.')) {
      const [parent, key] = path.split('.') as [string, string];
      const prior = (entry as unknown as Record<string, unknown>)[parent];
      const normalized = value || undefined;
      onChange({
        [parent]: {
          ...(prior as object),
          [key]: normalized,
          ...(parent === 'period' && key === 'end' && normalized
            ? { ongoing: false }
            : {}),
        },
      });
      return;
    }
    if (path === 'keywords' || path === 'technologies')
      onChange({
        [path]: value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      });
    else
      onChange({
        [path]: ['date', 'url', 'issuer', 'publisher', 'proficiency'].includes(
          path,
        )
          ? value || undefined
          : value,
      });
  };
  return (
    <article className="resume-import-entry">
      <div className="resume-import-entry-heading">
        <strong>
          {entry.title ||
            `Untitled ${sectionNames[section].toLowerCase()} entry`}
        </strong>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 size={14} /> Remove entry
        </Button>
      </div>
      <div className="resume-import-fields">
        <label>
          <span>Title</span>
          <input
            value={entry.title}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </label>
        <label className="wide-field">
          <span>Description / summary</span>
          <textarea
            rows={2}
            value={entry.summary ?? ''}
            onChange={(event) =>
              onChange({ summary: event.target.value || undefined })
            }
          />
        </label>
        {fields.map(([path, label]) => {
          const value = valueAt(path);
          return (
            <label key={path}>
              <span>{label}</span>
              <input
                value={inputValue(value)}
                onChange={(event) => write(path, event.target.value)}
                placeholder={
                  path.startsWith('period.') ? 'YYYY or YYYY-MM' : undefined
                }
              />
            </label>
          );
        })}
        <label className="wide-field">
          <span>Achievement bullets (one per line)</span>
          <textarea
            rows={3}
            value={entry.bullets.map((bullet) => bullet.text).join('\n')}
            onChange={(event) =>
              onChange({
                bullets: event.target.value.split('\n').map((text, index) => ({
                  id: entry.bullets[index]?.id ?? crypto.randomUUID(),
                  text,
                })),
              })
            }
          />
        </label>
      </div>
    </article>
  );
}

export function ResumeImportReview({
  filename,
  format,
  incoming,
  warnings,
  onClose,
}: {
  filename: string;
  format: string;
  incoming: MasterCareerProfile;
  warnings: string[];
  onClose: () => void;
}) {
  const [profile, setProfile] = useState(incoming);
  const [savedProfile, setSavedProfile] = useState<MasterCareerProfile>();
  const [chooseTemplate, setChooseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateId>('classic');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();
  const updateIdentity = (key: string, value: string) =>
    setProfile((current) => ({
      ...current,
      identity: { ...current.identity, [key]: value || undefined },
    }));
  const updateEvidence = (
    section: EntrySection,
    id: string,
    patch: Record<string, unknown>,
  ) =>
    setProfile((current) => {
      const next = structuredClone(current);
      const rows = next[section] as unknown as Evidence[];
      const index = rows.findIndex((entry) => entry.id === id);
      if (index >= 0) rows[index] = { ...rows[index]!, ...patch } as Evidence;
      return next;
    });
  const removeEntry = (section: EntrySection, id: string) =>
    setProfile((current) => ({
      ...current,
      [section]: (current[section] as unknown[]).filter(
        (entry) => (entry as Evidence).id !== id,
      ),
    }));
  const saveProfile = async () => {
    setBusy(true);
    setError('');
    try {
      if (hasUnsavedDrafts())
        throw new Error(
          'Save or reload open resume edits before importing a profile.',
        );
      const validated = validate(profileSchema, profile);
      const saved = await repository.addProfile(validated);
      setProfile(saved);
      setSavedProfile(saved);
      setStatus('Career profile saved in this browser.');
    } catch (cause) {
      setError(
        cause instanceof DataError
          ? [cause.message, ...cause.details].join('\n')
          : cause instanceof Error
            ? cause.message
            : 'Could not save this career profile.',
      );
    } finally {
      setBusy(false);
    }
  };
  const createResume = async () => {
    if (!savedProfile) return;
    setBusy(true);
    setError('');
    try {
      const title = `${savedProfile.identity.name || 'Imported'} resume`;
      const variant = await repository.createResume(
        savedProfile.id,
        title.slice(0, 200),
        savedProfile.identity.headline ?? '',
        selectedTemplate,
      );
      onClose();
      navigate(`/resumes/${variant.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not create the resume.',
      );
    } finally {
      setBusy(false);
    }
  };
  const hasMissing =
    !profile.identity.name ||
    !profile.identity.email ||
    !profile.summary ||
    !entrySectionSchema.options.some((section) => profile[section].length);
  const previewSections = entrySectionSchema.options.filter(
    (section) => profile[section].length,
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={savedProfile ? 'Profile saved' : 'Review imported resume'}
      className="import-dialog resume-import-review-dialog"
      description={`${filename} · ${format}. Review every field before saving; nothing is stored until you confirm.`}
    >
      {!savedProfile ? (
        <>
          <p className="resume-import-missing" role="note">
            {hasMissing
              ? 'Some common details are missing. Add them if you have them, or leave them blank.'
              : 'Review the extracted information and correct anything that needs attention.'}
          </p>
          {warnings.map((warning) => (
            <p key={warning} className="reference-warning">
              {warning}
            </p>
          ))}
          <section className="resume-import-section">
            <h3>Personal details</h3>
            <div className="resume-import-fields">
              {identityFields.map(([key, label]) => (
                <label key={key}>
                  <span>
                    {label}
                    {!profile.identity[key] ? ' · missing' : ''}
                  </span>
                  <input
                    type={key === 'email' ? 'email' : 'text'}
                    value={profile.identity[key] ?? ''}
                    onChange={(event) =>
                      updateIdentity(key, event.target.value)
                    }
                  />
                </label>
              ))}
              <label className="wide-field">
                <span>
                  Professional summary{!profile.summary ? ' · missing' : ''}
                </span>
                <textarea
                  rows={4}
                  value={profile.summary ?? ''}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      summary: event.target.value || undefined,
                    }))
                  }
                />
              </label>
            </div>
          </section>
          {entrySectionSchema.options.map((section) => {
            const entries = profile[section] as unknown as Evidence[];
            if (!entries.length) return null;
            return (
              <section className="resume-import-section" key={section}>
                <div className="resume-import-section-heading">
                  <h3>{sectionNames[section]}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setProfile((current) => ({ ...current, [section]: [] }))
                    }
                  >
                    Remove section
                  </Button>
                </div>
                {entries.map((entry) => (
                  <EvidenceEditor
                    key={entry.id}
                    section={section}
                    entry={entry}
                    onChange={(patch) =>
                      updateEvidence(section, entry.id, patch)
                    }
                    onRemove={() => removeEntry(section, entry.id)}
                  />
                ))}
              </section>
            );
          })}
          <details className="resume-import-preview">
            <summary>Preview before saving</summary>
            <article>
              <h2>{profile.identity.name || 'Name not provided'}</h2>
              {profile.identity.headline && <p>{profile.identity.headline}</p>}
              {[
                profile.identity.email,
                profile.identity.phone,
                profile.identity.location,
              ]
                .filter(Boolean)
                .join(' · ') && (
                <p>
                  {[
                    profile.identity.email,
                    profile.identity.phone,
                    profile.identity.location,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              {profile.summary && <p>{profile.summary}</p>}
              {previewSections.map((section) => (
                <section key={section}>
                  <h3>{sectionNames[section]}</h3>
                  {(profile[section] as unknown as Evidence[]).map((entry) => (
                    <div key={entry.id}>
                      <strong>{entry.title}</strong>
                      {entry.summary && <p>{entry.summary}</p>}
                      {entry.bullets.map((bullet) => (
                        <p key={bullet.id}>• {bullet.text}</p>
                      ))}
                    </div>
                  ))}
                </section>
              ))}
            </article>
          </details>
          {error && (
            <p role="alert" className="validation-errors">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void saveProfile()}
            >
              {busy ? 'Saving…' : 'Confirm and save career profile'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p role="status" className="portability-status">
            {status}
          </p>
          <p>
            Your imported career profile stays independent from the resume
            design and future wording edits.
          </p>
          {!chooseTemplate ? (
            <div className="dialog-actions">
              <Button type="button" variant="outline" onClick={onClose}>
                Finish for now
              </Button>
              <Button type="button" onClick={() => setChooseTemplate(true)}>
                Choose Resume Template
              </Button>
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="resume-import-template">Resume template</label>
                <select
                  id="resume-import-template"
                  value={selectedTemplate}
                  onChange={(event) =>
                    setSelectedTemplate(event.target.value as TemplateId)
                  }
                >
                  {templateRegistry.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <TemplateGallery
                selected={selectedTemplate}
                onSelect={setSelectedTemplate}
              />
              {error && (
                <p role="alert" className="validation-errors">
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setChooseTemplate(false)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void createResume()}
                >
                  {busy ? 'Creating resume…' : 'Create resume and open editor'}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
