import { useState, type CSSProperties } from 'react';
import {
  Plus,
  Copy,
  ArrowUpRight,
  FileText,
  MoreHorizontal,
  ArrowRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useWorkspace } from '@/app/workspace-context';
import { Button } from '@/components/ui/button';
import { repository } from '@/services/storage/repository';
import { useUi } from '@/app/ui-store';
import { buildRenderModel } from '@/services/rendering/model';
import { formatDate } from '@/lib/utils';
import { documentAccent } from '@/services/rendering/colors';
import { DeleteResume, ResumeAction } from './resume-actions';

export function ResumesPage() {
  const { profiles, variants } = useWorkspace();
  const { run, pending } = useUi();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  async function create(profileId?: string) {
    setCreating(true);
    try {
      const resume = await repository.startResume(profileId);
      navigate(`/resumes/${resume.id}`);
    } catch (error) {
      await run(() => Promise.reject(error), '');
    } finally {
      setCreating(false);
    }
  }
  return (
    <div className="resume-dashboard">
      <header className="dashboard-heading">
        <div>
          <h1>My Resumes</h1>
          <p>Your next chapter starts with a great resume.</p>
        </div>
        <Button onClick={() => void create()} disabled={creating}>
          <Plus size={18} />
          {creating ? 'Creating…' : 'Create Resume'}
        </Button>
      </header>
      {!variants.length && (
        <section
          className="dashboard-empty"
          aria-label="Create your first resume"
        >
          <div className="empty-document" aria-hidden="true">
            <div className="empty-document-header">
              <span />
              <div>
                <i />
                <i />
              </div>
            </div>
            <i />
            <i />
            <i />
            <hr />
            <i />
            <i />
            <i />
            <span className="empty-document-icon">
              <FileText size={22} />
            </span>
          </div>
          <h2>A fresh page. A new possibility.</h2>
          <p>Bring your experience together in a resume that feels like you.</p>
          <Button onClick={() => void create()} disabled={creating}>
            {creating ? 'Creating…' : 'Create your first resume'}{' '}
            <ArrowRight size={17} />
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              void run(() => repository.createDemo(), 'Sample resume added.')
            }
          >
            Explore a sample resume <ArrowUpRight size={15} />
          </Button>
        </section>
      )}
      <div className="dashboard-grid">
        {[...variants]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map((variant) => {
            const profile = profiles.find(
              (p) => p.id === variant.sourceProfileId,
            );
            const model = profile
              ? buildRenderModel(profile, variant)
              : undefined;
            return (
              <article className="document-card" key={variant.id}>
                <div className="document-thumbnail">
                  <div
                    aria-hidden="true"
                    className={`mini-document ${variant.template.typography === 'serif' ? 'mini-serif' : ''}`}
                    style={
                      {
                        '--mini-accent': documentAccent(variant.template),
                      } as CSSProperties
                    }
                  >
                    <strong>{model?.identity.name || 'Your name'}</strong>
                    <span>
                      {model?.identity.headline || 'Your professional title'}
                    </span>
                    <small>
                      {[model?.identity.email, model?.identity.location]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                    {(model?.sections ?? []).slice(0, 4).map((section) => (
                      <section key={section.id}>
                        <h3>{section.title}</h3>
                        {section.text && <p>{section.text}</p>}
                        {section.entries.slice(0, 2).map((entry) => (
                          <div key={entry.id}>
                            <b>{entry.title}</b>
                            <p>{entry.subtitle}</p>
                            <p>{entry.summary || entry.bullets[0]?.text}</p>
                          </div>
                        ))}
                      </section>
                    ))}
                    {!model?.sections.length && (
                      <div className="mini-placeholder">
                        {Array.from({ length: 8 }, (_, i) => (
                          <i key={i} />
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/resumes/${variant.id}`}
                    className="thumbnail-link"
                    aria-label={`Open resume: ${variant.title}`}
                  >
                    <span className="thumbnail-open">
                      Open resume <ArrowUpRight size={16} />
                    </span>
                  </Link>
                </div>
                <div className="document-card-body">
                  <Link to={`/resumes/${variant.id}`}>
                    <h2>{variant.title}</h2>
                  </Link>
                  <p>Edited {formatDate(variant.updatedAt)}</p>
                  <div className="document-card-actions">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/resumes/${variant.id}`}>Open editor</Link>
                    </Button>
                    <details className="card-options">
                      <summary aria-label={`Options for ${variant.title}`}>
                        <MoreHorizontal size={20} />
                      </summary>
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            void run(
                              () => repository.duplicateVariant(variant.id),
                              'Resume duplicated.',
                            )
                          }
                        >
                          <Copy size={14} />
                          Duplicate
                        </Button>
                        <ResumeAction variant={variant} />
                        <DeleteResume variant={variant} />
                      </div>
                    </details>
                  </div>
                </div>
              </article>
            );
          })}
        {!!variants.length && (
          <button
            className="new-resume-card"
            onClick={() => void create()}
            disabled={creating}
          >
            <span>
              <Plus size={25} />
            </span>
            <strong>Create a new resume</strong>
            <p>A fresh version for your next move.</p>
          </button>
        )}
      </div>
      <div className="dashboard-secondary">
        {profiles.length > 0 && (
          <details>
            <summary>
              <FileText size={15} /> Start from a career profile
            </summary>
            <div>
              {profiles.map((p) => (
                <Button
                  key={p.id}
                  variant="outline"
                  size="sm"
                  onClick={() => void create(p.id)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
