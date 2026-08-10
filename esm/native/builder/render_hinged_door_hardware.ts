import type { Object3DLike, ThreeLike } from '../../../types';
import type { HingedDoorOpLike } from './render_door_ops_shared_contracts.js';

type HingedDoorHardwarePolicy = {
  standardEdgeInsetM: number;
  shortDoorInsetRatio: number;
  doorPlateCenterFromHingeEdgeM: number;
  doorPlateWidthM: number;
  doorPlateHeightM: number;
  doorPlateDepthM: number;
  cupCenterFromHingeEdgeM: number;
  cupRadiusM: number;
  cupVisibleDepthM: number;
  cupRadialSegments: number;
  cupCollarRadiusM: number;
  cupCollarDepthM: number;
  cupPadWidthM: number;
  cupPadHeightM: number;
  cupPadDepthM: number;
  mainArmCenterFromPivotM: number;
  mainArmLengthM: number;
  mainArmHeightM: number;
  mainArmDepthM: number;
  bridgeArmCenterFromPivotM: number;
  bridgeArmLengthM: number;
  bridgeArmHeightM: number;
  bridgeArmDepthM: number;
  knuckleCenterFromPivotM: number;
  knuckleRadiusM: number;
  knuckleHeightM: number;
  knuckleRadialSegments: number;
  carcassPlateCenterFromPivotM: number;
  carcassPlateThicknessM: number;
  carcassPlateHeightM: number;
  carcassPlateDepthM: number;
  receiverBlockCenterFromPivotM: number;
  receiverBlockWidthM: number;
  receiverBlockHeightM: number;
  receiverBlockDepthM: number;
  receiverArmCenterFromPivotM: number;
  receiverArmLengthM: number;
  receiverArmHeightM: number;
  receiverArmDepthM: number;
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
  doorPlateGeometry: unknown;
  cupGeometry: unknown;
  cupCollarGeometry: unknown;
  cupPadGeometry: unknown;
  mainArmGeometry: unknown;
  bridgeArmGeometry: unknown;
  knuckleGeometry: unknown;
  carcassPlateGeometry: unknown;
  receiverBlockGeometry: unknown;
  receiverArmGeometry: unknown;
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
  // Hardware owns its calibrated metal finish. Prevent the generic wardrobe
  // material pass from inheriting the surrounding door/carcass part material.
  obj.userData.__keepMaterialSubtree = true;
}

function makeHardwareMesh(THREE: ThreeLike, geometry: unknown, material: unknown): Object3DLike {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.__wpDoorHingeHardware = true;
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
    doorPlateGeometry: new THREE.BoxGeometry(
      policy.doorPlateWidthM,
      policy.doorPlateHeightM,
      policy.doorPlateDepthM
    ),
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
    cupPadGeometry: new THREE.BoxGeometry(policy.cupPadWidthM, policy.cupPadHeightM, policy.cupPadDepthM),
    mainArmGeometry: new THREE.BoxGeometry(
      policy.mainArmLengthM,
      policy.mainArmHeightM,
      policy.mainArmDepthM
    ),
    bridgeArmGeometry: new THREE.BoxGeometry(
      policy.bridgeArmLengthM,
      policy.bridgeArmHeightM,
      policy.bridgeArmDepthM
    ),
    knuckleGeometry: new THREE.CylinderGeometry(
      policy.knuckleRadiusM,
      policy.knuckleRadiusM,
      policy.knuckleHeightM,
      policy.knuckleRadialSegments
    ),
    carcassPlateGeometry: new THREE.BoxGeometry(
      policy.carcassPlateThicknessM,
      policy.carcassPlateHeightM,
      policy.carcassPlateDepthM
    ),
    receiverBlockGeometry: new THREE.BoxGeometry(
      policy.receiverBlockWidthM,
      policy.receiverBlockHeightM,
      policy.receiverBlockDepthM
    ),
    receiverArmGeometry: new THREE.BoxGeometry(
      policy.receiverArmLengthM,
      policy.receiverArmHeightM,
      policy.receiverArmDepthM
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

  const plate = makeHardwareMesh(THREE, state.doorPlateGeometry, state.material);
  plate.position.set(
    hingeDirection * policy.doorPlateCenterFromHingeEdgeM,
    0,
    doorBackZ - policy.doorPlateDepthM / 2
  );
  doorHalf.add(plate);

  const cupPad = makeHardwareMesh(THREE, state.cupPadGeometry, state.material);
  cupPad.position.set(
    hingeDirection * policy.cupCenterFromHingeEdgeM,
    0,
    doorBackZ - policy.cupPadDepthM / 2
  );
  doorHalf.add(cupPad);

  const cup = makeHardwareMesh(THREE, state.cupGeometry, state.accentMaterial);
  cup.rotation.x = Math.PI / 2;
  cup.position.set(
    hingeDirection * policy.cupCenterFromHingeEdgeM,
    0,
    doorBackZ - policy.cupVisibleDepthM / 2 - 0.0002
  );
  doorHalf.add(cup);

  const cupCollar = makeHardwareMesh(THREE, state.cupCollarGeometry, state.material);
  cupCollar.rotation.x = Math.PI / 2;
  cupCollar.position.set(
    hingeDirection * policy.cupCenterFromHingeEdgeM,
    0,
    doorBackZ - policy.cupCollarDepthM / 2 + 0.0002
  );
  doorHalf.add(cupCollar);

  const mainArm = makeHardwareMesh(THREE, state.mainArmGeometry, state.material);
  mainArm.position.set(
    hingeDirection * policy.mainArmCenterFromPivotM,
    0,
    doorBackZ - policy.mainArmDepthM / 2 - 0.001
  );
  doorHalf.add(mainArm);

  const bridgeArm = makeHardwareMesh(THREE, state.bridgeArmGeometry, state.material);
  bridgeArm.position.set(
    hingeDirection * policy.bridgeArmCenterFromPivotM,
    0,
    doorBackZ - policy.bridgeArmDepthM / 2 - 0.0025
  );
  doorHalf.add(bridgeArm);

  const knuckle = makeHardwareMesh(THREE, state.knuckleGeometry, state.accentMaterial);
  knuckle.rotation.z = Math.PI / 2;
  knuckle.position.set(
    hingeDirection * policy.knuckleCenterFromPivotM,
    0,
    doorBackZ - policy.bridgeArmDepthM / 2 - 0.0025
  );
  doorHalf.add(knuckle);

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

  const plate = makeHardwareMesh(THREE, state.carcassPlateGeometry, state.material);
  plate.position.set(
    hingeDirection * policy.carcassPlateCenterFromPivotM,
    0,
    doorBackZ - policy.carcassPlateDepthM / 2 - 0.0015
  );
  carcassHalf.add(plate);

  const receiverBlock = makeHardwareMesh(THREE, state.receiverBlockGeometry, state.material);
  receiverBlock.position.set(
    hingeDirection * policy.receiverBlockCenterFromPivotM,
    0,
    doorBackZ - policy.receiverBlockDepthM / 2 - 0.0025
  );
  carcassHalf.add(receiverBlock);

  const receiverArm = makeHardwareMesh(THREE, state.receiverArmGeometry, state.accentMaterial);
  receiverArm.position.set(
    hingeDirection * policy.receiverArmCenterFromPivotM,
    0,
    doorBackZ - policy.receiverArmDepthM / 2 - 0.0025
  );
  carcassHalf.add(receiverArm);

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
