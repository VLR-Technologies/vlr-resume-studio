/* eslint-disable react-refresh/only-export-components -- This is a lazy document-generation module, not a hot-reloaded UI boundary. */
import {
  Document,
  Page,
  Text,
  View,
  Link,
  Font,
  pdf,
} from '@react-pdf/renderer';
import type { ResumeRenderModel, RenderEntry } from './model';

export function configurePdfFonts(base = '/fonts') {
  for (const family of ['NotoSans', 'NotoSerif'])
    Font.register({
      family,
      fonts: [
        { src: `${base}/${family}-Regular.ttf`, fontWeight: 400 },
        { src: `${base}/${family}-Bold.ttf`, fontWeight: 700 },
      ],
    });
  Font.registerHyphenationCallback((word) =>
    word.length > 32 ? (word.match(/.{1,24}/gu) ?? [word]) : [word],
  );
}
if (typeof window !== 'undefined') configurePdfFonts();
const mm = (value: number) => (value * 72) / 25.4;

export function ResumeDocument({ model }: { model: ResumeRenderModel }) {
  const t = model.template;
  const academic = t.templateId === 'academic';
  const european = t.templateId === 'european';
  const modern = t.templateId === 'modern';
  const accent = t.templateId === 'classic' ? '#20242a' : t.accentColor;
  const headingStyle = {
    fontSize: t.bodyFontSize + 1.5,
    fontWeight: 700,
    color: accent,
    marginBottom: 5,
    paddingBottom: t.layout.showDividers ? 3 : 0,
    borderBottomWidth: t.layout.showDividers ? (modern ? 1.5 : 0.5) : 0,
    borderBottomColor: accent,
  };
  const entryHeader = (entry: RenderEntry) => (
    <View
      minPresenceAhead={t.bodyFontSize * 3}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 9,
        marginBottom: 2,
      }}
    >
      {european && entry.date ? (
        <Text
          style={{
            width: mm(29),
            fontSize: t.bodyFontSize - 1,
            color: '#51565c',
          }}
        >
          {entry.date}
        </Text>
      ) : null}
      <View style={{ flexGrow: 1, flexShrink: 1 }}>
        <Text style={{ fontWeight: 700 }}>{entry.title}</Text>
        {entry.subtitle ? (
          <Text style={{ color: '#42484f', fontSize: t.bodyFontSize - 0.5 }}>
            {entry.subtitle}
          </Text>
        ) : null}
      </View>
      {!european && entry.date ? (
        <Text
          style={{
            maxWidth: '30%',
            fontSize: t.bodyFontSize - 1,
            textAlign: 'right',
            color: '#51565c',
          }}
        >
          {entry.date}
        </Text>
      ) : null}
    </View>
  );
  return (
    <Document
      title={model.title}
      author={model.identity.name || undefined}
      creator="VLR Resume Studio"
      language="en"
    >
      <Page
        size={t.pageSize === 'Letter' ? 'LETTER' : 'A4'}
        wrap
        style={{
          paddingTop: mm(t.margins.top),
          paddingRight: mm(t.margins.right),
          paddingBottom: mm(t.margins.bottom) + 9,
          paddingLeft: mm(t.margins.left),
          fontFamily: t.typography === 'serif' ? 'NotoSerif' : 'NotoSans',
          fontSize: t.bodyFontSize,
          lineHeight: t.lineSpacing,
          color: '#20242a',
        }}
      >
        <View
          style={{
            textAlign: t.headerStyle === 'centered' ? 'center' : 'left',
            marginBottom: mm(t.sectionSpacing),
            borderTopWidth: modern ? 4 : 0,
            borderTopColor: accent,
            paddingTop: modern ? 10 : 0,
          }}
          minPresenceAhead={80}
        >
          {european && (
            <Text
              style={{
                fontSize: 8,
                color: accent,
                letterSpacing: 1.5,
                marginBottom: 6,
              }}
            >
              CURRICULUM VITAE
            </Text>
          )}
          {model.identity.name && (
            <Text
              style={{
                fontSize: t.headingFontSize,
                lineHeight: 1.25,
                fontWeight: 700,
                color: accent,
              }}
            >
              {model.identity.name}
            </Text>
          )}
          {model.identity.headline && (
            <Text
              style={{
                fontSize: t.bodyFontSize + 1,
                lineHeight: 1.3,
                marginTop: 4,
              }}
            >
              {model.identity.headline}
            </Text>
          )}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent:
                t.headerStyle === 'centered' ? 'center' : 'flex-start',
              columnGap: 10,
              rowGap: 2,
              marginTop: 6,
              fontSize: t.bodyFontSize - 1,
            }}
          >
            {model.identity.email && (
              <Link
                style={{ color: '#42484f', textDecoration: 'none' }}
                src={`mailto:${model.identity.email}`}
              >
                {model.identity.email}
              </Link>
            )}
            {model.identity.phone && <Text>{model.identity.phone}</Text>}
            {model.identity.location && <Text>{model.identity.location}</Text>}
          </View>
        </View>
        {model.sections.map((section) => (
          <View key={section.id} style={{ marginBottom: mm(t.sectionSpacing) }}>
            <Text minPresenceAhead={t.bodyFontSize * 4} style={headingStyle}>
              {academic && section.id === 'work'
                ? 'Research & professional appointments'
                : section.title}
            </Text>
            {section.text && (
              <Text orphans={2} widows={2}>
                {section.text}
              </Text>
            )}
            {section.entries.map((entry) => (
              <View key={entry.id} style={{ marginBottom: 8 }}>
                {entryHeader(entry)}
                {entry.summary && (
                  <Text orphans={2} widows={2} style={{ marginBottom: 3 }}>
                    {entry.summary}
                  </Text>
                )}
                {entry.details && (
                  <Text style={{ marginBottom: 3 }}>{entry.details}</Text>
                )}
                {entry.url && (
                  <Link
                    src={entry.url}
                    style={{
                      color: accent,
                      fontSize: t.bodyFontSize - 1,
                      marginBottom: 3,
                    }}
                  >
                    {entry.url}
                  </Link>
                )}
                {entry.bullets.map((b) => (
                  <Text
                    key={b.id}
                    orphans={2}
                    widows={2}
                    style={{ paddingLeft: 8, marginBottom: 2 }}
                  >
                    • {b.text}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
// React PDF has a shared font/layout engine. Serialize jobs to avoid concurrent render corruption.
let queue: Promise<unknown> = Promise.resolve();
export function generatePdf(model: ResumeRenderModel): Promise<Blob> {
  const result = queue.then(() =>
    pdf(<ResumeDocument model={model} />).toBlob(),
  );
  queue = result.catch(() => undefined);
  return result;
}
