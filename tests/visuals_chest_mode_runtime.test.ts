import test from 'node:test';
import assert from 'node:assert/strict';

import { buildChestOnly } from '../esm/native/builder/visuals_chest_mode.ts';
import { resolveChestModeBodyMaterialState } from '../esm/native/builder/visuals_chest_mode_materials.ts';
import { resolveChestModeBuildInputs } from '../esm/native/builder/visuals_chest_mode_inputs.ts';

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

class FakeObject3D {
  children: any[] = [];
  position = new FakeVector3();
  rotation = {};
  scale = {};
  userData: Record<string, unknown> = {};
  add(child: unknown) {
    this.children.push(child);
    return child;
  }
  remove(child: unknown) {
    this.children = this.children.filter(entry => entry !== child);
  }
}

class FakeGroup extends FakeObject3D {}
class FakeMesh extends FakeObject3D {
  geometry: unknown;
  material: unknown;
  renderOrder = 0;
  constructor(geometry: unknown, material: unknown) {
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
class FakeCylinderGeometry {
  type = 'CylinderGeometry';
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}
class FakeMaterial {
  userData: Record<string, unknown> = {};
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown> = {}) {
    this.opts = opts;
  }
}
class FakeMeshStandardMaterial extends FakeMaterial {}
class FakeMeshBasicMaterial extends FakeMaterial {}

function createChestApp() {
  const dimensionCalls: any[] = [];
  const outlined: unknown[] = [];
  let renderCalls = 0;
  let updateCalls = 0;
  const wardrobeGroup = new FakeGroup();
  const App: any = {
    services: {
      builder: {
        modules: {},
        contents: {},
        materials: {
          getMaterial(color: unknown, part: unknown, useTexture?: unknown) {
            return { color, part, useTexture: !!useTexture };
          },
          getMirrorMaterial() {
            return { mirror: true };
          },
        },
        renderOps: {
          addOutlines(mesh: unknown) {
            outlined.push(mesh);
          },
          addDimensionLine(...args: unknown[]) {
            dimensionCalls.push(args);
          },
        },
      },
      platform: {
        getBuildUI() {
          return {
            baseType: 'legs',
            baseLegStyle: 'square',
            baseLegColor: 'nickel',
            baseLegHeightCm: 16,
            baseLegWidthCm: 6,
            colorChoice: '#cccccc',
            customColor: '#00ff00',
            raw: { width: 160, height: 90, depth: 45, chestDrawersCount: 3 },
          };
        },
      },
    },
    deps: {
      THREE: {
        Group: FakeGroup,
        Mesh: FakeMesh,
        BoxGeometry: FakeBoxGeometry,
        CylinderGeometry: FakeCylinderGeometry,
        MeshStandardMaterial: FakeMeshStandardMaterial,
        MeshBasicMaterial: FakeMeshBasicMaterial,
        Vector3: FakeVector3,
      },
    },
    render: {
      wardrobeGroup,
      drawersArray: [],
      renderer: {
        render() {
          renderCalls += 1;
        },
      },
      scene: { name: 'scene' },
      camera: { name: 'camera' },
      controls: {
        update() {
          updateCalls += 1;
        },
      },
    },
    store: {
      getState() {
        return {
          config: {
            showDimensions: true,
            isMultiColorMode: true,
            individualColors: { chest_drawer_1: 'mirror' },
            savedColors: [{ id: 'saved_tex', type: 'texture', value: 'oak' }],
          },
          ui: {},
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
  };
  return {
    App,
    wardrobeGroup,
    dimensionCalls,
    outlined,
    getRenderCalls: () => renderCalls,
    getUpdateCalls: () => updateCalls,
  };
}

test('visuals chest mode input/material helpers normalize chest-only UI and texture state', () => {
  const { App } = createChestApp();
  assert.deepEqual(resolveChestModeBuildInputs(App, null), {
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 3,
    effectiveBaseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 16,
    baseLegWidthCm: 6,
    baseLegHeightM: 0.16,
    colorChoice: '#cccccc',
    customColor: '#00ff00',
  });

  assert.deepEqual(
    resolveChestModeBodyMaterialState({
      colorChoice: 'custom',
      customColor: '#123456',
      hasCustomTexture: false,
      cfg: {} as any,
    }),
    { colorHex: '#123456', useTexture: false }
  );
  assert.deepEqual(
    resolveChestModeBodyMaterialState({
      colorChoice: 'saved_tex',
      customColor: '#123456',
      cfg: { savedColors: [{ id: 'saved_tex', type: 'texture', value: 'oak' }] } as any,
    }),
    { colorHex: 'saved_tex', useTexture: true }
  );
});

test('visuals chest mode build creates wide-leg chest drawers, mirror override, and dimensions via focused owners', () => {
  const { App, wardrobeGroup, dimensionCalls, outlined, getRenderCalls, getUpdateCalls } = createChestApp();
  buildChestOnly(App, {
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 3,
    baseType: 'legs',
    baseLegStyle: 'round',
    baseLegColor: 'gold',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#ffffff',
  });

  assert.equal(App.render.drawersArray.length, 3);
  assert.equal(dimensionCalls.length, 2);
  assert.equal(getRenderCalls(), 1);
  assert.equal(getUpdateCalls(), 1);

  const legCount = wardrobeGroup.children.filter(
    (child: any) => child?.geometry?.type === 'CylinderGeometry'
  ).length;
  assert.equal(legCount, 6);

  const mirrorDrawer = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_drawer_1'
  );
  assert.ok(mirrorDrawer);
  assert.deepEqual(mirrorDrawer.children[0].material, { mirror: true });

  const labels = dimensionCalls.map(call => call[3]);
  assert.deepEqual(labels, ['160', '90']);
  assert.ok(outlined.length >= 10);
});
