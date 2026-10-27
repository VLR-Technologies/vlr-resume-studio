// Run after npm test, test:e2e, the compiler POC and independent PDF inspection.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import console from 'node:console';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const unit = await readJson('qa-artifacts/stage-2-vitest-results.json');
const browser = await readJson('qa-artifacts/playwright-results.json');
const pdf = await readJson(
  'qa-artifacts/typst-inspection/independent-results.json',
);
const poc = await readJson('qa-artifacts/typst-poc/results.json');
const cases = [],
  observations = [];
function walk(suites) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const last = test.results.at(-1);
        cases.push({
          file: spec.file,
          title: spec.title,
          project: test.projectName,
          status: test.status,
          outcome: last?.status,
          durationMs: last?.duration,
        });
        for (const a of last?.attachments ?? []) {
          if (a.name === 'typst-performance')
            observations.push({
              project: test.projectName,
              data: JSON.parse(Buffer.from(a.body, 'base64').toString()),
            });
        }
      }
    }
    walk(suite.suites);
  }
}
walk(browser.suites);
async function filesAt(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = `${root}/${entry.name}`;
    files.push(...(entry.isDirectory() ? await filesAt(path) : [path]));
  }
  return files;
}
const files = [
  ...(await filesAt('src')),
  ...(await filesAt('tests')),
  ...(await filesAt('e2e')),
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'playwright.config.ts',
  'vercel.json',
  'public/_headers',
];
const hash = createHash('sha256');
for (const path of files.sort()) {
  hash.update(path);
  hash.update(await readFile(path));
}
const summary = {
  recordedAt: new Date().toISOString(),
  baseCommit: 'e8437c50057b3f3f481f15232edf7c6b3a6faeda',
  applicationFingerprint: {
    algorithm: 'sha256',
    value: hash.digest('hex'),
    scope:
      'Sorted path names and bytes in src/, tests/, e2e/, package.json, package-lock.json, vite.config.ts, playwright.config.ts, vercel.json, public/_headers',
  },
  environment: {
    platform: process.platform,
    node: process.version,
    browserRunner: '@playwright/test 1.64.1',
    productionOrigin: 'http://127.0.0.1:4173',
  },
  unitIntegrationPdf: {
    passed: unit.numPassedTests,
    failed: unit.numFailedTests,
    skipped: unit.numPendingTests,
  },
  browser: { stats: browser.stats, cases },
  compilerPoc: poc,
  independentTypstPdf: pdf,
  observations,
};
await writeFile(
  'docs/typst/EVIDENCE_SUMMARY.json',
  JSON.stringify(summary, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      unit: summary.unitIntegrationPdf,
      browser: browser.stats,
      pdf: { documents: pdf.documents, pages: pdf.pages },
      observations: observations.length,
    },
    null,
    2,
  ),
);
