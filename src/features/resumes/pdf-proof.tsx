import { useEffect, useRef, useState } from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { generatePdf } from '@/services/rendering/pdf';
import type { ResumeRenderModel } from '@/services/rendering/model';
import { Button } from '@/components/ui/button';
GlobalWorkerOptions.workerSrc = workerUrl;
const PAGE_WINDOW = 5;
export default function PdfProof({ model }: { model: ResumeRenderModel }) {
  const container = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<{
    model: ResumeRenderModel;
    document: PDFDocumentProxy;
  }>();
  const [firstPage, setFirstPage] = useState(1);
  const [drawn, setDrawn] = useState<{
    document: PDFDocumentProxy;
    firstPage: number;
  }>();
  const [failure, setFailure] = useState<{
    model: ResumeRenderModel;
    message: string;
  }>();
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const blob = await generatePdf(model);
          if (cancelled) return;
          const task = getDocument({
            data: new Uint8Array(await blob.arrayBuffer()),
          });
          dispose = () => {
            void task.destroy();
          };
          const document = await task.promise;
          if (cancelled) {
            dispose();
            return;
          }
          setFirstPage(1);
          setLoaded({ model, document });
          setFailure(undefined);
        } catch (error) {
          if (!cancelled)
            setFailure({
              model,
              message: error instanceof Error ? error.message : 'Try again.',
            });
        }
      })();
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      dispose?.();
    };
  }, [model]);
  useEffect(() => {
    if (!loaded || loaded.model !== model) return;
    let cancelled = false;
    const document = loaded.document;
    void (async () => {
      try {
        container.current?.replaceChildren();
        for (
          let i = firstPage;
          i <= Math.min(document.numPages, firstPage + PAGE_WINDOW - 1);
          i++
        ) {
          const page = await document.getPage(i);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1.4 });
          const canvas = window.document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute('role', 'img');
          canvas.setAttribute(
            'aria-label',
            `PDF page ${i} of ${document.numPages}. Use Download PDF for selectable text.`,
          );
          container.current?.append(canvas);
          await page.render({ canvas, viewport }).promise;
          page.cleanup();
        }
        if (!cancelled) setDrawn({ document, firstPage });
      } catch (error) {
        if (!cancelled)
          setFailure({
            model,
            message: error instanceof Error ? error.message : 'Try again.',
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, firstPage, model]);
  const current = loaded?.model === model ? loaded.document : undefined;
  const ready =
    current && drawn?.document === current && drawn.firstPage === firstPage;
  const status =
    failure?.model === model
      ? `Preview failed: ${failure.message}`
      : ready
        ? `${current.numPages} page${current.numPages === 1 ? '' : 's'} · exact PDF layout`
        : 'Rendering PDF proof…';
  return (
    <div className="pdf-proof">
      <p role="status">{status}</p>
      {current && current.numPages > PAGE_WINDOW && (
        <div className="proof-pagination">
          <Button
            size="sm"
            variant="outline"
            aria-label="Previous PDF pages"
            disabled={!ready || firstPage === 1}
            onClick={() => setFirstPage(Math.max(1, firstPage - PAGE_WINDOW))}
          >
            Previous
          </Button>
          <span>
            Pages {firstPage}–
            {Math.min(current.numPages, firstPage + PAGE_WINDOW - 1)} of{' '}
            {current.numPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            aria-label="Next PDF pages"
            disabled={!ready || firstPage + PAGE_WINDOW > current.numPages}
            onClick={() => setFirstPage(firstPage + PAGE_WINDOW)}
          >
            Next
          </Button>
        </div>
      )}
      <div ref={container} />
    </div>
  );
}
