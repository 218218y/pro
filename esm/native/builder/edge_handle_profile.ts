import type { Object3DLike, ThreeLike } from '../../../types';

import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

type EdgeProfileThreeLike = Pick<ThreeLike, 'Group' | 'Mesh' | 'BoxGeometry'>;

type EdgeHandleProfileArgs = {
  THREE: EdgeProfileThreeLike;
  material: unknown;
  length: number;
  keepMaterial?: boolean;
};

type DoorEdgeHandleProfileArgs = EdgeHandleProfileArgs & {
  anchorX: number;
  isLeftHinge: boolean;
};

type DrawerEdgeHandleProfileArgs = EdgeHandleProfileArgs;

type PositionLike = Object3DLike['position'];

type ObjectLike = Object3DLike;

const EDGE_HANDLE_MOUNT_THICKNESS = HANDLE_DIMENSIONS.edge.mountThicknessM;
const EDGE_HANDLE_MOUNT_DEPTH = HANDLE_DIMENSIONS.edge.mountDepthM;
const EDGE_HANDLE_MOUNT_FRONT_Z = HANDLE_DIMENSIONS.edge.mountFrontZM;

const EDGE_HANDLE_RETURN_THICKNESS = HANDLE_DIMENSIONS.edge.returnThicknessM;
const EDGE_HANDLE_RETURN_DEPTH = HANDLE_DIMENSIONS.edge.returnDepthM;
const EDGE_HANDLE_RETURN_FRONT_Z = HANDLE_DIMENSIONS.edge.returnFrontZM;
const EDGE_HANDLE_RETURN_INSET = HANDLE_DIMENSIONS.edge.returnInsetM;

const EDGE_HANDLE_BRIDGE_THICKNESS = HANDLE_DIMENSIONS.edge.bridgeThicknessM;
const EDGE_HANDLE_BRIDGE_OVERLAP = HANDLE_DIMENSIONS.edge.bridgeOverlapM;

const EDGE_HANDLE_DRAWER_RETURN_DROP = HANDLE_DIMENSIONS.edge.drawerReturnDropM;

function setVec3(target: PositionLike, x: number, y: number, z: number): void {
  target.set(x, y, z);
}

function markKeepMaterial(node: ObjectLike | null | undefined, keepMaterial: boolean): void {
  if (!node) return;
  node.userData = node.userData || {};
  if (keepMaterial) node.userData.__keepMaterial = true;
}

function createMesh(
  THREE: EdgeProfileThreeLike,
  material: unknown,
  width: number,
  height: number,
  depth: number,
  keepMaterial: boolean
): ObjectLike {
  const mesh: ObjectLike = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  markKeepMaterial(mesh, keepMaterial);
  return mesh;
}

export function createDoorEdgeHandleProfile(args: DoorEdgeHandleProfileArgs): Object3DLike {
  const { THREE, material, length, anchorX, isLeftHinge, keepMaterial = true } = args;
  const inwardSign = isLeftHinge ? -1 : 1;
  const group: ObjectLike = new THREE.Group();
  setVec3(group.position, anchorX, 0, 0);

  const mount = createMesh(
    THREE,
    material,
    EDGE_HANDLE_MOUNT_THICKNESS,
    length,
    EDGE_HANDLE_MOUNT_DEPTH,
    keepMaterial
  );
  setVec3(mount.position, 0, 0, EDGE_HANDLE_MOUNT_FRONT_Z);
  group.add(mount);

  const grip = createMesh(
    THREE,
    material,
    EDGE_HANDLE_RETURN_THICKNESS,
    length,
    EDGE_HANDLE_RETURN_DEPTH,
    keepMaterial
  );
  setVec3(grip.position, inwardSign * EDGE_HANDLE_RETURN_INSET, 0, EDGE_HANDLE_RETURN_FRONT_Z);
  group.add(grip);

  const dx = inwardSign * EDGE_HANDLE_RETURN_INSET;
  const dz = EDGE_HANDLE_RETURN_FRONT_Z - EDGE_HANDLE_MOUNT_FRONT_Z;
  const bridge = createMesh(
    THREE,
    material,
    Math.hypot(dx, dz) + EDGE_HANDLE_BRIDGE_OVERLAP,
    length,
    EDGE_HANDLE_BRIDGE_THICKNESS,
    keepMaterial
  );
  setVec3(bridge.position, dx / 2, 0, EDGE_HANDLE_MOUNT_FRONT_Z + dz / 2);
  bridge.rotation.y = Math.atan2(dz, dx);
  group.add(bridge);

  return group;
}

export function createDrawerEdgeHandleProfile(args: DrawerEdgeHandleProfileArgs): Object3DLike {
  const { THREE, material, length, keepMaterial = true } = args;
  const group: ObjectLike = new THREE.Group();

  const mount = createMesh(
    THREE,
    material,
    length,
    EDGE_HANDLE_MOUNT_THICKNESS,
    EDGE_HANDLE_MOUNT_DEPTH,
    keepMaterial
  );
  setVec3(mount.position, 0, -(EDGE_HANDLE_MOUNT_THICKNESS / 2), EDGE_HANDLE_MOUNT_FRONT_Z);
  group.add(mount);

  const grip = createMesh(
    THREE,
    material,
    length,
    EDGE_HANDLE_RETURN_DEPTH,
    EDGE_HANDLE_RETURN_THICKNESS,
    keepMaterial
  );
  setVec3(grip.position, 0, -EDGE_HANDLE_DRAWER_RETURN_DROP, EDGE_HANDLE_RETURN_FRONT_Z);
  group.add(grip);

  const drop = EDGE_HANDLE_DRAWER_RETURN_DROP - EDGE_HANDLE_MOUNT_THICKNESS / 2;
  const dz = EDGE_HANDLE_RETURN_FRONT_Z - EDGE_HANDLE_MOUNT_FRONT_Z;
  const bridge = createMesh(
    THREE,
    material,
    length,
    EDGE_HANDLE_BRIDGE_THICKNESS,
    Math.hypot(drop, dz) + EDGE_HANDLE_BRIDGE_OVERLAP,
    keepMaterial
  );
  setVec3(
    bridge.position,
    0,
    -(EDGE_HANDLE_MOUNT_THICKNESS / 2 + drop / 2),
    EDGE_HANDLE_MOUNT_FRONT_Z + dz / 2
  );
  bridge.rotation.x = Math.atan2(drop, dz);
  group.add(bridge);

  return group;
}
