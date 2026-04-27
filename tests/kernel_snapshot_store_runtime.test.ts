import test from 'node:test';
import assert from 'node:assert/strict';

import { createKernelSnapshotStoreSystem } from '../esm/native/kernel/kernel_snapshot_store_system.ts';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown, fallback: UnknownRecord = {}): UnknownRecord {
  return isRecord(value) ? value : fallback;
}

function asRecordOrNull(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

test('kernel snapshot store normalizes touch/sync/persist meta through canonical store-facing shape', () => {
  const touchCalls: UnknownRecord[] = [];
  const commitCalls: Array<{ ui: UnknownRecord; meta: UnknownRecord; config?: UnknownRecord }> = [];
  const dirtyCalls: Array<{ value: boolean; meta: UnknownRecord }> = [];
  const app: UnknownRecord = {
    store: {
      state: {
        ui: {
          width: 120,
          height: 210,
          depth: 60,
          doors: 4,
          raw: { width: 120, height: 210, depth: 60, doors: 4 },
        },
        runtime: {},
        mode: { primary: 'none', opts: {} },
      },
      getState() {
        return this.state;
      },
      patch() {
        return true;
      },
      setDirty(value: boolean, meta: UnknownRecord) {
        dirtyCalls.push({ value, meta });
      },
    },
  };

  const system = createKernelSnapshotStoreSystem({
    App: app as never,
    stateKernel: {
      captureConfig: () => ({ wardrobeType: 'hinged' }),
    } as never,
    asRecord,
    asRecordOrNull,
    isRecord,
    reportKernelError: () => true,
    reportNonFatal: () => {},
    setStoreUiSnapshot: (ui, meta, config) => {
      commitCalls.push({ ui, meta, config });
      return true;
    },
    touchStore: meta => {
      touchCalls.push(meta);
      return true;
    },
  });

  system.touch({ silent: true, reason: 'manual-touch' });
  assert.deepEqual(touchCalls[0], {
    source: 'touch',
    immediate: false,
    noBuild: false,
    noAutosave: false,
    noPersist: false,
    noHistory: false,
    noCapture: false,
    force: false,
    forceBuild: false,
    silent: true,
    uiOnly: false,
    reason: 'manual-touch',
  });

  system.syncStore({ override: { notesEnabled: true }, reason: 'sync-it', silent: true });
  assert.equal(commitCalls.length, 1);
  assert.equal(commitCalls[0].meta.source, 'syncStore');
  assert.equal(commitCalls[0].meta.reason, 'sync-it');
  assert.equal(commitCalls[0].meta.silent, true);
  assert.equal(commitCalls[0].ui.notesEnabled, true);

  system.persist({ noPersist: true, noCapture: true, reason: 'persist-check' });
  assert.equal(touchCalls.length, 2);
  assert.equal(touchCalls[1].source, 'persist');
  assert.equal(touchCalls[1].noBuild, true);
  assert.equal(touchCalls[1].reason, 'persist-check');
  assert.equal(dirtyCalls.length, 0);
});

test('kernel snapshot store skips unchanged snapshot commits while still allowing forced build-only commits', () => {
  const commitCalls: Array<{ ui: UnknownRecord; meta: UnknownRecord; config?: UnknownRecord }> = [];
  const buildCalls: UnknownRecord[] = [];
  const autosaveCalls: string[] = [];
  const app: UnknownRecord = {
    store: {
      state: {
        ui: {
          width: 120,
          height: 210,
          depth: 60,
          doors: 4,
          raw: { width: 120, height: 210, depth: 60, doors: 4 },
          __snapshot: true,
          __capturedAt: 111,
        },
        config: {
          wardrobeType: 'hinged',
          savedColors: [{ id: 'oak', name: 'Oak' }],
          colorSwatchesOrder: ['oak'],
        },
        runtime: {},
        mode: { primary: 'none', opts: {} },
      },
      getState() {
        return this.state;
      },
      patch() {
        return true;
      },
      setDirty() {
        return true;
      },
    },
    services: {
      builder: {
        requestBuild: (_uiOverride: unknown, meta: UnknownRecord) => {
          buildCalls.push(meta);
        },
      },
      autosave: {
        schedule: () => {
          autosaveCalls.push('scheduled');
        },
      },
    },
  };

  const system = createKernelSnapshotStoreSystem({
    App: app as never,
    stateKernel: {
      captureConfig: () => ({
        wardrobeType: 'hinged',
        savedColors: [{ id: 'oak', name: 'Oak' }],
        colorSwatchesOrder: ['oak'],
      }),
    } as never,
    asRecord,
    asRecordOrNull,
    isRecord,
    reportKernelError: () => true,
    reportNonFatal: () => {},
    setStoreUiSnapshot: (ui, meta, config) => {
      commitCalls.push({ ui, meta, config });
      return true;
    },
    touchStore: () => true,
  });

  system.commitFromSnapshot(
    { width: 120, raw: { width: 120, height: 210, depth: 60, doors: 4 } },
    { source: 'noop' }
  );
  assert.equal(commitCalls.length, 0);
  assert.equal(buildCalls.length, 0);
  assert.equal(autosaveCalls.length, 0);

  system.commitFromSnapshot(
    { width: 120, raw: { width: 120, height: 210, depth: 60, doors: 4 } },
    { source: 'noop-force', forceBuild: true }
  );
  assert.equal(commitCalls.length, 0);
  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0].reason, 'noop-force');
  assert.equal(buildCalls[0].force, true);
  assert.equal(autosaveCalls.length, 0);
});

test('kernel snapshot store detaches nested incoming snapshot branches before persisting', () => {
  const commitCalls: Array<{ ui: UnknownRecord; meta: UnknownRecord; config?: UnknownRecord }> = [];
  const incoming = {
    raw: {
      width: 120,
      dims: { width: 120, height: 210 },
    },
    notes: {
      panels: [{ id: 'a', open: true }],
    },
  };
  const app: UnknownRecord = {
    store: {
      state: {
        ui: {
          width: 100,
          height: 200,
          depth: 60,
          doors: 4,
          raw: { width: 100, height: 200, depth: 60, doors: 4 },
          __snapshot: true,
          __capturedAt: 50,
        },
        config: { wardrobeType: 'hinged' },
        runtime: {},
        mode: { primary: 'none', opts: {} },
      },
      getState() {
        return this.state;
      },
      patch() {
        return true;
      },
      setDirty() {
        return true;
      },
    },
  };

  const system = createKernelSnapshotStoreSystem({
    App: app as never,
    stateKernel: {
      captureConfig: () => ({ wardrobeType: 'hinged' }),
    } as never,
    asRecord,
    asRecordOrNull,
    isRecord,
    reportKernelError: () => true,
    reportNonFatal: () => {},
    setStoreUiSnapshot: (ui, meta, config) => {
      commitCalls.push({ ui, meta, config });
      return true;
    },
    touchStore: () => true,
  });

  system.commitFromSnapshot(incoming, { source: 'detach-check' });
  assert.equal(commitCalls.length, 1);
  assert.equal((commitCalls[0].ui.raw as UnknownRecord).width, 120);
  assert.deepEqual((commitCalls[0].ui.notes as UnknownRecord).panels, [{ id: 'a', open: true }]);

  ((incoming.raw as UnknownRecord).dims as UnknownRecord).width = 999;
  (((incoming.notes as UnknownRecord).panels as unknown[])?.[0] as UnknownRecord).open = false;

  assert.equal(((commitCalls[0].ui.raw as UnknownRecord).dims as UnknownRecord).width, 120);
  assert.deepEqual((commitCalls[0].ui.notes as UnknownRecord).panels, [{ id: 'a', open: true }]);
});
