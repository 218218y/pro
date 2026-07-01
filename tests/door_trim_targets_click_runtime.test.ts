import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDoorTrimTarget } from '../esm/native/services/canvas_picking_door_trim_targets.ts';
import { handleCanvasDoorTrimClick } from '../esm/native/services/canvas_picking_door_trim_click.ts';

type DoorGroupLike = {
  userData: Record<string, unknown>;
  worldToLocal?: (point: { x: number; y: number; z: number }) => unknown;
};

class FakeVector3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

function createDoorGroup(partId: string, extra: Record<string, unknown> = {}): DoorGroupLike {
  return {
    userData: {
      partId,
      __doorWidth: 1,
      __doorHeight: 2,
      ...extra,
    },
    worldToLocal(point) {
      return point;
    },
  };
}

function createDoorTrimApp() {
  const historyMeta: Array<Record<string, unknown>> = [];
  const configWrites: Array<{
    mapName: string;
    nextMap: Record<string, unknown>;
    meta?: Record<string, unknown>;
  }> = [];
  const rootState = {
    mode: {
      opts: {
        trimAxis: 'horizontal',
        trimColor: 'gold',
        trimSpan: 'half',
        trimSizeCm: 24,
        trimCrossSizeCm: 8,
      },
    },
    config: {
      doorTrimMap: {},
      mirrorLayoutMap: {},
    },
  };
  const app: any = {
    render: {},
    deps: {
      THREE: {
        Vector3: FakeVector3,
      },
    },
    store: {
      getState() {
        return rootState;
      },
      patch(patch: Record<string, unknown>) {
        Object.assign(rootState, patch || {});
        return patch;
      },
    },
    actions: {
      config: {
        setMap(mapName: string, nextMap: Record<string, unknown>, meta?: Record<string, unknown>) {
          rootState.config = { ...rootState.config, [mapName]: nextMap };
          configWrites.push({ mapName, nextMap, meta });
          return nextMap;
        },
      },
      history: {
        batch(fn: () => unknown, meta?: Record<string, unknown>) {
          historyMeta.push(meta || {});
          return fn();
        },
      },
    },
  };
  return { app, rootState, historyMeta, configWrites };
}

test('door trim target resolution canonicalizes segmented door ids and bottom-corner stacks', () => {
  const segmented = createDoorGroup('d7_full');
  const lowerCorner = createDoorGroup('lower_corner_door_2_full', { __wpStack: 'bottom' });
  const App: any = {
    render: {
      doorsArray: [{ group: segmented }, { group: lowerCorner }],
    },
  };

  const segmentedTarget = resolveDoorTrimTarget(App, 'd7_top');
  assert.equal(segmentedTarget?.partId, 'd7_full');
  assert.equal(segmentedTarget?.group, segmented);

  const segmentedSurfaceTarget = resolveDoorTrimTarget(App, 'd7_mid2_accent_top');
  assert.equal(segmentedSurfaceTarget?.partId, 'd7_full');
  assert.equal(segmentedSurfaceTarget?.group, segmented);

  const cornerTarget = resolveDoorTrimTarget(App, 'corner_door_2_trim', lowerCorner);
  assert.equal(cornerTarget?.partId, 'lower_corner_door_2_full');
  assert.equal(cornerTarget?.group, lowerCorner);

  const cornerSurfaceTarget = resolveDoorTrimTarget(App, 'corner_door_2_mid2_groove_left', lowerCorner);
  assert.equal(cornerSurfaceTarget?.partId, 'lower_corner_door_2_full');
  assert.equal(cornerSurfaceTarget?.group, lowerCorner);
});

test('door trim click writes canonical trim maps through history batch and toggles existing matches off', () => {
  const { app, rootState, historyMeta, configWrites } = createDoorTrimApp();
  const doorGroup = createDoorGroup('d7_full');
  app.render.doorsArray = [{ group: doorGroup }];

  const first = handleCanvasDoorTrimClick({
    App: app,
    effectiveDoorId: 'd7_mid2_accent_top',
    foundPartId: null,
    doorHitPoint: { x: 0, y: 0, z: 0 },
    doorHitObject: doorGroup,
  });

  assert.equal(first, true);
  assert.equal(historyMeta.length, 1);
  assert.deepEqual(historyMeta[0], { source: 'doorTrim:click', immediate: true });
  assert.equal(configWrites.length, 1);
  assert.equal(configWrites[0]?.mapName, 'doorTrimMap');
  assert.ok(Array.isArray(rootState.config.doorTrimMap.d7_full));
  assert.equal(rootState.config.doorTrimMap.d7_full.length, 1);
  assert.equal('d7_mid2_accent_top' in rootState.config.doorTrimMap, false);
  assert.equal('d7_mid2' in rootState.config.doorTrimMap, false);
  const [addedTrim] = rootState.config.doorTrimMap.d7_full;
  assert.equal(addedTrim.axis, 'horizontal');
  assert.equal(addedTrim.color, 'gold');
  assert.equal(addedTrim.span, 'half');
  assert.equal(addedTrim.sizeCm, undefined);
  assert.equal(addedTrim.crossSizeCm, 8);
  assert.equal(Object.prototype.hasOwnProperty.call(addedTrim, 'center' + 'Norm'), false);
  assert.equal(addedTrim.centerXNorm, 0.5);
  assert.equal(addedTrim.centerYNorm, 0.5);

  const second = handleCanvasDoorTrimClick({
    App: app,
    effectiveDoorId: 'd7_mid2_trim_preview_hover',
    foundPartId: null,
    doorHitPoint: { x: 0, y: 0, z: 0 },
    doorHitObject: doorGroup,
  });

  assert.equal(second, true);
  assert.equal(historyMeta.length, 2);
  assert.equal(configWrites.length, 2);
  assert.deepEqual(rootState.config.doorTrimMap, {});
});

test('door trim click resolves sketch external-drawer split door leaves from nested visual children', () => {
  const { app, rootState, configWrites } = createDoorTrimApp();
  const segmentedRoot = createDoorGroup('sketch_box_0_sb_1_door_left_top', {
    __doorWidth: 0.8,
    __doorHeight: 0.6,
    __doorRectMinX: -0.4,
    __doorRectMaxX: 0.4,
    __doorRectMinY: -0.3,
    __doorRectMaxY: 0.3,
    __wpSketchDoorLeaf: true,
  }) as DoorGroupLike & { parent?: unknown };
  const nestedMesh = {
    userData: {
      partId: 'sketch_box_0_sb_1_door_left_top_trim_preview_hover',
      __wpSketchDoorSegment: true,
    },
    parent: segmentedRoot,
  } as DoorGroupLike & { parent?: unknown };
  app.render.doorsArray = [
    {
      group: createDoorGroup('sketch_box_0_sb_1_door_left', {
        __doorWidth: 0.8,
        __doorHeight: 2.2,
      }),
    },
  ];

  const handled = handleCanvasDoorTrimClick({
    App: app,
    effectiveDoorId: 'sketch_box_0_sb_1_door_left_top_accent_top',
    foundPartId: null,
    doorHitPoint: { x: 0, y: 0, z: 0 },
    doorHitObject: nestedMesh,
    doorHitGroup: segmentedRoot,
  });

  assert.equal(handled, true);
  assert.equal(configWrites.length, 1);
  assert.equal(rootState.config.doorTrimMap.sketch_box_0_sb_1_door_left, undefined);
  assert.equal(rootState.config.doorTrimMap.sketch_box_0_sb_1_door_left_top_accent_top, undefined);
  assert.equal(rootState.config.doorTrimMap.sketch_box_0_sb_1_door_left_top_trim_preview_hover, undefined);
  assert.ok(Array.isArray(rootState.config.doorTrimMap.sketch_box_0_sb_1_door_left_top));
  assert.equal(rootState.config.doorTrimMap.sketch_box_0_sb_1_door_left_top.length, 1);
  assert.equal(rootState.config.doorTrimMap.sketch_box_0_sb_1_door_left_top[0].axis, 'horizontal');
});

test('door trim target resolution supports regular and sketch external drawer fronts', () => {
  const regularDrawer = createDoorGroup('d1_draw_1');
  const sketchDrawer = createDoorGroup('sketch_ext_drawers_1_sed-1_1');
  const sketchBoxDrawer = createDoorGroup('sketch_box_free_box-a_ext_drawers_sed-2_1');
  const drawerBoxBody = createDoorGroup('drawer_box__d1_draw_1', { __wpDrawerBox: true });
  const App: any = {
    render: {
      drawersArray: [
        { group: regularDrawer },
        { group: sketchDrawer },
        { group: sketchBoxDrawer },
        { group: drawerBoxBody },
      ],
    },
  };

  const regularTarget = resolveDoorTrimTarget(App, 'd1_draw_1');
  assert.equal(regularTarget?.partId, 'd1_draw_1');
  assert.equal(regularTarget?.group, regularDrawer);

  const sketchTarget = resolveDoorTrimTarget(App, 'sketch_ext_drawers_1_sed-1_1');
  assert.equal(sketchTarget?.partId, 'sketch_ext_drawers_1_sed-1_1');
  assert.equal(sketchTarget?.group, sketchDrawer);

  const sketchBoxTarget = resolveDoorTrimTarget(App, 'sketch_box_free_box-a_ext_drawers_sed-2_1');
  assert.equal(sketchBoxTarget?.partId, 'sketch_box_free_box-a_ext_drawers_sed-2_1');
  assert.equal(sketchBoxTarget?.group, sketchBoxDrawer);

  assert.equal(resolveDoorTrimTarget(App, 'drawer_box__d1_draw_1'), null);
});

test('door trim click writes trim maps for external drawer fronts', () => {
  const { app, rootState, configWrites } = createDoorTrimApp();
  const drawerGroup = createDoorGroup('d1_draw_1', { __wpType: 'extDrawer' });
  app.render.drawersArray = [{ group: drawerGroup }];

  const handled = handleCanvasDoorTrimClick({
    App: app,
    effectiveDoorId: null,
    foundPartId: 'd1_draw_1',
    doorHitPoint: { x: 0, y: 0, z: 0 },
    doorHitObject: drawerGroup,
  });

  assert.equal(handled, true);
  assert.equal(configWrites.length, 1);
  assert.ok(Array.isArray(rootState.config.doorTrimMap.d1_draw_1));
  assert.equal(rootState.config.doorTrimMap.d1_draw_1.length, 1);
  assert.equal(rootState.config.doorTrimMap.d1_draw_1[0].axis, 'horizontal');
});

test('door trim click on regular corner drawer boxes writes to the owning drawer front', () => {
  const { app, rootState, configWrites } = createDoorTrimApp();
  const drawerGroup = createDoorGroup('corner_c0_draw_1', { __wpType: 'extDrawer' });
  const drawerBox = createDoorGroup('drawer_box__corner_c0_draw_1', {
    __wpDrawerBox: true,
    __wpDrawerOwnerPartId: 'corner_c0_draw_1',
    drawerId: 'corner_c0_draw_1',
  });
  app.render.drawersArray = [{ group: drawerGroup }];

  const resolved = resolveDoorTrimTarget(app, 'drawer_box__corner_c0_draw_1', drawerBox);
  assert.equal(resolved?.partId, 'corner_c0_draw_1');
  assert.equal(resolved?.group, drawerGroup);

  const handled = handleCanvasDoorTrimClick({
    App: app,
    effectiveDoorId: null,
    foundPartId: 'drawer_box__corner_c0_draw_1',
    doorHitPoint: { x: 0, y: 0, z: 0 },
    doorHitObject: drawerBox,
  });

  assert.equal(handled, true);
  assert.equal(configWrites.length, 1);
  assert.equal(rootState.config.doorTrimMap.drawer_box__corner_c0_draw_1, undefined);
  assert.ok(Array.isArray(rootState.config.doorTrimMap.corner_c0_draw_1));
  assert.equal(rootState.config.doorTrimMap.corner_c0_draw_1.length, 1);
});

test('door trim target resolution and click support cabinet side and top carcass surfaces', () => {
  const { app, rootState, configWrites } = createDoorTrimApp();
  const sidePanel = createDoorGroup('body_left', {
    __wpDoorTrimSurface: true,
    __wpDoorTrimSurfacePlane: 'yz',
    __wpDoorTrimSurfaceFaceSign: -1,
    __wpDoorTrimSurfaceFaceCoord: -0.009,
    __doorWidth: 0.6,
    __doorHeight: 2.1,
    __doorRectMinX: -0.3,
    __doorRectMaxX: 0.3,
    __doorRectMinY: -1.05,
    __doorRectMaxY: 1.05,
  });
  const topPanel = createDoorGroup('body_ceil', {
    __wpDoorTrimSurface: true,
    __wpDoorTrimSurfacePlane: 'xz',
    __wpDoorTrimSurfaceFaceSign: 1,
    __wpDoorTrimSurfaceFaceCoord: 0.009,
    __doorWidth: 1.6,
    __doorHeight: 0.6,
    __doorRectMinX: -0.8,
    __doorRectMaxX: 0.8,
    __doorRectMinY: -0.3,
    __doorRectMaxY: 0.3,
  });

  const sideTarget = resolveDoorTrimTarget(app, 'body_left', sidePanel);
  assert.equal(sideTarget?.partId, 'body_left');
  assert.equal(sideTarget?.group, sidePanel);

  const topTarget = resolveDoorTrimTarget(app, 'body_ceil', topPanel);
  assert.equal(topTarget?.partId, 'body_ceil');
  assert.equal(topTarget?.group, topPanel);

  const handled = handleCanvasDoorTrimClick({
    App: app,
    effectiveDoorId: null,
    foundPartId: 'body_left',
    doorHitPoint: { x: -0.009, y: 0.42, z: 0.18 },
    doorHitObject: sidePanel,
  });

  assert.equal(handled, true);
  assert.equal(configWrites.length, 1);
  assert.ok(Array.isArray(rootState.config.doorTrimMap.body_left));
  assert.equal(rootState.config.doorTrimMap.body_left.length, 1);
  assert.equal(rootState.config.doorTrimMap.body_left[0].axis, 'horizontal');
  assert.ok(Math.abs(rootState.config.doorTrimMap.body_left[0].centerXNorm - 0.75) < 1e-9);
  assert.ok(Math.abs(rootState.config.doorTrimMap.body_left[0].centerYNorm - 0.7) < 1e-9);

  const handledTop = handleCanvasDoorTrimClick({
    App: app,
    effectiveDoorId: null,
    foundPartId: 'body_ceil',
    doorHitPoint: { x: 0.4, y: 0.009, z: -0.12 },
    doorHitObject: topPanel,
  });

  assert.equal(handledTop, true);
  assert.equal(configWrites.length, 2);
  assert.ok(Array.isArray(rootState.config.doorTrimMap.body_ceil));
  assert.equal(rootState.config.doorTrimMap.body_ceil.length, 1);
  assert.ok(Math.abs(rootState.config.doorTrimMap.body_ceil[0].centerXNorm - 0.75) < 1e-9);
  assert.ok(Math.abs(rootState.config.doorTrimMap.body_ceil[0].centerYNorm - 0.3) < 1e-9);
});
