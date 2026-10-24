import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type { CSSProperties } from 'react';
import type { ResumeRenderModel } from '@/services/rendering/model';
import { Button } from '@/components/ui/button';
const PdfProof = lazy(() => import('./pdf-proof'));

export function ResumePreview({ model }: { model: ResumeRenderModel }) {
  const [proof, setProof] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const t = model.template;
  const pageWidth = t.pageSize === 'Letter' ? 215.9 : 210;
  useEffect(() => {
    if (!panel.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setScale(
          Math.min(
            1,
            Math.max(
              0.2,
              (entry.contentRect.width - 32) / ((pageWidth * 96) / 25.4),
            ),
          ),
        );
    });
    observer.observe(panel.current);
    return () => observer.disconnect();
  }, [pageWidth]);
  return (
    <div className="preview-panel" ref={panel}>
      <div className="preview-toolbar">
        <span>
          {proof ? 'Paginated PDF proof' : 'Live document'} · {t.pageSize}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setProof(!proof)}>
          {proof ? 'Live view' : 'PDF proof'}
        </Button>
      </div>
      {proof ? (
        <Suspense fallback={<p role="status">Loading PDF tools…</p>}>
          <PdfProof model={model} />
        </Suspense>
      ) : (
        <div className="paper-viewport">
          <article
            aria-label="Live resume preview"
            className={`resume-paper template-${t.templateId}`}
            style={
              {
                zoom: scale,
                width: `${pageWidth}mm`,
                minHeight: t.pageSize === 'Letter' ? '279.4mm' : '297mm',
                '--resume-font':
                  t.typography === 'serif' ? 'NotoSerif' : 'NotoSans',
                '--body-size': `${t.bodyFontSize}pt`,
                '--heading-size': `${t.headingFontSize}pt`,
                '--line-spacing': t.lineSpacing,
                '--section-spacing': `${t.sectionSpacing}mm`,
                '--accent':
                  t.templateId === 'classic' ? '#20242a' : t.accentColor,
                padding: `${t.margins.top}mm ${t.margins.right}mm ${t.margins.bottom}mm ${t.margins.left}mm`,
                textAlign: 'left',
              } as CSSProperties
            }
          >
            <header
              style={{
                textAlign: t.headerStyle === 'centered' ? 'center' : 'left',
              }}
            >
              {t.templateId === 'european' && (
                <p className="cv-label">CURRICULUM VITAE</p>
              )}
              {model.identity.name && <h2>{model.identity.name}</h2>}
              {model.identity.headline && (
                <p className="paper-headline">{model.identity.headline}</p>
              )}
              <div
                className="paper-contact"
                style={{
                  justifyContent:
                    t.headerStyle === 'centered' ? 'center' : 'flex-start',
                }}
              >
                {model.identity.email && (
                  <a href={`mailto:${model.identity.email}`}>
                    {model.identity.email}
                  </a>
                )}
                {model.identity.phone && <span>{model.identity.phone}</span>}
                {model.identity.location && (
                  <span>{model.identity.location}</span>
                )}
              </div>
            </header>
            {!model.sections.length && !model.identity.name && (
              <p className="paper-empty">
                Your resume starts here. Add personal details and select career
                entries to see your document.
              </p>
            )}
            {model.sections.map((s) => (
              <section key={s.id}>
                <h3
                  style={{
                    borderBottom: t.layout.showDividers ? undefined : 'none',
                  }}
                >
                  {t.templateId === 'academic' && s.id === 'work'
                    ? 'Research & professional appointments'
                    : s.title}
                </h3>
                {s.text && <p>{s.text}</p>}
                {s.entries.map((e) => (
                  <div className="paper-entry" key={e.id}>
                    <div className="paper-entry-heading">
                      <div>
                        <h4>{e.title}</h4>
                        {e.subtitle && <p>{e.subtitle}</p>}
                      </div>
                      {e.date && <time>{e.date}</time>}
                    </div>
                    {e.summary && <p>{e.summary}</p>}
                    {e.details && <p>{e.details}</p>}
                    {e.url && (
                      <a href={e.url} target="_blank" rel="noreferrer">
                        {e.url}
                      </a>
                    )}
                    {!!e.bullets.length && (
                      <ul>
                        {e.bullets.map((b) => (
                          <li key={b.id}>{b.text}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </article>
        </div>
      )}
      <p className="preview-note">
        Live view updates as you type. PDF proof shows exact page breaks.
      </p>
    </div>
  );
}
