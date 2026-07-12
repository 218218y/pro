import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';

import {
  createVerifyScriptCoverageMap,
  validateCloseoutTestGroupBindings,
} from '../tools/wp_refactor_closeout_audit_support.mjs';

const SCRIPT_ENTRIES = [
  ['test:browser-feedback-family-contracts', 'node --test tests/browser_feedback_family_contracts.test.js'],
  ['test:builder-surfaces', 'node --test tests/builder_surface_family_contracts.test.js'],
  ['verify:browser-feedback-family-core', 'node tools/wp_verify_lane.js browser-feedback-family-core'],
  ['verify:builder-surfaces', 'node tools/wp_verify_lane.js builder-surfaces'],
  ['verify:alias', 'npm run verify:builder-surfaces'],
  ['test:catalog-group', 'node tools/wp_test_group.mjs catalog-group'],
  ['verify:catalog-group', 'npm run test:catalog-group'],
];

test('refactor closeout audit expands verify-lane coverage through canonical lane plans and aliases', () => {
  const coverage = createVerifyScriptCoverageMap(SCRIPT_ENTRIES, {
    testGroupCatalog: {
      'catalog-group': {
        script: 'test:catalog-group',
        files: ['tests/catalog_family_contracts.test.js'],
      },
    },
  });

  const browserFeedback = coverage.get('verify:browser-feedback-family-core');
  assert.ok(browserFeedback);
  assert.ok(browserFeedback.scriptNames.has('test:browser-feedback-family-contracts'));
  assert.ok(browserFeedback.testRefs.has('tests/browser_feedback_family_contracts.test.js'));
  assert.ok(browserFeedback.basenames.has('browser_feedback_family_contracts'));

  const builder = coverage.get('verify:builder-surfaces');
  assert.ok(builder);
  assert.ok(builder.scriptNames.has('test:builder-surfaces'));
  assert.ok(builder.testRefs.has('tests/builder_surface_family_contracts.test.js'));
  assert.ok(builder.basenames.has('builder_surface_family_contracts'));

  const alias = coverage.get('verify:alias');
  assert.ok(alias);
  assert.ok(alias.scriptNames.has('verify:builder-surfaces'));
  assert.ok(alias.scriptNames.has('test:builder-surfaces'));
  assert.ok(alias.testRefs.has('tests/builder_surface_family_contracts.test.js'));
  assert.ok(alias.basenames.has('builder_surface_family_contracts'));

  const catalogGroup = coverage.get('verify:catalog-group');
  assert.ok(catalogGroup);
  assert.ok(catalogGroup.testGroupNames.has('catalog-group'));
  assert.ok(catalogGroup.testRefs.has('tests/catalog_family_contracts.test.js'));
  assert.ok(catalogGroup.basenames.has('catalog_family_contracts'));
});

test('closeout test-group bindings reject catalog drift and direct-file fallbacks', () => {
  const catalog = {
    canonical: { script: 'test:canonical', files: ['tests/canonical.test.js'] },
  };
  const valid = validateCloseoutTestGroupBindings({
    lanes: [
      {
        id: 'canonical-lane',
        testGroupId: 'canonical',
        command: 'npm',
        args: ['run', 'test:canonical'],
      },
    ],
    scriptEntries: [['test:canonical', 'node tools/wp_test_group.mjs canonical']],
    testGroupCatalog: catalog,
  });
  assert.deepEqual(valid, []);

  const invalid = validateCloseoutTestGroupBindings({
    lanes: [
      {
        id: 'broken-lane',
        testGroupId: 'canonical',
        command: 'node',
        args: ['--test', 'tests/canonical.test.js'],
      },
    ],
    scriptEntries: [['test:canonical', 'node --test tests/canonical.test.js']],
    testGroupCatalog: catalog,
  });
  assert.deepEqual(invalid.map(issue => issue.code).sort(), [
    'group-lane-has-direct-test-refs',
    'lane-command-mismatch',
    'package-script-binding-mismatch',
  ]);
});

test('modernization gate includes the closeout coverage audit', () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(packageJson.scripts['verify:refactor-modernization'], /npm run audit:refactor-closeout/);
});
