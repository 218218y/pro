import test from 'node:test';
import assert from 'node:assert/strict';

import { DRAWER_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import {
  findSketchBoxRegularExternalDrawerInCell,
  getSketchBoxRegularExternalDrawerStackHeight,
  normalizeSketchBoxRegularExternalDrawerCount,
  normalizeStoredSketchBoxRegularExternalDrawerCount,
  readSketchBoxRegularExternalDrawersForRender,
} from '../esm/native/features/sketch_box_regular_external_drawers.ts';
import {
  readNumber as readStackPreviewNumber,
  readRecordNumber as readStackPreviewRecordNumber,
} from '../esm/native/services/canvas_picking_sketch_box_stack_preview_records.ts';
import {
  readNumber as readVerticalPreviewNumber,
  readRecordNumber as readVerticalPreviewRecordNumber,
} from '../esm/native/services/canvas_picking_sketch_box_vertical_content_preview_records.ts';
import {
  readFiniteNumber as readModuleHoverFiniteNumber,
  readNumber as readModuleHoverNumber,
} from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_shared.ts';
import {
  buildSketchExternalDrawerBlockers,
  buildSketchInternalDrawerBlockers,
} from '../esm/native/services/canvas_picking_manual_layout_sketch_vertical_stack.ts';
import { buildManualLayoutVerticalContentBlockers } from '../esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts';
import {
  doesSketchModuleVerticalRangeCollideWithDrawers,
  resolveSketchModuleVerticalRangePlacementAgainstDrawers,
} from '../esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts';
import {
  isSketchFreeBoxUnderWardrobeColumn,
  isWithinSketchFreePlacementBounds,
} from '../esm/native/services/canvas_picking_sketch_free_box_geometry_vertical.ts';
import { buildSketchExternalDrawerCollisionRanges } from '../esm/native/builder/render_interior_sketch_stack_collision.ts';

test('regular external drawer count parsing is limited to tool/UI counts', () => {
  assert.equal(normalizeSketchBoxRegularExternalDrawerCount('3'), 3);
  assert.equal(normalizeStoredSketchBoxRegularExternalDrawerCount('3'), 0);
  assert.equal(
    getSketchBoxRegularExternalDrawerStackHeight('3'),
    3 * DRAWER_DIMENSIONS.external.regularHeightM
  );
  assert.equal(getSketchBoxRegularExternalDrawerStackHeight({ count: '3' }), 0);

  assert.deepEqual(
    readSketchBoxRegularExternalDrawersForRender({
      regularExtDrawers: [{ id: 'string-count', count: '3' }],
    }),
    []
  );

  const shoeOnly = readSketchBoxRegularExternalDrawersForRender({
    regularExtDrawers: [{ id: 'shoe-string-count', count: '3', hasShoeDrawer: true }],
  });
  assert.equal(shoeOnly.length, 1);
  assert.equal(shoeOnly[0]?.count, 0);
  assert.equal(shoeOnly[0]?.hasShoeDrawer, true);
});

test('regular external drawer cell matching rejects string-encoded stored cell coordinates', () => {
  const box = {
    regularExtDrawers: [
      { id: 'string-cell', count: 1, xNorm: '0.5', yNormC: '0.5' },
      { id: 'number-cell', count: 1, xNorm: 0.5, yNormC: 0.5 },
    ],
  };

  assert.equal(findSketchBoxRegularExternalDrawerInCell(box, { xNorm: 0.5, yNormC: 0.5 })?.id, 'number-cell');
  assert.equal(findSketchBoxRegularExternalDrawerInCell(box, { xNorm: '0.5' as any, yNormC: 0.5 }), null);
});

test('sketch preview record readers reject numeric strings from live state', () => {
  assert.equal(readStackPreviewNumber('0.5'), null);
  assert.equal(readStackPreviewRecordNumber({ yNorm: '0.5' }, 'yNorm'), null);
  assert.equal(readVerticalPreviewNumber('0.5'), null);
  assert.equal(readVerticalPreviewRecordNumber({ yNorm: '0.5' }, 'yNorm'), null);
  assert.equal(readModuleHoverNumber('0.5'), null);
  assert.equal(readModuleHoverFiniteNumber('0.5'), null);
});

test('manual sketch vertical stack blockers reject string-encoded drawer state', () => {
  assert.deepEqual(
    buildSketchExternalDrawerBlockers({
      extDrawers: [{ id: 'external-string', count: '3', yNormC: '0.5' }],
      boxCenterY: 1,
      boxHeight: 2,
      woodThick: 0.02,
    }),
    []
  );
  assert.deepEqual(
    buildSketchInternalDrawerBlockers({
      drawers: [{ id: 'internal-string', yNormC: '0.5' }],
      boxCenterY: 1,
      boxHeight: 2,
      woodThick: 0.02,
    }),
    []
  );
});

test('manual layout vertical content blockers reject string-encoded sketch geometry', () => {
  const blockers = buildManualLayoutVerticalContentBlockers({
    cfgRef: null,
    shelves: [
      { id: 'string-shelf', yNorm: '0.25' },
      { id: 'typed-shelf', yNorm: 0.3 },
    ],
    rods: [
      { id: 'string-rod', yNorm: '0.5' },
      { id: 'typed-rod', yNorm: 0.6 },
    ],
    storageBarriers: [
      { id: 'string-storage-height', yNorm: 0.7, heightM: '0.3' },
      { id: 'typed-storage', yNorm: 0.8, heightM: 0.3 },
    ],
    bottomY: 0,
    topY: 2,
    totalHeight: 2,
    pad: 0.02,
    woodThick: 0.02,
  });

  assert.deepEqual(
    blockers.map(blocker => blocker.id),
    ['typed-shelf', 'typed-rod', 'typed-storage']
  );
});

test('module vertical range collision rejects string-encoded live placement dimensions', () => {
  const collisionArgs = {
    drawers: [{ id: 'existing-drawer', yNormC: 0.5 }],
    extDrawers: [],
    bottomY: 0,
    topY: 2,
    totalHeight: 2,
    pad: 0.02,
    centerY: 1,
    heightM: 0.4,
  };

  assert.equal(doesSketchModuleVerticalRangeCollideWithDrawers(collisionArgs), true);
  assert.equal(
    doesSketchModuleVerticalRangeCollideWithDrawers({
      ...collisionArgs,
      centerY: '1' as any,
    }),
    false
  );
  assert.equal(
    doesSketchModuleVerticalRangeCollideWithDrawers({
      ...collisionArgs,
      heightM: '0.4' as any,
    }),
    false
  );

  const placement = resolveSketchModuleVerticalRangePlacementAgainstDrawers({
    ...collisionArgs,
    desiredCenterY: '1' as any,
    heightM: 0.4,
  });
  assert.equal(placement.blocked, false);
  assert.equal(Number.isNaN(placement.centerY), true);
});

test('render sketch stack collision ranges do not parse string-encoded external drawer count', () => {
  const ranges = buildSketchExternalDrawerCollisionRanges({
    extDrawers: [
      { id: 'string-y', count: 3, yNormC: '0.5' } as any,
      { id: 'string-count', count: '3', yNormC: 0.5 } as any,
      { id: 'typed-count', count: 3, yNormC: 0.75 },
    ],
    bottomY: 0,
    topY: 2,
    totalHeight: 2,
    pad: 0.02,
  });

  const stringCount = ranges.find(range => range.id === 'string-count');
  const typedCount = ranges.find(range => range.id === 'typed-count');

  assert.equal(
    ranges.some(range => range.id === 'string-y'),
    false
  );
  assert.ok(stringCount);
  assert.ok(typedCount);
  assert.ok(stringCount.maxY - stringCount.minY < typedCount.maxY - typedCount.minY);
});

test('free-box geometry predicates reject string-encoded live measurements', () => {
  const wardrobeBox = { centerX: 0, centerY: 1, width: 2, height: 2 };

  assert.equal(
    isSketchFreeBoxUnderWardrobeColumn({
      planeX: '0' as any,
      planeY: 0.2,
      boxH: 0.8,
      wardrobeBox,
    }),
    false
  );
  assert.equal(
    isSketchFreeBoxUnderWardrobeColumn({
      planeX: 0,
      planeY: 0.2,
      boxH: 0.8,
      wardrobeBox: { ...wardrobeBox, height: '2' as any },
    }),
    false
  );
  assert.equal(
    isWithinSketchFreePlacementBounds({
      planeX: 0,
      planeY: '1' as any,
      previewW: 0.5,
      previewH: 0.8,
      wardrobeBox,
    }),
    false
  );
});
