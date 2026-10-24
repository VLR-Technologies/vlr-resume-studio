import { useId } from 'react';
import type { ComponentProps } from 'react';
import { Field } from '@/components/ui/primitives';
import type { MasterCareerProfile } from '@/domain/schemas';

export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 4,
  ...rest
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
} & Omit<ComponentProps<'input'>, 'onChange' | 'value'>) {
  const id = useId();
  return (
    <Field htmlFor={id} label={label}>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          maxLength={10000}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...rest}
          id={id}
          maxLength={rest.maxLength ?? 200}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function IdentityFields({
  identity,
  onChange,
}: {
  identity: MasterCareerProfile['identity'];
  onChange: (identity: MasterCareerProfile['identity']) => void;
}) {
  return (
    <div className="field-grid">
      {(['name', 'headline', 'email', 'phone', 'location'] as const).map(
        (key) => (
          <TextField
            key={key}
            label={
              {
                name: 'Full name',
                headline: 'Professional headline',
                email: 'Email',
                phone: 'Phone',
                location: 'Location',
              }[key]
            }
            value={identity[key]}
            type={key === 'email' ? 'email' : 'text'}
            onChange={(value) =>
              onChange({ ...identity, [key]: value || undefined })
            }
          />
        ),
      )}
    </div>
  );
}
export function SaveStatus({
  status,
  errors,
  retry,
}: {
  status: string;
  errors: string[];
  retry: () => void;
}) {
  return (
    <div className="save-feedback">
      <span
        role="status"
        className={errors.length ? 'save-error' : 'save-status'}
      >
        <span className="small-dot" />
        {status}
      </span>
      {errors.length > 0 && (
        <div role="alert" className="validation-errors">
          <strong>
            Your edits are kept here. Correct the fields or retry.
          </strong>
          <ul>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
          <button type="button" onClick={retry}>
            Retry save
          </button>
        </div>
      )}
    </div>
  );
}
