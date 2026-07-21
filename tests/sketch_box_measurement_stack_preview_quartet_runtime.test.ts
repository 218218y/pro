import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY,
  DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY,
  DRAWER_SKETCH_SIZING_POLICY,
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
} from '../esm/shared/dimensions/drawer_sketch_policy.ts';
import { SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY } from '../esm/shared/dimensions/sketch_box_preview_policy.ts';
import { decodeSketchBoxContentCommandHover } from '../esm/native/services/canvas_picking_sketch_box_content_command.ts';
import { resolveSketchBoxDrawersPreview } from '../esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts';
import { resolveSketchBoxExternalDrawersPreview } from '../esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts';
import { resolveSketchModuleDrawersPreview } from '../esm/native/services/canvas_picking_sketch_module_stack_preview_drawers.ts';
import { resolveSketchModuleExternalDrawersPreview } from '../esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts';

const EPSILON = 1e-12;
const host = { tool: 'sketch_int_drawers', moduleKey: 2, isBottom: false, ts: 7 } as const;

function assertClose(actual: unknown, expected: number, message?: string) {
  assert.equal(typeof actual, 'number', message);
  assert.ok(Math.abs(actual - expected) <= EPSILON, message ?? `${actual} != ${expected}`);
}

function firstMeasurement(preview: Record<string, unknown>) {
  const measurements = preview.clearanceMeasurements;
  assert.ok(Array.isArray(measurements));
  assert.ok(measurements.length > 0);
  return measurements[0] as Record<string, unknown>;
}

function createBoxArgs(args: {
  segmentWidth: number;
  innerDepth: number;
  selectedDrawerCount?: number | null;
  drawerHeightM?: number | null;
  targetBox?: Record<string, unknown>;
}) {
  const segment = {
    index: 0,
    centerX: 0.18,
    width: args.segmentWidth,
    xNorm: 0.5,
    leftX: 0.18 - args.segmentWidth / 2,
    rightX: 0.18 + args.segmentWidth / 2,
  };
  return {
    host,
    contentKind: 'drawers' as const,
    boxId: 'box-1',
    freePlacement: false,
    targetBox: args.targetBox ?? { drawers: [], extDrawers: [], shelves: [] },
    targetGeo: {
      centerX: 0.18,
      innerW: args.segmentWidth,
      innerD: args.innerDepth,
      innerBackZ: -0.24,
      outerW: args.segmentWidth + 0.036,
      centerZ: 0.04,
      outerD: args.innerDepth + 0.036,
    },
    targetCenterY: 1,
    targetHeight: 2,
    pointerX: 0.18,
    pointerY: 1,
    woodThick: 0.018,
    selectedDrawerCount: args.selectedDrawerCount,
    drawerHeightM: args.drawerHeightM ?? 0.2,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [segment],
    pickSketchBoxSegment: () => segment,
  };
}

function createModuleArgs(args: {
  innerWidth: number;
  internalDepth: number;
  selectedDrawerCount?: number | null;
  drawerHeightM?: number | null;
  selectorFrontEnvelope?: { centerX: number; centerZ: number; outerW: number; outerD: number } | null;
}) {
  return {
    host,
    contentKind: 'drawers' as const,
    moduleKey: 2,
    cfgRef: null,
    bottomY: 0,
    topY: 2,
    totalHeight: 2,
    pad: 0.018,
    desiredCenterY: 1,
    innerW: args.innerWidth,
    internalCenterX: 0.12,
    internalDepth: args.internalDepth,
    internalZ: -0.22,
    drawers: [],
    extDrawers: [],
    selectedDrawerCount: args.selectedDrawerCount,
    drawerHeightM: args.drawerHeightM ?? 0.2,
    woodThick: 0.018,
    selectorFrontEnvelope: args.selectorFrontEnvelope,
    isCornerKey: () => false,
  };
}

test('Sketch Box internal-drawer preview preserves focused width/depth boundaries and measurement placement', () => {
  const widthInputs = [
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewWidthClearanceM +
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinWidthM / 2,
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewWidthClearanceM +
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinWidthM,
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewWidthClearanceM +
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinWidthM * 2,
  ];
  const depthInputs = [
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewDepthClearanceM +
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinDepthM / 2,
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewDepthClearanceM +
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinDepthM,
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewDepthClearanceM +
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinDepthM * 2,
  ];

  for (let index = 0; index < widthInputs.length; index += 1) {
    const args = createBoxArgs({ segmentWidth: widthInputs[index], innerDepth: depthInputs[index] });
    const result = resolveSketchBoxDrawersPreview(args);
    assert.ok(result?.preview);
    const preview = result.preview as Record<string, unknown>;
    const expectedW = Math.max(
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinWidthM,
      widthInputs[index] - DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewWidthClearanceM
    );
    const expectedD = Math.max(
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinDepthM,
      depthInputs[index] - DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewDepthClearanceM
    );
    assertClose(preview.w, expectedW);
    assertClose(preview.d, expectedD);
    const measurement = firstMeasurement(preview);
    assert.equal(measurement.textScale, SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale);
    assertClose(
      measurement.z,
      args.targetGeo.innerBackZ +
        args.targetGeo.innerD / 2 +
        expectedD / 2 +
        Math.max(
          DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMeasurementZOffsetMinM,
          expectedD * DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMeasurementZOffsetDepthRatio
        )
    );
  }

  const result = resolveSketchBoxDrawersPreview(createBoxArgs({ segmentWidth: 0.9, innerDepth: 0.55 }));
  assert.ok(result);
  const decoded = decodeSketchBoxContentCommandHover(result.hoverRecord);
  assert.equal(decoded.ok, true);
  if (!decoded.ok) assert.fail(decoded.reason);
  assert.equal(decoded.value.command.kind, 'internal-drawers');
  assert.equal(decoded.value.command.boxId, 'box-1');
  assert.equal(decoded.value.command.freePlacement, false);
  assert.equal(decoded.value.command.drawerHeightM, 0.2);
});

test('Sketch module internal-drawer preview preserves focused boundaries, stack payload, and measurement scale', () => {
  const innerWidth =
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewWidthClearanceM +
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinWidthM * 2;
  const internalDepth =
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewDepthClearanceM +
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinDepthM / 2;
  const args = createModuleArgs({ innerWidth, internalDepth });
  const result = resolveSketchModuleDrawersPreview(args);
  assert.ok(result?.preview);
  const preview = result.preview as Record<string, unknown>;
  const expectedW = Math.max(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinWidthM,
    innerWidth - DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewWidthClearanceM
  );
  const expectedD = Math.max(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinDepthM,
    internalDepth - DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewDepthClearanceM
  );
  assertClose(preview.w, expectedW);
  assertClose(preview.d, expectedD);
  assert.equal(result.hoverRecord.kind, 'drawers');
  assert.equal(result.hoverRecord.op, 'add');
  assert.equal(result.hoverRecord.drawerHeightM, 0.2);
  assert.equal(result.hoverRecord.drawerH, preview.drawerH);
  assert.equal(result.hoverRecord.drawerGap, preview.drawerGap);
  assertClose(
    result.hoverRecord.stackH,
    (preview.drawerH as number) * DRAWER_SKETCH_SIZING_POLICY.internalStackCount +
      (preview.drawerGap as number) * (DRAWER_SKETCH_SIZING_POLICY.internalStackCount - 1)
  );
  const measurement = firstMeasurement(preview);
  assert.equal(measurement.textScale, SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale);
  assertClose(
    measurement.z,
    args.internalZ +
      expectedD / 2 +
      Math.max(
        DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMeasurementZOffsetMinM,
        expectedD * DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMeasurementZOffsetDepthRatio
      )
  );
});

test('Sketch Box external-drawer preview preserves default-count precedence and front-render focused owners', () => {
  const args = createBoxArgs({ segmentWidth: 0.9, innerDepth: 0.55, selectedDrawerCount: 0 });
  const result = resolveSketchBoxExternalDrawersPreview({ ...args, contentKind: 'ext_drawers' });
  assert.ok(result?.preview);
  const preview = result.preview as Record<string, unknown>;
  const faceWidth = Math.max(
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
    args.targetGeo.innerW - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM
  );
  const expectedW = Math.max(
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
    faceWidth - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM
  );
  const expectedZ =
    args.targetGeo.centerZ + args.targetGeo.outerD / 2 + EXTERNAL_DRAWER_FRONT_RENDER_POLICY.frontOffsetZM;
  assert.equal(
    (preview.drawers as unknown[]).length,
    DRAWER_SKETCH_SIZING_POLICY.externalPreviewDefaultCount
  );
  assertClose(preview.w, expectedW);
  assertClose(preview.d, EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM);
  assertClose(preview.z, expectedZ);
  const measurement = firstMeasurement(preview);
  assert.equal(measurement.textScale, SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale);
  assertClose(
    measurement.z,
    expectedZ +
      EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM / 2 +
      Math.max(
        DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMeasurementZOffsetMinM,
        EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM *
          DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMeasurementZOffsetThicknessRatio
      )
  );

  const explicit = resolveSketchBoxExternalDrawersPreview({
    ...createBoxArgs({ segmentWidth: 0.9, innerDepth: 0.55, selectedDrawerCount: 2 }),
    contentKind: 'ext_drawers',
  });
  assert.ok(explicit?.preview);
  assert.equal((explicit.preview.drawers as unknown[]).length, 2);
});

test('Sketch module external-drawer preview preserves selector envelope, default count, and focused front geometry', () => {
  const selectorFrontEnvelope = { centerX: 0.31, centerZ: 0.4, outerW: 1.1, outerD: 0.62 };
  const args = createModuleArgs({
    innerWidth: 0.9,
    internalDepth: 0.55,
    selectedDrawerCount: Number.NaN,
    selectorFrontEnvelope,
  });
  const result = resolveSketchModuleExternalDrawersPreview({ ...args, contentKind: 'ext_drawers' });
  assert.ok(result?.preview);
  const preview = result.preview as Record<string, unknown>;
  const outerW = Math.max(
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinWidthM,
    selectorFrontEnvelope.outerW
  );
  const expectedW = Math.max(
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
    outerW - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM
  );
  const frontPlaneZ = selectorFrontEnvelope.centerZ + selectorFrontEnvelope.outerD / 2;
  const expectedZ =
    frontPlaneZ +
    EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM / 2 +
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewFrontZOffsetM;
  assert.equal(result.hoverRecord.drawerCount, DRAWER_SKETCH_SIZING_POLICY.externalPreviewDefaultCount);
  assert.equal(
    (preview.drawers as unknown[]).length,
    DRAWER_SKETCH_SIZING_POLICY.externalPreviewDefaultCount
  );
  assertClose(preview.x, selectorFrontEnvelope.centerX);
  assertClose(preview.w, expectedW);
  assertClose(preview.d, EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM);
  assertClose(preview.z, expectedZ);
  const measurement = firstMeasurement(preview);
  assert.equal(measurement.textScale, SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale);
  assertClose(
    measurement.z,
    expectedZ +
      EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM / 2 +
      Math.max(
        DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMeasurementZOffsetMinM,
        EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM *
          DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMeasurementZOffsetThicknessRatio
      )
  );
});
