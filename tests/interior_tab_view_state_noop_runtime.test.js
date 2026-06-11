import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInteriorViewStateControllerHarness,
  loadInteriorTabViewStateControllerModule,
} from './interior_tab_runtime_helpers.js';

test('[interior-view-state-controller] sketch shelf depth updaters preserve refs for semantic no-op', () => {
  const calls = [];
  const mod = loadInteriorTabViewStateControllerModule(calls);

  const prevDepth = { regular: '', glass: 27 };
  const prevDraft = { regular: '', glass: '27' };
  assert.equal(mod.patchInteriorSketchShelfDepthMap(prevDepth, 'glass', 27), prevDepth);
  assert.equal(mod.patchInteriorSketchShelfDepthDraftMap(prevDraft, 'glass', '27'), prevDraft);
  assert.equal(
    JSON.stringify(mod.patchInteriorSketchShelfDepthMap(prevDepth, 'glass', 30)),
    JSON.stringify({ regular: '', glass: 30 })
  );
  assert.equal(
    JSON.stringify(mod.patchInteriorSketchShelfDepthDraftMap(prevDraft, 'glass', '30')),
    JSON.stringify({ regular: '', glass: '30' })
  );
});

test('[interior-view-state-controller] repeated sketch shelf sync reuses previous maps when nothing changed', () => {
  const harness = createInteriorViewStateControllerHarness({
    shelfDepthByVariant: { regular: '', glass: 27 },
    shelfDepthDraftByVariant: { regular: '', glass: '27' },
  });

  harness.controller.syncSketchShelfDepthState(true, 'sketch_shelf:glass@27');
  const firstDepth = harness.getShelfDepthByVariant();
  const firstDraft = harness.getShelfDepthDraftByVariant();

  harness.controller.syncSketchShelfDepthState(true, 'sketch_shelf:glass@27');
  assert.equal(harness.getShelfDepthByVariant(), firstDepth);
  assert.equal(harness.getShelfDepthDraftByVariant(), firstDraft);

  harness.controller.syncSketchShelfDepthState(true, 'sketch_shelf:glass@32');
  assert.notEqual(harness.getShelfDepthByVariant(), firstDepth);
  assert.notEqual(harness.getShelfDepthDraftByVariant(), firstDraft);
});
