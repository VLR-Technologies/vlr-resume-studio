// Run after the final browser suite and independent PDF inspection.
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import console from 'node:console';
const unit = JSON.parse(
  await readFile('qa-artifacts/vitest-results.json', 'utf8'),
);
const result = JSON.parse(
  await readFile('qa-artifacts/playwright-results.json', 'utf8'),
);
const observations = [];
const cases = [];
function walk(suites, parents = []) {
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
        for (const attachment of last?.attachments ?? []) {
          if (
            ![
              'performance-observation',
              'template-output-comparison',
              'proof-canvas-budget',
              'viewport-checks',
            ].includes(attachment.name)
          )
            continue;
          const bytes = attachment.body
            ? Buffer.from(attachment.body, 'base64')
            : awaitReadUnsupported(attachment);
          if (bytes)
            observations.push({
              project: test.projectName,
              kind: attachment.name,
              data: JSON.parse(bytes.toString()),
            });
        }
      }
    }
    walk(suite.suites, [...parents, suite.title]);
  }
}
function awaitReadUnsupported(attachment) {
  throw new Error(
    `Expected inline JSON attachment: ${attachment.name} (${attachment.path})`,
  );
}
walk(result.suites);
const pdf = JSON.parse(
  await readFile(
    'qa-artifacts/inspection/independent-pdf-results.json',
    'utf8',
  ),
);
const summary = {
  recordedAt: new Date().toISOString(),
  testedSourceCommit:
    process.env.QA_TESTED_COMMIT ??
    execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
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
    source: 'qa-artifacts/vitest-results.json',
  },
  browser: { stats: result.stats, cases },
  independentPdf: pdf,
  observations,
};
await writeFile(
  'docs/qa/EVIDENCE_SUMMARY.json',
  JSON.stringify(summary, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      cases: cases.length,
      stats: result.stats,
      observations: observations.length,
      documents: pdf.documents,
      pages: pdf.pages,
    },
    null,
    2,
  ),
);
