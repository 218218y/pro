import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveBuilderBuildFollowThroughDecision,
  shouldRunStructuralRefreshFollowThrough,
} from '../esm/native/runtime/builder_service_access_build_request_runtime.ts';

test('builder request follow-through runtime: accepted immediate builds defer render follow-through when scheduler owns render', () => {
  const calls: Array<{ uiOverride: unknown; meta: any }> = [];
  const App: any = {
    services: {
      builder: {
        requestBuild(uiOverride: unknown, meta: any) {
          calls.push({ uiOverride, meta });
          return true;
        },
        __scheduler: { __esm_v1: true },
      },
    },
  };

  const decision = resolveBuilderBuildFollowThroughDecision(
    App,
    { source: 'builder:test', triggerRender: true },
    true
  );

  assert.deepEqual(decision, {
    requestedBuild: true,
    deferRenderFollowThrough: true,
  });
  assert.deepEqual(calls, [
    {
      uiOverride: null,
      meta: {
        source: 'builder:test',
        reason: 'builder:test',
        immediate: true,
        force: true,
      },
    },
  ]);
});

test('builder request follow-through runtime: structural refresh render gating stays off when render is deferred to the scheduler', () => {
  const decision = {
    requestedBuild: true,
    deferRenderFollowThrough: true,
  };

  assert.equal(
    shouldRunStructuralRefreshFollowThrough(
      { source: 'builder:test', triggerRender: true, updateShadows: true },
      decision
    ),
    false
  );

  assert.equal(
    shouldRunStructuralRefreshFollowThrough(
      { source: 'builder:test', triggerRender: true, updateShadows: true },
      { requestedBuild: true, deferRenderFollowThrough: false }
    ),
    true
  );
});
