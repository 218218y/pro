import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeThreeRuntime } from './_fake_three_runtime.ts';

import { tryHandleGenericPartPaintHover } from '../esm/native/services/canvas_picking_generic_paint_hover.ts';

const THREE = createFakeThreeRuntime();

type HitLike = { object: any; point?: { x?: number; y?: number; z?: number } | null };

function createRaycaster(intersects: HitLike[]) {
  return {
    lastMouse: null as { x: number; y: number } | null,
    lastCamera: null as unknown,
    lastObjects: null as unknown,
    setFromCamera(mouse: { x: number; y: number }, camera: unknown) {
      this.lastMouse = { ...mouse };
      this.lastCamera = camera;
    },
    intersectObjects(objects: unknown, _recursive?: boolean, optionalTarget?: HitLike[]) {
      this.lastObjects = objects;
      if (Array.isArray(optionalTarget)) {
        optionalTarget.length = 0;
        optionalTarget.push(...intersects);
        return optionalTarget;
      }
      return intersects.slice();
    },
  };
}

function createBoxObject(
  partId: string,
  args: { width?: number; height?: number; depth?: number; x?: number; y?: number; z?: number } = {}
) {
  return {
    type: 'Mesh',
    userData: { partId },
    material: { visible: true, opacity: 1 },
    children: [],
    parent: null as any,
    geometry: {
      parameters: {
        width: args.width ?? 0.6,
        height: args.height ?? 1.9,
        depth: args.depth ?? 0.55,
      },
      boundingBox: {
        min: {
          x: -(args.width ?? 0.6) / 2,
          y: -(args.height ?? 1.9) / 2,
          z: -(args.depth ?? 0.55) / 2,
        },
        max: {
          x: (args.width ?? 0.6) / 2,
          y: (args.height ?? 1.9) / 2,
          z: (args.depth ?? 0.55) / 2,
        },
      },
    },
    position: {
      x: args.x ?? 0,
      y: args.y ?? 0,
      z: args.z ?? 0,
    },
    scale: { x: 1, y: 1, z: 1 },
  };
}

function createApp(args: { wardrobeGroup: any; maps?: Record<string, Record<string, unknown>> }) {
  const state = {
    ui: { stackSplitEnabled: false },
    config: {},
    mode: { primary: 'paint' },
    runtime: {},
    meta: {},
  };
  return {
    store: {
      getState() {
        return state;
      },
      patch() {
        return undefined;
      },
    },
    render: {
      camera: { updateMatrixWorld() {} },
      wardrobeGroup: args.wardrobeGroup,
      scene: { children: [args.wardrobeGroup] },
    },
    services: {
      runtimeCache: {},
      builder: {
        registry: {
          get() {
            return null;
          },
        },
      },
    },
    maps: {
      getMap(name: string) {
        return args.maps?.[name] || null;
      },
    },
  } as any;
}

test('generic paint hover builds a canonical grouped preview and clears other hover overlays first', () => {
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const bodyLeft = createBoxObject('body_left', { x: -0.45 });
  bodyLeft.parent = wardrobeGroup;
  wardrobeGroup.children.push(bodyLeft);
  const raycaster = createRaycaster([{ object: bodyLeft, point: { x: -0.45, y: 0.2, z: 0.1 } }]);
  const mouse = { x: 0, y: 0 };
  const App = createApp({
    wardrobeGroup,
    maps: {
      individualColors: {
        body_left: 'oak',
        body_right: 'oak',
        body_ceil: 'oak',
        body_floor: 'oak',
      },
    },
  });

  const calls: string[] = [];
  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App,
    ndcX: 0.2,
    ndcY: -0.1,
    paintSelection: 'oak',
    raycaster,
    mouse,
    hideLayoutPreview: args => {
      calls.push(`layout:${String((args as { App?: unknown }).App === App)}`);
    },
    hideSketchPreview: args => {
      calls.push(`sketch:${String((args as { App?: unknown }).App === App)}`);
    },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(calls, ['layout:true', 'sketch:true']);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.App, App);
  assert.equal(previews[0]?.op, 'remove');
  assert.equal(previews[0]?.kind, 'box');
  assert.ok(typeof previews[0]?.w === 'number' && Number(previews[0].w) > 0.5);
  assert.deepEqual(raycaster.lastMouse, { x: 0.2, y: -0.1 });
});

test('generic paint hover treats chest body and commode frame parts as paintable shell parts', () => {
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const chestLeft = createBoxObject('chest_left', { width: 0.04, height: 0.9, depth: 0.45, x: -0.8 });
  const chestRight = createBoxObject('chest_right', { width: 0.04, height: 0.9, depth: 0.45, x: 0.8 });
  const chestCeil = createBoxObject('chest_ceil', { width: 1.6, height: 0.04, depth: 0.45, y: 0.9 });
  const chestFloor = createBoxObject('chest_floor', { width: 1.6, height: 0.04, depth: 0.45, y: 0 });
  const commodeBack = createBoxObject('chest_commode_back', {
    width: 1.5,
    height: 1.1,
    depth: 0.018,
    y: 1.45,
  });
  for (const child of [chestLeft, chestRight, chestCeil, chestFloor, commodeBack]) {
    child.parent = wardrobeGroup;
    wardrobeGroup.children.push(child);
  }

  const App = createApp({
    wardrobeGroup,
    maps: {
      individualColors: {
        chest_left: 'oak',
        chest_right: 'oak',
        chest_ceil: 'oak',
        chest_floor: 'oak',
        chest_commode_back: 'oak',
      },
    },
  });

  const runHover = (target: unknown) => {
    const previews: Record<string, unknown>[] = [];
    const handled = tryHandleGenericPartPaintHover({
      App,
      ndcX: 0,
      ndcY: 0,
      paintSelection: 'walnut',
      raycaster: createRaycaster([{ object: target as never, point: { x: 0, y: 0.5, z: 0 } }]),
      mouse: { x: 0, y: 0 },
      previewRo: {
        setSketchPlacementPreview(args: Record<string, unknown>) {
          previews.push(args);
        },
      },
    });
    assert.equal(handled, true);
    assert.equal(previews.length, 1);
    return previews[0]!;
  };

  const shellPreview = runHover(chestLeft);
  assert.equal(shellPreview.kind, 'box');
  assert.equal(shellPreview.fillFront, false);
  assert.equal(Number(shellPreview.w) > 1.55, true);

  const commodePreview = runHover(commodeBack);
  assert.equal(commodePreview.kind, 'box');
  assert.equal(commodePreview.fillFront, true);
  assert.equal(Number(commodePreview.w) > 1.45, true);
});

test('generic paint hover hides stale previews when a target resolves but no preview box can be measured', () => {
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const bodyLeft = {
    type: 'Mesh',
    userData: { partId: 'body_left' },
    material: { visible: true, opacity: 1 },
    children: [],
    parent: wardrobeGroup,
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
  wardrobeGroup.children.push(bodyLeft);
  const raycaster = createRaycaster([{ object: bodyLeft, point: { x: 0, y: 0, z: 0 } }]);
  const mouse = { x: 0, y: 0 };
  const App = createApp({ wardrobeGroup });

  const calls: string[] = [];
  let previewCalled = false;
  const handled = tryHandleGenericPartPaintHover({
    App,
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster,
    mouse,
    hideLayoutPreview: () => {
      calls.push('layout');
    },
    hideSketchPreview: () => {
      calls.push('sketch');
    },
    previewRo: {
      setSketchPlacementPreview() {
        previewCalled = true;
      },
    },
  });

  assert.equal(handled, false);
  assert.equal(previewCalled, false);
  assert.deepEqual(calls, ['layout', 'sketch']);
});

test('generic paint hover suppresses non-paintable corner back panels instead of showing a stale floating paint target', () => {
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const cornerBack = createBoxObject('corner_pent_back_side', {
    width: 0.7,
    height: 1.9,
    depth: 0.005,
    x: -0.4,
    y: 0.95,
    z: -0.6,
  });
  const nearbyShelf = createBoxObject('corner_shelf_left_g0', {
    width: 0.7,
    height: 0.018,
    depth: 0.45,
    x: -0.4,
    y: 0.95,
    z: -0.6,
  });
  cornerBack.parent = wardrobeGroup;
  nearbyShelf.parent = wardrobeGroup;
  wardrobeGroup.children.push(cornerBack, nearbyShelf);

  const App = createApp({ wardrobeGroup });
  const calls: string[] = [];
  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App,
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster: createRaycaster([{ object: cornerBack, point: { x: -0.4, y: 0.95, z: -0.6 } }]),
    mouse: { x: 0, y: 0 },
    hideLayoutPreview: args => {
      calls.push(`layout:${String((args as { App?: unknown }).App === App)}`);
    },
    hideSketchPreview: args => {
      calls.push(`sketch:${String((args as { App?: unknown }).App === App)}`);
    },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, false);
  assert.equal(previews.length, 0);
  assert.deepEqual(calls, ['layout:true', 'sketch:true']);
});

test('generic paint hover previews wave cornice fascia override removal as remove while inherited fallback stays add', () => {
  const runHover = (colors: Record<string, unknown>, selection: string) => {
    const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
    const waveSide = createBoxObject('cornice_wave_side_left', {
      width: 0.08,
      height: 0.08,
      depth: 0.55,
      x: -0.45,
      y: 1.9,
    });
    waveSide.parent = wardrobeGroup;
    wardrobeGroup.children.push(waveSide);

    const previews: Record<string, unknown>[] = [];
    const handled = tryHandleGenericPartPaintHover({
      App: createApp({
        wardrobeGroup,
        maps: {
          individualColors: colors,
        },
      }),
      ndcX: 0,
      ndcY: 0,
      paintSelection: selection,
      raycaster: createRaycaster([{ object: waveSide, point: { x: -0.45, y: 1.9, z: 0.2 } }]),
      mouse: { x: 0, y: 0 },
      previewRo: {
        setSketchPlacementPreview(args: Record<string, unknown>) {
          previews.push(args);
        },
      },
    });

    assert.equal(handled, true);
    assert.equal(previews.length, 1);
    return previews[0]?.op;
  };

  assert.equal(
    runHover({ cornice_color: '#111111', cornice_wave_side_left: '#222222' }, '#222222'),
    'remove'
  );
  assert.equal(runHover({ cornice_color: '#222222' }, '#222222'), 'add');
});

test('generic paint hover snaps to a nearby thin shelf board when the direct ray only hits the module selector', () => {
  const shelfPartId = 'module_shelf_0_g2';
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const shelf = createBoxObject(shelfPartId, { width: 1.1, height: 0.018, depth: 0.45, y: 0.8 });
  const selector = {
    type: 'Mesh',
    userData: { isModuleSelector: true, moduleIndex: 0 },
    material: { visible: true, opacity: 1 },
    children: [],
    parent: wardrobeGroup,
    geometry: {
      parameters: { width: 1.1, height: 1.8, depth: 0.01 },
      boundingBox: { min: { x: -0.55, y: 0, z: -0.01 }, max: { x: 0.55, y: 1.8, z: 0.01 } },
    },
    position: { x: 0, y: 0.9, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  } as any;
  shelf.parent = wardrobeGroup;
  wardrobeGroup.children.push(shelf, selector);

  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App: createApp({ wardrobeGroup }),
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster: createRaycaster([{ object: selector, point: { x: 0.1, y: 0.835, z: 0.03 } }]),
    mouse: { x: 0, y: 0 },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'object_boxes');
  assert.deepEqual(previews[0]?.previewObjects, [shelf]);
});

test('generic paint hover keeps a direct paintable part instead of stealing it for a nearby shelf', () => {
  const shelfPartId = 'module_shelf_0_g2';
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const shelf = createBoxObject(shelfPartId, { width: 1.1, height: 0.018, depth: 0.45, y: 0.8 });
  const side = createBoxObject('body_left', { width: 0.04, height: 1.8, depth: 0.45, x: -0.58, y: 0.9 });
  shelf.parent = wardrobeGroup;
  side.parent = wardrobeGroup;
  wardrobeGroup.children.push(shelf, side);

  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App: createApp({ wardrobeGroup }),
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster: createRaycaster([{ object: side, point: { x: -0.58, y: 0.82, z: 0.02 } }]),
    mouse: { x: 0, y: 0 },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'box');
  assert.notDeepEqual(previews[0]?.previewObjects, [shelf]);
});

test('generic paint hover previews drawer boxes with their real panel objects', () => {
  const drawerBoxPartId = 'drawer_box__drawer_1';
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const drawerGroup = {
    type: 'Group',
    userData: { partId: 'drawer_1' },
    material: { visible: true, opacity: 1 },
    children: [] as unknown[],
    parent: wardrobeGroup,
  };
  const drawerBox = {
    type: 'Group',
    userData: { partId: drawerBoxPartId, __wpDrawerBox: true, __doorWidth: 0.56, __doorHeight: 0.18 },
    material: { visible: true, opacity: 1 },
    children: [] as unknown[],
    parent: drawerGroup,
  };
  const sidePanel = createBoxObject('unused', { width: 0.018, height: 0.18, depth: 0.48, x: -0.27 });
  (sidePanel as any).userData = {};
  sidePanel.parent = drawerBox;
  const foldedContent = createBoxObject('unused', { width: 0.2, height: 0.04, depth: 0.2, y: -0.02 });
  (foldedContent as any).userData = {};
  (foldedContent as any).userData.__kind = 'folded_cloth_item';
  foldedContent.parent = drawerBox;
  drawerBox.children.push(sidePanel, foldedContent);
  drawerGroup.children.push(drawerBox);
  wardrobeGroup.children.push(drawerGroup);

  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App: createApp({ wardrobeGroup }),
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster: createRaycaster([{ object: sidePanel, point: { x: -0.27, y: 0, z: 0.05 } }]),
    mouse: { x: 0, y: 0 },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'object_boxes');
  assert.deepEqual(previews[0]?.previewObjects, [sidePanel]);
});

test('generic paint hover treats the stack-split unified divider as a thin board hover target', () => {
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const divider = createBoxObject('body_stack_split_divider', {
    width: 1.4,
    height: 0.018,
    depth: 0.48,
    y: 0.92,
  });
  divider.parent = wardrobeGroup;
  wardrobeGroup.children.push(divider);

  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App: createApp({ wardrobeGroup }),
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster: createRaycaster([{ object: divider, point: { x: 0.1, y: 0.92, z: 0.02 } }]),
    mouse: { x: 0, y: 0 },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'object_boxes');
  assert.deepEqual(previews[0]?.previewObjects, [divider]);
});

test('generic paint hover groups the stack-split lower carcass frame as one paint target', () => {
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const lowerLeft = createBoxObject('lower_body_left', { width: 0.04, height: 0.9, depth: 0.45, x: -0.72 });
  const lowerRight = createBoxObject('lower_body_right', { width: 0.04, height: 0.9, depth: 0.45, x: 0.72 });
  const lowerCeil = createBoxObject('lower_body_ceil', { width: 1.4, height: 0.04, depth: 0.45, y: 0.9 });
  const lowerFloor = createBoxObject('lower_body_floor', { width: 1.4, height: 0.04, depth: 0.45, y: 0.02 });
  for (const child of [lowerLeft, lowerRight, lowerCeil, lowerFloor]) {
    child.parent = wardrobeGroup;
    wardrobeGroup.children.push(child);
  }

  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App: createApp({
      wardrobeGroup,
      maps: {
        individualColors: {
          lower_body_left: 'oak',
          lower_body_right: 'oak',
          lower_body_ceil: 'oak',
          lower_body_floor: 'oak',
        },
      },
    }),
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'oak',
    raycaster: createRaycaster([{ object: lowerLeft, point: { x: -0.72, y: 0.45, z: 0.01 } }]),
    mouse: { x: 0, y: 0 },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'box');
  assert.equal(previews[0]?.fillFront, false);
  assert.equal(previews[0]?.op, 'remove');
  assert.ok(Number(previews[0]?.w) > 1.3);
});

test('generic paint hover shows object-box feedback for plinth targets', () => {
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const plinth = createBoxObject('plinth_color', { width: 1.2, height: 0.1, depth: 0.08, y: 0.05 });
  plinth.parent = wardrobeGroup;
  wardrobeGroup.children.push(plinth);

  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App: createApp({ wardrobeGroup }),
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster: createRaycaster([{ object: plinth, point: { x: 0, y: 0.05, z: 0.02 } }]),
    mouse: { x: 0, y: 0 },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'object_boxes');
  assert.deepEqual(previews[0]?.previewObjects, [plinth]);
});

test('generic paint hover shows object-box feedback for leg platform stage targets', () => {
  const runHover = (
    partId:
      | 'base_leg_platform_bottom'
      | 'base_leg_platform_top'
      | 'lower_base_leg_platform_bottom'
      | 'lower_base_leg_platform_top'
  ) => {
    const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
    const platform = createBoxObject(partId, {
      width: 1.4,
      height: 0.028,
      depth: 0.58,
      y: partId.endsWith('_top') ? 2.414 : 0.134,
    });
    platform.parent = wardrobeGroup;
    wardrobeGroup.children.push(platform);

    const previews: Record<string, unknown>[] = [];
    const handled = tryHandleGenericPartPaintHover({
      App: createApp({ wardrobeGroup }),
      ndcX: 0,
      ndcY: 0,
      paintSelection: 'walnut',
      raycaster: createRaycaster([{ object: platform, point: { x: 0, y: platform.position.y, z: 0.02 } }]),
      mouse: { x: 0, y: 0 },
      previewRo: {
        setSketchPlacementPreview(args: Record<string, unknown>) {
          previews.push(args);
        },
      },
    });

    assert.equal(handled, true, partId);
    assert.equal(previews.length, 1, partId);
    assert.equal(previews[0]?.kind, 'object_boxes', partId);
    assert.deepEqual(previews[0]?.previewObjects, [platform], partId);
  };

  runHover('base_leg_platform_bottom');
  runHover('base_leg_platform_top');
  runHover('lower_base_leg_platform_bottom');
  runHover('lower_base_leg_platform_top');
});

test('generic paint hover shows object-box feedback for pentagon shelves, floor, and ceiling thin boards', () => {
  const runHover = (partId: string) => {
    const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
    const target = createBoxObject(partId, { width: 0.9, height: 0.018, depth: 0.55, y: 0.8 });
    target.parent = wardrobeGroup;
    wardrobeGroup.children.push(target);

    const previews: Record<string, unknown>[] = [];
    const handled = tryHandleGenericPartPaintHover({
      App: createApp({ wardrobeGroup }),
      ndcX: 0,
      ndcY: 0,
      paintSelection: 'walnut',
      raycaster: createRaycaster([{ object: target, point: { x: 0, y: 0.8, z: 0.1 } }]),
      mouse: { x: 0, y: 0 },
      previewRo: {
        setSketchPlacementPreview(args: Record<string, unknown>) {
          previews.push(args);
        },
      },
    });

    assert.equal(handled, true);
    assert.equal(previews.length, 1);
    assert.equal(previews[0]?.kind, 'object_boxes');
    assert.deepEqual(previews[0]?.previewObjects, [target]);
  };

  runHover('corner_pent_int_left_shelf_1');
  runHover('corner_pent_int_shelf_180');
  runHover('corner_pent_floor');
  runHover('corner_pent_ceil');
});

test('generic paint hover previews the full pentagon frame from roof, floor, or attach side hits', () => {
  const runHover = (hitPartId: string) => {
    const wardrobeGroup = { children: [] as any[], userData: { partId: 'root' } };
    const parts = [
      createBoxObject('corner_pent_ceil', { width: 0.9, height: 0.018, depth: 0.55, y: 2 }),
      createBoxObject('corner_pent_floor', { width: 0.9, height: 0.018, depth: 0.55, y: 0 }),
      createBoxObject('corner_pent_attach_main', { width: 0.04, height: 2, depth: 0.55, x: -0.4 }),
      createBoxObject('corner_pent_attach_wing', { width: 0.04, height: 2, depth: 0.55, x: 0.4 }),
    ];
    for (const part of parts) {
      part.parent = wardrobeGroup;
      wardrobeGroup.children.push(part);
    }
    const target = parts.find(part => part.userData.partId === hitPartId);
    assert.ok(target, hitPartId);

    const previews: Record<string, unknown>[] = [];
    const handled = tryHandleGenericPartPaintHover({
      App: createApp({
        wardrobeGroup,
        maps: {
          individualColors: {
            corner_pent_ceil: 'walnut',
            corner_pent_floor: 'walnut',
            corner_pent_attach_main: 'walnut',
            corner_pent_attach_wing: 'walnut',
          },
        },
      }),
      ndcX: 0,
      ndcY: 0,
      paintSelection: 'walnut',
      raycaster: createRaycaster([{ object: target, point: { x: 0, y: 0.8, z: 0.1 } }]),
      mouse: { x: 0, y: 0 },
      previewRo: {
        setSketchPlacementPreview(args: Record<string, unknown>) {
          previews.push(args);
        },
      },
    });

    assert.equal(handled, true, hitPartId);
    assert.equal(previews.length, 1, hitPartId);
    assert.equal(previews[0]?.kind, 'object_boxes', hitPartId);
    assert.deepEqual(previews[0]?.previewObjects, parts, hitPartId);
    assert.equal(previews[0]?.op, 'remove', hitPartId);
  };

  runHover('corner_pent_ceil');
  runHover('corner_pent_floor');
  runHover('corner_pent_attach_main');
  runHover('corner_pent_attach_wing');
});

test('generic paint hover inherits bottom stack from the pentagon parent for thin-board previews', () => {
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const cornerGroup = {
    children: [] as unknown[],
    userData: { partId: 'corner_pentagon', __wpStack: 'bottom' },
    parent: wardrobeGroup,
  };
  const shelf = createBoxObject('corner_pent_int_shelf_210', {
    width: 0.9,
    height: 0.018,
    depth: 0.55,
    y: 0.8,
  });
  shelf.parent = cornerGroup;
  cornerGroup.children.push(shelf);
  wardrobeGroup.children.push(cornerGroup);

  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App: createApp({
      wardrobeGroup,
      maps: {
        individualColors: {
          lower_corner_pent_int_shelf_210: 'walnut',
        },
      },
    }),
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster: createRaycaster([{ object: shelf, point: { x: 0, y: 0.8, z: 0.1 } }]),
    mouse: { x: 0, y: 0 },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'object_boxes');
  assert.deepEqual(previews[0]?.previewObjects, [shelf]);
  assert.equal(previews[0]?.op, 'remove');
});

test('generic paint hover previews the unified corner stack middle floor as its own thin board', () => {
  const wardrobeGroup = { children: [] as any[], userData: { partId: 'root' } };
  const topGroup = {
    children: [] as any[],
    userData: { __wpCornerWing: true, __wpStack: 'top', __wpStackSplitUnifiedFrame: true },
    parent: wardrobeGroup,
  };
  wardrobeGroup.children.push(topGroup);

  const middleFloor = createBoxObject('corner_stack_mid_floor', {
    width: 0.8,
    height: 0.018,
    depth: 0.55,
    y: 1.1,
  });
  middleFloor.parent = topGroup;
  topGroup.children.push(middleFloor);

  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App: createApp({ wardrobeGroup }),
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster: createRaycaster([{ object: middleFloor, point: { x: 0.1, y: 1.1, z: 0.1 } }]),
    mouse: { x: 0, y: 0 },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'object_boxes');
  assert.deepEqual(previews[0]?.previewObjects, [middleFloor]);
  assert.equal(previews[0]?.fillFront, true);
  assert.equal(previews[0]?.fillBack, true);
});

test('generic paint hover previews one unified stack-split corner wing outer frame without the middle boards', () => {
  const wardrobeGroup = { children: [] as any[], userData: { partId: 'root' } };
  const topGroup = {
    children: [] as any[],
    userData: { __wpCornerWing: true, __wpStack: 'top', __wpStackSplitUnifiedFrame: true },
    parent: wardrobeGroup,
  };
  const bottomGroup = {
    children: [] as any[],
    userData: { __wpCornerWing: true, __wpStack: 'bottom', __wpStackSplitUnifiedFrame: true },
    parent: wardrobeGroup,
  };
  wardrobeGroup.children.push(bottomGroup, topGroup);

  const topCeil = createBoxObject('corner_wing_ceil', { width: 0.8, height: 0.018, depth: 0.55, y: 2.4 });
  const topFloorMiddle = createBoxObject('corner_floor', { width: 0.8, height: 0.018, depth: 0.55, y: 1.1 });
  const topLeft = createBoxObject('corner_wing_side_left', {
    width: 0.018,
    height: 1.2,
    depth: 0.55,
    y: 1.8,
  });
  const topRight = createBoxObject('corner_wing_side_right', {
    width: 0.018,
    height: 1.2,
    depth: 0.55,
    y: 1.8,
  });
  const bottomCeilMiddle = createBoxObject('corner_wing_ceil', {
    width: 0.8,
    height: 0.018,
    depth: 0.55,
    y: 1.08,
  });
  const bottomFloor = createBoxObject('corner_floor', { width: 0.8, height: 0.018, depth: 0.55, y: 0 });
  const bottomLeft = createBoxObject('corner_wing_side_left', {
    width: 0.018,
    height: 1.1,
    depth: 0.55,
    y: 0.55,
  });
  const bottomRight = createBoxObject('corner_wing_side_right', {
    width: 0.018,
    height: 1.1,
    depth: 0.55,
    y: 0.55,
  });

  for (const part of [topCeil, topFloorMiddle, topLeft, topRight]) {
    part.parent = topGroup;
    topGroup.children.push(part);
  }
  for (const part of [bottomCeilMiddle, bottomFloor, bottomLeft, bottomRight]) {
    part.parent = bottomGroup;
    bottomGroup.children.push(part);
  }

  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App: createApp({ wardrobeGroup }),
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster: createRaycaster([{ object: bottomRight, point: { x: 0.4, y: 0.5, z: 0.1 } }]),
    mouse: { x: 0, y: 0 },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'object_boxes');
  assert.deepEqual(previews[0]?.previewObjects, [
    bottomFloor,
    bottomLeft,
    bottomRight,
    topCeil,
    topLeft,
    topRight,
  ]);
});

test('generic paint hover positions corner wing side preview in wardrobe coordinates, not wing-local coordinates', () => {
  const wardrobeGroup = new THREE.Group() as any;
  wardrobeGroup.userData = { partId: 'root' };
  const wingGroup = new THREE.Group() as any;
  wingGroup.position.set(2, 0, 0);
  wingGroup.rotation.y = Math.PI / 2;
  wardrobeGroup.add(wingGroup);

  const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2, 0.5), new THREE.MeshBasicMaterial()) as any;
  sidePanel.userData = { partId: 'corner_wing_side_right' };
  sidePanel.position.set(0.6, 1, -0.2);
  wingGroup.add(sidePanel);
  wardrobeGroup.updateMatrixWorld(true);

  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App: {
      ...createApp({ wardrobeGroup }),
      deps: { THREE },
    } as any,
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster: createRaycaster([{ object: sidePanel, point: { x: 1.8, y: 1, z: -0.6 } }]),
    mouse: { x: 0, y: 0 },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'object_boxes');
  assert.deepEqual(previews[0]?.previewObjects, [sidePanel]);
  assert.ok(Math.abs(Number(previews[0]?.x) - 1.8) < 1e-9);
  assert.ok(Math.abs(Number(previews[0]?.z) + 0.6) < 1e-9);
  assert.ok(Math.abs(Number(previews[0]?.w) - 0.5) < 1e-9);
  assert.ok(Math.abs(Number(previews[0]?.d) - 0.04) < 1e-9);
});
