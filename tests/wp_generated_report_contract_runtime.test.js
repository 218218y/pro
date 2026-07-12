import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  GENERATED_REPORT_CATALOG,
  compareGeneratedArtifactPair,
  selectGeneratedReports,
} from '../tools/wp_generated_report_contract.mjs';

test('generated report catalog owns every checked-in audit pair', () => {
  assert.deepEqual(
    GENERATED_REPORT_CATALOG.map(report => report.id),
    [
      'verification-summary',
      'script-duplicates',
      'css-style',
      'features-public-api',
      'legacy-fallbacks',
      'test-groups',
      'test-portfolio',
    ]
  );
  for (const report of GENERATED_REPORT_CATALOG) {
    assert.equal(fs.existsSync(report.json), true, `${report.json} should exist`);
    assert.equal(fs.existsSync(report.markdown), true, `${report.markdown} should exist`);
  }
});

test('generated report selection rejects unknown ids and preserves catalog order', () => {
  assert.deepEqual(
    selectGeneratedReports(['test-portfolio', 'css-style']).map(report => report.id),
    ['css-style', 'test-portfolio']
  );
  assert.throws(() => selectGeneratedReports(['missing']), /unknown report id/);
});

test('generated report comparison ignores timestamps but catches semantic drift', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-generated-report-test-'));
  const expectedJson = path.join(root, 'expected.json');
  const actualJson = path.join(root, 'actual.json');
  const expectedMarkdown = path.join(root, 'expected.md');
  const actualMarkdown = path.join(root, 'actual.md');

  fs.writeFileSync(expectedJson, JSON.stringify({ generatedAt: 'one', summary: { count: 2 } }));
  fs.writeFileSync(actualJson, JSON.stringify({ generatedAt: 'two', summary: { count: 2 } }));
  fs.writeFileSync(expectedMarkdown, '# Report\n\nGenerated at: one\n\nCount: 2\n');
  fs.writeFileSync(actualMarkdown, '# Report\n\nGenerated at: two\n\nCount: 2\n');

  assert.deepEqual(
    compareGeneratedArtifactPair({
      projectRoot: root,
      expectedJson,
      expectedMarkdown,
      actualJson,
      actualMarkdown,
    }),
    []
  );

  fs.writeFileSync(actualJson, JSON.stringify({ generatedAt: 'two', summary: { count: 3 } }));
  assert.deepEqual(
    compareGeneratedArtifactPair({
      projectRoot: root,
      expectedJson,
      expectedMarkdown,
      actualJson,
      actualMarkdown,
    }),
    [{ file: 'actual.json', reason: 'stale' }]
  );
});
