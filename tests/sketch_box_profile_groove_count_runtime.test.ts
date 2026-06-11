import test from 'node:test';
import assert from 'node:assert/strict';

import { appendGrooveStrips } from '../esm/native/builder/visuals_and_contents_door_visual_grooves.ts';
import { appendSketchBoxDoorCoreVisual } from '../esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_core.ts';

class FakeVector3 {
  x = 0;
  y = 0;
  z = 0;

  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class FakeObject3D {
  children: unknown[] = [];
  position = new FakeVector3();
  userData: Record<string, unknown> = {};

  add(child: unknown) {
    this.children.push(child);
    return child;
  }

  traverse(visitor: (node: unknown) => void) {
    for (const child of this.children) visitor(child);
  }
}

class FakeGroup extends FakeObject3D {}

class FakeMesh extends FakeObject3D {
  geometry: unknown;
  material: unknown;

  constructor(geometry: unknown, material: unknown) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeBoxGeometry {
  args: unknown[];

  constructor(...args: unknown[]) {
    this.args = args;
  }
}

class FakeMeshStandardMaterial {
  color = { setHex() {} };

  constructor(props: Record<string, unknown> = {}) {
    Object.assign(this, props);
  }
}

function createThree() {
  return {
    Group: FakeGroup,
    Mesh: FakeMesh,
    BoxGeometry: FakeBoxGeometry,
    MeshStandardMaterial: FakeMeshStandardMaterial,
  };
}

test('door visual grooves honor an explicit local groove-line count before profile density fallback', () => {
  const THREE = createThree();
  const visualGroup = new THREE.Group();
  const App = {
    store: {
      getState() {
        return {
          config: {
            grooveLinesCountMap: {
              sketch_box_1_door_sbdr_1: 2,
            },
          },
        };
      },
    },
  };

  appendGrooveStrips({
    App: App as never,
    THREE: THREE as never,
    visualGroup: visualGroup as never,
    tagDoorVisualPart(node: unknown, role: string) {
      (node as { userData: Record<string, unknown> }).userData.__doorVisualRole = role;
    },
    hasGrooves: true,
    isSketch: false,
    groovePartId: 'sketch_box_1_door_sbdr_1',
    zSign: 1,
    targetW: 0.5,
    targetH: 1.2,
    zOffset: 0.02,
    densityOverride: 12,
    linesCountOverride: 5.9,
  });

  assert.equal(visualGroup.children.length, 5);
  assert.equal(
    visualGroup.children.every(
      child =>
        (child as { userData?: Record<string, unknown> }).userData?.__doorVisualRole === 'door_groove_strip'
    ),
    true
  );
});

test('styled sketch-box profile doors forward the stored per-box groove count into createDoorVisual', () => {
  const calls: unknown[][] = [];
  const doorGroup = new FakeGroup();
  const createdVisual = new FakeGroup();

  appendSketchBoxDoorCoreVisual({
    renderArgs: {
      frontsArgs: {
        args: {
          moduleKeyStr: 'module-A',
          bodyMat: { kind: 'body' },
          currentShelfMat: { kind: 'shelf' },
          isFn: (value: unknown) => typeof value === 'function',
        },
        shell: {
          boxId: 'box-1',
        },
      },
    } as never,
    doorGroup: doorGroup as never,
    layout: {
      placement: {
        door: {
          groove: true,
          grooveLinesCount: 7.8,
        },
      },
      doorPid: 'sketch_box_1_door_sbdr_1',
      slabLocalX: 0.11,
      doorW: 0.6,
      doorH: 1.1,
      doorD: 0.018,
      sharedDoorUserData: {},
    } as never,
    materials: {
      doorMat: { kind: 'door' },
      doorFaceMat: { kind: 'door-face' },
      doorBaseMat: { kind: 'door-base' },
    } as never,
    visualRoute: {
      route: 'styled',
      effectiveDoorStyle: 'profile',
      createDoorVisual(...args: unknown[]) {
        calls.push(args);
        return createdVisual as never;
      },
      shouldUseClassicAccents: false,
    } as never,
    THREE: createThree() as never,
    addOutlines: null,
    doorVisualState: {
      isMirror: false,
      isGlass: false,
      curtainType: null,
      mirrorLayout: null,
    },
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][13], { grooveLinesCount: 7.8 });
  assert.equal(doorGroup.children[0], createdVisual);
});
