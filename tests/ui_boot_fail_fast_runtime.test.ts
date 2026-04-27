import test from 'node:test';
import assert from 'node:assert/strict';

import { bootMain } from '../esm/native/ui/boot_main.ts';
import { getUiBootRuntimeState } from '../esm/native/runtime/ui_boot_state_access.ts';

type FakeNode = {
  parent?: FakeNode | null;
  children?: FakeNode[];
  appendChild?: (node: FakeNode) => FakeNode;
  contains?: (node: FakeNode) => boolean;
};

type FakeElement = FakeNode & {
  nodeType: 1;
  id?: string;
  style: { cursor: string };
  clientWidth?: number;
  clientHeight?: number;
  getBoundingClientRect?: () => { left: number; top: number; width: number; height: number };
  addEventListener?: (...args: unknown[]) => void;
  removeEventListener?: (...args: unknown[]) => void;
};

function createFakeElement(id = ''): FakeElement {
  const el: FakeElement = {
    nodeType: 1,
    id,
    style: { cursor: '' },
    children: [],
    appendChild(node: FakeNode) {
      this.children!.push(node);
      node.parent = this;
      return node;
    },
    contains(node: FakeNode) {
      return this.children!.includes(node);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: this.clientWidth || 1, height: this.clientHeight || 1 };
    },
    addEventListener() {},
    removeEventListener() {},
  };
  return el;
}

function createFakeDocument(container: FakeElement) {
  const body = createFakeElement('body');
  const docEl = createFakeElement('html');
  return {
    body,
    documentElement: docEl,
    defaultView: null as unknown,
    createElement(tag: string) {
      const upper = String(tag || '').toUpperCase();
      const el = createFakeElement();
      (el as any).tagName = upper;
      return el;
    },
    querySelector() {
      return null;
    },
    getElementById(id: string) {
      return id === 'viewer-container' ? container : null;
    },
  };
}

function createFakeThree() {
  class Vec3 {
    x = 0;
    y = 0;
    z = 0;
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    copy(source: { x?: number; y?: number; z?: number }) {
      this.x = Number(source?.x ?? 0);
      this.y = Number(source?.y ?? 0);
      this.z = Number(source?.z ?? 0);
      return this;
    }
    clone() {
      return new Vec3().copy(this);
    }
    sub(v: { x: number; y: number; z: number }) {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }
    add(v: { x: number; y: number; z: number }) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    multiplyScalar(s: number) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }
    addVectors(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
      this.x = a.x + b.x;
      this.y = a.y + b.y;
      this.z = a.z + b.z;
      return this;
    }
    lerp(v: { x: number; y: number; z: number }, alpha: number) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      this.z += (v.z - this.z) * alpha;
      return this;
    }
  }
  class Object3DBase {
    parent: unknown = null;
    children: unknown[] = [];
    position = new Vec3();
    rotation: Record<string, unknown> = {};
    scale = new Vec3().set(1, 1, 1);
    userData: Record<string, unknown> = {};
    add(node: unknown) {
      this.children.push(node);
      if (node && typeof node === 'object') (node as any).parent = this;
      return this;
    }
    remove(node: unknown) {
      this.children = this.children.filter(child => child !== node);
      if (node && typeof node === 'object') (node as any).parent = null;
      return this;
    }
  }
  class Scene extends Object3DBase {}
  class WebGLCubeRenderTarget {
    texture = {};
    constructor(_size: number, _opts: Record<string, unknown>) {}
  }
  class CubeCamera extends Object3DBase {
    constructor(_near: number, _far: number, _rt: unknown) {
      super();
    }
  }
  class PerspectiveCamera extends Object3DBase {
    aspect = 1;
    fov = 45;
    updateProjectionMatrix() {}
    updateMatrixWorld(_force?: boolean) {}
  }
  class WebGLRenderer {
    domElement = createFakeElement('canvas');
    shadowMap: Record<string, unknown> = {};
    setClearColor(_color: number, _alpha?: number) {}
    setSize(_width: number, _height: number) {}
    setPixelRatio(_ratio: number) {}
    render(_scene: unknown, _camera: unknown) {}
  }
  class OrbitControls {
    enabled = true;
    enableDamping = false;
    target = new Vec3();
    constructor(_camera: unknown, _domElement: unknown) {}
    update() {}
    handleResize() {}
    addEventListener(_name: string, _fn: unknown) {}
    removeEventListener(_name: string, _fn: unknown) {}
    dispatchEvent(_event: unknown) {
      return true;
    }
  }
  class Group extends Object3DBase {}
  return {
    Scene,
    WebGLCubeRenderTarget,
    CubeCamera,
    PerspectiveCamera,
    WebGLRenderer,
    OrbitControls,
    Group,
    LinearFilter: 'LinearFilter',
    RGBAFormat: 'RGBAFormat',
    PCFShadowMap: 'PCFShadowMap',
  };
}

function createBootApp(overrides?: {
  roomDesign?: Record<string, unknown> | null;
  installReactivity?: (() => unknown) | null;
  commitUiSnapshot?: ((ui: Record<string, unknown>, meta: Record<string, unknown>) => unknown) | null;
  historySystem?: { resetBaseline?: (meta?: Record<string, unknown>) => void } | null;
  ui?: Record<string, unknown>;
}) {
  const container = createFakeElement('viewer-container');
  container.clientWidth = 900;
  container.clientHeight = 600;

  const doc = createFakeDocument(container);
  const windowObj = {
    document: doc,
    navigator: { userAgent: 'node:test' },
    location: { search: '' },
    devicePixelRatio: 1,
    setTimeout: (_fn: () => void, _ms?: number) => 0,
    clearTimeout: (_handle?: number) => undefined,
    setInterval: (_fn: () => void, _ms?: number) => 0,
    clearInterval: (_handle?: number) => undefined,
    requestAnimationFrame: (_cb: FrameRequestCallback) => 0,
    cancelAnimationFrame: (_handle: number) => undefined,
    addEventListener: (_name: string, _fn: unknown, _opts?: unknown) => undefined,
    removeEventListener: (_name: string, _fn?: unknown) => undefined,
  };
  (doc as any).defaultView = windowObj;

  const installReactivity =
    overrides?.installReactivity === undefined ? () => true : overrides.installReactivity;
  const commitUiSnapshot =
    overrides?.commitUiSnapshot === undefined
      ? (_ui: Record<string, unknown>, _meta: Record<string, unknown>) => true
      : overrides.commitUiSnapshot;

  const App: any = {
    deps: {
      THREE: createFakeThree(),
      browser: {
        document: doc,
        window: windowObj,
      },
    },
    store: {
      getState() {
        return {
          ui: overrides?.ui || { width: 240, height: 260, depth: 60, doors: 4 },
          config: {},
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
    actions: {
      store: {
        installReactivity,
      },
      commitUiSnapshot,
      meta: {
        uiOnly(_meta?: Record<string, unknown>, source?: string) {
          return { source: source || 'test', uiOnly: true, noBuild: true };
        },
      },
      runtime: {
        setScalar(_key: string, _value: unknown, _meta?: Record<string, unknown>) {},
      },
    },
    services: {
      autosave: {},
      history: overrides?.historySystem === undefined ? undefined : { system: overrides.historySystem },
      roomDesign: overrides?.roomDesign === undefined ? { buildRoom() {} } : overrides.roomDesign,
      platform: {
        util: {
          log() {},
        },
        reportError() {},
        triggerRender() {},
      },
    },
  };

  return { App, container };
}

test('ui boot fail-fast: missing RoomDesign wiring throws and clears boot runtime state', () => {
  const { App } = createBootApp({ roomDesign: null });

  assert.throws(() => bootMain(App), /RoomDesign service missing|expected App\.services\.roomDesign/);
  assert.deepEqual(getUiBootRuntimeState(App), {
    didInit: true,
    booting: false,
    bootBuildScheduled: false,
    bootBuildArgs: null,
  });
});

test('ui boot fail-fast: missing store reactivity wiring throws before boot completes', () => {
  const { App } = createBootApp({ installReactivity: null });

  assert.throws(() => bootMain(App), /store reactivity must be installed before UI boot completes/i);
  assert.equal(getUiBootRuntimeState(App).booting, false);
});

test('ui boot fail-fast: store reactivity installer exceptions keep the real cause instead of collapsing to a bare false', () => {
  const { App } = createBootApp({
    installReactivity() {
      throw new Error('reactivity exploded');
    },
  });

  assert.throws(
    () => bootMain(App),
    /store reactivity must be installed before ui boot completes|reactivity exploded/i
  );
  assert.equal(getUiBootRuntimeState(App).booting, false);
});

test('ui boot fail-fast: boot seed commit failures are no longer softened away', () => {
  const { App } = createBootApp({
    commitUiSnapshot() {
      throw new Error('commit exploded');
    },
  });

  assert.throws(() => bootMain(App), /boot seed commit failed|commit exploded/i);
  assert.equal(getUiBootRuntimeState(App).booting, false);
});

test('ui boot fail-fast: history baseline reset failures are no longer softened away after the canonical seed commit', () => {
  const { App } = createBootApp({
    historySystem: {
      resetBaseline() {
        throw new Error('history reset exploded');
      },
    },
  });

  assert.throws(() => bootMain(App), /history baseline reset failed|history reset exploded/i);
  assert.equal(getUiBootRuntimeState(App).booting, false);
});

test('ui boot seeds the full store.ui snapshot and resets history baseline through the controller-owned seam', () => {
  const commits: Array<{ ui: Record<string, unknown>; meta: Record<string, unknown> }> = [];
  const historyCalls: Record<string, unknown>[] = [];
  const { App } = createBootApp({
    ui: { width: 240, height: 260, depth: 60, doors: 4, color: 'oak', customFlag: true },
    historySystem: {
      resetBaseline(meta?: Record<string, unknown>) {
        historyCalls.push(meta || {});
      },
    },
    commitUiSnapshot(ui: Record<string, unknown>, meta: Record<string, unknown>) {
      commits.push({ ui, meta });
      return true;
    },
  });

  assert.doesNotThrow(() => bootMain(App));
  assert.equal(commits.length, 1);
  assert.deepEqual(commits[0]?.ui, {
    width: 240,
    height: 260,
    depth: 60,
    doors: 4,
    color: 'oak',
    customFlag: true,
  });
  assert.equal(commits[0]?.meta.source, 'init:seed');
  assert.deepEqual(historyCalls, [{ source: 'init:seed' }]);
});

test('ui boot fail-fast: missing essential store.ui dimensions now throw from the controller-owned boot seed seam', () => {
  const { App } = createBootApp({
    ui: { width: 240, height: 260, depth: 60 },
  });

  assert.throws(() => bootMain(App), /boot seed requires essential ui fields/i);
  assert.equal(getUiBootRuntimeState(App).booting, false);
});
