import type { UnknownRecord } from '../../../types/index.js';
import {
  BLUM_TANDEM_DRAWER_RUNNER_POLICY,
  ROLLER_DRAWER_RUNNER_POLICY,
  normalizeDrawerRunnerType,
} from './drawer_runner_policy.js';

type DrawerRunnerPosition = { x: number; y: number; z: number };

type RunnerObjectLike = {
  userData?: UnknownRecord;
  position?: { set?(x: number, y: number, z: number): unknown };
  rotation?: { z?: number };
  add?(obj: unknown): unknown;
};

type RunnerThreeLike = {
  Mesh: new (geometry: unknown, material: unknown) => RunnerObjectLike;
  BoxGeometry: new (width: number, height: number, depth: number) => unknown;
  CylinderGeometry?: new (
    radiusTop: number,
    radiusBottom: number,
    height: number,
    radialSegments: number
  ) => unknown;
  MeshStandardMaterial?: new (params: UnknownRecord) => unknown;
};

type AppendDrawerRunnerVisualsArgs = {
  THREE: RunnerThreeLike;
  runnerType: unknown;
  fixedParent: RunnerObjectLike;
  movingParent: RunnerObjectLike;
  drawerWidthM: number;
  drawerHeightM: number;
  drawerDepthM: number;
  drawerBoxOffsetZM?: number;
  closedPosition: DrawerRunnerPosition;
  ownerPartId: string;
};

type RunnerMaterials = {
  rollerSteel: unknown;
  rollerWheel: unknown;
  blumSteel: unknown;
  blumInner: unknown;
  blumLock: unknown;
};

const materialCache = new WeakMap<object, RunnerMaterials>();

function getRunnerMaterials(THREE: RunnerThreeLike): RunnerMaterials | null {
  const Material = THREE.MeshStandardMaterial;
  if (typeof Material !== 'function') return null;
  const cacheKey = THREE as unknown as object;
  const cached = materialCache.get(cacheKey);
  if (cached) return cached;

  const materials: RunnerMaterials = {
    // Powder-coated roller runners are commonly white; the wheels are nylon/plastic.
    rollerSteel: new Material({ color: 0xf2f2ee, roughness: 0.55, metalness: 0.25 }),
    rollerWheel: new Material({ color: 0xd7d7d2, roughness: 0.82, metalness: 0.0 }),
    // TANDEM runner bodies are zinc/steel; the front locking device is Blum orange.
    blumSteel: new Material({ color: 0x8f969b, roughness: 0.36, metalness: 0.82 }),
    blumInner: new Material({ color: 0xb7bdc1, roughness: 0.3, metalness: 0.88 }),
    blumLock: new Material({ color: 0xe86f13, roughness: 0.5, metalness: 0.05 }),
  };
  materialCache.set(cacheKey, materials);
  return materials;
}

function markHardware(obj: RunnerObjectLike, ownerPartId: string, role: string): void {
  obj.userData = {
    ...obj.userData,
    __ignoreRaycast: true,
    __wpDrawerRunnerHardware: true,
    __wpDrawerRunnerOwnerPartId: ownerPartId,
    __wpDrawerRunnerRole: role,
  };
}

function addBox(args: {
  THREE: RunnerThreeLike;
  parent: RunnerObjectLike;
  material: unknown;
  size: [number, number, number];
  position: [number, number, number];
  ownerPartId: string;
  role: string;
}): RunnerObjectLike {
  const mesh = new args.THREE.Mesh(new args.THREE.BoxGeometry(...args.size), args.material);
  mesh.position?.set?.(...args.position);
  markHardware(mesh, args.ownerPartId, args.role);
  args.parent.add?.(mesh);
  return mesh;
}

function addWheel(args: {
  THREE: RunnerThreeLike;
  parent: RunnerObjectLike;
  material: unknown;
  radius: number;
  width: number;
  position: [number, number, number];
  ownerPartId: string;
  role: string;
}): RunnerObjectLike | null {
  const CylinderGeometry = args.THREE.CylinderGeometry;
  // Runtime THREE always provides CylinderGeometry. Lightweight/headless render
  // adapters may intentionally expose only BoxGeometry; rails should still render
  // instead of making unrelated drawer rendering fail because a wheel primitive is absent.
  if (typeof CylinderGeometry !== 'function') return null;
  const wheel = new args.THREE.Mesh(
    new CylinderGeometry(args.radius, args.radius, args.width, 20),
    args.material
  );
  if (wheel.rotation) wheel.rotation.z = Math.PI / 2;
  wheel.position?.set?.(...args.position);
  markHardware(wheel, args.ownerPartId, args.role);
  args.parent.add?.(wheel);
  return wheel;
}

function resolveRunnerLength(depthM: number, endInsetM: number, minLengthM: number): number {
  if (!(Number.isFinite(depthM) && depthM > 0)) return 0;
  return Math.min(depthM, Math.max(minLengthM, depthM - endInsetM * 2));
}

function appendRollerRunnerVisuals(args: AppendDrawerRunnerVisualsArgs, materials: RunnerMaterials): void {
  const policy = ROLLER_DRAWER_RUNNER_POLICY;
  const length = resolveRunnerLength(args.drawerDepthM, policy.endInsetM, policy.minVisualLengthM);
  if (!(length > 0)) return;

  // movingParent is the drawer box itself, so moving hardware is always expressed
  // in drawer-box-local coordinates. drawerBoxOffsetZM is only the box center
  // offset inside the closed drawer group and is needed to place cabinet-fixed
  // hardware in the fixed parent's coordinate space. Applying it to moving
  // hardware as well would double the offset and push the rail through the back.
  const drawerBoxOffsetZ = Number.isFinite(args.drawerBoxOffsetZM) ? args.drawerBoxOffsetZM || 0 : 0;
  const movingLocalZ = 0;
  const fixedCenterZ = args.closedPosition.z + drawerBoxOffsetZ;
  const railY = -args.drawerHeightM / 2 + policy.profileHeightM / 2 + 0.003;
  const webT = policy.visualWebThicknessM;
  const flangeW = policy.visualFlangeWidthM;
  const flangeT = policy.visualFlangeThicknessM;
  const frontWheelZ = fixedCenterZ + length / 2 - policy.visualWheelRadiusM * 1.35;
  const rearWheelZ = movingLocalZ - length / 2 + policy.visualWheelRadiusM * 1.35;

  for (const side of [-1, 1] as const) {
    // Drawer member: attached directly to the drawer side.
    const movingWebX = side * (args.drawerWidthM / 2 + webT / 2);
    const movingFlangeX = side * (args.drawerWidthM / 2 + flangeW / 2);
    addBox({
      THREE: args.THREE,
      parent: args.movingParent,
      material: materials.rollerSteel,
      size: [webT, policy.profileHeightM, length],
      position: [movingWebX, railY, movingLocalZ],
      ownerPartId: args.ownerPartId,
      role: `roller-moving-web-${side < 0 ? 'left' : 'right'}`,
    });
    addBox({
      THREE: args.THREE,
      parent: args.movingParent,
      material: materials.rollerSteel,
      size: [flangeW, flangeT, length],
      position: [movingFlangeX, railY - policy.profileHeightM / 2 + flangeT / 2, movingLocalZ],
      ownerPartId: args.ownerPartId,
      role: `roller-moving-flange-${side < 0 ? 'left' : 'right'}`,
    });

    // Cabinet member: its outer face lands on the 12.5 mm installation plane.
    const fixedWebLocalX = side * (args.drawerWidthM / 2 + policy.sideClearanceM - webT / 2);
    const fixedFlangeLocalX = side * (args.drawerWidthM / 2 + policy.sideClearanceM - flangeW / 2);
    addBox({
      THREE: args.THREE,
      parent: args.fixedParent,
      material: materials.rollerSteel,
      size: [webT, policy.profileHeightM, length],
      position: [args.closedPosition.x + fixedWebLocalX, args.closedPosition.y + railY, fixedCenterZ],
      ownerPartId: args.ownerPartId,
      role: `roller-fixed-web-${side < 0 ? 'left' : 'right'}`,
    });
    addBox({
      THREE: args.THREE,
      parent: args.fixedParent,
      material: materials.rollerSteel,
      size: [flangeW, flangeT, length],
      position: [
        args.closedPosition.x + fixedFlangeLocalX,
        args.closedPosition.y + railY + policy.profileHeightM / 2 - flangeT / 2,
        fixedCenterZ,
      ],
      ownerPartId: args.ownerPartId,
      role: `roller-fixed-flange-${side < 0 ? 'left' : 'right'}`,
    });

    const wheelX = side * (args.drawerWidthM / 2 + policy.sideClearanceM / 2);
    addWheel({
      THREE: args.THREE,
      parent: args.fixedParent,
      material: materials.rollerWheel,
      radius: policy.visualWheelRadiusM,
      width: policy.visualWheelWidthM,
      position: [args.closedPosition.x + wheelX, args.closedPosition.y + railY, frontWheelZ],
      ownerPartId: args.ownerPartId,
      role: `roller-fixed-front-wheel-${side < 0 ? 'left' : 'right'}`,
    });
    addWheel({
      THREE: args.THREE,
      parent: args.movingParent,
      material: materials.rollerWheel,
      radius: policy.visualWheelRadiusM,
      width: policy.visualWheelWidthM,
      position: [wheelX, railY, rearWheelZ],
      ownerPartId: args.ownerPartId,
      role: `roller-moving-rear-wheel-${side < 0 ? 'left' : 'right'}`,
    });
  }
}

function appendBlumRunnerVisuals(args: AppendDrawerRunnerVisualsArgs, materials: RunnerMaterials): void {
  const policy = BLUM_TANDEM_DRAWER_RUNNER_POLICY;
  const nominalLength = Math.min(
    policy.nominalLengthMaxM,
    Math.max(policy.nominalLengthMinM, args.drawerDepthM + policy.drawerLengthFromNominalReductionM)
  );
  const length = Math.min(
    args.drawerDepthM,
    Math.max(policy.minVisualLengthM, nominalLength - policy.drawerLengthFromNominalReductionM)
  );
  if (!(length > 0)) return;

  const drawerBoxOffsetZ = Number.isFinite(args.drawerBoxOffsetZM) ? args.drawerBoxOffsetZM || 0 : 0;
  const movingLocalZ = 0;
  const fixedCenterZ = args.closedPosition.z + drawerBoxOffsetZ;
  const railY = -args.drawerHeightM / 2 - policy.visualRailHeightM / 2;
  const innerY = railY + (policy.visualRailHeightM - policy.visualInnerRailHeightM) / 2;
  const frontZ = movingLocalZ + length / 2;

  for (const side of [-1, 1] as const) {
    const railX = side * (args.drawerWidthM / 2 - policy.visualSideInsetM);

    // Fixed cabinet-mounted body of the concealed runner.
    addBox({
      THREE: args.THREE,
      parent: args.fixedParent,
      material: materials.blumSteel,
      size: [policy.visualRailWidthM, policy.visualRailHeightM, length],
      position: [args.closedPosition.x + railX, args.closedPosition.y + railY, fixedCenterZ],
      ownerPartId: args.ownerPartId,
      role: `blum-fixed-runner-${side < 0 ? 'left' : 'right'}`,
    });

    // Telescoping member that travels with the drawer.
    addBox({
      THREE: args.THREE,
      parent: args.movingParent,
      material: materials.blumInner,
      size: [policy.visualInnerRailWidthM, policy.visualInnerRailHeightM, length * 0.9],
      position: [railX, innerY, movingLocalZ + length * 0.025],
      ownerPartId: args.ownerPartId,
      role: `blum-moving-runner-${side < 0 ? 'left' : 'right'}`,
    });

    // TANDEM locking device: left/right, directly below the front of the drawer.
    addBox({
      THREE: args.THREE,
      parent: args.movingParent,
      material: materials.blumLock,
      size: [policy.visualLockWidthM, policy.visualLockHeightM, policy.visualLockDepthM],
      position: [
        railX,
        railY - policy.visualLockHeightM / 2,
        frontZ - policy.visualLockFrontInsetM - policy.visualLockDepthM / 2,
      ],
      ownerPartId: args.ownerPartId,
      role: `blum-locking-device-${side < 0 ? 'left' : 'right'}`,
    });
  }
}

export function appendDrawerRunnerVisuals(args: AppendDrawerRunnerVisualsArgs): void {
  if (
    !(args.drawerWidthM > 0) ||
    !(args.drawerHeightM > 0) ||
    !(args.drawerDepthM > 0) ||
    !args.fixedParent ||
    !args.movingParent
  ) {
    return;
  }
  const materials = getRunnerMaterials(args.THREE);
  if (!materials) return;
  const runnerType = normalizeDrawerRunnerType(args.runnerType);
  if (runnerType === 'blum') appendBlumRunnerVisuals(args, materials);
  else appendRollerRunnerVisuals(args, materials);
}
