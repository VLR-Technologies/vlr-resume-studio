import {
  UserRound,
  BriefcaseBusiness,
  GraduationCap,
  FolderGit2,
  ArrowRight,
} from 'lucide-react';
import { useWorkspace } from '@/app/workspace-context';
import { Card, Badge, EmptyState } from '@/components/ui/primitives';
import { PageHeader } from '@/components/layout/page-header';
import { ProfileAction, DeleteProfile } from './profile-actions';
import { entrySectionSchema, type MasterCareerProfile } from '@/domain/schemas';
import { formatDate } from '@/lib/utils';
const sectionNames: Record<string, string> = {
  work: 'Work experience',
  internships: 'Internships',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  languages: 'Languages',
  certifications: 'Certifications',
  publications: 'Publications',
  volunteer: 'Volunteering',
  awards: 'Awards',
  links: 'Professional links',
  custom: 'Custom sections',
};
function ProfileDetails({ profile }: { profile: MasterCareerProfile }) {
  return (
    <div className="profile-details">
      <div className="profile-identity">
        <span className="avatar">
          {profile.identity.name
            ?.split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('') || <UserRound size={25} />}
        </span>
        <div>
          <h3>{profile.identity.name || 'Your blank profile'}</h3>
          <p>{profile.identity.headline || 'Ready for your experience'}</p>
          {(profile.identity.location ||
            profile.identity.email ||
            profile.identity.phone) && (
            <p className="identity-contact">
              {[
                profile.identity.location,
                profile.identity.email,
                profile.identity.phone,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      </div>
      {profile.summary && (
        <section className="evidence-section">
          <h4>Professional summary</h4>
          <p>{profile.summary}</p>
        </section>
      )}
      {entrySectionSchema.options.map(
        (section) =>
          profile[section].length > 0 && (
            <section className="evidence-section" key={section}>
              <h4>{sectionNames[section]}</h4>
              {profile[section].map((entry) => (
                <article className="evidence-entry" key={entry.id}>
                  <strong>{entry.title}</strong>
                  {'institution' in entry && <p>{entry.institution}</p>}
                  {'organization' in entry && <p>{entry.organization}</p>}
                  {'period' in entry && (
                    <small>
                      {entry.period.start ?? 'Start unspecified'} –{' '}
                      {entry.period.ongoing
                        ? 'Present'
                        : (entry.period.end ?? 'End unspecified')}
                    </small>
                  )}
                  {entry.summary && <p>{entry.summary}</p>}
                  {'keywords' in entry && (
                    <div className="skill-tags">
                      {entry.keywords.map((skill, index) => (
                        <span key={`${skill}-${index}`}>{skill}</span>
                      ))}
                    </div>
                  )}
                  {'proficiency' in entry && <p>{entry.proficiency}</p>}
                  {'qualification' in entry && entry.qualification && (
                    <p>{entry.qualification}</p>
                  )}
                  {'issuer' in entry && entry.issuer && <p>{entry.issuer}</p>}
                  {'publisher' in entry && entry.publisher && (
                    <p>{entry.publisher}</p>
                  )}
                  {'awarder' in entry && entry.awarder && (
                    <p>{entry.awarder}</p>
                  )}
                  {'date' in entry && entry.date && <small>{entry.date}</small>}
                  {'url' in entry && entry.url && (
                    <p>
                      <a href={entry.url} target="_blank" rel="noreferrer">
                        {entry.url}
                      </a>
                    </p>
                  )}
                  {entry.bullets.length > 0 && (
                    <ul>
                      {entry.bullets.map((b) => (
                        <li key={b.id}>{b.text}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </section>
          ),
      )}
      {entrySectionSchema.options.every((s) => !profile[s].length) && (
        <div className="blank-profile-info">
          <div className="inline-icons">
            <GraduationCap />
            <BriefcaseBusiness />
            <FolderGit2 />
          </div>
          <h4>Your experience belongs here</h4>
          <p>
            This blank profile is saved. Full editing for education, work,
            projects, and more is coming in a later stage.
          </p>
        </div>
      )}
    </div>
  );
}
export function ProfilePage() {
  const { profiles, variants } = useWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="THE SOURCE OF YOUR STORY"
        title="Career Profile"
        description="One home for your experience. A starting point for every resume."
      >
        <ProfileAction />
      </PageHeader>
      <div className="info-strip">
        <UserRound size={20} />
        <p>
          Your master profile is your source of truth. Each resume keeps its own
          selections and wording.
        </p>
        <ArrowRight size={18} />
      </div>
      {!profiles.length ? (
        <Card>
          <EmptyState
            icon={UserRound}
            title="Every career starts somewhere"
            description="Create a blank profile today. You can explore a fictional sample from the overview, too."
          >
            <ProfileAction />
          </EmptyState>
        </Card>
      ) : (
        <div className="profile-list">
          {profiles.map((profile) => (
            <Card key={profile.id} className="profile-card">
              <header className="card-heading">
                <div>
                  <div className="title-with-badge">
                    <h2>{profile.label}</h2>
                    {profile.isDemo && <Badge>Fictional sample</Badge>}
                  </div>
                  <p>
                    Saved {formatDate(profile.updatedAt)} ·{' '}
                    {
                      variants.filter((v) => v.sourceProfileId === profile.id)
                        .length
                    }{' '}
                    linked resumes
                  </p>
                </div>
                <div className="row-actions">
                  <ProfileAction profile={profile} />
                  <DeleteProfile
                    profile={profile}
                    linked={
                      variants.filter((v) => v.sourceProfileId === profile.id)
                        .length
                    }
                  />
                </div>
              </header>
              <ProfileDetails profile={profile} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
