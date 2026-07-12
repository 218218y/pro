import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { readTestGroup } from '../tools/wp_test_group_catalog.mjs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('sketch verify split delegates stable batch scripts to canonical groups', () => {
  const scripts = pkg.scripts;
  assert.equal(
    scripts['test:sketch-surfaces'],
    'npm run test:sketch-surfaces:manual-hover && npm run test:sketch-surfaces:box-hover && npm run test:sketch-surfaces:free-boxes && npm run test:sketch-surfaces:render-visuals'
  );
  const groups = [
    ['sketch-manual-hover', 'test:sketch-surfaces:manual-hover'],
    ['sketch-box-hover', 'test:sketch-surfaces:box-hover'],
    ['sketch-free-boxes', 'test:sketch-surfaces:free-boxes'],
    ['sketch-render-visuals', 'test:sketch-surfaces:render-visuals'],
  ];
  for (const [groupName, scriptName] of groups) {
    assert.equal(scripts[scriptName], `node tools/wp_test_group.mjs ${groupName}`);
    assert.equal(readTestGroup(groupName)?.runner, 'tsx-test');
  }
});
