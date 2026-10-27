import { createBrowserCompiler } from './browser';
import type { TypstCompiler, WorkerHost } from 'typst-wasm';
import type { ResumeRenderModel } from '../model';
import { typstProject } from './adapter';
const abortError = () =>
  new DOMException('Compilation cancelled.', 'AbortError');
/** A compiler owns one worker and one virtual project, disposed after every job. */
export async function compileTypst(
  model: ResumeRenderModel,
  signal?: AbortSignal,
): Promise<Blob> {
  const project = typstProject(model);
  const lifetime = new AbortController();
  let compiler: TypstCompiler | undefined;
  let host: WorkerHost | undefined;
  let rejectStop: (error: Error) => void = () => {};
  const stopped = new Promise<never>((_resolve, reject) => {
    rejectStop = reject;
  });
  const abort = () => {
    lifetime.abort();
    void host?.terminate();
    rejectStop(abortError());
  };
  const timer = setTimeout(() => {
    lifetime.abort();
    void host?.terminate();
    rejectStop(
      new Error(
        'Typst compilation exceeded 60 seconds. Try fewer selected entries.',
      ),
    );
  }, 60_000);
  signal?.addEventListener('abort', abort, { once: true });
  try {
    if (signal?.aborted) throw abortError();
    return await Promise.race([
      stopped,
      (async () => {
        compiler = await createBrowserCompiler((worker) => {
          host = worker;
          if (lifetime.signal.aborted) void host.terminate();
        }, lifetime.signal);
        if (lifetime.signal.aborted) throw abortError();
        await compiler.addSource('main.typ', project.source);
        await compiler.addFile('resume.json', project.data);
        const result = await compiler.compile({
          main: 'main.typ',
          format: 'pdf',
        });
        if (lifetime.signal.aborted) throw abortError();
        if (result.output.length > 25 * 1024 * 1024)
          throw new Error(
            'The PDF exceeds the 25 MiB output limit. Reduce selected content.',
          );
        return new Blob([result.output.slice() as Uint8Array<ArrayBuffer>], {
          type: 'application/pdf',
        });
      })(),
    ]);
  } finally {
    lifetime.abort();
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    if (compiler) await compiler.dispose();
    else void host?.terminate();
  }
}
