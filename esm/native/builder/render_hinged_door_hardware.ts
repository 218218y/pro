import type { Object3DLike, ThreeLike } from '../../../types';
import type { HingedDoorOpLike } from './render_door_ops_shared_contracts.js';

type HingeComponentName =
  | 'doorCup'
  | 'doorCupCollar'
  | 'doorConnector'
  | 'carcassPlate'
  | 'carcassLinkUpper'
  | 'carcassLinkLower'
  | 'carcassConnector';

type HingedDoorHardwarePolicy = {
  standardEdgeInsetM: number;
  shortDoorInsetRatio: number;
  cupCenterFromHingeEdgeM: number;
  cupRadiusM: number;
  cupVisibleDepthM: number;
  cupRadialSegments: number;
  cupCollarRadiusM: number;
  cupCollarDepthM: number;
  doorConnectorCenterFromPivotM: number;
  doorConnectorLengthM: number;
  doorConnectorHeightM: number;
  doorConnectorDepthM: number;
  carcassPlateCenterFromPivotM: number;
  carcassPlateThicknessM: number;
  carcassPlateHeightM: number;
  carcassPlateDepthM: number;
  carcassLinkBlockCenterFromPivotM: number;
  carcassLinkBlockWidthM: number;
  carcassLinkBlockHeightM: number;
  carcassLinkBlockDepthM: number;
  carcassLinkBlockCenterYOffsetM: number;
  carcassConnectorCenterFromPivotM: number;
  carcassConnectorLengthM: number;
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

type HingedDoorHardwareRenderState = {
  material: unknown;
  accentMaterial: unknown;
  cupGeometry: unknown;
  cupCollarGeometry: unknown;
  doorConnectorGeometry: unknown;
  carcassPlateGeometry: unknown;
  carcassLinkBlockGeometry: unknown;
  carcassConnectorGeometry: unknown;
  policy: HingedDoorHardwarePolicy;
  doorThicknessM: number;
};

function disableHardwarePicking(obj: Object3DLike): void {
  obj.raycast = () => undefined;
}

function tagHardwareObject(
  obj: Object3DLike,
  partId: string,
  hingeIndex: number,
  role: 'door' | 'carcass'
): void {
  obj.userData.__wpDoorHingeHardware = true;
  obj.userData.__wpHingeOwnerPartId = partId;
  obj.userData.__wpHingeIndex = hingeIndex;
  obj.userData.__wpHingeRole = role;
  obj.userData.__keepMaterialSubtree = true;
}

function makeHardwareMesh(
  THREE: ThreeLike,
  geometry: unknown,
  material: unknown,
  component: HingeComponentName
): Object3DLike {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.__wpDoorHingeHardware = true;
  mesh.userData.__wpHingeComponent = component;
  mesh.userData.__keepMaterial = true;
  disableHardwarePicking(mesh);
  return mesh;
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
    doorConnectorGeometry: new THREE.BoxGeometry(
      policy.doorConnectorLengthM,
      policy.doorConnectorHeightM,
      policy.doorConnectorDepthM
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
    carcassConnectorGeometry: new THREE.BoxGeometry(
      policy.carcassConnectorLengthM,
      policy.carcassConnectorHeightM,
      policy.carcassConnectorDepthM
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
}): void {
  const { THREE, doorGroup, doorOp, state, localY, hingeIndex } = args;
  const policy = state.policy;
  const hingeDirection = doorOp.isLeftHinge ? 1 : -1;
  const doorBackZ = -state.doorThicknessM / 2;

  const doorHalf = new THREE.Group();
  tagHardwareObject(doorHalf, doorOp.partId, hingeIndex, 'door');
  doorHalf.position.set(0, localY, 0);

  // Door side: only the concealed cup, its collar and one short connector that
  // runs toward the carcass. There is deliberately no bar continuing away from
  // the carcass across the door face.
  const cup = makeHardwareMesh(THREE, state.cupGeometry, state.accentMaterial, 'doorCup');
  cup.rotation.x = Math.PI / 2;
  cup.position.set(
    hingeDirection * policy.cupCenterFromHingeEdgeM,
    0,
    doorBackZ - policy.cupVisibleDepthM / 2 - 0.0002
  );
  doorHalf.add(cup);

  const cupCollar = makeHardwareMesh(THREE, state.cupCollarGeometry, state.material, 'doorCupCollar');
  cupCollar.rotation.x = Math.PI / 2;
  cupCollar.position.set(
    hingeDirection * policy.cupCenterFromHingeEdgeM,
    0,
    doorBackZ - policy.cupCollarDepthM / 2 + 0.0002
  );
  doorHalf.add(cupCollar);

  const doorConnector = makeHardwareMesh(THREE, state.doorConnectorGeometry, state.material, 'doorConnector');
  doorConnector.position.set(
    hingeDirection * policy.doorConnectorCenterFromPivotM,
    0,
    doorBackZ - policy.doorConnectorDepthM / 2 - 0.0025
  );
  doorHalf.add(doorConnector);

  doorGroup.add(doorHalf);
}

function appendCarcassMountedHalf(args: {
  THREE: ThreeLike;
  wardrobeGroup: Object3DLike;
  doorOp: HingedDoorOpLike;
  state: HingedDoorHardwareRenderState;
  localY: number;
  hingeIndex: number;
}): void {
  const { THREE, wardrobeGroup, doorOp, state, localY, hingeIndex } = args;
  const policy = state.policy;
  const hingeDirection = doorOp.isLeftHinge ? 1 : -1;
  const doorBackZ = -state.doorThicknessM / 2;
  const pivotX = doorOp.pivotX || 0;
  const doorCenterY = doorOp.y || 0;
  const doorCenterZ = doorOp.z || 0;

  const carcassHalf = new THREE.Group();
  tagHardwareObject(carcassHalf, doorOp.partId, hingeIndex, 'carcass');
  carcassHalf.position.set(pivotX, doorCenterY + localY, doorCenterZ);

  const plate = makeHardwareMesh(THREE, state.carcassPlateGeometry, state.material, 'carcassPlate');
  plate.position.set(
    hingeDirection * policy.carcassPlateCenterFromPivotM,
    0,
    doorBackZ - policy.carcassPlateDepthM / 2 - 0.0015
  );
  carcassHalf.add(plate);

  // The two raised rectangular links now belong to the fixed carcass side.
  // They sit above/below the center line and feed into one short connector
  // that projects toward the door-side cup assembly.
  const linkZ = doorBackZ - policy.carcassLinkBlockDepthM / 2 - 0.0025;
  const upperLink = makeHardwareMesh(
    THREE,
    state.carcassLinkBlockGeometry,
    state.material,
    'carcassLinkUpper'
  );
  upperLink.position.set(
    hingeDirection * policy.carcassLinkBlockCenterFromPivotM,
    policy.carcassLinkBlockCenterYOffsetM,
    linkZ
  );
  carcassHalf.add(upperLink);

  const lowerLink = makeHardwareMesh(
    THREE,
    state.carcassLinkBlockGeometry,
    state.material,
    'carcassLinkLower'
  );
  lowerLink.position.set(
    hingeDirection * policy.carcassLinkBlockCenterFromPivotM,
    -policy.carcassLinkBlockCenterYOffsetM,
    linkZ
  );
  carcassHalf.add(lowerLink);

  const carcassConnector = makeHardwareMesh(
    THREE,
    state.carcassConnectorGeometry,
    state.accentMaterial,
    'carcassConnector'
  );
  carcassConnector.position.set(
    hingeDirection * policy.carcassConnectorCenterFromPivotM,
    0,
    doorBackZ - policy.carcassConnectorDepthM / 2 - 0.0025
  );
  carcassHalf.add(carcassConnector);

  wardrobeGroup.add(carcassHalf);
}

export function appendHingedDoorHardware(args: {
  THREE: ThreeLike;
  wardrobeGroup: Object3DLike;
  doorGroup: Object3DLike;
  doorOp: HingedDoorOpLike;
  state: HingedDoorHardwareRenderState | null;
}): number {
  const { THREE, wardrobeGroup, doorGroup, doorOp, state } = args;
  if (!state) return 0;

  const offsets = resolveHingedDoorHardwareCenterOffsets(doorOp.height, state.policy);
  if (!offsets) return 0;

  for (let hingeIndex = 0; hingeIndex < offsets.length; hingeIndex++) {
    const localY = offsets[hingeIndex];
    appendDoorMountedHalf({ THREE, doorGroup, doorOp, state, localY, hingeIndex });
    appendCarcassMountedHalf({ THREE, wardrobeGroup, doorOp, state, localY, hingeIndex });
  }

  return offsets.length;
}
