import test from 'node:test';
import assert from 'node:assert/strict';

import { computeExternalDrawersOpsForModule } from '../esm/native/builder/core_storage_compute_external_drawers.ts';
import { applyExternalDrawersForModule } from '../esm/native/builder/external_drawers_pipeline.ts';
import { createModuleDoorSpanResolver } from '../esm/native/builder/module_loop_pipeline_runtime_shared.ts';

test('external drawer op producer rejects string-encoded numeric compute inputs', () => {
  const stringWidth = computeExternalDrawersOpsForModule({
    wardrobeType: 'hinged',
    moduleIndex: 2,
    startDoorId: 1,
    externalCenterX: 0,
    externalW: '0.8',
    depth: 0.55,
    startY: 0,
    woodThick: 0.018,
    regCount: 1,
  });
  assert.equal(stringWidth.drawers.length, 0);

  const stringCount = computeExternalDrawersOpsForModule({
    wardrobeType: 'hinged',
    moduleIndex: 2,
    startDoorId: 1,
    externalCenterX: 0,
    externalW: 0.8,
    depth: 0.55,
    startY: 0,
    woodThick: 0.018,
    regCount: '2',
  });
  assert.equal(stringCount.drawers.length, 0);
});

test('external drawer pipeline does not apply string-encoded face overrides to builder ops', () => {
  const applied: Array<Record<string, unknown>> = [];
  const App = {
    services: {
      builder: {
        renderOps: {
          applyExternalDrawersOps: (input: Record<string, unknown>) => {
            applied.push(input);
          },
        },
      },
    },
  };

  const ok = applyExternalDrawersForModule({
    App: App as never,
    THREE: {} as never,
    cfg: { wardrobeType: 'hinged' },
    config: {},
    moduleIndex: 0,
    startDoorId: 1,
    externalCenterX: 0,
    externalW: 0.8,
    drawerFaceW: '1.2' as never,
    drawerFaceOffsetX: '0.1' as never,
    depth: 0.55,
    frontZ: '0.3' as never,
    startY: 0,
    woodThick: 0.018,
    hasShoe: false,
    regCount: 1,
    bodyMat: 'body',
    createBoard: () => ({ userData: {} }) as never,
    innerW: 0.8,
    internalDepth: 0.5,
    internalCenterX: 0,
    internalZ: 0,
    effectiveBottomY: 0.4,
  });

  assert.equal(ok, true);
  assert.equal(applied.length, 1);
  const ops = applied[0]?.ops as { drawers?: Array<Record<string, unknown>> } | undefined;
  const firstDrawer = ops?.drawers?.[0];
  assert.ok(firstDrawer);
  assert.equal(Object.prototype.hasOwnProperty.call(firstDrawer, 'faceW'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(firstDrawer, 'faceOffsetX'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(firstDrawer, 'frontZ'), false);
});

test('module door span resolver ignores string-encoded pivot-map geometry', () => {
  const resolveSpan = createModuleDoorSpanResolver({
    1: { pivotX: '0.1', doorWidth: '0.5', isLeftHinge: true },
    2: { pivotX: '1.1', doorWidth: '0.4', isLeftHinge: false },
  });

  assert.deepEqual(resolveSpan(1, 2, 9, 8), { spanW: 8, centerX: 9 });
});
