import { documentAccent } from '@/services/rendering/colors';
import type { TemplateConfig } from '@/domain/schemas';
import { useState, type CSSProperties } from 'react';
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { StudioHeading } from '@/components/ui/studio-heading';
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
        style={
          {
            '--range-progress': `${((value - min) / (max - min)) * 100}%`,
          } as CSSProperties
        }
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
      <StudioHeading
        title="Design"
        description="Make every detail feel like you."
      />
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
              <strong className="font-specimen" aria-hidden="true">
                Aa<span>Bb</span>
              </strong>
              {t.typography === font && (
                <Check className="choice-check" size={15} aria-hidden="true" />
              )}
              <span>{font === 'sans' ? 'Noto Sans' : 'Noto Serif'}</span>
              <small>
                {font === 'sans'
                  ? 'Clean & contemporary'
                  : 'Classic & considered'}
              </small>
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
        <div className="color-choices" role="group" aria-label="Theme swatches">
          {colors.map((color) => (
            <button
              key={color}
              aria-label={`Use color ${color}`}
              aria-pressed={t.accentColor === color}
              style={{ background: color }}
              onClick={() => onChange({ ...t, accentColor: color })}
            >
              {t.accentColor === color && (
                <Check size={17} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        <label className="custom-color">
          <span>Custom color</span>
          <span className="custom-color-value">
            <span aria-hidden="true">{t.accentColor.toUpperCase()}</span>
            <input
              aria-label="Accent color"
              type="color"
              value={t.accentColor}
              onChange={(e) => onChange({ ...t, accentColor: e.target.value })}
            />
          </span>
        </label>
      </section>
      <section className="design-card">
        <h3>Page layout</h3>
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
              <LayoutSketch shape={layout.shape} />
              {t.templateId === layout.id && (
                <Check className="choice-check" size={14} aria-hidden="true" />
              )}
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
        <summary>
          <SlidersHorizontal size={17} aria-hidden="true" />
          <span>Advanced Design</span>
          <ChevronDown size={17} aria-hidden="true" />
        </summary>
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

function LayoutSketch({ shape }: { shape: 'single' | 'date' | 'label' }) {
  return (
    <svg
      className="layout-sketch"
      viewBox="0 0 84 100"
      fill="none"
      aria-hidden="true"
    >
      <rect
        className="layout-paper"
        x="1"
        y="1"
        width="82"
        height="98"
        rx="4"
      />
      <path className="layout-ink" d="M12 16h34" strokeWidth="4" />
      <path d="M12 24h49" strokeWidth="2" />
      {[38, 60, 82].map((y) => (
        <g key={y}>
          {shape === 'single' ? (
            <>
              <path className="layout-ink" d={`M12 ${y}h22`} strokeWidth="3" />
              <path d={`M12 ${y + 7}h59m-59 5h45`} strokeWidth="2" />
            </>
          ) : (
            <>
              <path
                className={shape === 'label' ? 'layout-ink' : ''}
                d={`M12 ${y}h${shape === 'date' ? 10 : 16}`}
                strokeWidth="3"
              />
              <path className="layout-ink" d={`M36 ${y}h33`} strokeWidth="3" />
              <path d={`M36 ${y + 7}h33m-33 5h26`} strokeWidth="2" />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}
