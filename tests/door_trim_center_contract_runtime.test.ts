import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDoorTrimCenterFromLocal,
  buildSnappedDoorTrimCenterFromLocal,
  createDoorTrimEntry,
  resolveDoorTrimPlacement,
  resolveDoorTrimPlacementAvoidingMirror,
  resolveDoorTrimPlacements,
} from '../esm/native/features/door_authoring/api.ts';

const rect = { minX: 0, maxX: 1, minY: 0, maxY: 1 };

test('door trim center contract keeps explicit normalized X/Y coordinates through creation and placement', () => {
  const rawCenter = buildDoorTrimCenterFromLocal({ rect, localX: 0.2, localY: 0.8 });
  assert.deepEqual(rawCenter, { centerXNorm: 0.2, centerYNorm: 0.8 });

  const entry = createDoorTrimEntry({
    id: 'trim_xy',
    axis: 'horizontal',
    color: 'gold',
    span: 'half',
    centerXNorm: rawCenter.centerXNorm,
    centerYNorm: rawCenter.centerYNorm,
  });
  assert.equal(Object.prototype.hasOwnProperty.call(entry, 'center' + 'Norm'), false);
  assert.equal(entry.centerXNorm, 0.2);
  assert.equal(entry.centerYNorm, 0.8);

  const horizontal = resolveDoorTrimPlacement({ rect, entry });
  assert.equal(horizontal.axis, 'horizontal');
  assert.equal(horizontal.centerXNorm, 0.2);
  assert.equal(horizontal.centerYNorm, 0.8);
  assert.equal(Object.prototype.hasOwnProperty.call(horizontal, 'center' + 'Norm'), false);
  const resolved = resolveDoorTrimPlacements({ rect, trims: [entry] });
  assert.equal(resolved.length, 1);
  assert.deepEqual(resolved[0].entry, entry);
  assert.deepEqual(resolved[0].placement, horizontal);

  const vertical = resolveDoorTrimPlacement({
    rect,
    axis: 'vertical',
    span: 'half',
    centerXNorm: 0.75,
    centerYNorm: 0.25,
  });
  assert.equal(vertical.centerXNorm, 0.75);
  assert.equal(vertical.centerYNorm, 0.25);
});

test('door trim snapping and mirror avoidance update both canonical center coordinates coherently', () => {
  const snapped = buildSnappedDoorTrimCenterFromLocal({
    rect,
    localX: 0.5001,
    localY: 0.4999,
  });
  assert.equal(snapped.centerXNorm, 0.5);
  assert.equal(snapped.centerYNorm, 0.5);
  assert.equal(snapped.isCentered, true);

  const horizontal = resolveDoorTrimPlacementAvoidingMirror({
    rect,
    axis: 'horizontal',
    span: 'half',
    centerXNorm: 0.5,
    centerYNorm: 0.5,
    mirrorLayouts: [{ widthCm: 40, heightCm: 40, centerXNorm: 0.5, centerYNorm: 0.5 }],
  });
  assert.equal(horizontal.centerXNorm, 0.5);
  assert.notEqual(horizontal.centerYNorm, 0.5);

  const vertical = resolveDoorTrimPlacementAvoidingMirror({
    rect,
    axis: 'vertical',
    span: 'half',
    centerXNorm: 0.5,
    centerYNorm: 0.5,
    mirrorLayouts: [{ widthCm: 40, heightCm: 40, centerXNorm: 0.5, centerYNorm: 0.5 }],
  });
  assert.notEqual(vertical.centerXNorm, 0.5);
  assert.equal(vertical.centerYNorm, 0.5);
});
