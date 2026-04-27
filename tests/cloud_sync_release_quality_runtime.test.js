import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPullCoalescer } from '../dist/esm/native/services/cloud_sync_coalescer.js';
import {
  buildRuntimeStatusSnapshotKey,
  cloneRuntimeStatus,
} from '../dist/esm/native/services/cloud_sync_support.js';

async function flushMicrotasks(times = 6) {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
}

function createTimerHarness() {
  let nextId = 1;
  const timers = new Map();

  const setTimeoutFn = (cb, ms = 0) => {
    const id = nextId++;
    timers.set(id, { id, ms: Number(ms) || 0, cb, active: true });
    return id;
  };

  const clearTimeoutFn = id => {
    const rec = timers.get(Number(id));
    if (rec) rec.active = false;
  };

  const runNext = () => {
    const active = [...timers.values()].filter(t => t.active).sort((a, b) => a.ms - b.ms || a.id - b.id);
    if (!active.length) return false;
    const rec = active[0];
    rec.active = false;
    rec.cb();
    return true;
  };

  return { setTimeoutFn, clearTimeoutFn, runNext };
}

test('cloud sync runtime status snapshot key stays stable for equal statuses and changes for meaningful updates', () => {
  const base = {
    room: 'public::sketch',
    clientId: 'client_1',
    instanceId: 'instance_1',
    realtime: { enabled: true, mode: 'broadcast', state: 'subscribed', channel: 'wp:public::sketch' },
    polling: { active: false, intervalMs: 5000, reason: '' },
    lastPullAt: 100,
    lastPushAt: 200,
    lastRealtimeEventAt: 300,
    lastError: '',
    diagEnabled: false,
  };

  const same = cloneRuntimeStatus(base);
  const changed = cloneRuntimeStatus(base);
  changed.lastPullAt = 101;

  assert.equal(buildRuntimeStatusSnapshotKey(base), buildRuntimeStatusSnapshotKey(same));
  assert.notEqual(buildRuntimeStatusSnapshotKey(base), buildRuntimeStatusSnapshotKey(changed));
});

test('cloud sync pull coalescer suppresses repeated coalesced diagnostics inside cooldown and reports suppression summary later', async () => {
  const timers = createTimerHarness();
  const runs = [];
  const diags = [];
  const errors = [];

  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;

  try {
    const coalescer = createCloudSyncPullCoalescer({
      scope: 'rt',
      run: () => {
        runs.push('run');
      },
      debounceMs: 0,
      minGapMs: 0,
      maxDelayMs: 0,
      diagCooldownMs: 1000,
      isDisposed: () => false,
      isSuppressed: () => false,
      isMainPushInFlight: () => false,
      setTimeoutFn: timers.setTimeoutFn,
      clearTimeoutFn: timers.clearTimeoutFn,
      reportNonFatal: op => errors.push(op),
      diag: (event, payload) => diags.push({ event, payload }),
    });

    coalescer.trigger('a');
    coalescer.trigger('b');
    assert.equal(timers.runNext(), true);
    await flushMicrotasks();

    assert.equal(runs.length, 1);
    assert.equal(diags.length, 1);
    assert.deepEqual(diags[0], {
      event: 'pull:coalesced:run',
      payload: { scope: 'rt', count: 2, reason: 'a|b' },
    });

    now = 1200;
    coalescer.trigger('c');
    coalescer.trigger('d');
    assert.equal(timers.runNext(), true);
    await flushMicrotasks();

    assert.equal(runs.length, 2);
    assert.equal(diags.length, 1);

    now = 2400;
    coalescer.trigger('e');
    coalescer.trigger('f');
    assert.equal(timers.runNext(), true);
    await flushMicrotasks();

    assert.equal(runs.length, 3);
    assert.equal(diags.length, 2);
    assert.deepEqual(diags[1], {
      event: 'pull:coalesced:run',
      payload: { scope: 'rt', count: 2, reason: 'e|f', suppressedRuns: 1 },
    });
    assert.deepEqual(errors, []);
  } finally {
    Date.now = originalNow;
  }
});
