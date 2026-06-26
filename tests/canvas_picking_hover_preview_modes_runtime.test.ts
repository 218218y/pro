import test from 'node:test';
import assert from 'node:assert/strict';

import {
  tryHandleCellDimsHoverPreview,
  tryHandleDrawerDividerHoverPreview,
  tryHandleExtDrawersHoverPreview,
} from '../esm/native/services/canvas_picking_hover_preview_modes.ts';
import { updateRenderLoopDrawerMotions } from '../esm/native/platform/render_loop_motion_drawers.ts';

function createApp(overrides: Record<string, unknown> = {}) {
  const state = {
    config: {
      modulesConfiguration: [{}],
      ...((overrides.state as any)?.config || {}),
    },
    ...((overrides.state as object) || {}),
  };
  return {
    deps: { THREE: { tag: 'THREE' }, ...((overrides.deps as object) || {}) },
    store: {
      getState: () => state,
      patch() {},
    },
    services: {
      builder: {
        renderOps: {
          ...((overrides.renderOps as object) || {}),
        },
      },
      ...((overrides.services as object) || {}),
    },
    render: {
      camera: { id: 'camera' },
      wardrobeGroup: { id: 'wardrobe' },
      ...((overrides.render as object) || {}),
    },
  } as any;
}

test('ext-drawers hover preview uses canonical preview wiring and toggles remove when drawer count already matches', () => {
  const previews: any[] = [];
  const hidden: any[] = [];
  const App = createApp({
    renderOps: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
      hideSketchPlacementPreview(args: unknown) {
        hidden.push(args);
      },
    },
  });

  const handled = tryHandleExtDrawersHoverPreview({
    App,
    ndcX: 0.2,
    ndcY: -0.1,
    raycaster: {},
    mouse: {},
    isExtDrawerEditMode: true,
    hideLayoutPreview(args: unknown) {
      hidden.push(args);
    },
    readUi: () => ({ currentExtDrawerType: 'regular', currentExtDrawerCount: 3 }),
    resolveInteriorHoverTarget: () => ({
      hitModuleKey: 0,
      hitSelectorObj: { id: 'selector-1' },
      isBottom: false,
      hitY: 0.5,
      info: {},
      bottomY: 0,
      topY: 2,
      spanH: 2,
      woodThick: 0.018,
      innerW: 0.9,
      internalCenterX: 0.1,
      internalDepth: 0.5,
      internalZ: -0.05,
      backZ: -0.3,
      regularDepth: 0.45,
      intersects: [],
    }),
    measureObjectLocalBox: () => ({
      centerX: 0.1,
      centerY: 1,
      centerZ: -0.02,
      width: 0.92,
      height: 2,
      depth: 0.55,
    }),
    readInteriorModuleConfigRef: () => ({ extDrawersCount: 3, hasShoeDrawer: false }),
  });

  assert.equal(handled, true);
  assert.equal(hidden.length, 1);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'ext_drawers');
  assert.equal(previews[0].op, 'remove');
  assert.equal(previews[0].drawers.length, 3);
  assert.equal(previews[0].anchor.id, 'selector-1');
});

test('ext-drawers hover preview marks impossible regular drawer count as blocked instead of blue add', () => {
  const previews: any[] = [];
  const hidden: any[] = [];
  const App = createApp({
    renderOps: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
      hideSketchPlacementPreview(args: unknown) {
        hidden.push(args);
      },
    },
  });

  const handled = tryHandleExtDrawersHoverPreview({
    App,
    ndcX: 0.2,
    ndcY: -0.1,
    raycaster: {},
    mouse: {},
    isExtDrawerEditMode: true,
    hideLayoutPreview(args: unknown) {
      hidden.push(args);
    },
    readUi: () => ({ currentExtDrawerType: 'regular', currentExtDrawerCount: 3 }),
    resolveInteriorHoverTarget: () => ({
      hitModuleKey: 0,
      hitSelectorObj: { id: 'selector-no-room' },
      isBottom: true,
      hitY: 0.3,
      info: { startY: 0, woodThick: 0.018, effectiveTopY: 0.582 },
      bottomY: 0.018,
      topY: 0.582,
      spanH: 0.564,
      woodThick: 0.018,
      innerW: 0.9,
      internalCenterX: 0.1,
      internalDepth: 0.5,
      internalZ: -0.05,
      backZ: -0.3,
      regularDepth: 0.45,
      intersects: [],
    }),
    measureObjectLocalBox: () => ({
      centerX: 0.1,
      centerY: 0.3,
      centerZ: -0.02,
      width: 0.92,
      height: 0.6,
      depth: 0.55,
    }),
    readInteriorModuleConfigRef: () => ({ extDrawersCount: 0, hasShoeDrawer: false }),
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'ext_drawers');
  assert.equal(previews[0].op, 'blocked');
  assert.equal(previews[0].blockedReason, 'no-room');
  assert.equal(previews[0].drawers.length, 3);
  assert.equal(previews[0].anchor.id, 'selector-no-room');
});

test('ext-drawers hover preview marks hex cells as blocked instead of blue add', () => {
  const previews: any[] = [];
  const hidden: any[] = [];
  const App = createApp({
    renderOps: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
      hideSketchPlacementPreview(args: unknown) {
        hidden.push(args);
      },
    },
  });

  const handled = tryHandleExtDrawersHoverPreview({
    App,
    ndcX: 0.2,
    ndcY: -0.1,
    raycaster: {},
    mouse: {},
    isExtDrawerEditMode: true,
    hideLayoutPreview(args: unknown) {
      hidden.push(args);
    },
    readUi: () => ({ currentExtDrawerType: 'regular', currentExtDrawerCount: 3 }),
    resolveInteriorHoverTarget: () => ({
      hitModuleKey: 0,
      hitSelectorObj: { id: 'selector-hex-cell' },
      isBottom: false,
      hitY: 0.5,
      info: {},
      bottomY: 0,
      topY: 2,
      spanH: 2,
      woodThick: 0.018,
      innerW: 0.9,
      internalCenterX: 0.1,
      internalDepth: 0.5,
      internalZ: -0.05,
      backZ: -0.3,
      regularDepth: 0.45,
      intersects: [],
    }),
    measureObjectLocalBox: () => ({
      centerX: 0.1,
      centerY: 1,
      centerZ: -0.02,
      width: 0.92,
      height: 2,
      depth: 0.55,
    }),
    readInteriorModuleConfigRef: () => ({ hexCell: { enabled: true }, extDrawersCount: 0 }),
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'ext_drawers');
  assert.equal(previews[0].op, 'blocked');
  assert.equal(previews[0].blockedReason, 'hex-cell');
  assert.equal(previews[0].anchor.id, 'selector-hex-cell');
});

test('regular external drawer hover removal previews the entire sketch external drawer stack', () => {
  const previews: any[] = [];
  const parent = { id: 'wardrobe-parent' };
  const makeGroup = (id: string, y: number) => ({
    id,
    parent,
    userData: {
      partId: `sketch_ext_drawers_1_sed123_${id}`,
      moduleIndex: 1,
      __wpSketchExtDrawer: true,
      __wpSketchExtDrawerId: 'sed123',
    },
    geometry: { parameters: { width: 0.8, height: 0.18, depth: 0.08 } },
    position: { x: 0, y, z: 0.25 },
    scale: { x: 1, y: 1, z: 1 },
  });
  const g1 = makeGroup('1', 0.3);
  const g2 = makeGroup('2', 0.55);
  const g3 = makeGroup('3', 0.8);
  const App = createApp({
    render: {
      drawersArray: [
        { id: 'sketch_ext_drawers_1_sed123_1', group: g1 },
        { id: 'sketch_ext_drawers_1_sed123_2', group: g2 },
        { id: 'sketch_ext_drawers_1_sed123_3', group: g3 },
      ],
    },
    renderOps: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
    },
  });

  const handled = tryHandleExtDrawersHoverPreview({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: {},
    mouse: {},
    isExtDrawerEditMode: true,
    readUi: () => ({ currentExtDrawerType: 'regular', currentExtDrawerCount: 3 }),
    resolveDrawerHoverPreviewTarget: () => ({
      drawer: { id: 'sketch_ext_drawers_1_sed123_2', group: g2 },
      parent,
      box: { centerX: 0, centerY: 0.55, centerZ: 0.25, width: 0.8, height: 0.18, depth: 0.08 },
    }),
    resolveInteriorHoverTarget: () => null,
    measureObjectLocalBox: (_App, obj) => {
      const rec = obj as any;
      return {
        centerX: rec.position.x,
        centerY: rec.position.y,
        centerZ: rec.position.z,
        width: rec.geometry.parameters.width,
        height: rec.geometry.parameters.height,
        depth: rec.geometry.parameters.depth,
      };
    },
    readInteriorModuleConfigRef: () => ({}),
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'ext_drawers');
  assert.equal(previews[0].op, 'remove');
  assert.equal(previews[0].drawers.length, 3);
  assert.deepEqual(
    previews[0].drawers.map((drawer: any) => drawer.y),
    [0.3, 0.55, 0.8]
  );
});

test('regular external drawer hover removal previews sketch internal drawers instead of add hover', () => {
  const previews: any[] = [];
  const parent = { id: 'wardrobe-parent' };
  const makeGroup = (y: number) => ({
    id: 'div_int_sketch_1_sid-1',
    parent,
    userData: { partId: 'div_int_sketch_1_sid-1', moduleIndex: '1' },
    geometry: { parameters: { width: 0.82, height: 0.16, depth: 0.38 } },
    position: { x: 0.1, y, z: 0.05 },
    scale: { x: 1, y: 1, z: 1 },
  });
  const bottom = makeGroup(0.35);
  const top = makeGroup(0.55);
  const App = createApp({
    render: {
      drawersArray: [
        { id: 'div_int_sketch_1_sid-1', group: bottom },
        { id: 'div_int_sketch_1_sid-1', group: top },
      ],
    },
    renderOps: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
    },
  });

  const handled = tryHandleExtDrawersHoverPreview({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: {},
    mouse: {},
    isExtDrawerEditMode: true,
    readUi: () => ({ currentExtDrawerType: 'regular', currentExtDrawerCount: 3 }),
    resolveDrawerHoverPreviewTarget: () => ({
      drawer: { id: 'div_int_sketch_1_sid-1', group: top },
      parent,
      box: { centerX: 0.1, centerY: 0.55, centerZ: 0.05, width: 0.82, height: 0.16, depth: 0.38 },
    }),
    resolveInteriorHoverTarget: () => {
      throw new Error('internal drawer direct hover should be handled before add-preview routing');
    },
    measureObjectLocalBox: (_App, obj) => {
      const rec = obj as any;
      return {
        centerX: rec.position.x,
        centerY: rec.position.y,
        centerZ: rec.position.z,
        width: rec.geometry.parameters.width,
        height: rec.geometry.parameters.height,
        depth: rec.geometry.parameters.depth,
      };
    },
    readInteriorModuleConfigRef: () => ({}),
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'drawers');
  assert.equal(previews[0].op, 'remove');
  assert.ok(Math.abs(Number(previews[0].y) - 0.27) < 1e-9);
  assert.ok(Math.abs(Number(previews[0].drawerGap) - 0.04) < 1e-9);
});

test('drawer-divider hover preview resolves add/remove directly from canonical config state', () => {
  const previews: any[] = [];
  const hidden: any[] = [];
  const App = createApp({
    state: {
      config: {
        drawerDividersMap: { 'div:int_4': true },
      },
    },
    renderOps: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
      hideSketchPlacementPreview(args: unknown) {
        hidden.push(args);
      },
    },
  });

  const handled = tryHandleDrawerDividerHoverPreview({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: {},
    mouse: {},
    isDividerEditMode: true,
    hideLayoutPreview(args: unknown) {
      hidden.push(args);
    },
    resolveDrawerHoverPreviewTarget: () => ({
      drawer: { id: 'int_4', dividerKey: 'div:int_4', group: { id: 'drawer-group' } },
      parent: { id: 'wardrobe-parent' },
      box: { centerX: 0.2, centerY: 0.7, centerZ: -0.1, width: 0.4, height: 0.3, depth: 0.25 },
    }),
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'drawer_divider');
  assert.equal(previews[0].op, 'remove');
  assert.equal(previews[0].anchor.id, 'drawer-group');
  assert.equal(previews[0].anchorParent.id, 'wardrobe-parent');
});

test('drawer-divider hover preview keeps closed drawers unchanged and reflects already-open drawer position', () => {
  const previews: any[] = [];
  const App = createApp({
    state: {
      config: {
        drawerDividersMap: {},
      },
    },
    renderOps: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
    },
  });

  const closedGroup = { id: 'closed-group', position: { x: 0, y: 0, z: 0 } };
  const openGroup = { id: 'open-group', position: { x: 0, y: 0, z: 0.45 } };
  const parent = { id: 'wardrobe-parent' };
  const closedBox = { centerX: 0.2, centerY: 0.7, centerZ: -0.1, width: 0.4, height: 0.3, depth: 0.25 };
  const openBox = { centerX: 0.2, centerY: 0.7, centerZ: 0.35, width: 0.4, height: 0.3, depth: 0.25 };

  const closedHandled = tryHandleDrawerDividerHoverPreview({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: {},
    mouse: {},
    isDividerEditMode: true,
    resolveDrawerHoverPreviewTarget: () => ({
      drawer: {
        id: 'int_closed',
        group: closedGroup,
        isOpen: false,
        closed: { x: 0, y: 0, z: 0 },
        open: { x: 0, y: 0, z: 0.45 },
      },
      parent,
      box: closedBox,
    }),
  });

  const openHandled = tryHandleDrawerDividerHoverPreview({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: {},
    mouse: {},
    isDividerEditMode: true,
    resolveDrawerHoverPreviewTarget: () => ({
      drawer: {
        id: 'int_open',
        group: openGroup,
        isOpen: true,
        closed: { x: 0, y: 0, z: 0 },
        open: { x: 0, y: 0, z: 0.45 },
      },
      parent,
      box: openBox,
    }),
  });

  assert.equal(closedHandled, true);
  assert.equal(openHandled, true);
  assert.equal(previews.length, 2);
  assert.equal(previews[0].z, -0.1);
  assert.equal(previews[0].anchorParent, parent);
  assert.ok(Math.abs(previews[1].z - 0.35) < 1e-9);
  assert.equal(previews[1].anchorParent, parent);
  assert.equal(previews[1].anchor, openGroup);
});

test('drawer-divider hover preview uses the live forced-open drawer position before animation advances', () => {
  const previews: any[] = [];
  const App = createApp({
    state: {
      config: {
        drawerDividersMap: {},
      },
    },
    services: {
      tools: {
        getDrawersOpenId() {
          return 'int_forced';
        },
      },
    },
    renderOps: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
    },
  });

  const handled = tryHandleDrawerDividerHoverPreview({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: {},
    mouse: {},
    isDividerEditMode: true,
    resolveDrawerHoverPreviewTarget: () => ({
      drawer: {
        id: 'int_forced',
        group: { id: 'forced-group', position: { x: 0, y: 0, z: 0.1 } },
        isOpen: false,
        closed: { x: 0, y: 0, z: 0 },
        open: { x: 0, y: 0, z: 0.6 },
      },
      parent: { id: 'wardrobe-parent' },
      box: { centerX: 0.2, centerY: 0.7, centerZ: 0, width: 0.4, height: 0.3, depth: 0.25 },
    }),
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.ok(Math.abs(previews[0].z - 0) < 1e-9);
  assert.equal(previews[0].drawerMotionPreview, true);
  assert.equal(previews[0].drawerMotionDrawerId, 'int_forced');
  assert.ok(Math.abs(previews[0].drawerMotionOffsetZ - 0.1) < 1e-9);
});

test('drawer-divider motion preview follows the live drawer animation frame instead of jumping to the target', () => {
  const makePos = (x: number, y: number, z: number) => ({
    x,
    y,
    z,
    set(nx: number, ny: number, nz: number) {
      this.x = nx;
      this.y = ny;
      this.z = nz;
    },
  });
  const drawerPosition = {
    x: 0,
    y: 0,
    z: 0,
    lerp(target: { x: number; y: number; z: number }, alpha: number) {
      this.x += (target.x - this.x) * alpha;
      this.y += (target.y - this.y) * alpha;
      this.z += (target.z - this.z) * alpha;
    },
  };
  const boxTop = { position: makePos(0.2, 0.7, -0.1) };
  const shelfA = { position: makePos(0.2, 0.7, -0.1) };
  const App = createApp({
    render: {
      cache: {
        sketchPlacementPreview: {
          visible: true,
          userData: {
            __boxTop: boxTop,
            __shelfA: shelfA,
            __drawerDividerMotionPreview: {
              drawerId: 'int_forced',
              closedX: 0,
              closedY: 0,
              closedZ: 0,
              boxBaseX: 0.2,
              boxBaseY: 0.7,
              boxBaseZ: -0.1,
              shelfBaseX: 0.2,
              shelfBaseY: 0.7,
              shelfBaseZ: -0.1,
            },
          },
        },
      },
      drawersArray: [
        {
          id: 'int_forced',
          isInternal: true,
          group: { position: drawerPosition },
          closed: { x: 0, y: 0, z: 0 },
          open: { x: 0, y: 0, z: 0.6 },
          isOpen: false,
        },
      ],
    },
  });

  const active = updateRenderLoopDrawerMotions(
    App,
    {
      hasInternalDrawers: true,
      doorsShouldBeOpen: false,
      internalDrawersShouldBeOpen: false,
      externalDrawersShouldBeOpen: false,
      isAnimating: true,
      isActiveState: true,
      globalClickMode: true,
      platformDimsFrame: null,
      doorsOpenFlag: false,
      sketchEditActive: false,
      sketchIntDrawersEditActive: false,
      sketchExtDrawersEditActive: false,
      forcedOpenDrawerId: 'int_forced',
      manualTool: null,
      delayTime: 0,
      timeSinceToggle: 0,
      localDoorModules: new Set<string>(),
      hasAnyLocalOpenDoor: false,
      visibleOpenInternalDrawerModules: new Set<string>(),
    },
    { now: () => 0, debugLog() {} }
  );

  assert.equal(active, true);
  assert.ok(drawerPosition.z > 0 && drawerPosition.z < 0.6);
  assert.ok(Math.abs(boxTop.position.z - (-0.1 + drawerPosition.z)) < 1e-9);
  assert.ok(Math.abs(shelfA.position.z - (-0.1 + drawerPosition.z)) < 1e-9);
  assert.ok(boxTop.position.z < 0.5);
});

test('cell-dims hover preview projects resized selector bounds through the canonical preview seam', () => {
  const previews: any[] = [];
  const hidden: any[] = [];
  const App = createApp({
    state: {
      config: {
        modulesConfiguration: [{ specialDims: { baseWidthCm: 90, widthCm: 90 } }],
      },
    },
  });

  const handled = tryHandleCellDimsHoverPreview({
    App,
    ndcX: 0.1,
    ndcY: 0.2,
    raycaster: {},
    mouse: {},
    isCellDimsMode: true,
    hideLayoutPreview(args: unknown) {
      hidden.push(['layout', args]);
    },
    hideSketchPreview(args: unknown) {
      hidden.push(['sketch', args]);
    },
    previewRo: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
    },
    resolveInteriorHoverTarget: () => ({
      hitModuleKey: 0,
      hitSelectorObj: { id: 'selector-2' },
      isBottom: false,
      hitY: 0.5,
      info: {},
      bottomY: 0,
      topY: 2,
      spanH: 2,
      woodThick: 0.018,
      innerW: 0.864,
      internalCenterX: 0,
      internalDepth: 0.5,
      internalZ: 0,
      backZ: -0.25,
      regularDepth: 0.45,
      intersects: [],
    }),
    measureObjectLocalBox: () => ({
      centerX: 0,
      centerY: 0.5,
      centerZ: 0,
      width: 0.9,
      height: 1,
      depth: 0.5,
    }),
    readCellDimsDraft: () => ({ applyW: 100, applyH: 140, applyD: 60 }),
    estimateVisibleModuleFrontZ: () => 0.25,
    getCellDimsHoverOp: () => 'add',
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'box');
  assert.equal(previews[0].op, 'add');
  assert.equal(previews[0].anchor.id, 'selector-2');
  assert.ok(previews[0].w > 0.88 && previews[0].w < 0.99);
  assert.ok(previews[0].boxH > 1.39 && previews[0].boxH < 1.41);
  assert.ok(previews[0].d >= 0.59 && previews[0].d <= 0.61);
  assert.equal(hidden.length, 1);
  assert.equal(hidden[0][0], 'layout');
});
