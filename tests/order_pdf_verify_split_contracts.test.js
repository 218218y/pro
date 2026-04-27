import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
const scripts = packageJson.scripts || {};

test('order-pdf surfaces script fans out into smaller verification batches', () => {
  const required = [
    'test:order-pdf-surfaces:overlay-core',
    'test:order-pdf-surfaces:pdf-render',
    'test:order-pdf-surfaces:sketch',
    'test:order-pdf-surfaces:export-overlay',
    'test:order-pdf-surfaces:export-builders',
    'test:order-pdf-surfaces:export-capture',
    'test:order-pdf-surfaces:export-text',
  ];
  for (const name of required) {
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
