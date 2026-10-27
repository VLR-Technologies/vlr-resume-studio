import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { TypstCompiler, WorkerHost } from 'typst-wasm';
import { createBrowserCompiler } from '@/services/rendering/typst/browser';
import { compileTypst } from '@/services/rendering/typst/compile';
import { buildRenderModel } from '@/services/rendering/model';
import { selectTemplate } from '@/domain/templates';
import { qaWorkspace } from './fixtures/qa-profiles';
vi.mock('@/services/rendering/typst/browser', () => ({
  createBrowserCompiler: vi.fn(),
}));
const factory = vi.mocked(createBrowserCompiler);
function model() {
  const { profile, variant } = qaWorkspace();
  variant.template = selectTemplate(variant.template, 'typst-ats-minimal');
  return buildRenderModel(profile, variant);
}
let compiler: TypstCompiler, host: WorkerHost, signal: AbortSignal | undefined;
beforeEach(() => {
  host = { listen: vi.fn(), postMessage: vi.fn(), terminate: vi.fn() };
  compiler = {
    addSource: vi.fn().mockResolvedValue(undefined),
    addFile: vi.fn().mockResolvedValue(undefined),
    compile: vi
      .fn()
      .mockResolvedValue({ output: new TextEncoder().encode('%PDF-test') }),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as TypstCompiler;
  factory.mockImplementation(async (onWorker, lifetime) => {
    signal = lifetime;
    onWorker?.(host);
    return compiler;
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
it('releases a successful job and closes its fetch lifetime', async () => {
  const result = await compileTypst(model());
  expect(result.size).toBe(9);
  expect(compiler.dispose).toHaveBeenCalledOnce();
  expect(signal!.aborted).toBe(true);
});
it('aborts active worker work without publishing a superseded document', async () => {
  vi.mocked(compiler.compile).mockImplementation(() => new Promise(() => {}));
  const controller = new AbortController();
  const result = compileTypst(model(), controller.signal);
  const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(compiler.compile).toHaveBeenCalledOnce());
  controller.abort();
  await rejected;
  expect(signal!.aborted).toBe(true);
  expect(host.terminate).toHaveBeenCalled();
  expect(compiler.dispose).toHaveBeenCalledOnce();
});
it('aborts initialization fetches on timeout, before any late worker can be created', async () => {
  vi.useFakeTimers();
  factory.mockImplementation((_worker, lifetime) => {
    signal = lifetime;
    return new Promise(() => {});
  });
  const result = compileTypst(model());
  const rejected = expect(result).rejects.toThrow('exceeded 60 seconds');
  await vi.advanceTimersByTimeAsync(60000);
  await rejected;
  expect(signal!.aborted).toBe(true);
});
