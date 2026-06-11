import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSketchBoxFronts } from '../esm/native/builder/render_interior_sketch_boxes_fronts.ts';

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
  position = new FakeVector3();
  rotation = new FakeVector3();
  userData: Record<string, unknown> = {};
  add(child: unknown) {
    this.children.push(child);
    return child;
  }
}

class FakeMesh {
  position = new FakeVector3();
  rotation = new FakeVector3();
  userData: Record<string, unknown> = {};
  children: unknown[] = [];
  castShadow = true;
  receiveShadow = true;
  geometry: unknown;
  material: unknown;
  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
  add(child: unknown) {
    this.children.push(child);
    return child;
  }
}

class FakeBoxGeometry {
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}

class FakeMeshStandardMaterial {
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

function createFrontsArgs() {
  const mirrorMat = { id: 'mirror-mat' };
  let mirrorCalls = 0;
  const doorVisualCalls: Array<{ partId: string; faceMat: unknown; isMirror: boolean; baseMat: unknown }> =
    [];
  const group = new FakeGroup();
  const shelfBoards: FakeMesh[] = [];
  const App: any = {
    services: {
      builder: {
        materials: {
          getMirrorMaterial: () => {
            mirrorCalls += 1;
            return mirrorMat;
          },
        },
      },
    },
  };

  const args: any = {
    shell: {
      box: {
        extDrawers: [
          { id: 'left', count: 1, yNormC: 0.25 },
          { id: 'right', count: 1, yNormC: 0.75 },
        ],
        doors: [],
      },
      boxId: 'box-0',
      boxPid: 'box_0',
      isFreePlacement: false,
      height: 1.4,
      halfH: 0.7,
      centerY: 1,
      boxMat: { id: 'box-mat' },
      geometry: {
        centerX: 0,
        centerZ: 0,
        outerW: 0.8,
        outerD: 0.55,
        innerW: 0.76,
        innerD: 0.51,
        innerBackZ: -0.255,
      },
      innerBottomY: 0.3,
      innerTopY: 1.7,
      regularDepth: 0.5,
      frontZ: 0.275,
    },
    boxDividers: [],
    yFromBoxNorm() {
      return null;
    },
    resolveBoxDrawerSpan() {
      return {
        segment: null,
        innerW: 0.6,
        innerCenterX: 0,
        outerW: 0.66,
        outerCenterX: 0,
        faceW: 0.66,
        faceCenterX: 0,
      };
    },
    args: {
      App,
      input: {
        cfg: {
          isMultiColorMode: true,
          doorSpecialMap: {
            box_0_ext_drawers_left_1: 'mirror',
            box_0_ext_drawers_right_1: 'mirror',
          },
        },
        addOutlines: () => {},
        createInternalDrawerBox: () => new FakeMesh(new FakeBoxGeometry(1, 1, 1), { id: 'drawer-box-mat' }),
      },
      group,
      woodThick: 0.02,
      moduleIndex: 2,
      moduleKeyStr: 'module_2',
      currentBraceShelfMat: { id: 'brace-shelf-mat' },
      createBoard: (
        w: number,
        h: number,
        d: number,
        x: number,
        y: number,
        z: number,
        mat: unknown,
        partId: string
      ) => {
        const mesh = new FakeMesh(new FakeBoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.userData.partId = partId;
        shelfBoards.push(mesh);
        group.add(mesh);
        return mesh;
      },
      createDoorVisual: (
        _faceW: number,
        _faceH: number,
        _faceD: number,
        faceMat: unknown,
        _style: unknown,
        _isOpen: boolean,
        isMirror: boolean,
        _curtainType: unknown,
        baseMat: unknown,
        _hingeCount: number,
        _doubleDoor: boolean,
        _mirrorLayout: unknown,
        partId: string
      ) => {
        doorVisualCalls.push({ partId, faceMat, isMirror, baseMat });
        return new FakeMesh(new FakeBoxGeometry(1, 1, 1), faceMat);
      },
      THREE: {
        Group: FakeGroup,
        Mesh: FakeMesh,
        BoxGeometry: FakeBoxGeometry,
        MeshStandardMaterial: FakeMeshStandardMaterial,
      },
      getPartMaterial: (partId: string) => ({ id: `part:${partId}` }),
      isFn: (value: unknown) => typeof value === 'function',
    },
  };

  return { args, mirrorCallsRef: () => mirrorCalls, doorVisualCalls, shelfBoards, App, group, mirrorMat };
}

test('render sketch box fronts reuses one mirror material across mirrored external drawers', () => {
  const { args, mirrorCallsRef, doorVisualCalls, shelfBoards, App, group, mirrorMat } = createFrontsArgs();

  renderSketchBoxFronts(args);

  assert.equal(mirrorCallsRef(), 1);
  assert.equal(doorVisualCalls.length, 2);
  assert.equal(doorVisualCalls[0]?.isMirror, true);
  assert.equal(doorVisualCalls[1]?.isMirror, true);
  assert.equal(doorVisualCalls[0]?.faceMat, mirrorMat);
  assert.equal(doorVisualCalls[1]?.faceMat, mirrorMat);
  assert.notEqual(doorVisualCalls[0]?.baseMat, mirrorMat);
  assert.notEqual(doorVisualCalls[1]?.baseMat, mirrorMat);
  assert.equal((App.render?.drawersArray || []).length, 2);
  assert.equal(shelfBoards.length, 2);
  assert.equal(group.children.length, 4);
});

test('render sketch box external drawers flush a top-anchored free-box stack to the box face edge', () => {
  const { args, App } = createFrontsArgs();
  args.shell.box = {
    extDrawers: [{ id: 'top-stack', count: 1, yNormC: 1 }],
    doors: [],
  };
  args.shell.isFreePlacement = true;
  args.shell.height = 1.4;
  args.shell.halfH = 0.7;
  args.shell.centerY = 1;
  args.shell.sideH = 1.36;
  args.shell.innerBottomY = 0.32;
  args.shell.innerTopY = 1.68;

  renderSketchBoxFronts(args);

  const drawers = App.render?.drawersArray || [];
  assert.equal(drawers.length, 1);
  const drawerGroup = drawers[0]?.group as FakeGroup;
  const expectedFaceTopY = args.shell.centerY + args.shell.halfH;

  assert.ok(Math.abs(Number(drawerGroup.userData.__wpFaceMaxY) - expectedFaceTopY) < 1e-9);
  assert.ok(Number(drawerGroup.userData.__wpFaceMaxY) > args.shell.innerTopY);
});
