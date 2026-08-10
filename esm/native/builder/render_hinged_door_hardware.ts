import type { Object3DLike, ThreeLike } from '../../../types';
import type { HingedDoorOpLike } from './render_door_ops_shared_contracts.js';

type HingedDoorHardwarePolicy = {
  standardEdgeInsetM: number;
  shortDoorInsetRatio: number;
  cupCenterFromHingeEdgeM: number;
  cupRadiusM: number;
  cupVisibleDepthM: number;
  cupRadialSegments: number;
  cupCollarRadiusM: number;
  cupCollarDepthM: number;
  carcassConnectorCupOverlapM: number;
  carcassConnectorOpenAngleRad: number;
  nominalCarcassMountFaceFromPivotM: number;
  carcassPlateThicknessM: number;
  carcassPlateHeightM: number;
  carcassPlateDepthM: number;
  carcassPlateFrontInsetM: number;
  carcassLinkBlockWidthM: number;
  carcassLinkBlockHeightM: number;
  carcassLinkBlockDepthM: number;
  carcassLinkBlockCenterYOffsetM: number;
  carcassLinkFrontInsetM: number;
  carcassConnectorBlockOverlapM: number;
  carcassConnectorHeightM: number;
  carcassConnectorDepthM: number;
  metalColorHex: number;
  accentColorHex: number;
  metalEmissiveHex: number;
  accentEmissiveHex: number;
  metalEmissiveIntensity: number;
  accentEmissiveIntensity: number;
  metalness: number;
  roughness: number;
};

export type HingedDoorHardwareRenderState = {
  material: unknown;
  accentMaterial: unknown;
  cupGeometry: unknown;
  cupCollarGeometry: unknown;
  carcassPlateGeometry: unknown;
  carcassLinkBlockGeometry: unknown;
  policy: HingedDoorHardwarePolicy;
  doorThicknessM: number;
};

type HingeComponentName =
  'doorCup' | 'doorCupCollar' | 'carcassPlate' | 'carcassLinkUpper' | 'carcassLinkLower' | 'carcassConnector';

function disableHardwarePicking(obj: Object3DLike): void {
  obj.raycast = () => undefined;
}

function tagHardwareObject(
  obj: Object3DLike,
  partId: string,
  hingeIndex: number,
  role: 'door' | 'carcass',
  ownerDoorGroup: Object3DLike
): void {
  obj.userData.__wpDoorHingeHardware = true;
  obj.userData.__wpHingeOwnerPartId = partId;
  obj.userData.__wpHingeIndex = hingeIndex;
  obj.userData.__wpHingeRole = role;
  obj.userData.__keepMaterialSubtree = true;
  Object.defineProperty(obj.userData, '__wpHingeOwnerDoorGroup', {
    value: ownerDoorGroup,
    enumerable: false,
    configurable: true,
    writable: true,
  });
}

function tagHardwareComponent(obj: Object3DLike, component: HingeComponentName): void {
  obj.userData.__wpDoorHingeHardware = true;
  obj.userData.__wpHingeComponent = component;
  obj.userData.__keepMaterial = true;
}

function makeHardwareMesh(
  THREE: ThreeLike,
  geometry: unknown,
  material: unknown,
  component: HingeComponentName
): Object3DLike {
  const mesh = new THREE.Mesh(geometry, material);
  tagHardwareComponent(mesh, component);
  disableHardwarePicking(mesh);
  return mesh;
}

function makeConnectorMeshBetween(args: {
  THREE: ThreeLike;
  material: unknown;
  component: HingeComponentName;
  height: number;
  depth: number;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
}): Object3DLike | null {
  const { THREE, material, component, height, depth, startX, startZ, endX, endZ } = args;
  const dx = endX - startX;
  const dz = endZ - startZ;
  const length = Math.hypot(dx, dz);
  if (!(length > 1e-6) || !Number.isFinite(length)) return null;

  const mesh = makeHardwareMesh(THREE, new THREE.BoxGeometry(length, height, depth), material, component);
  mesh.position.set((startX + endX) / 2, 0, (startZ + endZ) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  mesh.userData.__wpConnectorStartX = startX;
  mesh.userData.__wpConnectorStartZ = startZ;
  mesh.userData.__wpConnectorEndX = endX;
  mesh.userData.__wpConnectorEndZ = endZ;
  return mesh;
}

export type HingedDoorHardwareRuntimeContext = {
  state: HingedDoorHardwareRenderState;
  carcassMountFaceX?: number;
  frontSign: 1 | -1;
};

const HINGE_HARDWARE_RUNTIME_CONTEXT_KEY = '__wpHingeHardwareRuntimeContext';

export function bindHingedDoorHardwareRuntimeContext(args: {
  doorGroup: Object3DLike;
  state: HingedDoorHardwareRenderState | null;
  doorOp: HingedDoorOpLike;
  frontSign?: number;
}): void {
  const { doorGroup, state, doorOp } = args;
  if (!state) return;
  const context: HingedDoorHardwareRuntimeContext = {
    state,
    frontSign: args.frontSign === -1 ? -1 : 1,
  };
  if (typeof doorOp.carcassMountFaceX === 'number' && Number.isFinite(doorOp.carcassMountFaceX)) {
    context.carcassMountFaceX = doorOp.carcassMountFaceX;
  }
  Object.defineProperty(doorGroup.userData, HINGE_HARDWARE_RUNTIME_CONTEXT_KEY, {
    value: context,
    enumerable: false,
    configurable: true,
    writable: true,
  });
}

export function readHingedDoorHardwareRuntimeContext(
  doorGroup: Object3DLike
): HingedDoorHardwareRuntimeContext | null {
  const value = doorGroup.userData?.[HINGE_HARDWARE_RUNTIME_CONTEXT_KEY];
  if (!value || typeof value !== 'object') return null;
  const context = value as Partial<HingedDoorHardwareRuntimeContext>;
  return context.state ? (context as HingedDoorHardwareRuntimeContext) : null;
}

function removeHardwareChildrenForDoor(parent: Object3DLike, ownerDoorGroup: Object3DLike): number {
  const children = Array.isArray(parent.children) ? parent.children.slice() : [];
  let removed = 0;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index] as Object3DLike | null;
    if (!child?.userData?.__wpDoorHingeHardware) continue;
    if (child.userData.__wpHingeOwnerDoorGroup !== ownerDoorGroup) continue;
    parent.remove(child);
    removed += 1;
  }
  return removed;
}

export function detachHingedDoorHardwareForDoor(args: {
  wardrobeGroup: Object3DLike;
  doorGroup: Object3DLike;
}): number {
  const { wardrobeGroup, doorGroup } = args;
  return (
    removeHardwareChildrenForDoor(doorGroup, doorGroup) +
    removeHardwareChildrenForDoor(wardrobeGroup, doorGroup)
  );
}

export function resolveHingedDoorHardwareCenterOffsets(
  doorHeight: number,
  policy: HingedDoorHardwarePolicy
): [number, number] | null {
  if (!(doorHeight > 0) || !Number.isFinite(doorHeight)) return null;
  const edgeInset = Math.min(policy.standardEdgeInsetM, doorHeight * policy.shortDoorInsetRatio);
  const centerDistance = Math.max(0, doorHeight / 2 - edgeInset);
  return [-centerDistance, centerDistance];
}

export function createHingedDoorHardwareRenderState(
  THREE: ThreeLike,
  policy: HingedDoorHardwarePolicy,
  doorThicknessM: number
): HingedDoorHardwareRenderState | null {
  if (
    typeof THREE.Mesh !== 'function' ||
    typeof THREE.Group !== 'function' ||
    typeof THREE.BoxGeometry !== 'function' ||
    typeof THREE.CylinderGeometry !== 'function' ||
    typeof THREE.MeshStandardMaterial !== 'function'
  ) {
    return null;
  }

  if (!(doorThicknessM > 0) || !Number.isFinite(doorThicknessM)) return null;

  return {
    material: new THREE.MeshStandardMaterial({
      color: policy.metalColorHex,
      metalness: policy.metalness,
      roughness: policy.roughness,
      emissive: policy.metalEmissiveHex,
      emissiveIntensity: policy.metalEmissiveIntensity,
    }),
    accentMaterial: new THREE.MeshStandardMaterial({
      color: policy.accentColorHex,
      metalness: Math.min(1, policy.metalness),
      roughness: Math.min(1, policy.roughness + 0.08),
      emissive: policy.accentEmissiveHex,
      emissiveIntensity: policy.accentEmissiveIntensity,
    }),
    cupGeometry: new THREE.CylinderGeometry(
      policy.cupRadiusM,
      policy.cupRadiusM,
      policy.cupVisibleDepthM,
      policy.cupRadialSegments
    ),
    cupCollarGeometry: new THREE.CylinderGeometry(
      policy.cupCollarRadiusM,
      policy.cupCollarRadiusM,
      policy.cupCollarDepthM,
      policy.cupRadialSegments
    ),
    carcassPlateGeometry: new THREE.BoxGeometry(
      policy.carcassPlateThicknessM,
      policy.carcassPlateHeightM,
      policy.carcassPlateDepthM
    ),
    carcassLinkBlockGeometry: new THREE.BoxGeometry(
      policy.carcassLinkBlockWidthM,
      policy.carcassLinkBlockHeightM,
      policy.carcassLinkBlockDepthM
    ),
    policy,
    doorThicknessM,
  };
}

function appendDoorMountedHalf(args: {
  THREE: ThreeLike;
  doorGroup: Object3DLike;
  doorOp: HingedDoorOpLike;
  state: HingedDoorHardwareRenderState;
  localY: number;
  hingeIndex: number;
  frontSign?: number;
}): void {
  const { THREE, doorGroup, doorOp, state, localY, hingeIndex } = args;
  const policy = state.policy;
  const hingeDirection = doorOp.isLeftHinge ? 1 : -1;
  const frontSign = args.frontSign === -1 ? -1 : 1;
  const doorBackZ = (-frontSign * state.doorThicknessM) / 2;

  const doorHalf = new THREE.Group();
  tagHardwareObject(doorHalf, doorOp.partId, hingeIndex, 'door', doorGroup);
  doorHalf.position.set(0, localY, 0);

  const cup = makeHardwareMesh(THREE, state.cupGeometry, state.accentMaterial, 'doorCup');
  cup.rotation.x = Math.PI / 2;
  cup.position.set(
    hingeDirection * policy.cupCenterFromHingeEdgeM,
    0,
    doorBackZ - frontSign * (policy.cupVisibleDepthM / 2 + 0.0002)
  );
  doorHalf.add(cup);

  const cupCollar = makeHardwareMesh(THREE, state.cupCollarGeometry, state.material, 'doorCupCollar');
  cupCollar.rotation.x = Math.PI / 2;
  const cupCollarZ = doorBackZ - frontSign * (policy.cupCollarDepthM / 2 - 0.0002);
  cupCollar.position.set(hingeDirection * policy.cupCenterFromHingeEdgeM, 0, cupCollarZ);
  doorHalf.add(cupCollar);

  // Keep the door half visually clean: the cup and collar are the only moving
  // hardware pieces. A moving bar here would swing into the gap between closed
  // leaves and point away from the fixed carcass arm while the door opens.
  doorGroup.add(doorHalf);
}

function resolveOpenCupNearEdgeTarget(args: {
  policy: HingedDoorHardwarePolicy;
  hingeDirection: number;
  cupRearZ: number;
  frontSign: 1 | -1;
}): { x: number; z: number } {
  const { policy, hingeDirection, cupRearZ, frontSign } = args;
  const canonicalCupRearZ = cupRearZ * frontSign;
  const nearCupLocalX =
    hingeDirection *
    Math.max(
      0.0005,
      policy.cupCenterFromHingeEdgeM - policy.cupCollarRadiusM + policy.carcassConnectorCupOverlapM
    );
  const angle = -hingeDirection * policy.carcassConnectorOpenAngleRad;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: nearCupLocalX * cos + canonicalCupRearZ * sin,
    z: frontSign * (-nearCupLocalX * sin + canonicalCupRearZ * cos),
  };
}

function resolveCarcassMountFaceX(
  doorOp: HingedDoorOpLike,
  policy: HingedDoorHardwarePolicy,
  hingeDirection: number
): number {
  const explicit = doorOp.carcassMountFaceX;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) return explicit;
  return hingeDirection * policy.nominalCarcassMountFaceFromPivotM;
}

function appendCarcassMountedHalf(args: {
  THREE: ThreeLike;
  wardrobeGroup: Object3DLike;
  doorGroup: Object3DLike;
  doorOp: HingedDoorOpLike;
  state: HingedDoorHardwareRenderState;
  localY: number;
  hingeIndex: number;
  frontSign?: number;
}): void {
  const { THREE, wardrobeGroup, doorGroup, doorOp, state, localY, hingeIndex } = args;
  const policy = state.policy;
  const hingeDirection = doorOp.isLeftHinge ? 1 : -1;
  const frontSign: 1 | -1 = args.frontSign === -1 ? -1 : 1;
  const doorBackZ = (-frontSign * state.doorThicknessM) / 2;
  const pivotX = doorOp.pivotX || 0;
  const doorCenterY = doorOp.y || 0;
  const doorCenterZ = doorOp.z || 0;
  const mountFaceX = resolveCarcassMountFaceX(doorOp, policy, hingeDirection);

  const carcassHalf = new THREE.Group();
  tagHardwareObject(carcassHalf, doorOp.partId, hingeIndex, 'carcass', doorGroup);
  carcassHalf.position.set(pivotX, doorCenterY + localY, doorCenterZ);

  // The plate starts exactly on the carcass face and grows only toward the
  // cabinet opening; nothing sits between the wood face and carcassPlate.
  const plateCenterX = mountFaceX + hingeDirection * (policy.carcassPlateThicknessM / 2);
  const plateZ = doorBackZ - frontSign * (policy.carcassPlateDepthM / 2 + policy.carcassPlateFrontInsetM);
  const plate = makeHardwareMesh(THREE, state.carcassPlateGeometry, state.material, 'carcassPlate');
  plate.position.set(plateCenterX, 0, plateZ);
  carcassHalf.add(plate);

  // Both raised links sit on top of the plate (toward the cabinet opening),
  // one above the other. Neither block is underneath the mounting plate.
  const plateOpeningFaceX = mountFaceX + hingeDirection * policy.carcassPlateThicknessM;
  const linkCenterX = plateOpeningFaceX + hingeDirection * (policy.carcassLinkBlockWidthM / 2);
  const linkZ = doorBackZ - frontSign * (policy.carcassLinkBlockDepthM / 2 + policy.carcassLinkFrontInsetM);

  const linkUpper = makeHardwareMesh(
    THREE,
    state.carcassLinkBlockGeometry,
    state.material,
    'carcassLinkUpper'
  );
  linkUpper.position.set(linkCenterX, policy.carcassLinkBlockCenterYOffsetM, linkZ);
  carcassHalf.add(linkUpper);

  const linkLower = makeHardwareMesh(
    THREE,
    state.carcassLinkBlockGeometry,
    state.accentMaterial,
    'carcassLinkLower'
  );
  linkLower.position.set(linkCenterX, -policy.carcassLinkBlockCenterYOffsetM, linkZ);
  carcassHalf.add(linkLower);

  // The fixed connector starts on the raised carcass links and points outward
  // toward the near edge of the door cup at the project's real open angle.
  // This makes its dominant direction front/outward (Z), with only a small X
  // offset away from the panel, instead of projecting into the gap between doors.
  const linkTouchX = plateOpeningFaceX + hingeDirection * policy.carcassConnectorBlockOverlapM;
  const openCupTarget = resolveOpenCupNearEdgeTarget({
    policy,
    hingeDirection,
    // Aim at the rear/hinge-side rim of the cup. At the open angle this point
    // sits just farther from the panel than the raised carcass links, producing
    // the requested slight outward X lean while the dominant motion stays frontward in Z.
    cupRearZ: doorBackZ - frontSign * (policy.cupVisibleDepthM + 0.0002),
    frontSign,
  });
  const carcassConnector = makeConnectorMeshBetween({
    THREE,
    material: state.material,
    component: 'carcassConnector',
    height: policy.carcassConnectorHeightM,
    depth: policy.carcassConnectorDepthM,
    startX: linkTouchX,
    startZ: linkZ,
    endX: openCupTarget.x,
    endZ: openCupTarget.z,
  });
  if (carcassConnector) carcassHalf.add(carcassConnector);

  wardrobeGroup.add(carcassHalf);
}

export function attachHingedDoorHardware(args: {
  THREE: ThreeLike;
  wardrobeGroup: Object3DLike;
  doorGroup: Object3DLike;
  doorOp: HingedDoorOpLike;
  state: HingedDoorHardwareRenderState | null;
  localCenterY?: number;
  frontSign?: number;
}): number {
  bindHingedDoorHardwareRuntimeContext({
    doorGroup: args.doorGroup,
    state: args.state,
    doorOp: args.doorOp,
    frontSign: args.frontSign,
  });
  return appendHingedDoorHardware(args);
}

export function appendHingedDoorHardware(args: {
  THREE: ThreeLike;
  wardrobeGroup: Object3DLike;
  doorGroup: Object3DLike;
  doorOp: HingedDoorOpLike;
  state: HingedDoorHardwareRenderState | null;
  localCenterY?: number;
  frontSign?: number;
}): number {
  const { THREE, wardrobeGroup, doorGroup, doorOp, state } = args;
  if (!state) return 0;

  const offsets = resolveHingedDoorHardwareCenterOffsets(doorOp.height, state.policy);
  if (!offsets) return 0;
  const localCenterY =
    typeof args.localCenterY === 'number' && Number.isFinite(args.localCenterY) ? args.localCenterY : 0;

  for (let hingeIndex = 0; hingeIndex < offsets.length; hingeIndex++) {
    const localY = localCenterY + offsets[hingeIndex];
    appendDoorMountedHalf({
      THREE,
      doorGroup,
      doorOp,
      state,
      localY,
      hingeIndex,
      frontSign: args.frontSign,
    });
    appendCarcassMountedHalf({
      THREE,
      wardrobeGroup,
      doorGroup,
      doorOp,
      state,
      localY,
      hingeIndex,
      frontSign: args.frontSign,
    });
  }

  return offsets.length;
}
