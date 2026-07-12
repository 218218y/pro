import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { readTestGroup } from '../tools/wp_test_group_catalog.mjs';

const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
const scripts = packageJson.scripts || {};

test('order-pdf surfaces script fans out through catalog-backed and direct verification batches', () => {
  const catalogBacked = 'test:order-pdf-surfaces:overlay-core';
  const directBatches = [
    'test:order-pdf-surfaces:pdf-render',
    'test:order-pdf-surfaces:sketch',
    'test:order-pdf-surfaces:export-overlay',
    'test:order-pdf-surfaces:export-builders',
    'test:order-pdf-surfaces:export-capture',
    'test:order-pdf-surfaces:export-text',
  ];
  const required = [catalogBacked, ...directBatches];

  assert.equal(scripts[catalogBacked], 'node tools/wp_test_group.mjs order-pdf-overlay-core');
  const overlayGroup = readTestGroup('order-pdf-overlay-core');
  assert.equal(overlayGroup?.runner, 'tsx-test');
  assert.equal(overlayGroup?.kind, 'ui-runtime-integration');
  assert.deepEqual(overlayGroup?.owners, ['ui/order-pdf']);
  assert.ok(overlayGroup?.files.length > 0, 'overlay core group should own concrete test files');

  for (const name of directBatches) {
    assert.equal(typeof scripts[name], 'string', `${name} should exist`);
    assert.match(scripts[name], /wp_run_tsx_tests\.mjs/);
  }
  const aggregate = scripts['test:order-pdf-surfaces'];
  assert.equal(typeof aggregate, 'string');
  for (const name of required) {
    assert.match(aggregate, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('playwright preflight script is exposed through package scripts', () => {
  assert.equal(scripts['e2e:smoke:preflight'], 'node tools/wp_playwright_preflight.js');
});
