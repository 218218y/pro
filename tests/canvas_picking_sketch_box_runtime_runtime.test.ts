import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __wp_findSketchModuleBoxAtPoint,
  __wp_parseSketchBoxToolSpec,
  __wp_resolveSketchBoxGeometry,
} from '../esm/native/services/canvas_picking_sketch_box_runtime.ts';
import { tryCommitSketchFreePlacementFromHoverWithDeps } from '../esm/native/services/canvas_picking_sketch_box_runtime_commit.ts';

test('sketch-box runtime parses width/depth overrides and rejects unrelated tools', () => {
  assert.deepEqual(__wp_parseSketchBoxToolSpec('sketch_box:60@90@45'), {
    heightCm: 60,
    widthCm: 90,
    depthCm: 45,
  });
  assert.deepEqual(__wp_parseSketchBoxToolSpec('sketch_box:70@@50'), {
    heightCm: 70,
    widthCm: null,
    depthCm: 50,
  });
  assert.equal(__wp_parseSketchBoxToolSpec('shelf'), null);
});

test('sketch-box runtime geometry center-snaps and width-clamps inside the module span', () => {
  const geo = __wp_resolveSketchBoxGeometry({
    innerW: 1.2,
    internalCenterX: 0,
    internalDepth: 0.6,
    internalZ: 0,
    woodThick: 0.018,
    widthM: 2,
    centerXHint: 0.01,
    enableCenterSnap: true,
  });

  assert.ok(Math.abs(geo.outerW - 1.2) <= 1e-9);
  assert.ok(Math.abs(geo.centerX - 0) <= 1e-9);
  assert.equal(geo.centered, true);
  assert.ok(geo.innerD > 0.02);
});

test('sketch-box runtime hit scan ignores free-placement boxes and prefers the nearest centered match', () => {
  const hit = __wp_findSketchModuleBoxAtPoint({
    boxes: [
      { id: 'free', freePlacement: true, yNorm: 0.2, heightM: 0.2, widthM: 0.3 },
      { id: 'left', yNorm: 0.5, heightM: 0.4, widthM: 0.3, xNorm: 0.25 },
      { id: 'center', yNorm: 0.5, heightM: 0.4, widthM: 0.4, xNorm: 0.5 },
    ],
    cursorY: 0,
    cursorX: 0,
    bottomY: -1,
    spanH: 2,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    woodThick: 0.018,
  });

  assert.equal(hit?.boxId, 'center');
  assert.ok(Math.abs((hit?.geo.centerX || 0) - 0) <= 1e-9);
});

test('sketch-box free-placement commit keeps matching/commit/hover mutation policy centralized', () => {
  const writes: unknown[] = [];
  let cleared = 0;
  const committed = tryCommitSketchFreePlacementFromHoverWithDeps({} as never, 'sketch_box:60', {
    pickSketchFreeBoxHost: () => ({ moduleKey: 3, hostBottom: false }) as never,
    readSketchHover: () => ({ ts: Date.now() }) as never,
    matchRecentSketchHover: () => ({ op: 'add', hostModuleKey: 3 }) as never,
    commitSketchFreePlacementHoverRecord: args => {
      assert.equal(args.freeBoxContentKind, 'box');
      return { committed: true, nextHover: { persisted: true } } as never;
    },
    getSketchFreeBoxContentKind: () => 'box' as never,
    measureWardrobeLocalBox: () => ({ centerY: 2, height: 6 }) as never,
    writeSketchHover: (_App, hover) => writes.push(hover),
    clearSketchHover: () => {
      cleared += 1;
    },
    toModuleKey: key => key as never,
  });

  assert.equal(committed, true);
  assert.deepEqual(writes, [{ persisted: true }]);
  assert.equal(cleared, 0);
});

test('sketch-box free-placement commit clears hover when the canonical commit finishes without next hover', () => {
  const writes: unknown[] = [];
  let cleared = 0;
  const committed = tryCommitSketchFreePlacementFromHoverWithDeps({} as never, 'sketch_box:60', {
    pickSketchFreeBoxHost: () => ({ moduleKey: 3, hostBottom: false }) as never,
    readSketchHover: () => ({ ts: Date.now() }) as never,
    matchRecentSketchHover: () => ({ op: 'add', hostModuleKey: 3 }) as never,
    commitSketchFreePlacementHoverRecord: () => ({ committed: true, nextHover: null }) as never,
    getSketchFreeBoxContentKind: () => 'box' as never,
    measureWardrobeLocalBox: () => ({ centerY: 2, height: 6 }) as never,
    writeSketchHover: (_App, hover) => writes.push(hover),
    clearSketchHover: () => {
      cleared += 1;
    },
    toModuleKey: key => key as never,
  });

  assert.equal(committed, true);
  assert.deepEqual(writes, []);
  assert.equal(cleared, 1);
});

test('sketch-box free-placement commit stays inert when no canonical host is available', () => {
  let committedCalls = 0;
  let cleared = 0;
  const committed = tryCommitSketchFreePlacementFromHoverWithDeps({} as never, 'sketch_box:60', {
    pickSketchFreeBoxHost: () => null as never,
    readSketchHover: () => ({ ts: Date.now() }) as never,
    matchRecentSketchHover: () => ({ op: 'add', hostModuleKey: 3 }) as never,
    commitSketchFreePlacementHoverRecord: () => {
      committedCalls += 1;
      return { committed: true, nextHover: null } as never;
    },
    getSketchFreeBoxContentKind: () => 'box' as never,
    measureWardrobeLocalBox: () => ({ centerY: 2, height: 6 }) as never,
    writeSketchHover: () => {
      throw new Error('should not write hover when host is missing');
    },
    clearSketchHover: () => {
      cleared += 1;
    },
    toModuleKey: key => key as never,
  });

  assert.equal(committed, false);
  assert.equal(committedCalls, 0);
  assert.equal(cleared, 0);
});
