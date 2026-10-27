import { documentAccent } from '@/services/rendering/colors';
import type { TemplateConfig } from '@/domain/schemas';
import { useState } from 'react';
import { selectTemplate } from '@/domain/templates';
import { TemplateGallery } from './template-gallery';
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
      <TemplateGallery
        selected={t.templateId}
        onSelect={(id) => onChange(selectTemplate(t, id))}
      />
      <h3>Typography & details</h3>
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
      {t.templateId !== 'classic' && documentAccent(t) !== t.accentColor && (
        <p className="form-note">
          This accent is too light on white paper. Headings and links use dark
          ink for readability; your color setting is preserved.
        </p>
      )}
      <h3>Paper & margins</h3>
      <SelectField
        label="Paper size"
        value={t.pageSize}
        onChange={(pageSize) =>
          onChange({ ...t, pageSize: pageSize as TemplateConfig['pageSize'] })
        }
        options={[
          { value: 'A4', label: 'A4 · 210 × 297 mm' },
          { value: 'Letter', label: 'US Letter · 215.9 × 279.4 mm' },
        ]}
      />
      <p className="form-note">
        Margins are bounded from 8 to 40 mm. Layouts use their defined columns;
        legacy column metadata is preserved but is not a configurable column
        control.
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
