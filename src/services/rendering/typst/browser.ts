import {
  createTypstCompiler,
  type TypstCompiler,
  type WorkerHost,
} from 'typst-wasm';
import { createWebWorker } from 'typst-wasm/worker/browser';
import workerUrl from 'typst-wasm/worker/web-worker?worker&url';
import coreUrl from 'typst-wasm/engine/engine.core.wasm?url';
import core2Url from 'typst-wasm/engine/engine.core2.wasm?url';
import core3Url from 'typst-wasm/engine/engine.core3.wasm?url';

export const COMPILER_VERSION = 'typst-wasm@1.0.0';
export async function createBrowserCompiler(
  onWorker?: (host: WorkerHost) => void,
  signal?: AbortSignal,
): Promise<TypstCompiler> {
  if (!globalThis.crossOriginIsolated)
    throw new Error(
      'Typst needs cross-origin isolation. Serve this app with the supplied COOP and COEP headers, then reload.',
    );
  // Initialize the worker only after the modules are ready. A worker load error
  // must reach an active init RPC rather than getting lost during WASM fetch.
  const modules = await Promise.all(
    [coreUrl, core2Url, core3Url].map((url) =>
      WebAssembly.compileStreaming(fetch(url, { signal })),
    ),
  );
  if (signal?.aborted)
    throw new DOMException('Compilation cancelled.', 'AbortError');
  const compiler = await createTypstCompiler({
    backend: 'worker',
    worker: () => {
      const host = createWebWorker(workerUrl);
      onWorker?.(host);
      return host;
    },
    coreModules: {
      'engine.core.wasm': modules[0]!,
      'engine.core2.wasm': modules[1]!,
      'engine.core3.wasm': modules[2]!,
    },
    // The virtual project is populated explicitly. Never resolve an external file,
    // URL or Universe package, even if a trusted template accidentally requests one.
    fileLoaders: [
      async () => {
        throw new Error('External Typst resources are disabled.');
      },
    ],
    fetch: async () => {
      throw new Error('Typst network access is disabled.');
    },
    packageCache: false,
    memoryPackageCacheCapacity: 0,
  });
  try {
    await compiler.addFonts(
      ...[
        'NotoSans-Regular.ttf',
        'NotoSans-Bold.ttf',
        'NotoSerif-Regular.ttf',
        'NotoSerif-Bold.ttf',
      ].map(async (name) => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}fonts/${name}`,
          { signal },
        );
        if (!response.ok) throw new Error(`Cannot load local font: ${name}`);
        return new Uint8Array(await response.arrayBuffer());
      }),
    );
    return compiler;
  } catch (error) {
    await compiler.dispose();
    throw error;
  }
}
