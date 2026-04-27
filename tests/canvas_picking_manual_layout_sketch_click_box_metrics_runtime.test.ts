import test from 'node:test';
import assert from 'node:assert/strict';

import { createManualLayoutSketchPlacementMetricsResolver } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_box_metrics.ts';

test('manual-layout sketch click box metrics resolve selector-local X in selector-parent space', () => {
  const selectorParent = { id: 'selector-parent' };
  const selector = {
    parent: selectorParent,
    userData: { isModuleSelector: true, moduleIndex: 4, __wpStack: 'bottom' },
  };

  const resolveMetrics = createManualLayoutSketchPlacementMetricsResolver({
    App: {} as never,
    intersects: [{ object: selector, point: { x: 12, y: 0.8, z: 4 } }] as any,
    activeModuleKey: 4,
    isBottomStack: true,
    gridInfo: {
      woodThick: 0.02,
      innerW: 0.75,
      internalCenterX: 0,
      internalDepth: 0.5,
      internalZ: -0.08,
    },
    woodThick: 0.02,
    toModuleKey: value => (typeof value === 'number' || typeof value === 'string' ? (value as any) : null),
    measureObjectLocalBox: () => ({ centerX: 0, centerY: 0, centerZ: 0, width: 1, height: 1, depth: 0.4 }),
    projectWorldPointToLocal: (_App, point, parent) => ({
      x: parent === selectorParent ? 0.33 : 0,
      y: (point as any).y,
      z: (point as any).z,
    }),
  });

  const metrics = resolveMetrics();
  assert.equal(metrics.hitLocalX, 0.33);
  assert.equal(metrics.innerW, 0.75);
  assert.equal(metrics.internalDepth, 0.5);
  assert.equal(metrics.internalZ, -0.08);
});
