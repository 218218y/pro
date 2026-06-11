import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findSketchFreeHoverTargetBox,
  resolveSketchFreePlacementBoxPreview,
} from '../esm/native/services/canvas_picking_sketch_free_surface_preview.ts';

const wardrobeBox = { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as const;

function resolveSketchFreeBoxGeometry(args: {
  centerX: number;
  widthM?: number | null;
  depthM?: number | null;
}) {
  const innerW = Number(args.widthM) || 0.8;
  const innerD = Number(args.depthM) || 0.4;
  return {
    centerX: Number(args.centerX) || 0,
    outerW: innerW + 0.036,
    innerW,
    outerD: innerD + 0.036,
    innerD,
    centerZ: 0,
    innerBackZ: -innerD / 2,
  };
}

test('sketch free surface target scan prefers the candidate with a box-local hit over plain plane-distance fallbacks', () => {
  const boxWithLocalHit = {
    id: 'box-local',
    freePlacement: true,
    absX: 0.6,
    absY: 1,
    heightM: 0.8,
    widthM: 0.7,
  };
  const boxWithoutLocalHit = {
    id: 'box-plane',
    freePlacement: true,
    absX: 0.15,
    absY: 1,
    heightM: 0.8,
    widthM: 0.7,
  };

  const target = findSketchFreeHoverTargetBox({
    App: {} as never,
    tool: 'sketch_box_divider',
    contentKind: 'divider',
    hostModuleKey: 0,
    freeBoxes: [boxWithoutLocalHit as any, boxWithLocalHit as any],
    planeHit: { x: 0.12, y: 1 },
    wardrobeBox: wardrobeBox as any,
    wardrobeBackZ: -0.3,
    intersects: [],
    localParent: null,
    resolveSketchFreeBoxGeometry: resolveSketchFreeBoxGeometry as never,
    getSketchFreeBoxPartPrefix: (_moduleKey, boxId) => `prefix:${String(boxId)}`,
    findSketchFreeBoxLocalHit: ({ partPrefix }) =>
      partPrefix === 'prefix:box-local' ? ({ x: 0.61, y: 1 } as any) : null,
  });

  assert.ok(target);
  assert.equal(target?.boxId, 'box-local');
  assert.ok(Math.abs(Number(target?.pointerX) - 0.61) < 1e-9);
});

test('sketch free surface placement preview produces canonical remove hover metadata and front overlay geometry', () => {
  const preview = resolveSketchFreePlacementBoxPreview({
    App: {} as never,
    tool: 'sketch_box_free',
    host: { moduleKey: 2, isBottom: false },
    planeHit: { x: 0.25, y: 0.9 },
    wardrobeBox: wardrobeBox as any,
    wardrobeBackZ: -0.3,
    freeBoxes: [
      {
        id: 'free-1',
        absX: 0.3,
        absY: 0.9,
        widthM: 0.8,
        depthM: 0.4,
        heightM: 1,
        doors: [{ id: 'door-1' }],
      },
    ] as any,
    intersects: [],
    localParent: null,
    resolveSketchFreeBoxHoverPlacement: () => ({
      op: 'remove',
      previewX: 0.3,
      previewY: 0.9,
      previewH: 1,
      previewW: 0.8,
      previewD: 0.4,
      snapToCenter: true,
      removeId: 'free-1',
    }),
    resolveSketchFreeBoxGeometry: resolveSketchFreeBoxGeometry as never,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
    boxH: 1,
    widthOverrideM: null,
    depthOverrideM: null,
  });

  assert.ok(preview);
  assert.equal(preview?.hoverRecord.kind, 'box');
  assert.equal(preview?.hoverRecord.op, 'remove');
  assert.equal(preview?.hoverRecord.removeId, 'free-1');
  assert.equal(preview?.hoverRecord.moduleKey, 2);
  assert.equal(preview?.hoverRecord.isBottom, false);
  assert.equal(preview?.preview.kind, 'box');
  assert.equal(preview?.preview.op, 'remove');
  assert.equal(preview?.preview.fillFront, true);
  assert.equal(preview?.preview.fillBack, true);
  assert.equal(preview?.preview.snapToCenter, true);
  assert.equal(preview?.preview.x, 0.3);
  assert.equal(preview?.preview.w, 0.8);
  assert.equal('clearanceMeasurements' in (preview?.preview ?? {}), false);
  assert.ok(Math.abs(Number(preview?.preview.frontOverlayW) - 0.832) < 1e-9);
});
