import type { ResumeRenderModel } from './model';
export interface CompiledDocument {
  model: ResumeRenderModel;
  blob: Blob;
}
import { getTemplate } from '@/domain/templates';
let queue: Promise<unknown> = Promise.resolve();
// One successful byte buffer shared by proof and download. No unbounded model cache.
let cached: { key: string; blob: Blob } | undefined;
const pending = new Map<string, Promise<Blob>>();
export function renderKey(model: ResumeRenderModel) {
  const definition = getTemplate(model.template.templateId);
  return JSON.stringify([definition.engine, definition.version, model]);
}
export function renderPdf(
  model: ResumeRenderModel,
  signal?: AbortSignal,
): Promise<Blob> {
  const key = renderKey(model);
  if (signal?.aborted)
    return Promise.reject(
      new DOMException('Rendering cancelled.', 'AbortError'),
    );
  if (cached?.key === key) return Promise.resolve(cached.blob);
  const existing = pending.get(key);
  // A proof has its own cancellation lifetime. Exports may reuse only a successful
  // result, rather than inheriting a proof's pending cancellation signal.
  if (existing && !signal) return existing.catch(() => renderPdf(model));
  const job = queue.then(async () => {
    if (signal?.aborted)
      throw new DOMException('Rendering cancelled.', 'AbortError');
    if (cached?.key === key) return cached.blob;
    const blob =
      getTemplate(model.template.templateId).engine === 'typst'
        ? await (await import('./typst/compile')).compileTypst(model, signal)
        : await (await import('./pdf')).generatePdf(model);
    if (signal?.aborted)
      throw new DOMException('Rendering cancelled.', 'AbortError');
    cached = { key, blob };
    return blob;
  });
  queue = job.catch(() => {});
  pending.set(key, job);
  void job
    .finally(() => {
      if (pending.get(key) === job) pending.delete(key);
    })
    .catch(() => {});
  return job;
}
