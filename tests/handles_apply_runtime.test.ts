import test from 'node:test';
import assert from 'node:assert/strict';

import { applyHandles } from '../esm/native/builder/handles_apply.ts';

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

test('handles apply triggers a platform render by default', () => {
  const { App, calls } = createApp();
  applyHandles({ App });
  assert.deepEqual(calls, [['platform-render', false]]);
});

test('handles apply can suppress the trailing platform render for batched callers', () => {
  const { App, calls } = createApp();
  applyHandles({ App, triggerRender: false });
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

  applyHandles({ App });
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
        d9_draw_0: 'standard',
        '__wp_manual_handle_position:d9_draw_0': '{"xRatio":0.75,"yRatio":0.7}',
      };
    },
  };

  applyHandles({ App, triggerRender: false });

  const drawerGroup = App.render.drawersArray[0].group as FakeGroup3D;
  const handleGroup = drawerGroup.children.find(child => child.userData.__kind === 'handle');
  assert.ok(handleGroup);
  assert.ok(Math.abs(handleGroup.position.x - 0.3) < 1e-12);
  assert.ok(Math.abs(handleGroup.position.y - 0.04) < 1e-12);
});
