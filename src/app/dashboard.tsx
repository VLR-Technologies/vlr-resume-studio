import { Link } from 'react-router';
import {
  UserRound,
  Files,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  Plus,
  Check,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, Badge, TextLink } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace-context';
import { useUi } from './ui-store';
import { ProfileAction } from '@/features/career-profile/profile-actions';
import { ResumeAction } from '@/features/resumes/resume-actions';
import { repository } from '@/services/storage/repository';
import { formatDate } from '@/lib/utils';
export function Dashboard() {
  const { profiles, variants } = useWorkspace();
  const { run, pending } = useUi();
  const hasDemo = profiles.some((p) => p.isDemo);
  const recent = [...variants]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  return (
    <>
      <PageHeader
        eyebrow="A LITTLE CLARITY. A LOT OF POSSIBILITY."
        title="Your next chapter starts here."
        description="Bring your experience together. Build a story for every opportunity."
      >
        <ProfileAction />
      </PageHeader>
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <Badge>
            <span className="small-dot" />
            Made for your career
          </Badge>
          <h2 id="welcome-title">
            One profile.
            <br />
            Many possibilities.
          </h2>
          <p>
            Your experience is the starting point.
            <br className="desktop-break" /> Shape it into focused resumes,
            without starting over.
          </p>
          <Link to="/profile" className="welcome-link">
            {profiles.length
              ? 'Explore your career profile'
              : 'Start with your career profile'}
            <ArrowRight size={17} />
          </Link>
        </div>
        <div
          className="career-flow"
          aria-label="One master profile connects to multiple resume variants"
        >
          <div className="flow-source">
            <span className="flow-icon">
              <UserRound size={22} strokeWidth={1.5} />
            </span>
            <div>
              <strong>Your career profile</strong>
              <span>All your experience, in one place</span>
            </div>
            <span className="flow-check">
              <Check size={13} />
            </span>
          </div>
          <div className="flow-connector">
            <span />
            <span />
            <span />
          </div>
          <div className="flow-variants">
            <div>
              <FileText size={22} strokeWidth={1.4} />
              <span>Internship</span>
              <i />
              <i />
              <i />
            </div>
            <div>
              <FileText size={22} strokeWidth={1.4} />
              <span>Full-time</span>
              <i />
              <i />
              <i />
            </div>
            <div>
              <FileText size={22} strokeWidth={1.4} />
              <span>Research</span>
              <i />
              <i />
              <i />
            </div>
          </div>
          <p className="flow-caption">Your content. Your direction.</p>
        </div>
      </section>
      <div className="stats-grid">
        <Card className="stat-card">
          <div>
            <p>Career profiles</p>
            <strong>{profiles.length.toString().padStart(2, '0')}</strong>
            <span>Your source of truth</span>
          </div>
          <UserRound size={21} strokeWidth={1.6} />
        </Card>
        <Card className="stat-card">
          <div>
            <p>Resume variants</p>
            <strong>{variants.length.toString().padStart(2, '0')}</strong>
            <span>Different goals, same you</span>
          </div>
          <Files size={21} strokeWidth={1.6} />
        </Card>
        <Card className="stat-card privacy-stat">
          <div>
            <p>Your data</p>
            <strong>
              Only here
              <span className="small-dot" />
            </strong>
            <span>Saved locally in this browser</span>
          </div>
          <ShieldCheck size={21} strokeWidth={1.6} />
        </Card>
      </div>
      <div className="workspace-heading">
        <h2>Your workspace</h2>
        <span>Thoughtfully organized. Ready to grow.</span>
      </div>
      <div className="dashboard-grid">
        <Card className="workspace-card">
          <header className="card-heading">
            <h3>Career Profile</h3>
            <TextLink to="/profile">View profiles</TextLink>
          </header>
          {profiles.length ? (
            <div className="profile-overview">
              {profiles.slice(0, 3).map((p) => (
                <Link to="/profile" className="saved-profile-row" key={p.id}>
                  <span className="small-avatar">
                    <UserRound size={19} />
                  </span>
                  <span>
                    <strong>{p.label}</strong>
                    <small>
                      {p.isDemo ? 'Fictional sample · ' : ''}Saved{' '}
                      {formatDate(p.updatedAt)}
                    </small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="compact-empty">
              <span className="empty-icon">
                <UserRound size={23} strokeWidth={1.5} />
              </span>
              <h4>A place for your experience</h4>
              <p>Start blank. Add your story at your own pace.</p>
              <Link to="/profile" className="text-link">
                Set up your profile
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </Card>
        <Card className="workspace-card">
          <header className="card-heading">
            <h3>Recent resumes</h3>
            <TextLink to="/resumes">View resumes</TextLink>
          </header>
          {recent.length ? (
            <div className="profile-overview">
              {recent.map((v) => (
                <Link className="saved-profile-row" to="/resumes" key={v.id}>
                  <span className="small-avatar paper-avatar">
                    <FileText size={19} />
                  </span>
                  <span>
                    <strong>{v.title}</strong>
                    <small>
                      {v.targetRole || 'No target role'} ·{' '}
                      {formatDate(v.updatedAt)}
                    </small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="compact-empty">
              <span className="empty-icon">
                <Files size={23} strokeWidth={1.5} />
              </span>
              <h4>Your opportunities, organized</h4>
              <p>
                {profiles.length
                  ? 'Your profile is ready. Create your first resume.'
                  : 'Create a profile to start your first resume.'}
              </p>
              {profiles.length ? (
                <ResumeAction />
              ) : (
                <span className="subtle-note">
                  <Plus size={13} />A profile is your first step
                </span>
              )}
            </div>
          )}
        </Card>
      </div>
      <section className="sample-banner">
        <span className="sample-icon">
          <FlaskConical size={22} strokeWidth={1.5} />
        </span>
        <div>
          <h3>
            {hasDemo
              ? 'Your sample workspace is ready'
              : 'Prefer to look around first?'}
          </h3>
          <p>
            {hasDemo
              ? 'Explore Alex Morgan’s fictional profile and linked resume.'
              : 'Explore a fictional profile and see how everything connects.'}
          </p>
        </div>
        {hasDemo ? (
          <Button variant="outline" asChild>
            <Link to="/profile">
              Explore sample
              <ArrowUpRight size={15} />
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () => repository.createDemo(),
                'Fictional sample profile and resume created.',
              )
            }
          >
            <span>{pending ? 'Creating…' : 'Try sample data'}</span>
            <ArrowRight size={15} />
          </Button>
        )}
      </section>
      <p className="foundation-note">
        <span className="small-dot" />
        Your profile, tailored resumes, and exports. Saved on this browser.
      </p>
    </>
  );
}
