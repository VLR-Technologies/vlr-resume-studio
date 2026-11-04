import { documentAccent } from '@/services/rendering/colors';
import type { TemplateConfig } from '@/domain/schemas';
import { useState } from 'react';
import { selectTemplate } from '@/domain/templates';
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

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="design-slider">
      <span>
        {label}
        <output>
          {Number(value.toFixed(2))}
          {suffix}
        </output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function DesignEditor({
  template: t,
  onChange,
}: {
  template: TemplateConfig;
  onChange: (t: TemplateConfig) => void;
}) {
  const colors = [
    '#245b4b',
    '#173954',
    '#373345',
    '#1f2937',
    '#925846',
    '#647662',
    '#336d90',
    '#8b4170',
  ];
  return (
    <div className="design-editor">
      <div className="panel-heading">
        <p className="dashboard-kicker">A FEW FINISHING TOUCHES</p>
        <h2>Design</h2>
        <p>Small details. A strong first impression.</p>
      </div>
      <section className="design-card">
        <h3>Typography</h3>
        <div className="font-choices" role="group" aria-label="Font family">
          {(['sans', 'serif'] as const).map((font) => (
            <button
              key={font}
              aria-pressed={t.typography === font}
              className={font}
              onClick={() => onChange({ ...t, typography: font })}
            >
              <strong>Aa</strong>
              <span>{font === 'sans' ? 'Noto Sans' : 'Noto Serif'}</span>
            </button>
          ))}
        </div>
        <Slider
          label="Body font size (pt)"
          value={t.bodyFontSize}
          min={8}
          max={16}
          step={0.5}
          suffix=" pt"
          onChange={(bodyFontSize) => onChange({ ...t, bodyFontSize })}
        />
      </section>
      <section className="design-card">
        <h3>Theme color</h3>
        <div className="color-choices">
          {colors.map((color) => (
            <button
              key={color}
              aria-label={`Use color ${color}`}
              aria-pressed={t.accentColor === color}
              style={{ background: color }}
              onClick={() => onChange({ ...t, accentColor: color })}
            >
              {t.accentColor === color ? '✓' : ''}
            </button>
          ))}
          <label className="custom-color" title="Custom color">
            <input
              aria-label="Accent color"
              type="color"
              value={t.accentColor}
              onChange={(e) => onChange({ ...t, accentColor: e.target.value })}
            />
          </label>
        </div>
      </section>
      <section className="design-card">
        <h3>Layout & columns</h3>
        <div className="layout-choices">
          {(
            [
              { id: 'classic', label: 'Single column', shape: 'single' },
              { id: 'european', label: 'Date column', shape: 'date' },
              {
                id: 'typst-modern-executive',
                label: 'Label column',
                shape: 'label',
              },
            ] as const
          ).map((layout) => (
            <button
              key={layout.id}
              aria-pressed={t.templateId === layout.id}
              onClick={() => onChange(selectTemplate(t, layout.id))}
            >
              <span className={`layout-sketch layout-${layout.shape}`}>
                <i />
                <i />
                <i />
              </span>
              <span>{layout.label}</span>
            </button>
          ))}
        </div>
        <p className="form-note">
          Choose a layout above, or explore all 12 templates.
        </p>
      </section>
      <section className="design-card">
        <h3>Spacing & margins</h3>
        <Slider
          label="Line spacing"
          value={t.lineSpacing}
          min={1}
          max={2}
          step={0.05}
          onChange={(lineSpacing) => onChange({ ...t, lineSpacing })}
        />
        <Slider
          label="Section spacing (mm)"
          value={t.sectionSpacing}
          min={2}
          max={20}
          suffix=" mm"
          onChange={(sectionSpacing) => onChange({ ...t, sectionSpacing })}
        />
        <Slider
          label="Page margins"
          value={t.margins.top}
          min={8}
          max={40}
          suffix=" mm"
          onChange={(margin) =>
            onChange({
              ...t,
              margins: {
                top: margin,
                bottom: margin,
                left: margin,
                right: margin,
              },
            })
          }
        />
      </section>
      <details className="advanced-design">
        <summary>Advanced Design</summary>
        <div className="field-grid">
          <SelectField
            label="Header presentation"
            value={t.headerStyle}
            onChange={(value) =>
              onChange({
                ...t,
                headerStyle: value as TemplateConfig['headerStyle'],
              })
            }
            options={[
              { value: 'left', label: 'Left aligned' },
              { value: 'centered', label: 'Centered' },
            ]}
          />
          <SelectField
            label="Paper size"
            value={t.pageSize}
            onChange={(value) =>
              onChange({ ...t, pageSize: value as TemplateConfig['pageSize'] })
            }
            options={[
              { value: 'A4', label: 'A4' },
              { value: 'Letter', label: 'US Letter' },
            ]}
          />
          <NumberControl
            label="Name font size (pt)"
            value={t.headingFontSize}
            min={12}
            max={30}
            step={1}
            update={(headingFontSize) => onChange({ ...t, headingFontSize })}
          />
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <NumberControl
              key={side}
              label={`${side[0]!.toUpperCase() + side.slice(1)} margin (mm)`}
              value={t.margins[side]}
              min={8}
              max={40}
              step={1}
              update={(value) =>
                onChange({ ...t, margins: { ...t.margins, [side]: value } })
              }
            />
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
        {t.templateId !== 'classic' && documentAccent(t) !== t.accentColor && (
          <p className="form-note">
            This color is too light on white paper. Dark ink keeps headings
            readable.
          </p>
        )}
      </details>
    </div>
  );
}
