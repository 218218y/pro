import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleManualLayoutSketchHoverModuleDividerFlow } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_divider_flow.ts';
import { resolveSketchFreeSurfaceContentPreview } from '../esm/native/services/canvas_picking_sketch_free_surface_preview.ts';
import {
  addSketchBoxDividerState,
  findNearestSketchBoxDivider,
  pickSketchBoxSegment,
  readSketchBoxDividerXNorm,
  readSketchBoxDividers,
  resolveSketchBoxDividerPlacement,
  resolveSketchBoxSegments,
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
    __wp_resolveSketchBoxSegments: resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment: pickSketchBoxSegment,
    __wp_findNearestSketchBoxDivider: findNearestSketchBoxDivider,
    __wp_resolveSketchBoxDividerPlacement: resolveSketchBoxDividerPlacement,
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
    },
    wardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as never,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
  });

  assert.ok(freePlacement);
  assert.equal(freePlacement?.hoverRecord.op, 'add');
  approx(Number(freePlacement?.preview.x), 0.1);
  assert.equal(freePlacement?.preview.snapToCenter, false);
  approx(Number(freePlacement?.preview.w), 1);

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
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
  });

  assert.ok(snapped);
  assert.equal(snapped?.hoverRecord.op, 'add');
  assert.equal(snapped?.preview.snapToCenter, true);
  approx(Number(snapped?.preview.x), 0.2455, 0.01);
  assert.ok(Number(snapped?.preview.w) < 0.5);
});
