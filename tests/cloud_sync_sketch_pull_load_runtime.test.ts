import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadCloudSketchProjectData,
  resolveCloudSketchPayloadFingerprint,
  resolveCloudSketchPullEligibility,
  resolveInitialCloudSketchCatchupDecision,
  shouldToastCloudSketchApplied,
} from '../esm/native/services/cloud_sync_sketch_pull_load.ts';

test('cloud sketch pull helpers normalize initial catchup, eligibility, and project-load result flow', () => {
  const fresh = resolveInitialCloudSketchCatchupDecision({
    isSite2: true,
    autoLoadEnabled: true,
    maxAgeHours: 12,
    rowUpdatedAt: '2026-03-27T10:00:00.000Z',
    nowMs: Date.parse('2026-03-27T11:00:00.000Z'),
  });
  assert.equal(fresh.shouldContinue, true);
  assert.equal(fresh.diagEvent, 'sketch:init-catchup:apply');
  assert.equal(fresh.diagPayload?.site, 'site2');

  const stale = resolveInitialCloudSketchCatchupDecision({
    isSite2: true,
    autoLoadEnabled: true,
    maxAgeHours: 1,
    rowUpdatedAt: '2026-03-27T08:00:00.000Z',
    nowMs: Date.parse('2026-03-27T11:00:00.000Z'),
  });
  assert.equal(stale.shouldContinue, false);
  assert.equal(stale.diagEvent, 'sketch:init-catchup:skip-stale');

  assert.deepEqual(
    resolveCloudSketchPullEligibility({
      parsed: { rev: 1, hash: 'abc', by: 'remote', sketch: { settings: {} } },
      localHash: 'abc',
      clientId: 'local',
    }),
    { shouldApply: false, reason: 'same-hash' }
  );

  assert.deepEqual(
    resolveCloudSketchPullEligibility({
      parsed: { rev: 1, hash: 'remote-hash', by: 'local', sketch: { settings: {} } },
      localHash: 'local-hash',
      clientId: 'local',
    }),
    { shouldApply: false, reason: 'same-client' }
  );

  assert.deepEqual(
    resolveCloudSketchPullEligibility({
      parsed: { rev: 1, hash: 'remote-hash', by: 'remote', sketch: null as any },
      localHash: 'local-hash',
      clientId: 'local',
    }),
    { shouldApply: false, reason: 'missing-sketch' }
  );

  assert.deepEqual(
    resolveCloudSketchPullEligibility({
      parsed: { rev: 1, hash: 'remote-hash', by: 'remote', sketch: { settings: {} } },
      localHash: 'local-hash',
      clientId: 'local',
    }),
    { shouldApply: true }
  );

  const app = {
    services: {
      projectIO: {
        loadProjectData(data: unknown, opts: unknown) {
          assert.deepEqual(data, { settings: { width: 100 } });
          assert.deepEqual(opts, { toast: false, meta: { source: 'cloudSketch.pull' } });
          return { ok: true, restoreGen: 5 };
        },
      },
    },
  } as any;
  assert.deepEqual(loadCloudSketchProjectData(app, { settings: { width: 100 } }), {
    ok: true,
    restoreGen: 5,
  });
  assert.equal(shouldToastCloudSketchApplied({ ok: true }), true);
  assert.equal(shouldToastCloudSketchApplied({ ok: true, pending: true }), false);
  assert.equal(shouldToastCloudSketchApplied({ ok: false, reason: 'invalid' }), false);
});

test('cloud sketch pull load preserves concrete project-loader failures', () => {
  const App = {
    services: {
      projectIO: {
        loadProjectData() {
          throw new Error('cloud sketch loader exploded');
        },
      },
    },
  } as any;

  assert.deepEqual(loadCloudSketchProjectData(App, { settings: { width: 120 } }), {
    ok: false,
    reason: 'error',
    message: 'cloud sketch loader exploded',
  });
});

test('cloud sketch payload fingerprint stays stable across key-order-only changes when remote hash is missing', () => {
  const first = resolveCloudSketchPayloadFingerprint({
    rev: 1,
    by: 'remote',
    sketch: {
      settings: { width: 120, height: 210 },
      modules: [{ id: 'm1', size: { h: 200, w: 60 } }],
    },
  } as any);

  const reordered = resolveCloudSketchPayloadFingerprint({
    rev: 1,
    by: 'remote',
    sketch: {
      modules: [{ size: { w: 60, h: 200 }, id: 'm1' }],
      settings: { height: 210, width: 120 },
    },
  } as any);

  assert.equal(first, reordered);
  assert.match(first, /^sketch:/);
});
