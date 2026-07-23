import test from 'node:test';
import assert from 'node:assert/strict';

import * as THREE from 'three';

import { DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY } from '../esm/shared/dimensions/drawer_sketch_policy.js';
import {
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
  EXTERNAL_DRAWER_SIZE_POLICY,
} from '../esm/shared/dimensions/external_drawer_policy.js';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.js';
import {
  SKETCH_BOX_DOOR_PREVIEW_POLICY,
  SKETCH_BOX_DRAWER_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.js';
import {
  resolveSketchBoxSegmentFaceSpan,
  resolveSketchBoxVisibleFrontOverlay,
} from '../esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.js';
import { resolveSketchFreeBoxGeometry } from '../esm/native/services/canvas_picking_sketch_free_boxes.js';
import { resolveSketchBoxSegments } from '../esm/native/services/canvas_picking_sketch_box_segments.js';
import { __wp_readSketchHover } from '../esm/native/services/canvas_picking_local_helpers.js';
import { tryHandleSketchBoxRegularExternalDrawersHoverPreview } from '../esm/native/services/canvas_picking_regular_ext_drawers_free_box.js';

type RecordMap = Record<string, unknown>;

type HarnessOptions = {
  box?: RecordMap;
  drawerType?: unknown;
  drawerCount?: unknown;
  pointerX?: number;
  pointerY?: number;
  rayDirectionZ?: number;
  omitCamera?: boolean;
  omitWardrobeGroup?: boolean;
  omitHost?: boolean;
};

const WARDROBE_BOX = {
  centerX: 0,
  centerY: 1,
  centerZ: 0,
  width: 2,
  height: 2,
  depth: 1,
};

function assertApprox(actual: unknown, expected: number, message?: string): void {
  assert.equal(typeof actual, 'number', message);
  assert.ok(Math.abs((actual as number) - expected) <= 1e-10, message);
}

function createDefaultBox(overrides: RecordMap = {}): RecordMap {
  return {
    id: 'box-1',
    freePlacement: true,
    absX: 0,
    absY: 1,
    widthM: 1,
    heightM: 1,
    depthM: 0.5,
    ...overrides,
  };
}

function asRecord(value: unknown): RecordMap {
  assert.ok(value && typeof value === 'object');
  return value as RecordMap;
}

function readCommand(App: RecordMap): RecordMap {
  const hover = asRecord(__wp_readSketchHover(App as never));
  assert.equal(hover.kind, 'box_content_command');
  assert.equal(hover.tool, 'ext_drawers_regular_free_box');
  assert.equal(hover.hostModuleKey, 0);
  assert.equal(hover.hostIsBottom, false);
  const envelope = asRecord(hover.boxContentCommand);
  assert.equal(envelope.version, 1);
  return asRecord(envelope.command);
}

function createHarness(options: HarnessOptions = {}) {
  const box = options.box ?? createDefaultBox();
  const moduleConfig = { sketchExtras: { boxes: [box] } };
  const state = {
    config: {
      modulesConfiguration: options.omitHost ? [] : [moduleConfig],
    },
    ui: {
      raw: { doors: options.omitHost ? 1 : 0 },
      currentExtDrawerType: options.drawerType ?? 'regular',
      currentExtDrawerCount: options.drawerCount ?? 2,
    },
    runtime: {},
    meta: {},
  };
  const wardrobeGroup = options.omitWardrobeGroup ? null : new THREE.Group();
  const cache: RecordMap = {};
  const App: RecordMap = {
    deps: { THREE },
    store: {
      getState: () => state,
      patch: () => undefined,
    },
    services: {
      runtimeCache: {
        noMainSketchWorkspaceMetrics: WARDROBE_BOX,
      },
    },
    render: {
      camera: options.omitCamera ? null : {},
      wardrobeGroup,
      cache,
    },
  };
  const pointerX = options.pointerX ?? 0;
  const pointerY = options.pointerY ?? 1;
  const raycaster = {
    ray: {
      origin: new THREE.Vector3(pointerX, pointerY, 1),
      direction: new THREE.Vector3(0, 0, options.rayDirectionZ ?? -1),
    },
    setFromCamera: () => undefined,
  };
  const previews: RecordMap[] = [];
  let hoverWasWrittenBeforePreview = false;

  const run = (setPreview = true): boolean =>
    tryHandleSketchBoxRegularExternalDrawersHoverPreview(
      {
        App: App as never,
        ndcX: 0,
        ndcY: 0,
        raycaster: raycaster as never,
        mouse: { x: 0, y: 0 },
        readUi: () => state.ui as never,
        readInteriorModuleConfigRef: () => moduleConfig as never,
      },
      {
        THREE,
        setPreview: setPreview
          ? args => {
              hoverWasWrittenBeforePreview = __wp_readSketchHover(App as never) != null;
              previews.push(args);
            }
          : null,
      }
    );

  return {
    App,
    box,
    previews,
    run,
    hoverWasWrittenBeforePreview: () => hoverWasWrittenBeforePreview,
  };
}

function resolveDefaultGeometry(box: RecordMap): ReturnType<typeof resolveSketchFreeBoxGeometry> {
  return resolveSketchFreeBoxGeometry({
    wardrobeWidth: WARDROBE_BOX.width,
    wardrobeDepth: WARDROBE_BOX.depth,
    backZ: WARDROBE_BOX.centerZ - WARDROBE_BOX.depth / 2,
    centerX: Number(box.absX),
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    widthM: Number(box.widthM),
    depthM: Number(box.depthM),
  });
}

test('regular external-drawer hover fails closed for invalid routing and missing context', () => {
  assert.equal(createHarness({ drawerType: 'unknown' }).run(), false);
  assert.equal(createHarness().run(false), false);
  assert.equal(createHarness({ omitHost: true }).run(), false);
  assert.equal(createHarness({ omitCamera: true }).run(), false);
  assert.equal(createHarness({ omitWardrobeGroup: true }).run(), false);
  assert.equal(createHarness({ rayDirectionZ: 0 }).run(), false);
  assert.equal(createHarness({ pointerX: 5 }).run(), false);
});

test('regular add uses focused sizing, material, fallback face geometry, and canonical command fields', () => {
  const harness = createHarness({ drawerType: 'regular', drawerCount: 2 });

  assert.equal(harness.run(), true);
  assert.equal(harness.hoverWasWrittenBeforePreview(), true);
  assert.equal(harness.previews.length, 1);

  const preview = harness.previews[0]!;
  const geometry = resolveDefaultGeometry(harness.box);
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const regularHeight = EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM;
  const baseY = Number(harness.box.absY) - Number(harness.box.heightM) / 2 + woodThick;
  const expectedWidth = Math.max(
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
    geometry.innerW - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM
  );
  const expectedDrawerHeight = Math.max(
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM,
    regularHeight - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM
  );

  assert.equal(preview.kind, 'ext_drawers');
  assert.equal(preview.op, 'add');
  assert.equal(preview.blockedReason, undefined);
  assert.equal(preview.anchorParent, (harness.App.render as RecordMap).wardrobeGroup);
  assertApprox(preview.x, geometry.centerX);
  assertApprox(preview.y, baseY);
  assertApprox(
    preview.z,
    geometry.centerZ + geometry.outerD / 2 + EXTERNAL_DRAWER_FRONT_RENDER_POLICY.frontOffsetZM
  );
  assertApprox(preview.w, expectedWidth);
  assertApprox(preview.d, EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM);
  assertApprox(preview.woodThick, woodThick);
  assert.deepEqual(preview.drawers, [
    { y: baseY + regularHeight / 2, h: expectedDrawerHeight },
    { y: baseY + regularHeight + regularHeight / 2, h: expectedDrawerHeight },
  ]);

  const command = readCommand(harness.App);
  assert.deepEqual(command, {
    kind: 'regular-external-drawers',
    boxId: 'box-1',
    freePlacement: true,
    op: 'add',
    removeId: null,
    contentXNorm: 0.5,
    boxYNorm: 0.5,
    boxBaseYNorm: 0,
    drawerCount: 2,
    hasShoeDrawer: false,
    drawerHeightM: regularHeight,
    blockedReason: null,
  });
});

test('active horizontal and vertical segments drive face, base, and normalized command identity', () => {
  const box = createDefaultBox({
    dividers: [{ id: 'divider-x', xNorm: 0.5 }],
    horizontalDividers: [{ id: 'divider-y', yNorm: 0.5 }],
  });
  const harness = createHarness({
    box,
    pointerX: -0.2,
    pointerY: 1.25,
    drawerType: 'regular',
    drawerCount: 2,
  });

  assert.equal(harness.run(), true);
  const preview = harness.previews[0]!;
  const command = readCommand(harness.App);
  const geometry = resolveDefaultGeometry(box);
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;

  assert.equal(command.kind, 'regular-external-drawers');
  assert.equal(command.op, 'add');
  assert.equal(typeof command.contentXNorm, 'number');
  assert.ok((command.contentXNorm as number) < 0.5);
  assert.equal(typeof command.boxYNorm, 'number');
  assert.ok((command.boxYNorm as number) > 0.5);
  assertApprox(
    command.boxBaseYNorm,
    (Number(preview.y) - (Number(box.absY) - Number(box.heightM) / 2)) / Number(box.heightM)
  );
  assertApprox(preview.y, Number(box.absY) + woodThick / 2);
  const activeSegmentWidth = geometry.innerW / 2 - woodThick / 2;
  assertApprox(preview.x, geometry.centerX - geometry.innerW / 4 - woodThick / 4);
  assertApprox(
    preview.w,
    Math.max(
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
      activeSegmentWidth - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM
    )
  );
});

test('regular add/remove preserves shoe state and offsets regular stacks above the shoe drawer', () => {
  const existing = {
    id: 'regular-existing',
    xNorm: 0.5,
    yNormC: 0.5,
    count: 2,
    hasShoeDrawer: true,
  };
  const removeHarness = createHarness({
    box: createDefaultBox({ regularExtDrawers: [existing] }),
    drawerType: 'regular',
    drawerCount: 2,
  });

  assert.equal(removeHarness.run(), true);
  assert.equal(removeHarness.previews[0]?.op, 'remove');
  assert.deepEqual(readCommand(removeHarness.App), {
    kind: 'regular-external-drawers',
    boxId: 'box-1',
    freePlacement: true,
    op: 'remove',
    removeId: 'regular-existing',
    contentXNorm: 0.5,
    boxYNorm: 0.5,
    boxBaseYNorm: 0,
    drawerCount: 0,
    hasShoeDrawer: true,
    drawerHeightM: EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM,
    blockedReason: null,
  });

  const addHarness = createHarness({
    box: createDefaultBox({ regularExtDrawers: [existing] }),
    drawerType: 'regular',
    drawerCount: 3,
  });
  assert.equal(addHarness.run(), true);
  const command = readCommand(addHarness.App);
  assert.equal(command.op, 'add');
  assert.equal(command.drawerCount, 3);
  assert.equal(command.hasShoeDrawer, true);
  assert.equal(command.removeId, 'regular-existing');

  const preview = addHarness.previews[0]!;
  const drawers = preview.drawers as RecordMap[];
  const baseY =
    Number(addHarness.box.absY) -
    Number(addHarness.box.heightM) / 2 +
    MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  assertApprox(
    drawers[0]?.y,
    baseY + EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM + EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM / 2
  );
  assert.ok(Number(drawers[1]?.y) > Number(drawers[0]?.y));
  assert.ok(Number(drawers[2]?.y) > Number(drawers[1]?.y));
});

test('shoe add/remove preserves the regular count and uses focused shoe geometry', () => {
  const baseItem = {
    id: 'regular-existing',
    xNorm: 0.5,
    yNormC: 0.5,
    count: 2,
    hasShoeDrawer: false,
  };
  const addHarness = createHarness({
    box: createDefaultBox({ regularExtDrawers: [baseItem] }),
    drawerType: 'shoe',
  });

  assert.equal(addHarness.run(), true);
  const addCommand = readCommand(addHarness.App);
  assert.equal(addCommand.op, 'add');
  assert.equal(addCommand.drawerCount, 2);
  assert.equal(addCommand.hasShoeDrawer, true);
  assert.equal(addCommand.drawerHeightM, EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM);
  const shoePreview = (addHarness.previews[0]?.drawers as RecordMap[])[0]!;
  assertApprox(
    shoePreview.h,
    Math.max(
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM,
      EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM
    )
  );

  const removeHarness = createHarness({
    box: createDefaultBox({
      regularExtDrawers: [{ ...baseItem, hasShoeDrawer: true }],
    }),
    drawerType: 'shoe',
  });
  assert.equal(removeHarness.run(), true);
  assert.equal(removeHarness.previews[0]?.op, 'remove');
  const removeCommand = readCommand(removeHarness.App);
  assert.equal(removeCommand.op, 'remove');
  assert.equal(removeCommand.removeId, 'regular-existing');
  assert.equal(removeCommand.drawerCount, 2);
  assert.equal(removeCommand.hasShoeDrawer, false);
});

test('insufficient stack space returns a no-room blocked preview without a removal identity', () => {
  const harness = createHarness({
    box: createDefaultBox({ heightM: 0.3 }),
    drawerType: 'regular',
    drawerCount: 3,
  });

  assert.equal(harness.run(), true);
  assert.equal(harness.previews[0]?.op, 'blocked');
  assert.equal(harness.previews[0]?.blockedReason, 'no-room');
  const command = readCommand(harness.App);
  assert.equal(command.op, 'add');
  assert.equal(command.removeId, null);
  assert.equal(command.blockedReason, 'no-room');
});

test('front overlay wins over fallback geometry and narrow faces retain the focused width floor', () => {
  const overlayBox = createDefaultBox({
    extDrawers: [{ id: 'sketch-external', xNorm: 0.5, yNormC: 0.5 }],
  });
  const overlayHarness = createHarness({ box: overlayBox, drawerCount: 1 });

  assert.equal(overlayHarness.run(), true);
  const overlayPreview = overlayHarness.previews[0]!;
  const overlayGeometry = resolveDefaultGeometry(overlayBox);
  assertApprox(
    overlayPreview.w,
    Math.max(
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
      Math.max(
        SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM,
        overlayGeometry.outerW - SKETCH_BOX_DOOR_PREVIEW_POLICY.frontOverlayWidthClearanceM
      ) - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM
    )
  );
  assertApprox(overlayPreview.d, SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewThicknessM);
  assertApprox(
    overlayPreview.z,
    overlayGeometry.centerZ +
      overlayGeometry.outerD / 2 +
      SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewThicknessM / 2 +
      SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewZOffsetM
  );

  const segmentedOverlayShell = createDefaultBox({
    dividers: [{ id: 'divider-x', xNorm: 0.5 }],
  });
  const segmentedOverlayGeometry = resolveDefaultGeometry(segmentedOverlayShell);
  const segments = resolveSketchBoxSegments({
    dividers: segmentedOverlayShell.dividers as never[],
    boxCenterX: segmentedOverlayGeometry.centerX,
    innerW: segmentedOverlayGeometry.innerW,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  });
  const [leftSegment] = segments;
  assert.ok(leftSegment);
  const segmentedOverlayBox = {
    ...segmentedOverlayShell,
    extDrawers: [{ id: 'sketch-external-left', xNorm: leftSegment.xNorm, yNormC: 0.5 }],
  };
  const segmentedOverlayHarness = createHarness({
    box: segmentedOverlayBox,
    pointerX: -0.2,
    drawerCount: 1,
  });
  assert.equal(segmentedOverlayHarness.run(), true);
  const faceSpan = resolveSketchBoxSegmentFaceSpan({
    boxCenterX: segmentedOverlayGeometry.centerX,
    innerW: segmentedOverlayGeometry.innerW,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    segment: leftSegment,
  });
  const resolvedOverlay = resolveSketchBoxVisibleFrontOverlay({
    box: segmentedOverlayBox,
    boxCenterY: Number(segmentedOverlayBox.absY),
    boxHeight: Number(segmentedOverlayBox.heightM),
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    geo: segmentedOverlayGeometry,
    segments,
    segment: leftSegment,
    fullBoxCenterY: Number(segmentedOverlayBox.absY),
    fullBoxInnerH: Number(segmentedOverlayBox.heightM),
  });
  assert.ok(resolvedOverlay !== null);
  const segmentedOverlayPreview = segmentedOverlayHarness.previews[0]!;
  assert.equal(segmentedOverlayPreview.x, resolvedOverlay.x);
  assert.equal(segmentedOverlayPreview.x, faceSpan.centerX);
  assert.notEqual(segmentedOverlayPreview.x, leftSegment.centerX);
  assert.notEqual(segmentedOverlayPreview.x, segmentedOverlayGeometry.centerX);

  const narrowHarness = createHarness({
    box: createDefaultBox({ widthM: 0.06 }),
    drawerCount: 1,
  });
  assert.equal(narrowHarness.run(), true);
  assertApprox(
    narrowHarness.previews[0]?.w,
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM
  );
});
