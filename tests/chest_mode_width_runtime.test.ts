import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeBuildDimsAndSyncRuntime } from '../esm/native/builder/state_sanitize_pipeline.ts';
import { flushDimensionRuntimeSync } from '../esm/native/runtime/dimension_sync_coalescer.ts';
import type { AppContainer, UnknownRecord } from '../types/index.ts';

type RuntimePatchCall = {
  patch: UnknownRecord;
  meta: UnknownRecord;
};

function recordCopy(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? { ...(value as UnknownRecord) } : {};
}

function createRuntimeHarness() {
  const patches: RuntimePatchCall[] = [];
  const callbacks = new Map<number, () => void>();
  const builder: UnknownRecord = {};
  let nextTimerId = 1;
  const app = {
    deps: {
      browser: {
        setTimeout(callback: () => void) {
          const id = nextTimerId++;
          callbacks.set(id, callback);
          return id;
        },
        clearTimeout(id?: number) {
          if (typeof id === 'number') callbacks.delete(id);
        },
      },
    },
    services: { builder },
    actions: {
      runtime: {
        patch(patch: unknown, meta: unknown) {
          patches.push({ patch: recordCopy(patch), meta: recordCopy(meta) });
        },
      },
    },
  };
  return {
    App: app as unknown as AppContainer,
    builder,
    callbacks,
    patches,
  };
}

test('chest mode keeps non-zero width even though doors count is zero', () => {
  const dims = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      isChestMode: true,
      raw: {
        width: 50,
        height: 50,
        depth: 40,
        doors: 0,
        chestDrawersCount: 2,
      },
    },
    cfg: { wardrobeType: 'hinged' },
  });

  assert.equal(dims.skipBuild, false);
  assert.equal(dims.widthCm, 50);
  assert.equal(dims.heightCm, 50);
  assert.equal(dims.depthCm, 40);
  assert.equal(dims.doorsCount, 0);
  assert.equal(dims.chestDrawersCount, 2);
});

test('single-door hinged wardrobe accepts 20cm while multi-door minimum remains 40cm', () => {
  const singleDoor = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      raw: { width: 20, height: 240, depth: 55, doors: 1, chestDrawersCount: 4 },
    },
    cfg: { wardrobeType: 'hinged' },
  });
  assert.equal(singleDoor.skipBuild, false);
  assert.equal(singleDoor.widthCm, 20);
  assert.equal(singleDoor.doorsCount, 1);

  const singleDoorBelowMin = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      raw: { width: 19, height: 240, depth: 55, doors: 1, chestDrawersCount: 4 },
    },
    cfg: { wardrobeType: 'hinged' },
  });
  assert.equal(singleDoorBelowMin.widthCm, 20);

  const twoDoors = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      raw: { width: 20, height: 240, depth: 55, doors: 2, chestDrawersCount: 4 },
    },
    cfg: { wardrobeType: 'hinged' },
  });
  assert.equal(twoDoors.widthCm, 40);
});

test('regular hinged wardrobe with zero doors still collapses width to zero', () => {
  const dims = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      isChestMode: false,
      raw: {
        width: 50,
        height: 240,
        depth: 55,
        doors: 0,
        chestDrawersCount: 4,
      },
    },
    cfg: { wardrobeType: 'hinged' },
  });

  assert.equal(dims.skipBuild, false);
  assert.equal(dims.widthCm, 0);
  assert.equal(dims.doorsCount, 0);
});

test('sanitizer uses hinged depth fallback when raw depth is missing', () => {
  const dims = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: { raw: { width: 160, height: 240, doors: 4, chestDrawersCount: 4 } },
    cfg: { wardrobeType: 'hinged' },
  });

  assert.equal(dims.skipBuild, false);
  assert.equal(dims.depthCm, 55);
  assert.equal(dims.doorsCount, 4);
});

test('sanitizer uses sliding depth and door fallbacks when raw values are missing', () => {
  const dims = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: { raw: { width: 160, height: 240, chestDrawersCount: 4 } },
    cfg: { wardrobeType: 'sliding' },
  });

  assert.equal(dims.skipBuild, false);
  assert.equal(dims.depthCm, 60);
  assert.equal(dims.doorsCount, 2);
});

test('active dimension drafts outside their exact limits skip without builder or runtime writes', () => {
  const cases = [
    {
      activeId: 'width',
      wardrobeType: 'hinged',
      raw: { width: 19, height: 240, depth: 55, doors: 1 },
    },
    {
      activeId: 'width',
      wardrobeType: 'hinged',
      raw: { width: 39, height: 240, depth: 55, doors: 4 },
    },
    {
      activeId: 'height',
      wardrobeType: 'hinged',
      raw: { width: 160, height: 99, depth: 55, doors: 4 },
    },
    {
      activeId: 'depth',
      wardrobeType: 'hinged',
      raw: { width: 160, height: 240, depth: 19, doors: 4 },
    },
    {
      activeId: 'doors',
      wardrobeType: 'sliding',
      raw: { width: 160, height: 240, depth: 60, doors: 1 },
    },
  ] as const;

  for (const fixture of cases) {
    const harness = createRuntimeHarness();
    const dims = sanitizeBuildDimsAndSyncRuntime({
      App: harness.App,
      ui: {
        __activeId: fixture.activeId,
        raw: { ...fixture.raw, chestDrawersCount: 4 },
      },
      cfg: { wardrobeType: fixture.wardrobeType },
    });

    assert.deepEqual(dims, {
      skipBuild: true,
      widthCm: 0,
      heightCm: 0,
      depthCm: 0,
      doorsCount: 0,
      chestDrawersCount: 0,
    });
    assert.equal(harness.builder.buildUi, undefined);
    assert.deepEqual(harness.patches, []);
    assert.equal(harness.callbacks.size, 0);
  }
});

test('forceBuild bypasses active draft skipping and clamps every upper and lower bound', () => {
  const harness = createRuntimeHarness();
  const dims = sanitizeBuildDimsAndSyncRuntime({
    App: harness.App,
    ui: {
      forceBuild: true,
      __activeId: 'width',
      raw: {
        width: -10,
        height: 999,
        depth: 999,
        doors: 99,
        chestDrawersCount: 99,
      },
    },
    cfg: { wardrobeType: 'hinged' },
  });

  assert.deepEqual(dims, {
    skipBuild: false,
    widthCm: 40,
    heightCm: 300,
    depthCm: 150,
    doorsCount: 14,
    chestDrawersCount: 8,
  });
  assert.equal(harness.callbacks.size, 0);
  assert.deepEqual(
    harness.patches.map(call => call.patch),
    [
      {
        wardrobeWidthM: 0.4,
        wardrobeHeightM: 3,
        wardrobeDepthM: 1.5,
        wardrobeDoorsCount: 14,
      },
    ]
  );
});

test('chest and sliding modes retain their distinct minimums and zero-drawer fallback', () => {
  const chest = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      isChestMode: true,
      raw: {
        width: -1,
        height: -1,
        depth: -1,
        doors: 0,
        chestDrawersCount: 1,
      },
    },
    cfg: { wardrobeType: 'hinged' },
  });
  assert.deepEqual(chest, {
    skipBuild: false,
    widthCm: 20,
    heightCm: 20,
    depthCm: 20,
    doorsCount: 0,
    chestDrawersCount: 2,
  });

  const sliding = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      raw: {
        width: 1,
        height: 1,
        depth: 1,
        doors: 1,
        chestDrawersCount: 0,
      },
    },
    cfg: { wardrobeType: 'sliding' },
  });
  assert.deepEqual(sliding, {
    skipBuild: false,
    widthCm: 40,
    heightCm: 100,
    depthCm: 20,
    doorsCount: 2,
    chestDrawersCount: 4,
  });
});

test('invalid values use canonical defaults while raw doors win over the normalized UI field', () => {
  const fallback = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      doors: '7.6',
      raw: {
        width: ' ',
        height: {},
        depth: Number.NaN,
        doors: null,
        chestDrawersCount: 'invalid',
      },
    },
    cfg: { wardrobeType: 'sliding' },
  });
  assert.deepEqual(fallback, {
    skipBuild: false,
    widthCm: 160,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 8,
    chestDrawersCount: 4,
  });

  const rawWins = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      doors: 9,
      raw: {
        width: '160.5',
        height: '240.5',
        depth: '55.5',
        doors: 3,
        chestDrawersCount: 4,
      },
    },
    cfg: { wardrobeType: 'hinged' },
  });
  assert.deepEqual(rawWins, {
    skipBuild: false,
    widthCm: 160.5,
    heightCm: 240.5,
    depthCm: 55.5,
    doorsCount: 3,
    chestDrawersCount: 4,
  });
});

test('sanitizer writes buildUi before an immediate meter patch with UI-only metadata and no build request', () => {
  const harness = createRuntimeHarness();
  const events: string[] = [];
  const raw = new Proxy<UnknownRecord>(
    {},
    {
      set(target, property, value) {
        events.push(`raw.${String(property)}`);
        target[property as string] = value;
        return true;
      },
    }
  );
  const buildUi = new Proxy<UnknownRecord>(
    { raw },
    {
      set(target, property, value) {
        events.push(`buildUi.${String(property)}`);
        target[property as string] = value;
        return true;
      },
    }
  );
  harness.builder.buildUi = buildUi;
  const runtimePatch = harness.App.actions?.runtime?.patch;
  assert.equal(typeof runtimePatch, 'function');
  if (typeof runtimePatch === 'function') {
    harness.App.actions.runtime.patch = (patch, meta) => {
      events.push('runtime.patch');
      return runtimePatch.call(harness.App.actions?.runtime, patch, meta);
    };
  }

  const dims = sanitizeBuildDimsAndSyncRuntime({
    App: harness.App,
    ui: {
      raw: {
        width: 200,
        height: 250,
        depth: 70,
        doors: 5,
        chestDrawersCount: 6,
      },
    },
    cfg: { wardrobeType: 'hinged' },
  });

  assert.deepEqual(dims, {
    skipBuild: false,
    widthCm: 200,
    heightCm: 250,
    depthCm: 70,
    doorsCount: 5,
    chestDrawersCount: 6,
  });
  assert.deepEqual(events, [
    'buildUi.width',
    'buildUi.height',
    'buildUi.depth',
    'buildUi.doors',
    'buildUi.raw',
    'raw.width',
    'raw.height',
    'raw.depth',
    'raw.doors',
    'runtime.patch',
  ]);
  assert.deepEqual(recordCopy(harness.builder.buildUi), {
    raw,
    width: 200,
    height: 250,
    depth: 70,
    doors: 5,
  });
  assert.deepEqual(recordCopy(raw), {
    width: 200,
    height: 250,
    depth: 70,
    doors: 5,
  });
  assert.deepEqual(harness.patches, [
    {
      patch: {
        wardrobeWidthM: 2,
        wardrobeHeightM: 2.5,
        wardrobeDepthM: 0.7,
        wardrobeDoorsCount: 5,
      },
      meta: {
        source: 'builder:dims',
        noBuild: true,
        noAutosave: true,
        noPersist: true,
        noHistory: true,
        noCapture: true,
        uiOnly: true,
      },
    },
  ]);
});

test('valid active edits coalesce the runtime patch while buildUi updates immediately', () => {
  const harness = createRuntimeHarness();
  const dims = sanitizeBuildDimsAndSyncRuntime({
    App: harness.App,
    ui: {
      __activeId: 'width',
      raw: {
        width: 180,
        height: 240,
        depth: 55,
        doors: 4,
        chestDrawersCount: 4,
      },
    },
    cfg: { wardrobeType: 'hinged' },
  });

  assert.equal(dims.skipBuild, false);
  assert.equal((harness.builder.buildUi as UnknownRecord).width, 180);
  assert.deepEqual(harness.patches, []);
  assert.equal(harness.callbacks.size, 1);
  assert.equal(flushDimensionRuntimeSync(harness.App), true);
  assert.equal(harness.callbacks.size, 0);
  assert.deepEqual(
    harness.patches.map(call => call.patch),
    [
      {
        wardrobeWidthM: 1.8,
        wardrobeHeightM: 2.4,
        wardrobeDepthM: 0.55,
        wardrobeDoorsCount: 4,
      },
    ]
  );
  assert.equal(flushDimensionRuntimeSync(harness.App), false);
});
