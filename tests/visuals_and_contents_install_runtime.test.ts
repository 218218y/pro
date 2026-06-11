import test from 'node:test';
import assert from 'node:assert/strict';

import { installBuilderVisualsAndContents } from '../esm/native/builder/visuals_and_contents.ts';

type AnyRecord = Record<string, any>;

function createThreeStub() {
  class BoxGeometry {
    constructor(
      public w: number,
      public h: number,
      public d: number
    ) {}
  }
  class RoundedBoxGeometry extends BoxGeometry {}
  class MeshStandardMaterial {
    constructor(public opts: AnyRecord) {}
  }
  class Mesh {
    position = { set() {} };
    rotation = { y: 0 };
    userData: AnyRecord = {};
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }
  return {
    BoxGeometry,
    RoundedBoxGeometry,
    MeshStandardMaterial,
    Mesh,
  };
}

function createParentGroup() {
  return {
    children: [] as unknown[],
    add(node: unknown) {
      this.children.push(node);
    },
  };
}

function createApp(
  id: string,
  showContents: boolean,
  surfaces?: { modules?: AnyRecord; contents?: AnyRecord }
) {
  return {
    id,
    deps: { THREE: createThreeStub() },
    services: {
      builder: {
        modules: surfaces?.modules ?? {},
        contents: surfaces?.contents ?? {},
      },
      platform: {
        getBuildUI() {
          return { showContents };
        },
      },
    },
    store: {
      getState() {
        return {
          runtime: { sketchMode: false },
          ui: { showHanger: showContents },
        };
      },
    },
  } as AnyRecord;
}

test('visuals_and_contents install keeps stable content refs live across root replacement installs', () => {
  const AppA = createApp('A', false);
  const installed = installBuilderVisualsAndContents(AppA as never);
  const heldAddFoldedClothes = installed.builderContents.addFoldedClothes;

  assert.equal(typeof heldAddFoldedClothes, 'function');

  const parentA = createParentGroup();
  heldAddFoldedClothes?.(0.5, 1, 0.2, 0.9, parentA as never, 0.5, 0.4);
  assert.equal(parentA.children.length, 0);

  const AppB = createApp('B', true, {
    modules: installed.builderModules as AnyRecord,
    contents: installed.builderContents as AnyRecord,
  });
  const reinstalled = installBuilderVisualsAndContents(AppB as never);

  assert.equal(reinstalled.builderContents, installed.builderContents);
  assert.equal(reinstalled.builderContents.addFoldedClothes, heldAddFoldedClothes);

  const parentB = createParentGroup();
  heldAddFoldedClothes?.(0.5, 1, 0.2, 0.9, parentB as never, 0.5, 0.4);
  assert.ok(parentB.children.length > 0);
});

test('visuals_and_contents install heals visual/content drift even when legacy markers are already set', () => {
  const driftedDoorVisual = () => 'drifted-door';
  const driftedFolded = () => 'drifted-folded';
  const App = createApp('A', true, {
    modules: {
      __esm_visuals_v1: true,
      createDoorVisual: driftedDoorVisual,
    },
    contents: {
      __esm_contents_v1: true,
      addFoldedClothes: driftedFolded,
    },
  });

  const installed = installBuilderVisualsAndContents(App as never);
  const canonicalDoor = installed.builderModules.createDoorVisual;
  const canonicalFolded = installed.builderContents.addFoldedClothes;

  assert.notEqual(canonicalDoor, driftedDoorVisual);
  assert.notEqual(canonicalFolded, driftedFolded);
  assert.equal(typeof installed.builderModules.createInternalDrawerBox, 'function');
  assert.equal(typeof installed.builderModules.buildChestOnly, 'function');
  assert.equal(typeof installed.builderContents.addHangingClothes, 'function');
  assert.equal(typeof installed.builderContents.addRealisticHanger, 'function');

  installed.builderModules.createDoorVisual = () => 'drifted-door-again';
  installed.builderContents.addFoldedClothes = () => 'drifted-folded-again';
  installBuilderVisualsAndContents(App as never);

  assert.equal(installed.builderModules.createDoorVisual, canonicalDoor);
  assert.equal(installed.builderContents.addFoldedClothes, canonicalFolded);
});
