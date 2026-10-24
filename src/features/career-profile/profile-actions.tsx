import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/primitives';
import { useUi } from '@/app/ui-store';
import { repository } from '@/services/storage/repository';
import type { MasterCareerProfile } from '@/domain/schemas';
import { discardPendingDrafts } from '@/features/editor/use-autosave';
export function ProfileAction({ profile }: { profile?: MasterCareerProfile }) {
  const [open, setOpen] = useState(false);
  const [openedVersion, setOpenedVersion] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ label: string }>({
    defaultValues: { label: profile?.label ?? 'My career profile' },
  });
  const { run, pending, notice, dismiss } = useUi();
  const submit = handleSubmit(async ({ label }) => {
    const ok = await run(
      () =>
        profile
          ? repository.saveProfile({ ...profile, label }, openedVersion)
          : repository.createBlankProfile(label),
      profile
        ? 'Profile name saved on this browser.'
        : 'Blank career profile created on this browser.',
    );
    if (ok) {
      setOpen(false);
      reset();
    }
  });
  return (
    <>
      <Button
        variant={profile ? 'ghost' : 'default'}
        size={profile ? 'sm' : 'default'}
        onClick={() => {
          setOpenedVersion(profile?.updatedAt ?? '');
          dismiss();
          reset({ label: profile?.label ?? 'My career profile' });
          setOpen(true);
        }}
      >
        {profile ? <Pencil size={14} /> : <Plus size={16} />}
        {profile ? 'Rename' : 'Create profile'}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={
          profile ? 'Rename career profile' : 'A fresh start for your career'
        }
        description={
          profile
            ? 'This changes the workspace label only.'
            : 'Start with a blank profile. No personal information required.'
        }
      >
        <form onSubmit={submit}>
          {notice?.error && <p role="alert">{notice.text}</p>}
          <Field
            label="Profile name"
            htmlFor="profile-label"
            error={errors.label?.message}
          >
            <input
              id="profile-label"
              autoComplete="off"
              aria-invalid={!!errors.label}
              {...register('label', {
                required: 'Add a profile name.',
                validate: (v) => !!v.trim() || 'Add a profile name.',
                maxLength: {
                  value: 200,
                  message: 'Use 200 characters or fewer.',
                },
                setValueAs: (v: string) => v.trim(),
              })}
            />
          </Field>
          <p className="form-note">
            Saved locally in this browser. Add your experience after creating
            the profile.
          </p>
          <div className="dialog-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending
                ? 'Saving…'
                : profile
                  ? 'Save name'
                  : 'Create blank profile'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
export function DeleteProfile({
  profile,
  linked,
}: {
  profile: MasterCareerProfile;
  linked: number;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useUi();
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2 size={14} />
        Delete
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this profile?"
        description={`“${profile.label}” will be permanently removed from this browser.`}
      >
        {linked > 0 ? (
          <p className="form-note">
            This profile has {linked} linked resume{linked === 1 ? '' : 's'}.
            Delete those from My Resumes first to protect their source
            references.
          </p>
        ) : (
          <p className="form-note">This action cannot be undone.</p>
        )}
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending || linked > 0}
            onClick={async () => {
              if (
                await run(async () => {
                  await repository.deleteProfile(profile.id);
                  discardPendingDrafts([profile.id]);
                }, 'Career profile deleted.')
              )
                setOpen(false);
            }}
          >
            Delete profile
          </Button>
        </div>
      </Dialog>
    </>
  );
}
