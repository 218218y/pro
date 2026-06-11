import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuildPlan } from '../esm/native/builder/plan.ts';
import {
  readBuildInputFingerprintFromState,
  normalizeBuildInputFingerprintScalar,
} from '../esm/native/builder/build_input_fingerprint.ts';
import {
  createFallbackBuildPlan,
  createPendingPlanFromState,
} from '../esm/native/builder/scheduler_shared_records.ts';
import { readPendingSignature } from '../esm/native/builder/scheduler_debug_stats_signature_policy.ts';

function readSignature(next: any): unknown {
  return next?.build?.signature ?? null;
}

test('builder build input fingerprint runtime: canonical fingerprint is stable for repeated reads', () => {
  const state = {
    build: { signature: [2, 2] },
    ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
    config: {
      individualColors: { body: '#ffffff' },
      doorSpecialMap: { d1_full: 'mirror' },
    },
    mode: { primary: 'none', opts: {} },
    runtime: { sketchMode: false, globalClickMode: true, doorsOpen: false, hoverPartId: 'ignored-hover' },
  };

  assert.match(normalizeBuildInputFingerprintScalar({ a: 1 }), /^json:/);
  assert.equal(
    readBuildInputFingerprintFromState(state, readSignature),
    readBuildInputFingerprintFromState(state, readSignature)
  );
});

test('builder plan runtime: BuildPlan keeps module signature separate from build input fingerprint', () => {
  const baseState = {
    build: { signature: [2, 2] },
    ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
    config: { individualColors: { body: '#ffffff' } },
    mode: { primary: 'none', opts: {} },
    runtime: { sketchMode: false },
  };
  const changedState = {
    ...baseState,
    config: { individualColors: { body: '#111111' } },
  };

  const basePlan = createBuildPlan(baseState);
  const changedPlan = createBuildPlan(changedState);

  assert.deepEqual(basePlan.signature, [2, 2]);
  assert.deepEqual(changedPlan.signature, [2, 2]);
  assert.notEqual(basePlan.inputFingerprint, changedPlan.inputFingerprint);
});

test('builder scheduler runtime: pending/fallback plans carry the canonical fingerprint instead of re-reading mutable state', () => {
  const state = {
    build: { signature: 'sig:stable' },
    ui: {},
    config: { individualColors: { body: '#ffffff' } },
  } as any;

  const pendingPlan = createPendingPlanFromState(state) as any;
  const fallbackPlan = createFallbackBuildPlan(state) as any;

  assert.equal(pendingPlan.inputFingerprint, readPendingSignature(pendingPlan));
  assert.equal(fallbackPlan.inputFingerprint, readPendingSignature(fallbackPlan));

  state.config.individualColors.body = '#111111';

  assert.equal(
    readPendingSignature(pendingPlan),
    pendingPlan.inputFingerprint,
    'stored pending fingerprint must remain the request identity even if the state object is later mutated'
  );
  assert.notEqual(
    readBuildInputFingerprintFromState(state, readSignature),
    pendingPlan.inputFingerprint,
    'the mutated state would produce a different fingerprint if the scheduler re-read it'
  );
});
