import test from 'node:test';
import assert from 'node:assert/strict';

import { applyHandles } from '../esm/native/builder/handles_apply.ts';
import { createHandlesApplyRuntime } from '../esm/native/builder/handles_apply_shared.ts';
import { purgeHandlesForRemovedDoors } from '../esm/native/builder/handles_purge.ts';

const addOutlines = () => undefined;

function createApp() {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        handles: { cache: {} },
      },
    },
    store: {
      getState() {
        return {
          ui: { view: {} },
          config: {},
          runtime: {},
          mode: { primary: 'none', opts: {} },
          meta: {},
        };
      },
    },
    render: {
      doorsArray: [],
    },
    platform: {
      triggerRender(updateShadows?: boolean) {
        calls.push(['platform-render', !!updateShadows]);
      },
    },
  };
  return { App, calls };
}

function readConfigSnapshot(App: any): Record<string, unknown> {
  return App.store.getState().config;
}

test('handles apply triggers a platform render by default', () => {
  const { App, calls } = createApp();
  applyHandles({ App, cfgSnapshot: readConfigSnapshot(App), addOutlines });
  assert.deepEqual(calls, [['platform-render', false]]);
});

test('handles apply can suppress the trailing platform render for batched callers', () => {
  const { App, calls } = createApp();
  applyHandles({ App, cfgSnapshot: readConfigSnapshot(App), addOutlines, triggerRender: false });
  assert.deepEqual(calls, []);
});

test('handles apply falls back to ensureRenderLoop when triggerRender is unavailable', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        handles: { cache: {} },
      },
      platform: {
        ensureRenderLoop() {
          calls.push(['ensureRenderLoop']);
        },
      },
    },
    store: {
      getState() {
        return {
          ui: { view: {} },
          config: {},
          runtime: {},
          mode: { primary: 'none', opts: {} },
          meta: {},
        };
      },
    },
    render: {
      doorsArray: [],
    },
  };

  applyHandles({ App, cfgSnapshot: readConfigSnapshot(App), addOutlines });
  assert.deepEqual(calls, [['ensureRenderLoop']]);
});

class FakePosition {
  x = 0;
  y = 0;
  z = 0;
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class FakeGroup3D {
  static nextId = 1;
  uuid = `fake-${FakeGroup3D.nextId++}`;
  name = '';
  isGroup = true;
  isMesh = false;
  userData: Record<string, unknown> = {};
  children: Array<FakeGroup3D | FakeMesh3D> = [];
  parent: FakeGroup3D | null = null;
  position = new FakePosition();
  matrixWorld = {};
  add(child: FakeGroup3D | FakeMesh3D) {
    child.parent = this;
    this.children.push(child);
  }
  remove(child: FakeGroup3D | FakeMesh3D) {
    this.children = this.children.filter(entry => entry !== child);
    child.parent = null;
  }
  traverse(fn: (node: FakeGroup3D | FakeMesh3D) => void) {
    fn(this);
    this.children.forEach(child => child.traverse(fn));
  }
  updateWorldMatrix() {}
}

class FakeGeometry3D {
  boundingBox: { min: { y: number; z: number }; max: { y: number; z: number } } | null = null;
  constructor(
    readonly width: number,
    readonly height: number,
    readonly depth: number
  ) {}
  computeBoundingBox() {
    this.boundingBox = {
      min: { y: -this.height / 2, z: -this.depth / 2 },
      max: { y: this.height / 2, z: this.depth / 2 },
    };
  }
}

class FakeMesh3D extends FakeGroup3D {
  isGroup = false;
  isMesh = true;
  geometry: FakeGeometry3D;
  material: unknown;
  constructor(geometry: FakeGeometry3D, material: unknown) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeBox3D {
  min = { z: 0 };
  max = { z: 0 };
  copy(box: { min: { z?: number }; max: { z?: number } }) {
    this.min.z = Number(box.min.z || 0);
    this.max.z = Number(box.max.z || 0);
    return this;
  }
  applyMatrix4() {
    return this;
  }
}

class FakeMatrix4D {
  copy() {
    return this;
  }
  invert() {
    return this;
  }
}

test('handles apply uses stored manual positions when placing external drawer handles', () => {
  const { App } = createApp();
  const outlined: unknown[] = [];
  App.deps = {
    THREE: {
      Group: FakeGroup3D,
      Mesh: FakeMesh3D,
      BoxGeometry: FakeGeometry3D,
      MeshStandardMaterial: class FakeMeshStandardMaterial {},
      Box3: FakeBox3D,
      Matrix4: FakeMatrix4D,
    },
  };
  App.render.drawersArray = [
    {
      group: Object.assign(new FakeGroup3D(), {
        userData: {
          partId: 'd9_draw_0',
          __doorWidth: 1.2,
          __doorHeight: 0.2,
          __frontMaxZ: 0.018,
        },
      }),
    },
  ];
  App.maps = {
    getMap(name: string) {
      if (name !== 'handlesMap') return {};
      return {
        d9_draw_0: 'none',
        '__wp_manual_handle_position:d9_draw_0': '{"xRatio":0.1,"yRatio":0.1}',
      };
    },
  };
  App.store.getState = () => ({
    ui: { view: {} },
    config: {
      handlesMap: {
        d9_draw_0: 'standard',
        '__wp_manual_handle_position:d9_draw_0': '{"xRatio":0.75,"yRatio":0.7}',
      },
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });

  applyHandles({
    App,
    cfgSnapshot: readConfigSnapshot(App),
    addOutlines: mesh => outlined.push(mesh),
    triggerRender: false,
  });

  const drawerGroup = App.render.drawersArray[0].group as FakeGroup3D;
  const handleGroup = drawerGroup.children.find(child => child.userData.__kind === 'handle');
  assert.ok(handleGroup);
  assert.ok(Math.abs(handleGroup.position.x - 0.3) < 1e-12);
  assert.ok(Math.abs(handleGroup.position.y - 0.04) < 1e-12);
  assert.equal(outlined.length, 1);
});

test('handles apply runtime captures one canonical config snapshot for handle maps', () => {
  const { App } = createApp();
  const handlesMap: Record<string, unknown> = { d1: 'standard' };
  App.maps = {
    getMap(name: string) {
      return name === 'handlesMap' ? { d1: 'none' } : {};
    },
  };
  App.store.getState = () => ({
    ui: { view: {} },
    config: {
      globalHandleType: 'none',
      handlesMap,
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });

  const runtime = createHandlesApplyRuntime({ App, cfgSnapshot: readConfigSnapshot(App), addOutlines });
  handlesMap.d1 = 'none';

  assert.equal(runtime.getHandleType('d1'), 'standard');
});

test('handles apply runtime rejects a missing snapshot outline binding', () => {
  const { App } = createApp();
  assert.throws(
    () => createHandlesApplyRuntime({ App, cfgSnapshot: readConfigSnapshot(App) }),
    /snapshot outline binding is required/
  );
});

test('handles purge reads removed-door state from the provided cfg snapshot', () => {
  const { App } = createApp();
  const wardrobeGroup = new FakeGroup3D();
  const door = new FakeGroup3D();
  door.userData.partId = 'd4_full';
  const handle = new FakeGroup3D();
  handle.name = 'handle_group_v7';
  door.add(handle);
  wardrobeGroup.add(door);
  App.render.wardrobeGroup = wardrobeGroup;
  App.store.getState = () => ({
    ui: { view: {} },
    config: { removedDoorsMap: {} },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });

  purgeHandlesForRemovedDoors(true, {
    App,
    cfgSnapshot: { removedDoorsMap: { removed_d4_full: true } },
  });

  assert.equal(door.children.includes(handle), false);
});

test('handles apply does not treat external drawer boxes as separate drawer fronts', () => {
  const { App } = createApp();
  App.deps = {
    THREE: {
      Group: FakeGroup3D,
      Mesh: FakeMesh3D,
      BoxGeometry: FakeGeometry3D,
      MeshStandardMaterial: class FakeMeshStandardMaterial {},
      Box3: FakeBox3D,
      Matrix4: FakeMatrix4D,
    },
  };

  const wardrobeGroup = new FakeGroup3D();
  const drawerGroup = new FakeGroup3D();
  drawerGroup.userData = {
    partId: 'd1_draw_0',
    __doorWidth: 0.7,
    __doorHeight: 0.22,
    __frontMaxZ: 0.018,
    __wpType: 'extDrawer',
  };

  const drawerBoxGroup = new FakeGroup3D();
  drawerBoxGroup.userData = {
    partId: 'drawer_box__d1_draw_0',
    __wpDrawerBox: true,
    __wpDrawerOwnerPartId: 'd1_draw_0',
    __doorWidth: 0.64,
    __doorHeight: 0.18,
  };
  drawerGroup.add(drawerBoxGroup);
  wardrobeGroup.add(drawerGroup);

  App.render.wardrobeGroup = wardrobeGroup;
  App.render.drawersArray = [{ id: 'd1_draw_0', group: drawerGroup }];
  App.store.getState = () => ({
    ui: { view: {} },
    config: { globalHandleType: 'standard', handlesMap: {} },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });

  applyHandles({ App, cfgSnapshot: readConfigSnapshot(App), addOutlines, triggerRender: false });

  const handleHosts: FakeGroup3D[] = [];
  wardrobeGroup.traverse(node => {
    if (node.children.some(child => child.userData.__kind === 'handle'))
      handleHosts.push(node as FakeGroup3D);
  });

  assert.deepEqual(
    handleHosts.map(node => node.userData.partId),
    ['d1_draw_0'],
    'only the drawer-front owner should receive a handle; the drawer box must stay handle-free'
  );
});

test('handles apply rejects a missing config snapshot instead of reading live build/store state', () => {
  const { App } = createApp();
  assert.throws(() => applyHandles({ App }), /cfgSnapshot is required/);
});
