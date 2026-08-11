import test from 'node:test';
import assert from 'node:assert/strict';

import { makeDrawerBoxPartId } from '../esm/native/features/part_identity/api.ts';
import { emitCornerWingExternalDrawers } from '../esm/native/builder/corner_wing_cell_interiors_storage.ts';
import { resolveExternalDrawerGeometry } from '../esm/shared/dimensions/external_drawer_policy.ts';

class PositionStub {
  x = 0;
  y = 0;
  z = 0;
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  copy(value: { x?: number; y?: number; z?: number }) {
    this.x = Number(value?.x || 0);
    this.y = Number(value?.y || 0);
    this.z = Number(value?.z || 0);
  }
}

class Object3DStub {
  userData: Record<string, unknown> = {};
  children: Object3DStub[] = [];
  parent: Object3DStub | null = null;
  position = new PositionStub();
  rotation: Record<string, unknown> = {};
  scale: Record<string, unknown> = {};
  isMesh = false;
  name = '';
  add(child: Object3DStub) {
    child.parent = this;
    this.children.push(child);
  }
}

class GroupStub extends Object3DStub {}

class MeshStub extends Object3DStub {
  geometry: unknown;
  material: unknown;
  constructor(geometry: unknown, material: unknown) {
    super();
    this.isMesh = true;
    this.geometry = geometry;
    this.material = material;
  }
}

class BoxGeometryStub {
  args: unknown[];
  constructor(...args: unknown[]) {
    this.args = args;
  }
}

class CylinderGeometryStub {
  args: unknown[];
  constructor(...args: unknown[]) {
    this.args = args;
  }
}

class MeshStandardMaterialStub {
  params: unknown;
  __keepMaterial?: boolean;
  constructor(params: unknown) {
    this.params = params;
  }
}

class Vector3Stub {
  x: number;
  y: number;
  z: number;
  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

function descendants(node: Object3DStub): Object3DStub[] {
  const out: Object3DStub[] = [];
  const stack = [...node.children];
  while (stack.length) {
    const next = stack.shift();
    if (!next) continue;
    out.push(next);
    stack.push(...next.children);
  }
  return out;
}

function makeRuntime(options?: {
  boxOverride?: unknown;
  stackKey?: 'top' | 'bottom';
  doorTrimMap?: Record<string, unknown>;
  drawerRunnerType?: 'roller' | 'blum';
}) {
  const whiteMat = { name: 'white' };
  const bodyMat = { name: 'body-main-painted' };
  const frontMat = { name: 'front-main-painted' };
  const frontOverrideMat = { name: 'front-special-painted' };
  const boxOverrideMat = options?.boxOverride || null;
  const wingGroup = new GroupStub();
  const createInternalDrawerBoxCalls: unknown[][] = [];

  const runtime = {
    App: {},
    ctx: {},
    __cfg: { isMultiColorMode: true, drawerRunnerType: options?.drawerRunnerType || 'roller' },
    THREE: {
      Group: GroupStub,
      Mesh: MeshStub,
      BoxGeometry: BoxGeometryStub,
      CylinderGeometry: CylinderGeometryStub,
      MeshStandardMaterial: MeshStandardMaterialStub,
      Vector3: Vector3Stub,
    },
    wingGroup,
    woodThick: 0.018,
    startY: 0,
    __stackKey: options?.stackKey || 'top',
    __stackScopePartKey: (partId: unknown) => `lower_${String(partId)}`,
    __mirrorX: false,
    frontMat,
    bodyMat,
    whiteMat,
    materials: { front: frontMat },
    shadowMat: { name: 'shadow' },
    getCornerShelfMat: () => bodyMat,
    getCornerMat: (partId: string, fallback: unknown) => {
      if (partId === 'corner_c0_draw_1' || partId === 'lower_corner_c0_draw_1') return frontOverrideMat;
      if (partId === makeDrawerBoxPartId('corner_c0_draw_1')) return boxOverrideMat || fallback;
      if (partId === makeDrawerBoxPartId('lower_corner_c0_draw_1')) return boxOverrideMat || fallback;
      return fallback;
    },
    readMap: (key: string) => (key === 'doorTrimMap' ? options?.doorTrimMap || {} : {}),
    readScopedReaderAny: () => undefined,
    __resolveSpecial: () => null,
    __getMirrorMat: () => ({ name: 'mirror' }),
    getGroove: null,
    groovesEnabled: false,
    doorStyle: 'profile',
    readMirrorLayout: () => null,
    addOutlines: () => undefined,
    createDoorVisual: (_w: number, _h: number, _t: number, material: unknown) =>
      new MeshStub(new BoxGeometryStub(_w, _h, _t), material),
    createInternalDrawerBox: (...args: unknown[]) => {
      createInternalDrawerBoxCalls.push(args);
      return new MeshStub(new BoxGeometryStub(args[0], args[1], args[2]), args[3]);
    },
    render: { drawersArray: [] as unknown[] },
    ensureRenderArray: (record: Record<string, unknown>, key: string) => {
      if (!Array.isArray(record[key])) record[key] = [];
      return record[key] as unknown[];
    },
  };

  const cellRuntime = {
    cfgCell: { extDrawersCount: 1, hasShoeDrawer: false },
    cell: { idx: 0, drawerHeightTotal: 0.22 },
    cellKey: 'corner-cell-0',
    cellW: 0.62,
    cellCenterX: 0.31,
    cellD: 0.58,
    effectiveBottomY: 0,
    effectiveTopY: 2,
    __z: (z: number) => z,
  };

  return {
    runtime,
    cellRuntime,
    wingGroup,
    whiteMat,
    bodyMat,
    frontMat,
    frontOverrideMat,
    boxOverrideMat,
    createInternalDrawerBoxCalls,
  };
}

test('corner regular external drawer box keeps a separate white paint identity from the drawer front', () => {
  const setup = makeRuntime();

  emitCornerWingExternalDrawers(setup.runtime as any, setup.cellRuntime as any);

  const drawerGroup = descendants(setup.wingGroup).find(
    node => node.userData?.partId === 'corner_c0_draw_1' && node.userData?.__wpType === 'extDrawer'
  );
  assert.ok(drawerGroup, 'expected the corner drawer group to be emitted');

  const drawerBoxPartId = makeDrawerBoxPartId('corner_c0_draw_1');
  const drawerBox = descendants(drawerGroup as Object3DStub).find(
    node => node.userData?.__wpDrawerBox === true
  );
  assert.ok(drawerBox, 'expected the corner drawer box to be tagged as a separate paint target');
  assert.equal(drawerBox?.userData.partId, drawerBoxPartId);
  assert.equal(drawerBox?.userData.drawerId, 'corner_c0_draw_1');
  assert.equal(drawerBox?.userData.__wpDrawerOwnerPartId, 'corner_c0_draw_1');
  assert.equal(drawerBox?.userData.__wpStack, 'top');
  assert.equal((drawerBox as MeshStub).material, setup.whiteMat);

  const drawerFront = descendants(drawerGroup as Object3DStub).find(
    node =>
      node.isMesh &&
      node.userData?.__wpDrawerBox !== true &&
      (node as MeshStub).material === setup.frontOverrideMat
  );
  assert.ok(drawerFront, 'expected the front special paint to remain on the front only');
  assert.notEqual((drawerBox as MeshStub).material, setup.bodyMat);
  assert.notEqual((drawerBox as MeshStub).material, setup.frontMat);
});

test('corner regular external drawer box accepts its own explicit per-part paint', () => {
  const boxOverride = { name: 'drawer-box-special-painted' };
  const setup = makeRuntime({ boxOverride });

  emitCornerWingExternalDrawers(setup.runtime as any, setup.cellRuntime as any);

  const drawerBox = descendants(setup.wingGroup).find(node => node.userData?.__wpDrawerBox === true) as
    MeshStub | undefined;
  assert.ok(drawerBox, 'expected a separately tagged drawer box');
  assert.equal(drawerBox?.userData.partId, makeDrawerBoxPartId('corner_c0_draw_1'));
  assert.equal(drawerBox?.material, boxOverride);
});

test('corner lower-stack regular external drawer box uses a scoped owner id and its own box id', () => {
  const setup = makeRuntime({ stackKey: 'bottom' });

  emitCornerWingExternalDrawers(setup.runtime as any, setup.cellRuntime as any);

  const drawerBox = descendants(setup.wingGroup).find(node => node.userData?.__wpDrawerBox === true) as
    MeshStub | undefined;
  assert.ok(drawerBox, 'expected lower corner drawer box to be emitted');
  assert.equal(drawerBox?.userData.partId, makeDrawerBoxPartId('lower_corner_c0_draw_1'));
  assert.equal(drawerBox?.userData.drawerId, 'lower_corner_c0_draw_1');
  assert.equal(drawerBox?.userData.__wpDrawerOwnerPartId, 'lower_corner_c0_draw_1');
  assert.equal(drawerBox?.userData.__wpStack, 'bottom');
  assert.equal(drawerBox?.material, setup.whiteMat);
});

test('corner regular external drawer build appends configured door-trim visuals to the drawer front', () => {
  const setup = makeRuntime({
    doorTrimMap: {
      corner_c0_draw_1: [{ id: 'trim-corner-drawer', axis: 'horizontal', color: 'gold', span: 'full' }],
    },
  });

  emitCornerWingExternalDrawers(setup.runtime as any, setup.cellRuntime as any);

  const drawerGroup = descendants(setup.wingGroup).find(
    node => node.userData?.partId === 'corner_c0_draw_1' && node.userData?.__wpType === 'extDrawer'
  );
  assert.ok(drawerGroup, 'expected the corner drawer group to be emitted');
  const trim = descendants(drawerGroup as Object3DStub).find(node => node.userData?.__wpDoorTrim === true) as
    MeshStub | undefined;

  assert.ok(trim, 'expected the corner drawer front to include the configured trim visual');
  assert.equal(trim?.userData.partId, 'corner_c0_draw_1');
  assert.equal(trim?.userData.__wpDoorTrimId, 'trim-corner-drawer');
  assert.equal(trim?.position.z > 0, true);
});

test('corner external drawers reuse regular drawer connector geometry and close the box-to-front gap', () => {
  const setup = makeRuntime();
  emitCornerWingExternalDrawers(setup.runtime as any, setup.cellRuntime as any);

  const drawerGroup = descendants(setup.wingGroup).find(
    node => node.userData?.partId === 'corner_c0_draw_1' && node.userData?.__wpType === 'extDrawer'
  );
  assert.ok(drawerGroup);
  const connector = descendants(drawerGroup as Object3DStub).find(
    node => node.userData?.__wpDrawerConnector === true
  ) as MeshStub | undefined;
  assert.ok(connector, 'expected the same connector board used by regular external drawers');

  const geometry = resolveExternalDrawerGeometry({
    externalWidthM: 0.62,
    depthM: 0.58,
    woodThicknessM: 0.018,
    frontZM: 0,
    drawerHeightM: 0.22,
    doorMountMode: 'overlay',
  });
  assert.deepEqual((connector?.geometry as BoxGeometryStub).args, [
    geometry.connectW,
    geometry.connectH,
    geometry.connectD,
  ]);
  assert.equal(connector?.position.z, geometry.connectZ);
});

test('corner external drawers render roller or Blum hardware from the external runner selector', () => {
  for (const drawerRunnerType of ['roller', 'blum'] as const) {
    const setup = makeRuntime({ drawerRunnerType });
    emitCornerWingExternalDrawers(setup.runtime as any, setup.cellRuntime as any);
    const roles = descendants(setup.wingGroup)
      .filter(node => node.userData?.__wpDrawerRunnerHardware === true)
      .map(node => String(node.userData?.__wpDrawerRunnerRole));

    assert.ok(roles.length > 0, `expected ${drawerRunnerType} hardware in corner external drawers`);
    if (drawerRunnerType === 'roller') {
      assert.ok(roles.some(role => role === 'roller-fixed-web-left'));
      assert.ok(roles.some(role => role === 'roller-moving-web-right'));
      assert.equal(
        roles.some(role => role.startsWith('blum-')),
        false
      );
    } else {
      assert.ok(roles.some(role => role === 'blum-fixed-runner-left'));
      assert.ok(roles.some(role => role === 'blum-locking-device-right'));
      assert.equal(
        roles.some(role => role.startsWith('roller-')),
        false
      );
    }
  }
});
