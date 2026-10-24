import { useState } from 'react';
import {
  Database,
  CloudOff,
  ShieldCheck,
  FlaskConical,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, Card } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useWorkspace } from '@/app/workspace-context';
import { useUi } from '@/app/ui-store';
import { repository } from '@/services/storage/repository';
export function SettingsPage() {
  const { profiles, variants } = useWorkspace();
  const demos = profiles.filter((p) => p.isDemo);
  const demoVariants = variants.filter((v) =>
    demos.some((p) => p.id === v.sourceProfileId),
  );
  const [open, setOpen] = useState(false);
  const { run, pending } = useUi();
  return (
    <>
      <PageHeader
        eyebrow="YOUR WORKSPACE, YOUR CONTROL"
        title="Settings"
        description="A clear view of where your data lives and how it’s used."
      />
      <div className="settings-grid">
        <Card className="settings-card">
          <div className="section-icon">
            <Database size={21} />
          </div>
          <h2>Stored on this browser</h2>
          <p>
            Your profiles and resumes are saved in IndexedDB on this device and
            browser profile. No account is needed.
          </p>
          <div className="storage-counts">
            <strong>
              {profiles.length}
              <span>career profiles</span>
            </strong>
            <strong>
              {variants.length}
              <span>resume variants</span>
            </strong>
          </div>
          <p className="form-note">
            Browser storage is not an encrypted backup. Clearing site data,
            private browsing, or browser eviction can remove it. Keep an
            independent copy of important career information until backup export
            is available.
          </p>
        </Card>
        <Card className="settings-card">
          <div className="section-icon">
            <ShieldCheck size={21} />
          </div>
          <h2>Private from the start</h2>
          <ul className="privacy-list">
            <li>
              <ShieldCheck size={16} />
              No analytics or tracking
            </li>
            <li>
              <ShieldCheck size={16} />
              No resume uploads or AI requests
            </li>
            <li>
              <ShieldCheck size={16} />
              No API keys or subscriptions
            </li>
            <li>
              <CloudOff size={16} />
              Cloud sync is not enabled
            </li>
          </ul>
          <p className="form-note">
            People with access to this browser profile may be able to read your
            records. Privacy extensions or browser settings can affect storage.
          </p>
        </Card>
        <Card className="settings-card sample-settings">
          <div>
            <div className="section-icon">
              <FlaskConical size={21} />
            </div>
            <h2>Sample workspace</h2>
            <p>
              The Alex Morgan profile is fictional. Removing sample data also
              removes all resumes and revisions linked to that sample profile.
            </p>
            <Badge className="neutral-badge">
              {demos.length} sample profiles · {demoVariants.length} linked
              resumes
            </Badge>
          </div>
          <Button
            variant="destructive"
            disabled={!demos.length || pending}
            onClick={() => setOpen(true)}
          >
            <Trash2 size={15} />
            Remove sample data
          </Button>
        </Card>
      </div>
      <Card className="about-card">
        <div>
          <h2>
            VLR Resume Studio{' '}
            <Badge className="neutral-badge">Stage 0 · v0.1.0</Badge>
          </h2>
          <p>
            A product by VLR Technologies. Built around a career profile that
            belongs to you.
          </p>
        </div>
        <a
          className="text-link"
          href="https://github.com/VLR-Technologies/vlr-resume-studio/tree/feat/stage-0-foundation/docs"
          target="_blank"
          rel="noreferrer"
        >
          Product & technical docs
          <ArrowUpRight size={15} />
        </a>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Remove sample data?"
        description={`This permanently deletes ${demos.length} fictional sample profile(s), ${demoVariants.length} linked resume(s), and their revisions from this browser. Your non-sample profiles are kept.`}
      >
        <p className="form-note">
          Any resume you created from a sample profile is included. This cannot
          be undone.
        </p>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              if (
                await run(
                  () => repository.deleteDemo(),
                  'Sample profiles and their linked resumes were removed.',
                )
              )
                setOpen(false);
            }}
          >
            Remove sample data
          </Button>
        </div>
      </Dialog>
    </>
  );
}
