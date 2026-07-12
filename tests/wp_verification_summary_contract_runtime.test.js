import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

import { buildCanonicalVerificationSummary } from '../tools/wp_verification_summary_contract.mjs';

const require = createRequire(import.meta.url);
const {
  REPORT_JSON_PATH,
  buildMarkdownReport,
  createCloseoutPayload,
} = require('../tools/wp_verify_closeout_support.cjs');

function createProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-verification-summary-'));
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"fixture"}\n');
  fs.writeFileSync(path.join(root, 'tools', 'fixture.js'), 'export const value = 1;\n');
  fs.writeFileSync(path.join(root, 'tests', 'fixture.test.js'), 'export const value = 1;\n');
  return root;
}

test('verification summary contract derives markdown from one validated JSON payload', () => {
  const root = createProject();
  const payload = createCloseoutPayload({
    projectRoot: root,
    workspace: root,
    generatedAt: '2026-07-12T11:00:00.000Z',
    runId: 'summary-run-001',
    meta: { profiles: ['control-plane'] },
    results: [],
    requestedLaneIds: [],
  });
  fs.writeFileSync(path.join(root, REPORT_JSON_PATH), `${JSON.stringify(payload, null, 2)}\n`);

  const result = buildCanonicalVerificationSummary(root);
  assert.deepEqual(result.payload, payload);
  assert.equal(result.markdown, buildMarkdownReport(payload));
  assert.match(result.markdown, /source_digest/);
  assert.match(result.markdown, /lane_catalog_digest/);
});

test('verification summary contract refuses to canonize a stale report', () => {
  const root = createProject();
  const payload = createCloseoutPayload({
    projectRoot: root,
    runId: 'summary-run-002',
    results: [],
    requestedLaneIds: [],
  });
  fs.writeFileSync(path.join(root, REPORT_JSON_PATH), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'tools', 'fixture.js'), 'export const value = 2;\n');

  assert.throws(() => buildCanonicalVerificationSummary(root), /source digest is stale/);
});
