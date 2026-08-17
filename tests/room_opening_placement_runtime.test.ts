import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginRoomOpeningPlacement,
  isRoomOpeningPlacementActive,
  tryHandleRoomOpeningPlacementClick,
  tryHandleRoomOpeningPlacementHover,
} from '../esm/native/services/room_opening_placement.ts';
import { resolveViewerMeasurementHitStateWithRoom } from '../esm/native/services/viewer_measurement_room_target.ts';

type AnyRecord = Record<string, any>;

class FakeGeometry {
  constructor(
    public width = 1,
    public height = 1,
    public depth = 1
  ) {}
}

class FakeMesh {
  parent: unknown = null;
  position = {
    x: 0,
    y: 0,
    z: 0,
    set: (x: number, y: number, z: number) => Object.assign(this.position, { x, y, z }),
  };
  scale = {
    x: 1,
    y: 1,
    z: 1,
    set: (x: number, y: number, z: number) => Object.assign(this.scale, { x, y, z }),
  };
  constructor(public geometry: unknown) {}
  updateMatrixWorld() {}
}

function createHarness() {
  const listeners = new Set<() => void>();
  const state: AnyRecord = {
    mode: { primary: 'none', opts: {} },
    config: {
      roomArchitecture: {
        backWall: { enabled: true, widthCm: 400, heightCm: 280, wardrobeOffsetLeftCm: 0 },
        leftWall: { enabled: false, depthCm: 300, heightCm: 280 },
        rightWall: { enabled: false, depthCm: 300, heightCm: 280 },
        column: { enabled: false },
        openings: [],
        wallColor: '#ffffff',
        surfacesHidden: false,
      },
    },
    ui: {},
    runtime: {},
  };

  const wallSurface: AnyRecord = {
    userData: {
      __wpRoomWallSurface: true,
      roomWallId: 'back',
      roomWallAxis: 'x',
      roomWallStartCoord: -2,
      roomWallUsableLength: 4,
      roomWallHeight: 2.8,
      roomWallInteriorFaceCoord: 0,
      roomWallInwardNormalX: 0,
      roomWallInwardNormalZ: 1,
    },
    parent: null,
  };
  const architecture = { children: [wallSurface] };
  wallSurface.parent = architecture;
  const roomGroup: AnyRecord = {
    children: [architecture],
    getObjectByName(name: string) {
      return name === 'wpRoomArchitecture' ? architecture : null;
    },
  };
  const wardrobeGroup: AnyRecord = { userData: {}, children: [] };
  const camera = {};

  let preview: AnyRecord | null = null;
  let hideCount = 0;
  let lastToast: { text: string | null; active: boolean } | null = null;

  const notify = () => {
    for (const listener of [...listeners]) listener();
  };

  const app: AnyRecord = {
    deps: { THREE: { BoxGeometry: FakeGeometry, Mesh: FakeMesh } },
    render: { camera, roomGroup, wardrobeGroup },
    store: {
      getState: () => state,
      patch(next: AnyRecord) {
        if (next?.mode) state.mode = { ...state.mode, ...next.mode };
        if (next?.config) state.config = { ...state.config, ...next.config };
        if (next?.ui) state.ui = { ...state.ui, ...next.ui };
        if (next?.runtime) state.runtime = { ...state.runtime, ...next.runtime };
        notify();
        return true;
      },
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    actions: {
      mode: {
        set(primary: string, opts: AnyRecord) {
          state.mode.primary = primary;
          state.mode.opts = opts || {};
          notify();
          return true;
        },
      },
      config: {
        setScalar(key: string, value: unknown) {
          state.config[key] = value;
          notify();
          return true;
        },
      },
    },
    services: {
      runtimeCache: {},
      builder: {
        renderOps: {
          hideSketchPlacementPreview() {
            hideCount += 1;
            preview = null;
          },
          setSketchPlacementPreview(args: AnyRecord) {
            preview = args;
            return {};
          },
        },
      },
      editState: {
        resetAllEditModes() {
          state.mode.primary = 'none';
          state.mode.opts = {};
          notify();
          return true;
        },
      },
      uiModesRuntime: {
        controller: {
          getPrimaryMode: () => state.mode.primary,
          enterPrimaryMode(mode: string, opts: AnyRecord) {
            state.mode.primary = mode;
            state.mode.opts = opts || {};
            if (typeof opts?.toast === 'string') lastToast = { text: opts.toast, active: true };
            notify();
          },
          exitPrimaryMode(expectedMode: string) {
            if (!expectedMode || state.mode.primary === expectedMode) {
              state.mode.primary = 'none';
              state.mode.opts = {};
              lastToast = { text: null, active: false };
              notify();
            }
          },
        },
      },
      uiFeedback: {
        toast() {},
        updateEditStateToast(text: string | null, active: boolean) {
          lastToast = { text, active };
        },
      },
      roomDesign: { updateRoomArchitecture() {} },
    },
  };

  let wallHits: AnyRecord[] = [{ object: wallSurface, point: { x: 0, y: 1.4, z: 0 }, distance: 10 }];
  let wardrobeHits: AnyRecord[] = [];
  const raycaster = {
    setFromCamera() {},
    intersectObjects(objects: unknown) {
      const list = Array.isArray(objects) ? objects : [];
      if (list[0] === wardrobeGroup) return wardrobeHits;
      if (list.includes(wallSurface)) return wallHits;
      return [];
    },
  };
  const mouse = { x: 0, y: 0 };

  return {
    app,
    state,
    wallSurface,
    architecture,
    wardrobeGroup,
    raycaster,
    mouse,
    notify,
    setWallHits(next: AnyRecord[]) {
      wallHits = next;
    },
    setWardrobeHits(next: AnyRecord[]) {
      wardrobeHits = next;
    },
    getPreview: () => preview,
    getHideCount: () => hideCount,
    getLastToast: () => lastToast,
  };
}

test('room opening placement uses primary edit mode and wall-bound sketch measurements', () => {
  const h = createHarness();
  assert.equal(beginRoomOpeningPlacement(h.app, { kind: 'window', widthCm: 120, heightCm: 100 }), true);
  assert.equal(h.state.mode.primary, 'room_opening');
  assert.equal(isRoomOpeningPlacementActive(h.app), true);
  assert.match(h.getLastToast()?.text || '', /מצב עריכה/u);
  assert.match(h.getLastToast()?.text || '', /חלון/u);

  const windowHover = tryHandleRoomOpeningPlacementHover({
    App: h.app,
    ndcX: 0,
    ndcY: 0,
    raycaster: h.raycaster,
    mouse: h.mouse,
  });
  assert.equal(windowHover?.partLabel, null);
  const windowMeasurements = h.getPreview()?.clearanceMeasurements || [];
  assert.equal(windowMeasurements.length, 4);
  assert.ok(windowMeasurements.every((entry: AnyRecord) => /ס"מ/u.test(entry.label)));
  assert.ok(
    windowMeasurements.every((entry: AnyRecord) => entry.surfacePlane == null || entry.surfacePlane === 'xy')
  );

  assert.equal(beginRoomOpeningPlacement(h.app, { kind: 'door', widthCm: 90, heightCm: 210 }), true);
  assert.equal(h.state.mode.primary, 'room_opening');
  assert.match(h.getLastToast()?.text || '', /דלת/u);
  tryHandleRoomOpeningPlacementHover({
    App: h.app,
    ndcX: 0,
    ndcY: 0,
    raycaster: h.raycaster,
    mouse: h.mouse,
  });
  assert.equal((h.getPreview()?.clearanceMeasurements || []).length, 3);

  Object.assign(h.wallSurface.userData, {
    roomWallId: 'right',
    roomWallAxis: 'z',
    roomWallStartCoord: 0,
    roomWallUsableLength: 3,
    roomWallHeight: 2.8,
    roomWallInteriorFaceCoord: 2,
    roomWallInwardNormalX: -1,
    roomWallInwardNormalZ: 0,
  });
  h.setWallHits([{ object: h.wallSurface, point: { x: 2, y: 1.4, z: 1.5 }, distance: 10 }]);
  beginRoomOpeningPlacement(h.app, { kind: 'window', widthCm: 120, heightCm: 100 });
  tryHandleRoomOpeningPlacementHover({
    App: h.app,
    ndcX: 0,
    ndcY: 0,
    raycaster: h.raycaster,
    mouse: h.mouse,
  });
  const sideMeasurements = h.getPreview()?.clearanceMeasurements || [];
  assert.equal(sideMeasurements.length, 4);
  assert.ok(sideMeasurements.every((entry: AnyRecord) => entry.surfacePlane === 'yz'));
  assert.ok(sideMeasurements.every((entry: AnyRecord) => Math.abs(entry.z - 1.988) < 1e-9));
});

test('wardrobe occludes wall placement while a truly empty click exits edit mode', () => {
  const h = createHarness();
  beginRoomOpeningPlacement(h.app, { kind: 'window', widthCm: 120, heightCm: 100 });
  h.setWardrobeHits([
    { object: { userData: {}, parent: h.wardrobeGroup }, point: { x: 0, y: 1, z: 1 }, distance: 5 },
  ]);
  const hidesBefore = h.getHideCount();
  const blockedHover = tryHandleRoomOpeningPlacementHover({
    App: h.app,
    ndcX: 0,
    ndcY: 0,
    raycaster: h.raycaster,
    mouse: h.mouse,
  });
  assert.equal(blockedHover?.partLabel, null);
  assert.ok(h.getHideCount() > hidesBefore);
  assert.equal(h.getPreview(), null);

  assert.equal(
    tryHandleRoomOpeningPlacementClick({
      App: h.app,
      ndcX: 0,
      ndcY: 0,
      raycaster: h.raycaster,
      mouse: h.mouse,
    }),
    true
  );
  assert.equal(h.state.config.roomArchitecture.openings.length, 0);
  assert.equal(h.state.mode.primary, 'room_opening');

  h.setWallHits([]);
  h.setWardrobeHits([]);
  assert.equal(
    tryHandleRoomOpeningPlacementClick({
      App: h.app,
      ndcX: 0.8,
      ndcY: -0.8,
      raycaster: h.raycaster,
      mouse: h.mouse,
    }),
    true
  );
  assert.equal(h.state.mode.primary, 'none');
  assert.equal(isRoomOpeningPlacementActive(h.app), false);
});

test('wardrobe dimension graphics never occlude room-opening placement', () => {
  const h = createHarness();
  beginRoomOpeningPlacement(h.app, { kind: 'window', widthCm: 120, heightCm: 100 });

  const dimensionLine = { type: 'Line', userData: {}, parent: h.wardrobeGroup };
  const dimensionLabel = { type: 'Sprite', userData: {}, parent: h.wardrobeGroup };
  h.setWardrobeHits([
    { object: dimensionLabel, point: { x: 1.8, y: 3.2, z: 1 }, distance: 2 },
    { object: dimensionLine, point: { x: 1.8, y: 3.1, z: 1 }, distance: 3 },
  ]);

  const hover = tryHandleRoomOpeningPlacementHover({
    App: h.app,
    ndcX: 0.7,
    ndcY: 0.7,
    raycaster: h.raycaster,
    mouse: h.mouse,
  });
  assert.equal(hover?.partLabel, null);
  assert.ok(h.getPreview(), 'dimension graphics must be ignored while the wall remains placeable');

  assert.equal(
    tryHandleRoomOpeningPlacementClick({
      App: h.app,
      ndcX: 0.7,
      ndcY: 0.7,
      raycaster: h.raycaster,
      mouse: h.mouse,
    }),
    true
  );
  assert.equal(h.state.config.roomArchitecture.openings.length, 1);
});

test('active opening mode directly hovers and removes an existing opening of the same kind', () => {
  const h = createHarness();
  h.state.config.roomArchitecture.openings = [
    {
      id: 'window-existing',
      kind: 'window',
      wall: 'back',
      widthCm: 120,
      heightCm: 100,
      offsetAlongCm: 140,
      bottomOffsetCm: 90,
    },
    {
      id: 'door-existing',
      kind: 'door',
      wall: 'back',
      widthCm: 90,
      heightCm: 210,
      offsetAlongCm: 20,
      bottomOffsetCm: 0,
    },
  ];

  const windowTarget: AnyRecord = {
    type: 'Mesh',
    parent: h.architecture,
    userData: {
      __wpRoomMeasurementTarget: true,
      roomOpeningId: 'window-existing',
      roomOpeningKind: 'window',
    },
  };
  const doorTarget: AnyRecord = {
    type: 'Mesh',
    parent: h.architecture,
    userData: {
      __wpRoomMeasurementTarget: true,
      roomOpeningId: 'door-existing',
      roomOpeningKind: 'door',
    },
  };
  h.architecture.children.push(windowTarget, doorTarget);

  beginRoomOpeningPlacement(h.app, { kind: 'window', widthCm: 120, heightCm: 100 });
  h.setWallHits([
    { object: windowTarget, point: { x: 0, y: 1.4, z: 0.01 }, distance: 4 },
    { object: h.wallSurface, point: { x: 0, y: 1.4, z: 0 }, distance: 10 },
  ]);
  const windowHover = tryHandleRoomOpeningPlacementHover({
    App: h.app,
    ndcX: 0,
    ndcY: 0,
    raycaster: h.raycaster,
    mouse: h.mouse,
  });
  assert.ok(windowHover);
  assert.equal(h.getPreview()?.op, 'remove');
  assert.deepEqual(h.getPreview()?.previewObjects, [windowTarget]);

  assert.equal(
    tryHandleRoomOpeningPlacementClick({
      App: h.app,
      ndcX: 0,
      ndcY: 0,
      raycaster: h.raycaster,
      mouse: h.mouse,
    }),
    true
  );
  assert.deepEqual(
    h.state.config.roomArchitecture.openings.map((opening: AnyRecord) => opening.id),
    ['door-existing']
  );
  assert.equal(h.state.mode.primary, 'room_opening', 'removal keeps the edit tool active');

  beginRoomOpeningPlacement(h.app, { kind: 'door', widthCm: 90, heightCm: 210 });
  h.setWallHits([
    { object: doorTarget, point: { x: -1, y: 1, z: 0.01 }, distance: 4 },
    { object: h.wallSurface, point: { x: -1, y: 1, z: 0 }, distance: 10 },
  ]);
  const doorHover = tryHandleRoomOpeningPlacementHover({
    App: h.app,
    ndcX: -0.2,
    ndcY: 0,
    raycaster: h.raycaster,
    mouse: h.mouse,
  });
  assert.ok(doorHover);
  assert.equal(h.getPreview()?.op, 'remove');
  assert.deepEqual(h.getPreview()?.previewObjects, [doorTarget]);

  assert.equal(
    tryHandleRoomOpeningPlacementClick({
      App: h.app,
      ndcX: -0.2,
      ndcY: 0,
      raycaster: h.raycaster,
      mouse: h.mouse,
    }),
    true
  );
  assert.equal(h.state.config.roomArchitecture.openings.length, 0);
  assert.equal(h.state.mode.primary, 'room_opening');
});

test('room measurement picking exposes walls and openings as canonical measurement hit targets', () => {
  const h = createHarness();
  const measurementTarget: AnyRecord = {
    type: 'Mesh',
    parent: h.architecture,
    userData: {
      __wpRoomMeasurementTarget: true,
      partId: 'room_wall_back',
      partLabel: 'קיר אחורי',
      __wpRoomMeasurementULength: 4,
      __wpRoomMeasurementHeight: 2.8,
      __wpRoomMeasurementThickness: 0.004,
      __wpRoomMeasurementUX: 1,
      __wpRoomMeasurementUZ: 0,
      __wpRoomMeasurementNormalX: 0,
      __wpRoomMeasurementNormalZ: 1,
    },
  };
  h.architecture.children.push(measurementTarget);
  h.setWallHits([{ object: measurementTarget, point: { x: 0.7, y: 1.1, z: 0.006 }, distance: 4 }]);

  const hitState = resolveViewerMeasurementHitStateWithRoom({
    App: h.app,
    hitState: null,
    ndcX: 0.2,
    ndcY: -0.1,
    raycaster: h.raycaster,
    mouse: h.mouse,
  });
  assert.ok(hitState);
  assert.equal(hitState.foundPartId, 'room_wall_back');
  assert.equal(hitState.primaryHitObject, measurementTarget);
  assert.equal(hitState.hitUserData?.partLabel, 'קיר אחורי');
  assert.equal(hitState.hitIdentity?.partId, 'room_wall_back');
});

test('external primary-mode exit clears the opening draft and preview immediately', () => {
  const h = createHarness();
  beginRoomOpeningPlacement(h.app, { kind: 'window', widthCm: 120, heightCm: 100 });
  tryHandleRoomOpeningPlacementHover({
    App: h.app,
    ndcX: 0,
    ndcY: 0,
    raycaster: h.raycaster,
    mouse: h.mouse,
  });
  assert.ok(h.getPreview());

  h.state.mode.primary = 'none';
  h.notify();
  assert.equal(h.getPreview(), null);
  assert.equal(isRoomOpeningPlacementActive(h.app), false);

  h.state.mode.primary = 'room_opening';
  h.notify();
  assert.equal(isRoomOpeningPlacementActive(h.app), false);
});
