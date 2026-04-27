import test from 'node:test';
import assert from 'node:assert/strict';

import { appendSketchBoxDoorVisuals } from '../esm/native/builder/render_interior_sketch_boxes_fronts_door_visuals.ts';

class FakeVector3 {
  x = 0;
  y = 0;
  z = 0;
  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class FakeGroup {
  children: unknown[] = [];
  userData: Record<string, unknown> = {};
  position = new FakeVector3();
  rotation = new FakeVector3();
  add(child: unknown) {
    this.children.push(child);
    return child;
  }
  traverse(fn: (node: unknown) => void) {
    fn(this);
    for (const child of this.children) {
      if (child && typeof (child as { traverse?: unknown }).traverse === 'function') {
        (child as { traverse: (cb: (node: unknown) => void) => void }).traverse(fn);
      } else {
        fn(child);
      }
    }
  }
}

function createArgs() {
  const doorGroup = new FakeGroup();
  const mirrorMat = { id: 'mirror-mat' };
  const baseMat = { id: 'base-mat' };
  const partMat = { id: 'part-mat' };
  const visualCalls: unknown[][] = [];
  const outlines: unknown[] = [];

  const renderArgs: any = {
    frontsArgs: {
      shell: { boxId: 'box-7', isFreePlacement: false },
      args: {
        App: {},
        input: {
          cfg: {
            isMultiColorMode: true,
            doorSpecialMap: { sketch_box_free_alpha_door_left: 'mirror' },
            mirrorLayoutMap: {
              sketch_box_free_alpha_door_left: [{ faceSign: -1, widthCm: 40, heightCm: 90 }],
            },
          },
          addOutlines: (node: unknown) => {
            outlines.push(node);
          },
          getPartColorValue: () => 'glass',
        },
        moduleKeyStr: 'module:alpha',
        currentShelfMat: { id: 'shelf-mat' },
        bodyMat: baseMat,
        createDoorVisual: (...args: unknown[]) => {
          visualCalls.push(args);
          const root = new FakeGroup();
          root.add(new FakeGroup());
          return root;
        },
        THREE: { Group: FakeGroup },
        isFn: (value: unknown) => typeof value === 'function',
        ops: {
          getMirrorMaterial: () => mirrorMat,
        },
      },
    },
    doorStyle: 'flat',
    doorStyleMap: {},
    resolvePartMaterial: () => partMat,
  };

  const layout: any = {
    placement: { door: { groove: false } },
    doorId: 'left',
    doorPid: 'sketch_box_free_alpha_door_left',
    slabLocalX: 0.17,
    doorW: 0.44,
    doorH: 1.18,
    doorD: 0.022,
    sharedDoorUserData: { foo: 'bar' },
  };

  return { doorGroup, renderArgs, layout, mirrorMat, baseMat, partMat, visualCalls, outlines };
}

test('sketch-box door visuals forward mirror state, mirror layout, and deep pick meta through the special visual path', () => {
  const { doorGroup, renderArgs, layout, mirrorMat, partMat, visualCalls, outlines } = createArgs();

  appendSketchBoxDoorVisuals({ renderArgs, doorGroup, layout });

  assert.equal(visualCalls.length, 1);
  assert.equal(visualCalls[0]?.[0], 0.44);
  assert.equal(visualCalls[0]?.[1], 1.18);
  assert.equal(visualCalls[0]?.[2], 0.022);
  assert.equal(visualCalls[0]?.[3], mirrorMat);
  assert.equal(visualCalls[0]?.[4], 'flat');
  assert.equal(visualCalls[0]?.[6], true);
  assert.equal(visualCalls[0]?.[7], null);
  assert.equal(visualCalls[0]?.[8], partMat);
  assert.deepEqual(visualCalls[0]?.[11], [{ faceSign: -1, widthCm: 40, heightCm: 90 }]);

  assert.equal(outlines.length, 0);
  assert.equal(doorGroup.children.length, 1);

  const specialVisual = doorGroup.children[0] as FakeGroup;
  assert.equal(specialVisual.position.x, 0.17);
  assert.equal(specialVisual.userData.partId, 'sketch_box_free_alpha_door_left');
  assert.equal(specialVisual.userData.__wpSketchBoxId, 'box-7');
  assert.equal(specialVisual.userData.__wpSketchModuleKey, 'module:alpha');
  assert.equal(specialVisual.userData.__wpSketchBoxDoor, true);
  assert.equal(specialVisual.userData.foo, 'bar');

  const nested = specialVisual.children[0] as FakeGroup;
  assert.equal(nested.userData.partId, 'sketch_box_free_alpha_door_left');
  assert.equal(nested.userData.__wpSketchBoxDoor, true);
  assert.equal(nested.userData.foo, 'bar');
});
