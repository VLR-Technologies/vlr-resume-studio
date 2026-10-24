import { Files, Link2, ArrowUpRight, FileText } from 'lucide-react';
import { Link } from 'react-router';
import { useWorkspace } from '@/app/workspace-context';
import { Card, Badge, EmptyState } from '@/components/ui/primitives';
import { PageHeader } from '@/components/layout/page-header';
import { ResumeAction, DeleteResume } from './resume-actions';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { repository } from '@/services/storage/repository';
import { useUi } from '@/app/ui-store';
import { resolveSelections } from '@/domain/factories';
export function ResumesPage() {
  const { profiles, variants } = useWorkspace();
  const { run, pending } = useUi();
  return (
    <>
      <PageHeader
        eyebrow="DIFFERENT OPPORTUNITIES. ONE YOU."
        title="My Resumes"
        description="Give each opportunity a focused version of your career story."
      >
        <ResumeAction />
      </PageHeader>
      {!variants.length ? (
        <Card>
          <EmptyState
            icon={Files}
            title="Your next opportunity starts here"
            description={
              profiles.length
                ? 'Create a resume linked to your career profile. Your original experience stays safely separate.'
                : 'Start with a career profile, then create your first resume.'
            }
          >
            {profiles.length ? (
              <ResumeAction />
            ) : (
              <Link className="text-link" to="/profile">
                Create your career profile
                <ArrowUpRight size={15} />
              </Link>
            )}
          </EmptyState>
        </Card>
      ) : (
        <div className="resume-grid">
          {[...variants]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((variant) => {
              const profile = profiles.find(
                (p) => p.id === variant.sourceProfileId,
              );
              const issues = profile
                ? resolveSelections(profile, variant).filter(
                    (s) => s.status !== 'current',
                  )
                : [];
              return (
                <Card key={variant.id} className="resume-card">
                  <div className="resume-card-top">
                    <span className="document-icon">
                      <FileText size={27} strokeWidth={1.3} />
                    </span>
                    {profile?.isDemo ? (
                      <Badge>Fictional sample</Badge>
                    ) : (
                      <Badge className="neutral-badge">Local resume</Badge>
                    )}
                  </div>
                  <h2>{variant.title}</h2>
                  <p className="resume-role">
                    {variant.targetRole || 'No target role set'}
                  </p>
                  <dl className="resume-metadata">
                    <div>
                      <dt>Format</dt>
                      <dd>
                        {variant.template.pageSize} · {variant.locale}
                      </dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatDate(variant.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt>Evidence</dt>
                      <dd>{variant.selections.length} selected entries</dd>
                    </div>
                  </dl>
                  <p className="source-link">
                    <Link2 size={14} />
                    {profile?.label ?? 'Source profile unavailable'}
                  </p>
                  {(!profile || issues.length > 0) && (
                    <p className="reference-warning">
                      {profile
                        ? `${issues.length} source entries changed or were removed.`
                        : 'Source profile is missing.'}{' '}
                      Selected snapshots are preserved for review.
                    </p>
                  )}
                  <div className="resume-actions">
                    <Button asChild size="sm">
                      <Link to={`/resumes/${variant.id}`}>Open editor</Link>
                    </Button>
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
                      Duplicate
                    </Button>
                    <ResumeAction variant={variant} />
                    <DeleteResume variant={variant} />
                  </div>
                </Card>
              );
            })}
        </div>
      )}
    </>
  );
}
