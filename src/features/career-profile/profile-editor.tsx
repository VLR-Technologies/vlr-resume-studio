import { useState } from 'react';
import { Plus, Undo2 } from 'lucide-react';
import { Link } from 'react-router';
import {
  type MasterCareerProfile,
  type Evidence,
  entrySectionSchema,
} from '@/domain/schemas';
import { createEvidence, sectionNames } from '@/domain/editor';
import { Button } from '@/components/ui/button';
import { repository } from '@/services/storage/repository';
import { useAutosave } from '@/features/editor/use-autosave';
import {
  IdentityFields,
  TextField,
  SaveStatus,
} from '@/features/editor/fields';
import { EvidenceEditor } from '@/features/editor/evidence-editor';
import { SortableList } from '@/features/editor/sortable-list';

export function ProfileEditor({ profile }: { profile: MasterCareerProfile }) {
  const editor = useAutosave(
    profile,
    (value, expected) => repository.saveProfile(value, expected),
    'profile',
  );
  const [section, setSection] = useState<
    'identity' | 'summary' | (typeof entrySectionSchema.options)[number]
  >('identity');
  const p = editor.draft;
  return (
    <div className="profile-edit-layout">
      <nav className="section-nav" aria-label={`Sections in ${profile.label}`}>
        <button
          className={section === 'identity' ? 'selected' : ''}
          onClick={() => setSection('identity')}
        >
          Personal details
        </button>
        <button
          className={section === 'summary' ? 'selected' : ''}
          onClick={() => setSection('summary')}
        >
          Professional summary
        </button>
        {entrySectionSchema.options.map((s) => (
          <button
            key={s}
            className={section === s ? 'selected' : ''}
            onClick={() => setSection(s)}
          >
            {sectionNames[s]}
            <span>{p[s].length}</span>
          </button>
        ))}
      </nav>
      <div className="profile-editor">
        <div className="editor-section-heading">
          <div>
            <p className="eyebrow">MASTER CAREER PROFILE</p>
            <h3>
              {section === 'identity'
                ? p.identity.name || 'Personal details'
                : sectionNames[section]}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={!editor.undoCount}
            onClick={editor.undo}
          >
            <Undo2 size={14} />
            Undo
          </Button>
        </div>
        <SaveStatus
          status={editor.status}
          errors={editor.errors}
          retry={() => void editor.flush()}
        />
        {profile.updatedAt !== p.updatedAt && (
          <p className="form-note">
            A newer stored version may be available.{' '}
            <button onClick={() => editor.reload(profile)}>
              Reload stored profile (discard local edits)
            </button>
          </p>
        )}
        {section === 'identity' ? (
          <IdentityFields
            identity={p.identity}
            onChange={(identity) => editor.change({ ...p, identity })}
          />
        ) : section === 'summary' ? (
          <TextField
            label="Professional summary"
            multiline
            value={p.summary}
            onChange={(summary) => editor.change({ ...p, summary })}
          />
        ) : (
          <>
            <SortableList<Evidence>
              items={p[section]}
              label={(e) => e.title || 'entry'}
              onChange={(items) => editor.change({ ...p, [section]: items })}
            >
              {(entry) => (
                <EvidenceEditor
                  entry={entry}
                  onChange={(updated) =>
                    editor.change({
                      ...p,
                      [section]: p[section].map((e) =>
                        e.id === entry.id ? updated : e,
                      ),
                    })
                  }
                  onDelete={() =>
                    editor.change({
                      ...p,
                      [section]: p[section].filter((e) => e.id !== entry.id),
                    })
                  }
                />
              )}
            </SortableList>
            <Button
              variant="outline"
              onClick={() =>
                editor.change({
                  ...p,
                  [section]: [...p[section], createEvidence(section)],
                })
              }
            >
              <Plus size={15} />
              Add {sectionNames[section].toLowerCase()} entry
            </Button>
          </>
        )}
        <div className="editor-footnote">
          Use Undo to restore recent edits in this session.{' '}
          <Link to="/settings">Export a backup</Link> for lasting recovery.
        </div>
      </div>
    </div>
  );
}
