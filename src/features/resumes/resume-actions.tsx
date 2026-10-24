import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/primitives';
import { useWorkspace } from '@/app/workspace-context';
import { useUi } from '@/app/ui-store';
import { repository } from '@/services/storage/repository';
import type { ResumeVariant } from '@/domain/schemas';
import { discardPendingDrafts } from '@/features/editor/use-autosave';
interface ResumeForm {
  profileId: string;
  title: string;
  targetRole: string;
}
export function ResumeAction({ variant }: { variant?: ResumeVariant }) {
  const [open, setOpen] = useState(false);
  const { profiles } = useWorkspace();
  const { run, pending } = useUi();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResumeForm>();
  const submit = handleSubmit(async (values) => {
    const ok = await run(
      () =>
        variant
          ? repository.saveVariant(
              {
                ...variant,
                title: values.title,
                targetRole: values.targetRole,
              },
              variant.updatedAt,
            )
          : repository.createResume(
              values.profileId,
              values.title,
              values.targetRole,
            ),
      variant
        ? 'Resume details saved. A previous revision was retained.'
        : 'Resume created from your career profile.',
    );
    if (ok) setOpen(false);
  });
  return (
    <>
      <Button
        variant={variant ? 'outline' : 'default'}
        size={variant ? 'sm' : 'default'}
        disabled={!profiles.length}
        onClick={() => {
          reset({
            profileId: variant?.sourceProfileId ?? profiles[0]?.id ?? '',
            title: variant?.title ?? '',
            targetRole: variant?.targetRole ?? '',
          });
          setOpen(true);
        }}
      >
        {variant ? <Pencil size={14} /> : <Plus size={16} />}
        {variant ? 'Edit details' : 'Create resume'}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={
          variant
            ? 'Edit resume details'
            : 'Make room for your next opportunity'
        }
        description={
          variant
            ? 'These changes apply to this resume only.'
            : 'Choose a source profile and give this resume a purpose.'
        }
      >
        <form onSubmit={submit}>
          {!variant && (
            <Field
              label="Career profile"
              htmlFor="resume-profile"
              error={errors.profileId?.message}
            >
              <select
                id="resume-profile"
                {...register('profileId', { required: 'Choose a profile.' })}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.isDemo ? ' (sample)' : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field
            label="Resume title"
            htmlFor="resume-title"
            error={errors.title?.message}
          >
            <input
              id="resume-title"
              placeholder="e.g. Software engineering applications"
              aria-invalid={!!errors.title}
              {...register('title', {
                required: 'Add a resume title.',
                validate: (v) => !!v.trim() || 'Add a resume title.',
                maxLength: {
                  value: 200,
                  message: 'Use 200 characters or fewer.',
                },
                setValueAs: (v: string) => v.trim(),
              })}
            />
          </Field>
          <Field
            label="Target role (optional)"
            htmlFor="target-role"
            error={errors.targetRole?.message}
          >
            <input
              id="target-role"
              placeholder="e.g. Software Engineer"
              {...register('targetRole', {
                maxLength: {
                  value: 200,
                  message: 'Use 200 characters or fewer.',
                },
              })}
            />
          </Field>
          <p className="form-note">
            Open the editor to tailor content, choose a design, and download
            your PDF.
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
              {pending ? 'Saving…' : variant ? 'Save details' : 'Create resume'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
export function DeleteResume({ variant }: { variant: ResumeVariant }) {
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
        title="Delete this resume?"
        description={`“${variant.title}” and its revisions will be permanently removed. Your master career profile stays saved.`}
      >
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              if (
                await run(async () => {
                  await repository.deleteVariant(variant.id);
                  discardPendingDrafts([variant.id]);
                }, 'Resume deleted. Your career profile is still saved.')
              )
                setOpen(false);
            }}
          >
            Delete resume
          </Button>
        </div>
      </Dialog>
    </>
  );
}
