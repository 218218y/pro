import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __wp_findSketchModuleBoxAtPoint,
  __wp_parseSketchBoxToolSpec,
  __wp_resolveSketchBoxGeometry,
} from '../esm/native/services/canvas_picking_sketch_box_runtime.ts';
import { tryCommitSketchFreePlacementFromHoverWithDeps } from '../esm/native/services/canvas_picking_sketch_box_runtime_commit.ts';
import { createSketchFreePlacementBoxHoverRecord } from '../esm/native/services/canvas_picking_sketch_free_commit.ts';
import { resolveSketchFreeBoxGeometry } from '../esm/native/services/canvas_picking_sketch_free_box_geometry_box.ts';
import {
  SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY,
  SKETCH_BOX_SHELL_GEOMETRY_POLICY,
} from '../esm/shared/dimensions/sketch_box_geometry_policy.ts';

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

test('sketch-box runtime geometry preserves shell minimums, center snap boundaries, and finite fallbacks', () => {
  const fallback = __wp_resolveSketchBoxGeometry({
    innerW: Number.NaN,
    internalCenterX: Number.POSITIVE_INFINITY,
    internalDepth: Number.NEGATIVE_INFINITY,
    internalZ: Number.NaN,
    woodThick: 0,
  });
  assert.equal(fallback.outerW, SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterWidthM);
  assert.equal(fallback.outerD, SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterDepthM);
  assert.equal(fallback.centerX, 0);
  assert.equal(Number.isNaN(fallback.centerZ), true);

  const snapEps = Math.min(
    SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.centerSnapMaxM,
    Math.max(
      SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.centerSnapMinM,
      1 * SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.centerSnapWidthRatio
    )
  );
  const snapped = __wp_resolveSketchBoxGeometry({
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.6,
    internalZ: 0,
    woodThick: 0.018,
    widthM: 0.4,
    centerXHint: snapEps,
    enableCenterSnap: true,
  });
  assert.equal(snapped.centerX, 0);
  assert.equal(snapped.centered, true);

  const outsideSnap = __wp_resolveSketchBoxGeometry({
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.6,
    internalZ: 0,
    woodThick: 0.018,
    widthM: 0.4,
    centerXHint: snapEps + 1e-6,
    enableCenterSnap: true,
  });
  assert.ok(Math.abs(outsideSnap.centerX - (snapEps + 1e-6)) < 1e-12);
  assert.equal(outsideSnap.centered, false);

  const left = __wp_resolveSketchBoxGeometry({
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.6,
    internalZ: 0,
    woodThick: 0.018,
    widthM: 0.2,
    xNorm: 0,
  });
  const center = __wp_resolveSketchBoxGeometry({
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.6,
    internalZ: 0,
    woodThick: 0.018,
    widthM: 0.2,
    xNorm: 0.5,
  });
  const right = __wp_resolveSketchBoxGeometry({
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.6,
    internalZ: 0,
    woodThick: 0.018,
    widthM: 0.2,
    xNorm: 1,
  });
  assert.ok(left.centerX < center.centerX && center.centerX < right.centerX);
  assert.ok(left.xNorm < center.xNorm && center.xNorm < right.xNorm);
});

test('free-box geometry preserves fallback clamping without capping explicit dimensions', () => {
  const fallback = resolveSketchFreeBoxGeometry({
    wardrobeWidth: 0.3,
    wardrobeDepth: 0.2,
    backZ: -0.25,
    centerX: Number.NaN,
    woodThick: Number.NaN,
    widthM: null,
    depthM: null,
  });
  assert.equal(fallback.outerW, 0.3);
  assert.equal(fallback.outerD, 0.2);
  assert.equal(fallback.centerX, 0);
  assert.equal(
    fallback.innerW,
    Math.max(
      SKETCH_BOX_SHELL_GEOMETRY_POLICY.minInnerDimensionM,
      fallback.outerW - 2 * SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultWoodThicknessM
    )
  );

  const explicit = resolveSketchFreeBoxGeometry({
    wardrobeWidth: 0.3,
    wardrobeDepth: 0.2,
    backZ: -0.25,
    centerX: 0.4,
    woodThick: 0.02,
    widthM: 1.4,
    depthM: 0.8,
  });
  assert.equal(explicit.outerW, 1.4);
  assert.equal(explicit.outerD, 0.8);
  assert.equal(explicit.centerX, 0.4);
  assert.ok(Math.abs(explicit.centerZ - 0.15) < 1e-12);
  assert.ok(Math.abs(explicit.innerBackZ - -0.23) < 1e-12);

  const rejectedOverrides = resolveSketchFreeBoxGeometry({
    wardrobeWidth: 1,
    wardrobeDepth: 0.6,
    backZ: 0,
    centerX: 0,
    woodThick: 0.02,
    widthM: '1.2' as any,
    depthM: Number.POSITIVE_INFINITY,
  });
  assert.equal(rejectedOverrides.outerW, SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterWidthM);
  assert.equal(rejectedOverrides.outerD, SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterDepthM);
});

test('sketch-box runtime geometry rejects string-encoded live overrides', () => {
  const geo = __wp_resolveSketchBoxGeometry({
    innerW: 1.2,
    internalCenterX: 0,
    internalDepth: 0.6,
    internalZ: 0,
    woodThick: 0.018,
    widthM: '0.4' as any,
    depthM: '0.3' as any,
    xNorm: '1' as any,
    centerXHint: '0.4' as any,
  });

  assert.equal(geo.outerW, 1.2);
  assert.equal(geo.outerD, 0.6);
  assert.equal(geo.centerX, 0);
  assert.equal(geo.xNorm, 0.5);
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

test('sketch-box runtime hit scan rejects string-encoded live box geometry', () => {
  const hit = __wp_findSketchModuleBoxAtPoint({
    boxes: [{ id: 'string-box', yNorm: '0.5', heightM: '0.4', widthM: '0.4', xNorm: '0.5' }],
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

  assert.equal(hit, null);
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

test('sketch-box free-placement commit does not derive floorY from string measurements', () => {
  let floorY: number | undefined;
  const committed = tryCommitSketchFreePlacementFromHoverWithDeps({} as never, 'sketch_box:60', {
    pickSketchFreeBoxHost: () => ({ moduleKey: 3, hostBottom: false }) as never,
    readSketchHover: () => ({ ts: Date.now() }) as never,
    matchRecentSketchHover: () => ({ op: 'add', hostModuleKey: 3 }) as never,
    commitSketchFreePlacementHoverRecord: args => {
      floorY = args.floorY;
      return { committed: true, nextHover: null } as never;
    },
    getSketchFreeBoxContentKind: () => 'box' as never,
    measureWardrobeLocalBox: () => ({ centerY: '2', height: '6' }) as never,
    writeSketchHover: () => {
      throw new Error('commit returns no next hover');
    },
    clearSketchHover: () => {},
    toModuleKey: key => key as never,
  });

  assert.equal(committed, true);
  assert.equal(Number.isNaN(floorY), true);
});

test('sketch-box free-placement commit clears and rejects stale add-hover under the wardrobe column', () => {
  let committedCalls = 0;
  let cleared = 0;
  const staleHover = createSketchFreePlacementBoxHoverRecord({
    tool: 'sketch_box:60',
    host: { moduleKey: 3, isBottom: false },
    op: 'add',
    previewX: 0,
    previewY: 0.1,
    previewH: 0.8,
    previewW: 0.6,
    previewD: 0.45,
  });
  assert.ok(staleHover);
  const committed = tryCommitSketchFreePlacementFromHoverWithDeps({} as never, 'sketch_box:60', {
    pickSketchFreeBoxHost: () => ({ moduleKey: 3, isBottom: false }) as never,
    readSketchHover: () => staleHover,
    matchRecentSketchHover: () => staleHover as never,
    commitSketchFreePlacementHoverRecord: () => {
      committedCalls += 1;
      return { committed: true, nextHover: null } as never;
    },
    getSketchFreeBoxContentKind: () => 'box' as never,
    measureWardrobeLocalBox: () => ({ centerX: 0, centerY: 1, width: 2, height: 2 }) as never,
    writeSketchHover: () => {
      throw new Error('should not write blocked under-wardrobe hover');
    },
    clearSketchHover: () => {
      cleared += 1;
    },
    toModuleKey: key => key as never,
  });

  assert.equal(committed, false);
  assert.equal(committedCalls, 0);
  assert.equal(cleared, 1);
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
