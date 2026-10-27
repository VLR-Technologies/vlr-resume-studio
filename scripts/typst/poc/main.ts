import { createBrowserCompiler } from '../../../src/services/rendering/typst/browser';
try {
  const timings = [];
  let bytes = new Uint8Array();
  // Repeated compiler creation catches worker-cache/isolation failures that a
  // single cold compiler does not exercise in WebKit.
  for (let attempt = 0; attempt < 3; attempt++) {
    const start = performance.now();
    const compiler = await createBrowserCompiler();
    const startup = performance.now() - start;
    try {
      await compiler.addSource(
        'main.typ',
        '#set text(font: "Noto Sans")\n= Fictional résumé\nMara Weiß — García — Élodie\n#link("https://example.org")[Portfolio]',
      );
      const result = await compiler.compile({
        main: 'main.typ',
        format: 'pdf',
      });
      bytes = result.output.slice();
      timings.push({
        startup,
        total: performance.now() - start,
        bytes: bytes.length,
      });
    } finally {
      await compiler.dispose();
    }
  }
  document.querySelector('#status')!.textContent = JSON.stringify({
    timings,
    magic: new TextDecoder().decode(bytes.slice(0, 5)),
  });
  (globalThis as unknown as { poc: unknown }).poc = {
    bytes: Array.from(bytes),
    startup: timings[0]!.startup,
    total: timings[0]!.total,
    repeated: timings,
  };
} catch (error) {
  document.querySelector('#status')!.textContent = String(error);
}
