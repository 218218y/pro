import test from 'node:test';
import assert from 'node:assert/strict';

import { createVerifyScriptCoverageMap } from '../tools/wp_refactor_closeout_audit_support.mjs';

const SCRIPT_ENTRIES = [
  ['test:browser-feedback-family-contracts', 'node --test tests/browser_feedback_family_contracts.test.js'],
  ['test:builder-surfaces', 'node --test tests/builder_surface_family_contracts.test.js'],
  ['verify:browser-feedback-family-core', 'node tools/wp_verify_lane.js browser-feedback-family-core'],
  ['verify:builder-surfaces', 'node tools/wp_verify_lane.js builder-surfaces'],
  ['verify:alias', 'npm run verify:builder-surfaces'],
];

test('refactor closeout audit expands verify-lane coverage through canonical lane plans and aliases', () => {
  const coverage = createVerifyScriptCoverageMap(SCRIPT_ENTRIES);

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
});
