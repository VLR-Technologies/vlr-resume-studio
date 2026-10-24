import { UserRound, ArrowRight } from 'lucide-react';
import { useWorkspace } from '@/app/workspace-context';
import { Card, Badge, EmptyState } from '@/components/ui/primitives';
import { PageHeader } from '@/components/layout/page-header';
import { ProfileAction, DeleteProfile } from './profile-actions';
import { formatDate } from '@/lib/utils';
import { ProfileEditor } from './profile-editor';
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
              <ProfileEditor profile={profile} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
