import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { readTestGroup } from '../tools/wp_test_group_catalog.mjs';

const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
const scripts = packageJson.scripts || {};

test('order-pdf surfaces script fans out exclusively through canonical test groups', () => {
  const groups = [
    ['test:order-pdf-surfaces:overlay-core', 'order-pdf-overlay-core'],
    ['test:order-pdf-surfaces:pdf-render', 'order-pdf-pdf-render'],
    ['test:order-pdf-surfaces:sketch', 'order-pdf-sketch'],
    ['test:order-pdf-surfaces:export-overlay', 'order-pdf-export-overlay'],
    ['test:order-pdf-surfaces:export-builders', 'order-pdf-export-builders'],
    ['test:order-pdf-surfaces:export-capture', 'order-pdf-export-capture'],
    ['test:order-pdf-surfaces:export-text', 'order-pdf-export-text'],
  ];

  for (const [scriptName, groupName] of groups) {
    assert.equal(scripts[scriptName], `node tools/wp_test_group.mjs ${groupName}`);
    const group = readTestGroup(groupName);
    assert.ok(group, `${groupName} should exist in the canonical catalog`);
    assert.equal(group.runner, 'tsx-test');
    assert.equal(group.environment, 'tsx');
    assert.ok(group.owners.length > 0, `${groupName} should declare an owner`);
    assert.ok(
      group.owners.every(owner => owner.includes('order-pdf')),
      `${groupName} owners should stay within the order-pdf boundary`
    );
    assert.ok(group.files.length > 0, `${groupName} should own concrete test files`);
  }

  const aggregate = scripts['test:order-pdf-surfaces'];
  assert.equal(typeof aggregate, 'string');
  for (const [scriptName] of groups) {
    assert.match(aggregate, new RegExp(scriptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(aggregate, /wp_run_tsx_tests\.mjs/);
});

test('playwright preflight script is exposed through package scripts', () => {
  assert.equal(scripts['e2e:smoke:preflight'], 'node tools/wp_playwright_preflight.js');
});
