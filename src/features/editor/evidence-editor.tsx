import { Plus, Trash2 } from 'lucide-react';
import type { Evidence } from '@/domain/schemas';
import { newId } from '@/domain/factories';
import { Button } from '@/components/ui/button';
import { TextField, SelectField } from './fields';
import { SortableList } from './sortable-list';

export function EvidenceEditor({
  entry,
  onChange,
  onDelete,
}: {
  entry: Evidence;
  onChange: (entry: Evidence) => void;
  onDelete: () => void;
}) {
  function patch(values: object) {
    onChange({ ...entry, ...values } as Evidence);
  }
  return (
    <article className="entry-editor">
      <header>
        <h3>{entry.title || 'New entry'}</h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onDelete}
          aria-label={`Delete ${entry.title || 'entry'}`}
        >
          <Trash2 size={14} />
          Remove
        </Button>
      </header>
      <div className="field-grid">
        <TextField
          label={
            entry.kind === 'custom'
              ? 'Custom section title'
              : entry.kind === 'skills'
                ? 'Skill group'
                : ['work', 'internships', 'volunteer'].includes(entry.kind)
                  ? 'Position'
                  : 'Title'
          }
          value={entry.title}
          onChange={(title) => patch({ title })}
        />
        {'organization' in entry && (
          <TextField
            label="Organization"
            value={entry.organization}
            onChange={(organization) => patch({ organization })}
          />
        )}
        {'institution' in entry && (
          <>
            <TextField
              label="Institution"
              value={entry.institution}
              onChange={(institution) => patch({ institution })}
            />
            <TextField
              label="Qualification"
              value={entry.qualification}
              onChange={(qualification) => patch({ qualification })}
            />
          </>
        )}
        {['work', 'internships', 'education'].includes(entry.kind) && (
          <TextField
            label="Location"
            value={'location' in entry ? entry.location : ''}
            onChange={(location) => patch({ location })}
          />
        )}
        {'proficiency' in entry || entry.kind === 'languages' ? (
          <TextField
            label="Proficiency"
            value={entry.kind === 'languages' ? entry.proficiency : ''}
            onChange={(proficiency) => patch({ proficiency })}
          />
        ) : null}
        {(['issuer', 'publisher', 'awarder'] as const).map(
          (key) =>
            ((key === 'issuer' && entry.kind === 'certifications') ||
              (key === 'publisher' && entry.kind === 'publications') ||
              (key === 'awarder' && entry.kind === 'awards')) && (
              <TextField
                key={key}
                label={key[0]!.toUpperCase() + key.slice(1)}
                value={
                  key in entry ? String(entry[key as keyof Evidence] ?? '') : ''
                }
                onChange={(value) => patch({ [key]: value || undefined })}
              />
            ),
        )}
        {'period' in entry && (
          <>
            <TextField
              label="Start date"
              placeholder="YYYY-MM"
              value={entry.period.start}
              onChange={(start) =>
                patch({
                  period: { ...entry.period, start: start || undefined },
                })
              }
            />
            <TextField
              label="End date"
              placeholder="YYYY-MM"
              value={entry.period.end}
              disabled={entry.period.ongoing}
              onChange={(end) =>
                patch({ period: { ...entry.period, end: end || undefined } })
              }
            />
            <label className="check-field">
              <input
                type="checkbox"
                checked={entry.period.ongoing}
                onChange={(e) =>
                  patch({
                    period: {
                      ...entry.period,
                      ongoing: e.target.checked,
                      end: e.target.checked ? undefined : entry.period.end,
                    },
                  })
                }
              />
              Currently here / ongoing
            </label>
          </>
        )}
        {['certifications', 'publications', 'awards'].includes(entry.kind) && (
          <TextField
            label="Date"
            placeholder="YYYY-MM"
            value={'date' in entry ? entry.date : ''}
            onChange={(date) => patch({ date: date || undefined })}
          />
        )}
        {['projects', 'links', 'certifications', 'publications'].includes(
          entry.kind,
        ) && (
          <TextField
            label="Website or project link"
            type="url"
            maxLength={2000}
            placeholder="https://"
            value={'url' in entry ? entry.url : ''}
            onChange={(url) =>
              patch({ url: url || (entry.kind === 'links' ? '' : undefined) })
            }
          />
        )}
        {entry.kind === 'skills' && (
          <>
            <SelectField
              label="Skill category"
              value={entry.category}
              onChange={(category) => patch({ category })}
              options={[
                { value: 'technical', label: 'Technical' },
                { value: 'professional', label: 'Professional' },
              ]}
            />
            <TextField
              label="Skills (comma separated)"
              value={entry.keywords.join(', ')}
              onChange={(value) =>
                patch({ keywords: value.split(',').map((s) => s.trim()) })
              }
              maxLength={10000}
            />
          </>
        )}
        {entry.kind === 'projects' && (
          <TextField
            label="Technologies (comma separated)"
            value={entry.technologies?.join(', ')}
            onChange={(value) =>
              patch({ technologies: value.split(',').map((s) => s.trim()) })
            }
            maxLength={10000}
          />
        )}
      </div>
      <TextField
        label={
          entry.kind === 'work' || entry.kind === 'internships'
            ? 'Responsibilities & overview'
            : 'Description'
        }
        multiline
        value={entry.summary}
        onChange={(summary) => patch({ summary })}
      />
      <div className="bullet-heading">
        <strong>Accomplishments & highlights</strong>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            patch({ bullets: [...entry.bullets, { id: newId(), text: '' }] })
          }
        >
          <Plus size={14} />
          Add bullet
        </Button>
      </div>
      <SortableList
        items={entry.bullets}
        label={(bullet) =>
          `bullet ${entry.bullets.findIndex((b) => b.id === bullet.id) + 1}`
        }
        onChange={(bullets) => patch({ bullets })}
      >
        {(bullet) => (
          <div className="bullet-row">
            <TextField
              label="Achievement bullet"
              multiline
              rows={2}
              value={bullet.text}
              onChange={(text) =>
                patch({
                  bullets: entry.bullets.map((b) =>
                    b.id === bullet.id ? { ...b, text } : b,
                  ),
                })
              }
            />
            <button
              type="button"
              className="icon-control"
              aria-label="Delete bullet"
              onClick={() =>
                patch({
                  bullets: entry.bullets.filter((b) => b.id !== bullet.id),
                })
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </SortableList>
    </article>
  );
}
