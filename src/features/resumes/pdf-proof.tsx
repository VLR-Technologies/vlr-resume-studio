import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { generatePdf } from '@/services/rendering/pdf';
import type { ResumeRenderModel } from '@/services/rendering/model';
GlobalWorkerOptions.workerSrc = workerUrl;
export default function PdfProof({ model }: { model: ResumeRenderModel }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Rendering pages…');
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
          if (cancelled || !container.current) {
            dispose();
            return;
          }
          container.current.replaceChildren();
          for (let i = 1; i <= document.numPages; i++) {
            if (cancelled) return;
            const page = await document.getPage(i);
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
          }
          setStatus(
            `${document.numPages} page${document.numPages === 1 ? '' : 's'} · exact PDF layout`,
          );
        } catch (error) {
          if (!cancelled)
            setStatus(
              `Preview failed: ${error instanceof Error ? error.message : 'Try again.'}`,
            );
        }
      })();
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      dispose?.();
    };
  }, [model]);
  return (
    <div className="pdf-proof">
      <p role="status">{status}</p>
      <div ref={container} />
    </div>
  );
}
