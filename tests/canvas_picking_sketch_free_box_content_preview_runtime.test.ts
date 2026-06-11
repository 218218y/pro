import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchFreeBoxContentPreview } from '../esm/native/services/canvas_picking_sketch_free_box_content_preview.ts';

type FreeBox = {
  id: string;
  freePlacement: true;
  absX: number;
  absY: number;
  heightM: number;
  widthM: number;
  depthM: number;
  doors?: unknown[];
};

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

function createContentPreviewArgs(overrides: Partial<Record<string, unknown>> = {}) {
  const freeBoxes: FreeBox[] = [
    {
      id: 'free-1',
      freePlacement: true,
      absX: 0.2,
      absY: 1,
      heightM: 1,
      widthM: 0.8,
      depthM: 0.4,
    },
  ];
  return {
    App: {} as never,
    tool: 'door_hinge',
    contentKind: 'door_hinge',
    host: { moduleKey: 2, isBottom: false },
    freeBoxes,
    planeHit: { x: 0.2, y: 1 },
    wardrobeBox: wardrobeBox as never,
    wardrobeBackZ: -0.3,
    intersects: [],
    localParent: null,
    resolveSketchFreeBoxGeometry: resolveSketchFreeBoxGeometry as never,
    getSketchFreeBoxPartPrefix: (_moduleKey: unknown, boxId: unknown) => `prefix:${String(boxId)}`,
    findSketchFreeBoxLocalHit: () => ({ x: 0.2, y: 1 }) as never,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () =>
      [
        {
          index: 0,
          centerX: 0.2,
          width: 0.8,
          xNorm: 0.5,
          leftX: -0.2,
          rightX: 0.6,
        },
      ] as never,
    pickSketchBoxSegment: () =>
      ({
        index: 0,
        centerX: 0.2,
        width: 0.8,
        xNorm: 0.5,
        leftX: -0.2,
        rightX: 0.6,
      }) as never,
    findNearestSketchBoxDivider: () => null as never,
    resolveSketchBoxDividerPlacement: () => ({ hoverRecord: null, preview: null }) as never,
    readSketchBoxDividerXNorm: () => null,
    ...overrides,
  } as never;
}

test('sketch-free box content preview short-circuits unsupported content kinds before target scanning', () => {
  let geometryCalls = 0;
  let localHitCalls = 0;

  const result = resolveSketchFreeBoxContentPreview(
    createContentPreviewArgs({
      tool: 'sketch_unknown',
      contentKind: 'unknown_kind',
      resolveSketchFreeBoxGeometry: ((args: {
        centerX: number;
        widthM?: number | null;
        depthM?: number | null;
      }) => {
        geometryCalls += 1;
        return resolveSketchFreeBoxGeometry(args);
      }) as never,
      findSketchFreeBoxLocalHit: (() => {
        localHitCalls += 1;
        return { x: 0.2, y: 1 } as never;
      }) as never,
    })
  );

  assert.equal(result, null);
  assert.equal(geometryCalls, 0);
  assert.equal(localHitCalls, 0);
});

test('sketch-free box content preview keeps door-hinge hover inert when the active segment has no door', () => {
  const result = resolveSketchFreeBoxContentPreview(createContentPreviewArgs());

  assert.deepEqual(result, { mode: 'hide' });
});

test('sketch-free box content preview returns canonical double-door removal metadata for an existing pair', () => {
  const result = resolveSketchFreeBoxContentPreview(
    createContentPreviewArgs({
      tool: 'double_door',
      contentKind: 'double_door',
      host: { moduleKey: 'corner', isBottom: true },
      freeBoxes: [
        {
          id: 'free-2',
          freePlacement: true,
          absX: 0.2,
          absY: 1,
          heightM: 1,
          widthM: 0.8,
          depthM: 0.4,
          doors: [
            { id: 'left-door', xNorm: 0.5, hinge: 'left', enabled: true },
            { id: 'right-door', xNorm: 0.5, hinge: 'right', enabled: true },
          ],
        },
      ],
    })
  );

  assert.ok(result && result.mode === 'preview');
  assert.equal(result?.hoverRecord.kind, 'box_content');
  assert.equal(result?.hoverRecord.contentKind, 'double_door');
  assert.equal(result?.hoverRecord.op, 'remove');
  assert.equal(result?.hoverRecord.freePlacement, true);
  assert.equal(result?.hoverRecord.moduleKey, 'corner');
  assert.equal(result?.hoverRecord.doorLeftId, 'left-door');
  assert.equal(result?.hoverRecord.doorRightId, 'right-door');
  assert.equal(result?.preview.kind, 'storage');
  assert.equal(result?.preview.op, 'remove');
});
