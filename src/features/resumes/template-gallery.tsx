import { useState } from 'react';
import { Check, ArrowUpRight } from 'lucide-react';
import {
  templateRegistry,
  templateCategories,
  type TemplateCategory,
} from '@/domain/templates';
import type { TemplateId } from '@/domain/template-ids';
export function TemplateGallery({
  selected,
  onSelect,
}: {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
}) {
  const [category, setCategory] = useState<TemplateCategory | 'All'>('All');
  return (
    <section className="template-gallery" aria-label="Template gallery">
      <div className="gallery-heading">
        <div>
          <p className="eyebrow">YOUR STORY, WELL PRESENTED</p>
          <h3>Find your format</h3>
        </div>
        <span>12 templates</span>
      </div>
      <p className="form-note">
        Choose a layout for your next opportunity. Each preview uses a fictional
        career profile.
      </p>
      <div
        className="gallery-filters"
        role="group"
        aria-label="Template categories"
      >
        {(['All', ...templateCategories] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="template-picker">
        {templateRegistry
          .filter((t) => category === 'All' || t.category === category)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              className={selected === t.id ? 'chosen' : ''}
              aria-pressed={selected === t.id}
              onClick={() => onSelect(t.id)}
            >
              <span className="template-art">
                <img
                  src={t.preview}
                  alt={`${t.name} PDF preview with fictional profile data`}
                  loading="lazy"
                  width="280"
                  height="396"
                />
                <span className="template-engine">
                  {t.engine === 'typst' ? 'Typst' : 'Original'}
                </span>
                {selected === t.id && (
                  <span className="template-selected">
                    <Check size={14} /> Selected
                  </span>
                )}
              </span>
              <span className="template-card-copy">
                <small className="template-category">{t.category}</small>
                <strong>{t.name}</strong>
                <small>{t.description}</small>
                <span className="template-recommendation">
                  {t.recommendations}
                </span>
                <span className="template-select">
                  {selected === t.id ? 'Selected template' : 'Select template'}
                  <ArrowUpRight size={14} />
                </span>
              </span>
            </button>
          ))}
      </div>
      <p className="form-note">
        All layouts keep your selected content and order. European designs
        follow common CV conventions; they are not official Europass documents.
        ATS acceptance depends on the receiving system.
      </p>
    </section>
  );
}
