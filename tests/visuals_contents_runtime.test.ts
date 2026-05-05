import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addHangingClothes,
  addFoldedClothes,
  addRealisticHanger,
} from '../esm/native/builder/visuals_contents.ts';

class FakeVector3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class FakeScale {
  x = 1;
  y = 1;
  z = 1;
  set(x = 1, y = 1, z = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class FakeObject3D {
  children: any[] = [];
  position = new FakeVector3();
  rotation = new FakeVector3();
  scale = new FakeScale();
  userData: Record<string, unknown> = {};
  add(child: unknown) {
    this.children.push(child);
    return child;
  }
}

class FakeGroup extends FakeObject3D {}
class FakeMesh extends FakeObject3D {
  geometry: any;
  material: any;
  constructor(geometry: any, material: any) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeBoxGeometry {
  type = 'BoxGeometry';
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}
class FakeTorusGeometry {
  type = 'TorusGeometry';
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}
class FakeCylinderGeometry {
  type = 'CylinderGeometry';
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}
class FakeExtrudeGeometry {
  type = 'ExtrudeGeometry';
  shape: any;
  opts: Record<string, unknown>;
  constructor(shape: any, opts: Record<string, unknown>) {
    this.shape = shape;
    this.opts = opts;
  }
}
class FakeShape {
  cmds: any[] = [];
  moveTo(...args: number[]) {
    this.cmds.push(['moveTo', ...args]);
  }
  quadraticCurveTo(...args: number[]) {
    this.cmds.push(['quadraticCurveTo', ...args]);
  }
  lineTo(...args: number[]) {
    this.cmds.push(['lineTo', ...args]);
  }
}
class FakeMeshStandardMaterial {
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

function createApp(overrides: Record<string, unknown> = {}) {
  const outlined: unknown[] = [];
  const buildUI = {
    showContents: true,
    showHanger: true,
    doorStyle: 'flat',
    ...(overrides.buildUI as object),
  };
  const state = {
    ui: overrides.ui || {},
    runtime: overrides.runtime || {},
    config: overrides.config || {},
    mode: {},
    meta: {},
  };
  const App: any = {
    services: {
      builder: {
        modules: {},
        contents: {},
        renderOps: {
          addOutlines(mesh: unknown) {
            outlined.push(mesh);
          },
        },
      },
      platform: {
        getBuildUI() {
          return buildUI;
        },
      },
    },
    deps: {
      THREE: {
        Group: FakeGroup,
        Mesh: FakeMesh,
        BoxGeometry: FakeBoxGeometry,
        TorusGeometry: FakeTorusGeometry,
        CylinderGeometry: FakeCylinderGeometry,
        ExtrudeGeometry: FakeExtrudeGeometry,
        MeshStandardMaterial: FakeMeshStandardMaterial,
        Shape: FakeShape,
      },
    },
    store: {
      getState() {
        return state;
      },
    },
  };
  return { App, outlined };
}

test('visuals_contents hanging clothes honor showContents, style depth, and outline only cloth meshes', () => {
  const { App, outlined } = createApp({ buildUI: { showContents: true, doorStyle: 'profile' } });
  const parent = new FakeGroup();

  addHangingClothes(App, 0, 1.4, 0, 0.16, parent as any, 1.3, 0.2);

  const hangers = parent.children.filter(child => child.geometry?.type === 'TorusGeometry');
  const clothes = parent.children.filter(child => child.geometry?.type === 'BoxGeometry');

  assert.equal(hangers.length, 4);
  assert.equal(clothes.length, 4);
  assert.equal(outlined.length, 4);
  assert.ok(clothes.every(child => child.geometry.args[2] === 0.2));
  assert.ok(clothes.every(child => typeof child.rotation.y === 'number'));
});

test('visuals_contents folded clothes clamp depth inside shelf bounds and outline only in sketch mode', () => {
  const { App, outlined } = createApp({ buildUI: { showContents: true }, runtime: { sketchMode: true } });
  const parent = new FakeGroup();

  addFoldedClothes(App, 0, 0.2, 0, 0.6, parent as any, 0.25, 0.2);

  assert.ok(parent.children.length > 0);
  assert.equal(outlined.length, parent.children.length);

  const minZ = -0.1 + 0.015 + 0.085;
  const maxZ = 0.1 - 0.015 - 0.085;
  assert.ok(parent.children.every(child => child.position.z >= minZ - 1e-9));
  assert.ok(parent.children.every(child => child.position.z <= maxZ + 1e-9));
  assert.ok(parent.children.every(child => child.geometry.args[2] === 0.17));
});

test('visuals_contents folded shelf renders books instead of clothes in library mode', () => {
  const { App, outlined } = createApp({
    buildUI: { showContents: true },
    config: { isLibraryMode: true },
    runtime: { sketchMode: true },
  });
  const parent = new FakeGroup();

  addFoldedClothes(App, 0, 0.2, 0, 0.6, parent as any, 0.25, 0.2);

  assert.ok(parent.children.length > 0);
  assert.equal(outlined.length, parent.children.length);
  assert.ok(
    parent.children.every(
      child => child.userData.__kind === 'library_book' || child.userData.__kind === 'library_book_stack'
    ),
    'library contents should be marked as books, not the folded-clothes meshes'
  );
  assert.ok(parent.children.every(child => child.geometry?.type === 'BoxGeometry'));
});

test('visuals_contents library books fit small shelf clearance and disappear when too tight', () => {
  const { App } = createApp({
    buildUI: { showContents: true },
    config: { isLibraryMode: true },
  });
  const parent = new FakeGroup();
  const shelfY = 0.2;
  const maxHeight = 0.1;

  addFoldedClothes(App, 0, shelfY, 0, 0.6, parent as any, maxHeight, 0.2);

  assert.ok(parent.children.length > 0);
  for (const child of parent.children) {
    const [bookWidth, bookHeight] = child.geometry.args;
    const angleZ = Number(child.rotation?.z || 0);
    const rotatedHeight =
      child.userData.__kind === 'library_book'
        ? Math.abs(bookHeight * Math.cos(angleZ)) + Math.abs(bookWidth * Math.sin(angleZ))
        : bookHeight;
    assert.ok(child.position.y + rotatedHeight / 2 <= shelfY + maxHeight - 0.014 + 1e-9);
  }

  const tinyParent = new FakeGroup();
  addFoldedClothes(App, 0, shelfY, 0, 0.6, tinyParent as any, 0.075, 0.2);
  assert.equal(tinyParent.children.length, 0);
});

test('visuals_contents realistic hanger respects showHanger override and scales to narrow modules', () => {
  const { App, outlined } = createApp({ buildUI: { showHanger: false }, ui: { showHanger: true } });
  const parent = new FakeGroup();

  addRealisticHanger(App, 0.1, 1.0, -0.1, parent as any, 0.18);

  assert.equal(parent.children.length, 1);
  const hangerGroup = parent.children[0];
  assert.equal(hangerGroup.children.length, 4);
  assert.equal(outlined.length, 1);
  assert.ok(Math.abs(hangerGroup.scale.x - 0.13 / 0.44) < 1e-9);
  assert.equal(hangerGroup.scale.x, hangerGroup.scale.y);
  assert.equal(hangerGroup.scale.y, hangerGroup.scale.z);
  assert.equal(hangerGroup.position.x, 0.1);
  assert.equal(hangerGroup.position.y, 0.945);
  assert.equal(hangerGroup.position.z, -0.1);
});
