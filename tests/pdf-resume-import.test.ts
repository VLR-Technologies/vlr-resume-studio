// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pdfMocks = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('pdfjs-dist', () => ({
  getDocument: pdfMocks.getDocument,
  GlobalWorkerOptions: { workerSrc: '' },
}));

import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import {
  extractPdfText,
  importPdfResume,
  parseResumeText,
} from '@/services/interoperability/pdf-resume-import';

function textItem(str: string, x: number, y: number) {
  return {
    str,
    transform: [1, 0, 0, 1, x, y],
    width: str.length * 5,
    height: 10,
  };
}
function page(items: unknown[]) {
  return {
    view: [0, 0, 600, 800],
    getTextContent: async () => ({ items }),
  };
}
function mockDocument(pages: ReturnType<typeof page>[]) {
  const document = {
    numPages: pages.length,
    getPage: async (number: number) => pages[number - 1],
  };
  pdfMocks.getDocument.mockReturnValue({
    promise: Promise.resolve(document),
    destroy: vi.fn().mockResolvedValue(undefined),
  });
}
const pdfBlob = () => new Blob(['%PDF-1.7\nlocal test PDF']);

describe('PDF resume text extraction and parsing', () => {
  beforeEach(() => {
    vi.mocked(getDocument).mockReset();
    GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  });

  it('extracts selectable text across pages and both columns', async () => {
    mockDocument([
      page([
        textItem('Jordan Lee', 40, 760),
        textItem('Software Engineer', 40, 740),
        textItem('jordan@example.com', 40, 720),
        textItem('Location: Berlin, Germany', 40, 700),
        textItem('Work Experience', 40, 670),
        textItem('Senior Engineer', 40, 640),
        textItem('2021 – Present', 40, 620),
        textItem('Example GmbH', 340, 640),
        textItem('• Improved service reliability', 340, 620),
        textItem('• Built APIs for customers', 340, 600),
        textItem('Delivered platform updates', 340, 580),
        textItem('Collaborated with teams', 340, 560),
      ]),
      page([
        textItem('Education', 40, 760),
        textItem('MSc Computer Science', 40, 730),
        textItem('North University', 40, 710),
        textItem('Skills', 40, 680),
        textItem('TypeScript, Python, SQL', 40, 650),
      ]),
    ]);
    const parsed = await importPdfResume(pdfBlob());
    expect(parsed.profile.identity.name).toBe('Jordan Lee');
    expect(parsed.profile.identity.email).toBe('jordan@example.com');
    expect(parsed.profile.work[0]?.title).toBe('Senior Engineer');
    expect(parsed.profile.work[0]?.organization).toBe('Example GmbH');
    expect(parsed.profile.work[0]?.bullets).toHaveLength(2);
    expect(parsed.profile.education[0]?.title).toContain('MSc');
    expect(parsed.profile.skills[0]?.keywords).toContain('TypeScript');
  });

  it('normalizes European headings and common date ranges without inventing dates', () => {
    const parsed = parseResumeText(
      [
        'Lena Fischer',
        'Produktmanagerin',
        'lena@example.de',
        'Berufserfahrung',
        'Produktmanagerin | Beispiel GmbH',
        '01/2022 – heute',
        '• Einführung eines neuen Dashboards',
        'Ausbildung',
        'MSc Informatik',
        'Technische Universität Berlin | 2018 – 2020',
        'Kenntnisse',
        'SQL, Python, Moderation',
        'Soft Skills',
        'Communication, Facilitation',
        'References',
        'Available on request',
      ].join('\n'),
    );
    expect(parsed.profile.identity.name).toBe('Lena Fischer');
    expect(parsed.profile.work[0]?.period).toMatchObject({
      start: '2022-01',
      ongoing: true,
    });
    expect(parsed.profile.skills[0]?.keywords).toContain('Moderation');
    expect(parsed.profile.skills[1]).toMatchObject({
      category: 'professional',
      keywords: ['Communication', 'Facilitation'],
    });
    expect(parsed.warnings.join(' ')).toContain('References');
    expect(() => parseResumeText('x'.repeat(20))).toThrow(
      /readable text|resume/i,
    );
  });

  it('reports empty, corrupt, and oversized input clearly', async () => {
    await expect(extractPdfText(new Blob([]))).rejects.toThrow(/empty/i);
    await expect(extractPdfText(new Blob(['not a pdf']))).rejects.toThrow(
      /header/i,
    );
    await expect(
      extractPdfText(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)])),
    ).rejects.toThrow(/5 MiB/i);
  });

  it('reports image-only PDFs as unsupported and password-protected PDFs clearly', async () => {
    mockDocument([page([])]);
    await expect(extractPdfText(pdfBlob())).rejects.toThrow(/OCR/i);
    pdfMocks.getDocument.mockReturnValue({
      promise: Promise.reject(
        Object.assign(new Error('Password required'), {
          name: 'PasswordException',
        }),
      ),
      destroy: vi.fn().mockResolvedValue(undefined),
    });
    await expect(extractPdfText(pdfBlob())).rejects.toThrow(
      /password-protected/i,
    );
  });
});
