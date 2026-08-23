import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasPickingInteriorExtension } from '../esm/native/services/canvas_picking_interior_extension.ts';
import { loadCanvasPickingInteriorExtension } from '../esm/native/services/canvas_picking_interior_extension_loader.ts';
import {
  getCanvasPickingInteriorExtension,
  isCanvasPickingInteriorClickMode,
  isCanvasPickingInteriorHoverMode,
  requireCanvasPickingInteriorExtension,
} from '../esm/native/services/canvas_picking_interior_extension_registry.ts';

test('Interior Canvas Picking extension registers synchronously and remains idempotent', () => {
  assert.equal(getCanvasPickingInteriorExtension(), null);
  assert.throws(
    () => requireCanvasPickingInteriorExtension(),
    /Interior picking mode was activated before its deferred extension registered/
  );

  const first = installCanvasPickingInteriorExtension();
  const second = installCanvasPickingInteriorExtension();

  assert.equal(first, second);
  assert.equal(getCanvasPickingInteriorExtension(), first);
  assert.equal(typeof first.tryHandleClickRoute, 'function');
  assert.equal(typeof first.tryHandleInteriorPreview, 'function');
  assert.equal(typeof first.tryHandleSketchHover, 'function');
});

test('Interior Canvas Picking loader caches one import promise', async () => {
  const first = loadCanvasPickingInteriorExtension();
  const second = loadCanvasPickingInteriorExtension();

  assert.equal(first, second);
  assert.equal(await first, getCanvasPickingInteriorExtension());
});

test('Interior Canvas Picking mode detection gates only feature-owned modes', () => {
  const mode = (overrides: Record<string, boolean>) =>
    ({
      __isLayoutEditMode: false,
      __isManualLayoutMode: false,
      __isBraceShelvesMode: false,
      __isCellDimsMode: false,
      __isExtDrawerEditMode: false,
      __isIntDrawerEditMode: false,
      __isDividerEditMode: false,
      ...overrides,
    }) as never;

  assert.equal(isCanvasPickingInteriorClickMode(mode({ __isManualLayoutMode: true })), true);
  assert.equal(isCanvasPickingInteriorClickMode(mode({ __isCellDimsMode: true })), false);
  assert.equal(isCanvasPickingInteriorClickMode(mode({})), false);

  const hover = (overrides: Record<string, unknown>) =>
    ({
      primaryMode: 'none',
      isExtDrawerEditMode: false,
      isDividerEditMode: false,
      isCellDimsMode: false,
      ...overrides,
    }) as never;
  assert.equal(isCanvasPickingInteriorHoverMode(hover({ primaryMode: 'layout' })), true);
  assert.equal(isCanvasPickingInteriorHoverMode(hover({ primaryMode: 'manual_layout' })), true);
  assert.equal(isCanvasPickingInteriorHoverMode(hover({ isDividerEditMode: true })), true);
  assert.equal(isCanvasPickingInteriorHoverMode(hover({ primaryMode: 'paint' })), false);
});
