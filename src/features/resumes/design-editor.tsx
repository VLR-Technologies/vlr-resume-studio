import type { TemplateConfig } from '@/domain/schemas';
import { useState } from 'react';
import { templateNames } from '@/domain/editor';
import { SelectField, TextField } from '@/features/editor/fields';
function NumberControl({
  label,
  value,
  min,
  max,
  step,
  update,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  update: (v: number) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <TextField
      label={label}
      type="number"
      min={min}
      max={max}
      step={step}
      value={editing ?? String(value)}
      onChange={(raw) => {
        setEditing(raw);
        const number = Number(raw);
        if (
          raw !== '' &&
          Number.isFinite(number) &&
          number >= min &&
          number <= max
        )
          update(number);
      }}
      onBlur={() => {
        if (
          editing !== null &&
          editing !== '' &&
          Number.isFinite(Number(editing))
        )
          update(Math.min(max, Math.max(min, Number(editing))));
        setEditing(null);
      }}
    />
  );
}

export function DesignEditor({
  template: t,
  onChange,
}: {
  template: TemplateConfig;
  onChange: (t: TemplateConfig) => void;
}) {
  function number(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    update: (v: number) => void,
  ) {
    return (
      <NumberControl
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        update={update}
      />
    );
  }
  return (
    <div className="design-editor">
      <p className="eyebrow">MAKE IT YOURS</p>
      <h2>Design your resume</h2>
      <div className="template-picker">
        {(
          Object.entries(templateNames) as [
            TemplateConfig['templateId'],
            string,
          ][]
        ).map(([id, name]) => (
          <button
            key={id}
            className={t.templateId === id ? 'chosen' : ''}
            aria-pressed={t.templateId === id}
            onClick={() =>
              onChange({
                ...t,
                templateId: id,
                typography: id === 'academic' ? 'serif' : t.typography,
              })
            }
          >
            <span className={`template-mini mini-${id}`} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <strong>{name}</strong>
            <small>
              {
                {
                  classic: 'Clear, simple, application ready',
                  european: 'Formal, with a date-led history',
                  modern: 'A restrained accent & clean hierarchy',
                  academic: 'Research, appointments & publications',
                }[id]
              }
            </small>
          </button>
        ))}
      </div>
      <p className="form-note">
        All templates preserve your content. The European layout is inspired by
        common CV conventions; it is not an official Europass document.
      </p>
      <div className="field-grid">
        <SelectField
          label="Font family"
          value={t.typography}
          onChange={(typography) =>
            onChange({
              ...t,
              typography: typography as TemplateConfig['typography'],
            })
          }
          options={[
            { value: 'sans', label: 'Noto Sans' },
            { value: 'serif', label: 'Noto Serif' },
          ]}
        />
        <SelectField
          label="Header presentation"
          value={t.headerStyle}
          onChange={(headerStyle) =>
            onChange({
              ...t,
              headerStyle: headerStyle as TemplateConfig['headerStyle'],
            })
          }
          options={[
            { value: 'left', label: 'Left aligned' },
            { value: 'centered', label: 'Centered' },
          ]}
        />
        {number(
          'Body font size (pt)',
          t.bodyFontSize,
          8,
          16,
          0.5,
          (bodyFontSize) => onChange({ ...t, bodyFontSize }),
        )}
        {number(
          'Name font size (pt)',
          t.headingFontSize,
          12,
          30,
          1,
          (headingFontSize) => onChange({ ...t, headingFontSize }),
        )}
        {number('Line spacing', t.lineSpacing, 1, 2, 0.05, (lineSpacing) =>
          onChange({ ...t, lineSpacing }),
        )}
        {number(
          'Section spacing (mm)',
          t.sectionSpacing,
          2,
          20,
          1,
          (sectionSpacing) => onChange({ ...t, sectionSpacing }),
        )}
        <TextField
          label="Accent color"
          type="color"
          value={t.accentColor}
          onChange={(accentColor) => onChange({ ...t, accentColor })}
        />
      </div>
      <h3>A4 page margins</h3>
      <p className="form-note">
        210 × 297 mm. Margins are bounded from 8 to 40 mm.
      </p>
      <div className="field-grid">
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <div key={side}>
            {number(
              `${side[0]!.toUpperCase() + side.slice(1)} margin (mm)`,
              t.margins[side],
              8,
              40,
              1,
              (value) =>
                onChange({
                  ...t,
                  pageSize: 'A4',
                  margins: { ...t.margins, [side]: value },
                }),
            )}
          </div>
        ))}
      </div>
      <label className="check-field">
        <input
          type="checkbox"
          checked={t.layout.showDividers}
          onChange={(e) =>
            onChange({
              ...t,
              layout: { ...t.layout, showDividers: e.target.checked },
            })
          }
        />
        Section heading rules
      </label>
    </div>
  );
}
