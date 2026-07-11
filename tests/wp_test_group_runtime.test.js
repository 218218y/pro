import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { readTestGroup, readTestGroupFiles } from '../tools/wp_test_group_catalog.mjs';
import { parseTestGroupArgs, resolveTestGroupPlan } from '../tools/wp_test_group.mjs';

test('test group catalog owns refactor-stage guard membership', () => {
  const group = readTestGroup('refactor-stage-guards');
  assert.equal(group.runner, 'node-test');
  assert.ok(group.files.length > 50);
  assert.equal(new Set(group.files).size, group.files.length);
  for (const file of group.files) assert.equal(fs.existsSync(file), true, `${file} should exist`);
});

test('test group reads return defensive copies', () => {
  const first = readTestGroupFiles('refactor-stage-guards');
  const second = readTestGroupFiles('refactor-stage-guards');
  first.pop();
  assert.notEqual(first.length, second.length);
});

test('test group runner validates args and missing files before spawning', () => {
  assert.deepEqual(parseTestGroupArgs(['refactor-stage-guards', '--print', '--dry-run']), {
    groupName: 'refactor-stage-guards',
    list: false,
    print: true,
    dryRun: true,
  });
  assert.throws(() => parseTestGroupArgs(['refactor-stage-guards', '--unknown']), /unknown test-group/);
  assert.throws(() => resolveTestGroupPlan({ groupName: 'missing' }), /unknown test group/);

  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-test-group-'));
  assert.throws(
    () => resolveTestGroupPlan({ projectRoot, groupName: 'refactor-stage-guards' }),
    /references missing file/
  );
});
