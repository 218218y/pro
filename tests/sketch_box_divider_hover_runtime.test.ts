import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleManualLayoutSketchHoverModuleDividerFlow } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_divider_flow.ts';
import { resolveSketchFreeSurfaceContentPreview } from '../esm/native/services/canvas_picking_sketch_free_surface_preview.ts';
import { resolveSketchFreeDoorContentPreview } from '../esm/native/services/canvas_picking_sketch_free_box_content_preview_doors.ts';
import { commitSketchModuleBoxContent } from '../esm/native/services/canvas_picking_sketch_box_content_commit.ts';
import {
  addSketchBoxDividerState,
  addSketchBoxHorizontalDividerState,
  findNearestSketchBoxDivider,
  findNearestSketchBoxHorizontalDivider,
  pickSketchBoxSegment,
  pickSketchBoxVerticalSegment,
  readSketchBoxDividerXNorm,
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  resolveSketchBoxDividerPlacement,
  resolveSketchBoxHorizontalDividerPlacement,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from '../esm/native/services/canvas_picking_sketch_box_dividers.ts';

function approx(actual: number, expected: number, eps = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= eps, `expected ${actual} to be within ${eps} of ${expected}`);
}

function makeTargetGeo() {
  return {
    outerW: 1.036,
    innerW: 1,
    centerX: 0,
    outerD: 0.436,
    innerD: 0.4,
    centerZ: 0,
    innerBackZ: -0.2,
  };
}

function resolveModuleBoxGeometry(args: {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  widthM?: number | null;
  depthM?: number | null;
  xNorm?: number | null;
}) {
  const t = Number(args.woodThick) || 0.018;
  const innerW = Number(args.widthM) || 1;
  const innerD = Number(args.depthM) || 0.4;
  const spanW = Number(args.innerW) || innerW;
  const centerX = Number(args.internalCenterX) || 0;
  const xNorm = Number.isFinite(Number(args.xNorm)) ? Number(args.xNorm) : 0.5;
  const leftX = centerX - spanW / 2;
  const resolvedCenterX = leftX + xNorm * spanW;
  return {
    outerW: innerW + t * 2,
    innerW,
    centerX: resolvedCenterX,
    xNorm,
    centered: Math.abs(resolvedCenterX - centerX) <= 0.001,
    outerD: innerD + t * 2,
    innerD,
    centerZ: Number(args.internalZ) || 0,
    innerCenterZ: Number(args.internalZ) || 0,
    innerBackZ: (Number(args.internalZ) || 0) - innerD / 2,
  };
}

test('module sketch-box divider hover allows free placement away from center snap', () => {
  const box = { id: 'box_1', yNorm: 0.5, heightM: 1, widthM: 1, depthM: 0.4, xNorm: 0.5 } as Record<
    string,
    unknown
  >;
  let hoverWrite: Record<string, unknown> | null = null;
  let previewWrite: Record<string, unknown> | null = null;

  const handled = tryHandleManualLayoutSketchHoverModuleDividerFlow({
    App: {} as never,
    tool: 'sketch_box_divider',
    boxes: [box],
    setPreview: args => {
      previewWrite = args as Record<string, unknown>;
    },
    hitModuleKey: 0,
    hitSelectorObj: {} as never,
    hitLocalX: 0.2,
    internalCenterX: 0,
    woodThick: 0.018,
    innerW: 1.6,
    internalDepth: 0.5,
    internalZ: 0,
    bottomY: 0,
    spanH: 2,
    yClamped: 1,
    isBottom: true,
    __wp_resolveSketchBoxGeometry: resolveModuleBoxGeometry,
    __wp_readSketchBoxDividers: readSketchBoxDividers,
    __wp_readSketchBoxHorizontalDividers: readSketchBoxHorizontalDividers,
    __wp_resolveSketchBoxSegments: resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment: pickSketchBoxSegment,
    __wp_resolveSketchBoxVerticalSegments: resolveSketchBoxVerticalSegments,
    __wp_pickSketchBoxVerticalSegment: pickSketchBoxVerticalSegment,
    __wp_findNearestSketchBoxDivider: findNearestSketchBoxDivider,
    __wp_findNearestSketchBoxHorizontalDivider: findNearestSketchBoxHorizontalDivider,
    __wp_resolveSketchBoxDividerPlacement: resolveSketchBoxDividerPlacement,
    __wp_resolveSketchBoxHorizontalDividerPlacement: resolveSketchBoxHorizontalDividerPlacement,
    __wp_readSketchBoxDividerXNorm: readSketchBoxDividerXNorm,
    __wp_writeSketchHover: (_app, hover) => {
      hoverWrite = hover as Record<string, unknown>;
    },
  } as never);

  assert.equal(handled, true);
  assert.ok(hoverWrite);
  assert.ok(previewWrite);
  approx(Number(hoverWrite?.dividerXNorm), 0.7);
  assert.equal(hoverWrite?.snapToCenter, false);
  assert.equal(hoverWrite?.kind, 'box_content');
  assert.equal(hoverWrite?.contentKind, 'divider');
  assert.equal(previewWrite?.kind, 'drawer_divider');
  approx(Number(previewWrite?.x), 0.2);
  assert.equal(Array.isArray(previewWrite?.clearanceMeasurements), true);
  assert.equal((previewWrite?.clearanceMeasurements as unknown[]).length, 2);
  assert.ok(
    (previewWrite?.clearanceMeasurements as Array<{ role?: string; styleKey?: string }>).every(
      entry => entry.role === 'cell' && entry.styleKey === 'cell'
    )
  );
});

test('free sketch-box divider preview snaps only when cursor is near a segment midpoint', () => {
  const targetBox = { id: 'free_box_1' } as Record<string, unknown>;
  addSketchBoxDividerState(targetBox, 0.5, 'mid');
  const targetGeo = makeTargetGeo();

  const freePlacement = resolveSketchFreeSurfaceContentPreview({
    tool: 'sketch_box_divider',
    contentKind: 'divider',
    host: { moduleKey: 0, isBottom: true },
    target: {
      boxId: 'free_box_1',
      targetBox,
      targetGeo,
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: 0.1,
      pointerY: 1,
      pointerZ: -0.2,
    },
    wardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as never,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
    findNearestSketchBoxHorizontalDivider,
    resolveSketchBoxHorizontalDividerPlacement,
  });

  assert.ok(freePlacement);
  assert.equal(freePlacement?.hoverRecord.op, 'add');
  approx(Number(freePlacement?.preview.x), 0.1);
  assert.equal(freePlacement?.preview.snapToCenter, false);
  approx(Number(freePlacement?.preview.w), 1);
  approx(Number(freePlacement?.preview.z), 0);
  approx(Number(freePlacement?.hoverRecord.dividerFrontZ), 0.2);
  assert.equal(Array.isArray(freePlacement?.preview.clearanceMeasurements), true);
  assert.equal((freePlacement?.preview.clearanceMeasurements as unknown[]).length, 3);
  assert.ok(
    (freePlacement?.preview.clearanceMeasurements as Array<{ role?: string }>).some(
      entry => entry.role === 'neighbor'
    )
  );
  const dividerMeasurements = freePlacement?.preview.clearanceMeasurements as Array<{
    role?: string;
    startY?: number;
  }>;
  assert.ok(
    dividerMeasurements.filter(entry => entry.role === 'cell').every(entry => Number(entry.startY) > 1.48),
    'cell measurements should be offset outside the top edge of the divider box'
  );
  assert.ok(
    dividerMeasurements
      .filter(entry => entry.role === 'neighbor')
      .every(entry => Number(entry.startY) < 0.52),
    'neighbor measurements should be offset outside the measured divider gap'
  );

  const snapped = resolveSketchFreeSurfaceContentPreview({
    tool: 'sketch_box_divider',
    contentKind: 'divider',
    host: { moduleKey: 0, isBottom: true },
    target: {
      boxId: 'free_box_1',
      targetBox,
      targetGeo,
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: 0.241,
      pointerY: 1,
    },
    wardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as never,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
    findNearestSketchBoxHorizontalDivider,
    resolveSketchBoxHorizontalDividerPlacement,
  });

  assert.ok(snapped);
  assert.equal(snapped?.hoverRecord.op, 'add');
  assert.equal(snapped?.preview.snapToCenter, true);
  approx(Number(snapped?.preview.x), 0.2455, 0.01);
  assert.ok(Number(snapped?.preview.w) < 0.5);
});

test('horizontal sketch-box divider scopes later vertical dividers to the active height section', () => {
  const box = { id: 'box_sections' } as Record<string, unknown>;
  addSketchBoxHorizontalDividerState(box, 0.5, 'h-mid');
  addSketchBoxDividerState(box, 0.5, 'v-top', { yNorm: 0.75 });

  const dividers = readSketchBoxDividers(box);
  const horizontalDividers = readSketchBoxHorizontalDividers(box);
  const topSegments = resolveSketchBoxSegments({
    dividers,
    horizontalDividers,
    boxCenterX: 0,
    innerW: 1,
    boxCenterY: 0,
    innerH: 1,
    woodThick: 0.018,
    yNorm: 0.75,
  });
  const bottomSegments = resolveSketchBoxSegments({
    dividers,
    horizontalDividers,
    boxCenterX: 0,
    innerW: 1,
    boxCenterY: 0,
    innerH: 1,
    woodThick: 0.018,
    yNorm: 0.25,
  });

  assert.equal(
    topSegments.length,
    2,
    'top row should be divided by the vertical divider stored for that row'
  );
  assert.equal(bottomSegments.length, 1, 'bottom row should stay independent and unsplit');
});

test('free sketch-box horizontal divider preview exposes axis, y norm and vertical measurements', () => {
  const targetBox = { id: 'free_box_horizontal' } as Record<string, unknown>;
  const targetGeo = makeTargetGeo();

  const preview = resolveSketchFreeSurfaceContentPreview({
    tool: 'sketch_box_divider_horizontal',
    contentKind: 'divider',
    host: { moduleKey: 0, isBottom: true },
    target: {
      boxId: 'free_box_horizontal',
      targetBox,
      targetGeo,
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: 0,
      pointerY: 1.2,
      pointerZ: -0.2,
    },
    wardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as never,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
    findNearestSketchBoxHorizontalDivider,
    resolveSketchBoxHorizontalDividerPlacement,
  });

  assert.ok(preview);
  assert.equal(preview?.hoverRecord.dividerAxis, 'horizontal');
  assert.equal(preview?.preview.dividerAxis, 'horizontal');
  approx(Number(preview?.hoverRecord.dividerYNorm), 0.7);
  approx(Number(preview?.preview.y), 1.2);
  approx(Number(preview?.preview.h), 0.018);
  assert.equal(Array.isArray(preview?.preview.clearanceMeasurements), true);
  assert.ok((preview?.preview.clearanceMeasurements as unknown[]).length >= 2);
});

test('free sketch-box horizontal divider after vertical divider is scoped to the active column', () => {
  const targetBox = { id: 'free_box_vertical_first' } as Record<string, unknown>;
  addSketchBoxDividerState(targetBox, 0.5, 'v-mid');
  const targetGeo = makeTargetGeo();

  const preview = resolveSketchFreeSurfaceContentPreview({
    tool: 'sketch_box_divider_horizontal',
    contentKind: 'divider',
    host: { moduleKey: 0, isBottom: true },
    target: {
      boxId: 'free_box_vertical_first',
      targetBox,
      targetGeo,
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: 0.25,
      pointerY: 1.2,
      pointerZ: -0.2,
    },
    wardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as never,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
    findNearestSketchBoxHorizontalDivider,
    resolveSketchBoxHorizontalDividerPlacement,
  });

  assert.ok(preview);
  assert.equal(preview?.hoverRecord.dividerAxis, 'horizontal');
  assert.ok(Number(preview?.hoverRecord.dividerXNorm) > 0.5);
  assert.ok(Number(preview?.preview.x) > 0);
  assert.ok(Number(preview?.preview.w) < targetGeo.innerW);
});

test('free sketch-box vertical-first workflow keeps the vertical divider full-height before adding horizontal rows', () => {
  const targetBox = { id: 'free_box_vertical_then_horizontal', freePlacement: true } as Record<
    string,
    unknown
  >;
  const targetGeo = makeTargetGeo();

  const verticalPreview = resolveSketchFreeSurfaceContentPreview({
    tool: 'sketch_box_divider',
    contentKind: 'divider',
    host: { moduleKey: 0, isBottom: true },
    target: {
      boxId: 'free_box_vertical_then_horizontal',
      targetBox,
      targetGeo,
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: 0,
      pointerY: 1,
      pointerZ: -0.2,
    },
    wardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as never,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
    findNearestSketchBoxHorizontalDivider,
    resolveSketchBoxHorizontalDividerPlacement,
  });

  assert.ok(verticalPreview);
  assert.equal(verticalPreview?.hoverRecord.dividerAxis, 'vertical');
  assert.equal(
    verticalPreview?.hoverRecord.dividerYNorm,
    null,
    'a vertical divider added before any horizontal divider must stay full-height'
  );

  commitSketchModuleBoxContent({
    box: targetBox as never,
    boxId: 'free_box_vertical_then_horizontal',
    contentKind: 'divider',
    hoverRec: verticalPreview!.hoverRecord,
  });

  assert.equal(
    readSketchBoxDividers(targetBox)[0]?.yNorm,
    undefined,
    'committed vertical divider should not be row-scoped until a real horizontal row exists'
  );

  const horizontalPreview = resolveSketchFreeSurfaceContentPreview({
    tool: 'sketch_box_divider_horizontal',
    contentKind: 'divider',
    host: { moduleKey: 0, isBottom: true },
    target: {
      boxId: 'free_box_vertical_then_horizontal',
      targetBox,
      targetGeo,
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: -0.25,
      pointerY: 1.2,
      pointerZ: -0.2,
    },
    wardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as never,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
    findNearestSketchBoxHorizontalDivider,
    resolveSketchBoxHorizontalDividerPlacement,
  });

  assert.ok(horizontalPreview);
  assert.ok(
    Number(horizontalPreview?.hoverRecord.dividerXNorm) < 0.5,
    'horizontal divider should be stored on the left vertical segment'
  );
  assert.ok(
    Number(horizontalPreview?.preview.w) < targetGeo.innerW,
    'horizontal divider preview should be limited to the active column'
  );
});

test('free sketch-box doors respect horizontal rows created after a full-height vertical divider', () => {
  const targetBox = { id: 'free_box_door_cells', freePlacement: true } as Record<string, unknown>;
  const targetGeo = makeTargetGeo();

  const verticalPreview = resolveSketchFreeSurfaceContentPreview({
    tool: 'sketch_box_divider',
    contentKind: 'divider',
    host: { moduleKey: 0, isBottom: true },
    target: {
      boxId: 'free_box_door_cells',
      targetBox,
      targetGeo,
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: 0,
      pointerY: 1,
    },
    wardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as never,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
    findNearestSketchBoxHorizontalDivider,
    resolveSketchBoxHorizontalDividerPlacement,
  });
  assert.ok(verticalPreview);
  commitSketchModuleBoxContent({
    box: targetBox as never,
    boxId: 'free_box_door_cells',
    contentKind: 'divider',
    hoverRec: verticalPreview!.hoverRecord,
  });

  const horizontalPreview = resolveSketchFreeSurfaceContentPreview({
    tool: 'sketch_box_divider_horizontal',
    contentKind: 'divider',
    host: { moduleKey: 0, isBottom: true },
    target: {
      boxId: 'free_box_door_cells',
      targetBox,
      targetGeo,
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: -0.25,
      pointerY: 1.2,
      pointerZ: -0.2,
    },
    wardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as never,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
    findNearestSketchBoxHorizontalDivider,
    resolveSketchBoxHorizontalDividerPlacement,
  });
  assert.ok(horizontalPreview);
  commitSketchModuleBoxContent({
    box: targetBox as never,
    boxId: 'free_box_door_cells',
    contentKind: 'divider',
    hoverRec: horizontalPreview!.hoverRecord,
  });

  const upperDoorPreview = resolveSketchFreeDoorContentPreview({
    tool: 'sketch_box_door',
    contentKind: 'door',
    host: { moduleKey: 0, isBottom: true },
    target: {
      boxId: 'free_box_door_cells',
      targetBox,
      targetGeo,
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: -0.25,
      pointerY: 1.3,
    },
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });
  const lowerDoorPreview = resolveSketchFreeDoorContentPreview({
    tool: 'sketch_box_door',
    contentKind: 'door',
    host: { moduleKey: 0, isBottom: true },
    target: {
      boxId: 'free_box_door_cells',
      targetBox,
      targetGeo,
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: -0.25,
      pointerY: 0.7,
    },
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  assert.equal(upperDoorPreview.mode, 'preview');
  assert.equal(lowerDoorPreview.mode, 'preview');
  assert.ok(
    Number(upperDoorPreview.hoverRecord.contentXNorm) < 0.5,
    'upper door should stay in the left divided column instead of expanding to the full box'
  );
  assert.ok(
    Number(lowerDoorPreview.hoverRecord.contentXNorm) < 0.5,
    'lower door should stay in the left divided column instead of expanding to the full box'
  );
  assert.notEqual(
    upperDoorPreview.hoverRecord.boxYNorm,
    lowerDoorPreview.hoverRecord.boxYNorm,
    'doors in the split column must be stored as separate vertical cells'
  );
  assert.ok(Number(upperDoorPreview.preview.w) < targetGeo.innerW);
  assert.ok(Number(lowerDoorPreview.preview.w) < targetGeo.innerW);
});
