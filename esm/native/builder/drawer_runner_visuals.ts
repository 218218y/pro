import type { AppContainer, UnknownRecord } from '../../../types/index.js';
import { enqueueBuilderPerfMetric } from './builder_perf_metric_queue.js';
import { ensureMaterialsRuntime, touchMaterialsCacheMeta } from './materials_factory_shared.js';
import { ensureSchedulerState } from './scheduler_shared.js';
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
  App: AppContainer;
  THREE: RunnerThreeLike;
  runnerType: unknown;
  fixedParent: RunnerObjectLike;
  movingParent: RunnerObjectLike;
  drawerWidthM: number;
  mountingWidthM: number;
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

type RunnerMaterialRole = keyof RunnerMaterials;

type RunnerMaterialRoleProbe = {
  returnedFromCache: number;
  created: number;
  returnedAfterDispose: number;
  boundToMesh: number;
  boundAfterDispose: number;
};

type RunnerMaterialProbe = {
  executionId: string;
  roles: Record<RunnerMaterialRole, RunnerMaterialRoleProbe>;
};

const RUNNER_MATERIAL_ROLES: RunnerMaterialRole[] = [
  'rollerSteel',
  'rollerWheel',
  'blumSteel',
  'blumInner',
  'blumLock',
];

function createRunnerMaterialProbe(App: AppContainer): RunnerMaterialProbe | null {
  if (typeof __WP_BUILD_PERF__ === 'undefined' || __WP_BUILD_PERF__ !== true) return null;
  const executionId = ensureSchedulerState(App).activeExecutionId;
  if (!executionId) return null;
  return {
    executionId,
    roles: Object.fromEntries(
      RUNNER_MATERIAL_ROLES.map(role => [
        role,
        {
          returnedFromCache: 0,
          created: 0,
          returnedAfterDispose: 0,
          boundToMesh: 0,
          boundAfterDispose: 0,
        },
      ])
    ) as Record<RunnerMaterialRole, RunnerMaterialRoleProbe>,
  };
}

function readMaterialUserData(material: unknown): UnknownRecord | null {
  if (!material || typeof material !== 'object') return null;
  const rec = material as UnknownRecord;
  const userData = rec.userData && typeof rec.userData === 'object' ? (rec.userData as UnknownRecord) : {};
  rec.userData = userData;
  return userData;
}

function recordPersistentMaterialCacheUse(
  material: unknown,
  role: RunnerMaterialRole,
  cacheHit: boolean,
  probe: RunnerMaterialProbe | null
): void {
  if (typeof __WP_BUILD_PERF__ === 'undefined' || __WP_BUILD_PERF__ !== true) return;
  const userData = readMaterialUserData(material);
  if (!userData) return;
  userData.__wpPerfPersistentCacheOwner = 'drawer-runner';
  userData.__wpDrawerRunnerMaterialRole = role;
  const roleProbe = probe?.roles[role];
  if (cacheHit) {
    if (roleProbe) roleProbe.returnedFromCache += 1;
    userData.__wpPerfPersistentCacheHitCount = (Number(userData.__wpPerfPersistentCacheHitCount) || 0) + 1;
    if (userData.__wpPerfDisposedByCleanGroup === true) {
      if (roleProbe) roleProbe.returnedAfterDispose += 1;
      userData.__wpPerfReturnedAfterDisposeCount =
        (Number(userData.__wpPerfReturnedAfterDisposeCount) || 0) + 1;
    }
  } else if (roleProbe) {
    roleProbe.created += 1;
  }
}

function recordRunnerMaterialBinding(material: unknown, probe: RunnerMaterialProbe | null): void {
  const userData = readMaterialUserData(material);
  const role = userData?.__wpDrawerRunnerMaterialRole;
  if (!userData || typeof role !== 'string' || !RUNNER_MATERIAL_ROLES.includes(role as RunnerMaterialRole))
    return;
  if (!probe) return;
  const roleProbe = probe.roles[role as RunnerMaterialRole];
  roleProbe.boundToMesh += 1;
  if (userData?.__wpPerfDisposedByCleanGroup === true) roleProbe.boundAfterDispose += 1;
}

function publishRunnerMaterialProbe(App: AppContainer, probe: RunnerMaterialProbe | null): void {
  if (!probe) return;
  enqueueBuilderPerfMetric(App, {
    name: 'builder.drawer-runner.material-lifetime',
    metricValue: 1,
    metricUnit: 'count',
    detail: {
      executionId: probe.executionId,
      roles: probe.roles,
    },
  });
}

// Drawer-runner finishes are render-only hardware policy owned by the builder layer.
// Keep them local instead of creating a builder -> features dependency for visual-only tokens.
const BLUM_FIXED_RUNNER_FINISH = { color: 0xe5e9ef, roughness: 0.2, metalness: 0.28 } as const;
const BLUM_MOVING_RUNNER_FINISH = { color: 0xd8dde4, roughness: 0.24, metalness: 0.32 } as const;
const BLUM_LOCKING_DEVICE_FINISH = { color: 0xb8c0c8, roughness: 0.3, metalness: 0.32 } as const;

const RUNNER_MATERIAL_DEFINITIONS: Record<RunnerMaterialRole, UnknownRecord> = {
  // Powder-coated roller runners are commonly white; the wheels are nylon/plastic.
  rollerSteel: { color: 0xf2f2ee, roughness: 0.55, metalness: 0.25 },
  rollerWheel: { color: 0xd7d7d2, roughness: 0.82, metalness: 0.0 },
  // Keep the moving member subtly distinct for depth, while the front locking
  // device is deliberately a slightly darker nickel instead of the old orange.
  blumSteel: BLUM_FIXED_RUNNER_FINISH,
  blumInner: BLUM_MOVING_RUNNER_FINISH,
  blumLock: BLUM_LOCKING_DEVICE_FINISH,
};

const RUNNER_MATERIAL_CACHE_KEYS: Record<RunnerMaterialRole, string> = {
  rollerSteel: 'drawer-runner:roller-steel:v1',
  rollerWheel: 'drawer-runner:roller-wheel:v1',
  blumSteel: 'drawer-runner:blum-steel:v1',
  blumInner: 'drawer-runner:blum-inner:v1',
  blumLock: 'drawer-runner:blum-lock:v1',
};

function getRunnerMaterials(
  App: AppContainer,
  THREE: RunnerThreeLike,
  probe: RunnerMaterialProbe | null
): RunnerMaterials | null {
  const Material = THREE.MeshStandardMaterial;
  if (typeof Material !== 'function') return null;
  const { renderCache, renderMeta } = ensureMaterialsRuntime(App);
  const materialCache = renderCache.materialCache;
  const materialMeta = renderMeta.material;
  const resolve = (role: RunnerMaterialRole): unknown => {
    const cacheKey = RUNNER_MATERIAL_CACHE_KEYS[role];
    let material = materialCache.get(cacheKey);
    const cacheHit = !!material;
    if (!material) {
      material = new Material(RUNNER_MATERIAL_DEFINITIONS[role]);
      materialCache.set(cacheKey, material);
    }
    const userData = readMaterialUserData(material);
    if (userData) {
      userData.isCached = true;
      userData.__wpDrawerRunnerMaterialRole = role;
      userData.__wpDrawerRunnerMaterialCacheKey = cacheKey;
    }
    touchMaterialsCacheMeta(App, materialMeta, cacheKey);
    recordPersistentMaterialCacheUse(material, role, cacheHit, probe);
    return material;
  };
  return Object.fromEntries(RUNNER_MATERIAL_ROLES.map(role => [role, resolve(role)])) as RunnerMaterials;
}

function markHardware(obj: RunnerObjectLike, ownerPartId: string, role: string): void {
  obj.userData = {
    ...obj.userData,
    __ignoreRaycast: true,
    // Runner hardware owns its finish independently from the drawer-box paint target.
    // Moving members intentionally live under drawerBox so they travel with the drawer;
    // without this flag materials_apply would inherit drawer_box__* from the parent and
    // recolor the rail whenever the box is painted as an individual part.
    __keepMaterial: true,
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
  probe: RunnerMaterialProbe | null;
}): RunnerObjectLike {
  recordRunnerMaterialBinding(args.material, args.probe);
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
  probe: RunnerMaterialProbe | null;
}): RunnerObjectLike | null {
  const CylinderGeometry = args.THREE.CylinderGeometry;
  // Runtime THREE always provides CylinderGeometry. Lightweight/headless render
  // adapters may intentionally expose only BoxGeometry; rails should still render
  // instead of making unrelated drawer rendering fail because a wheel primitive is absent.
  if (typeof CylinderGeometry !== 'function') return null;
  recordRunnerMaterialBinding(args.material, args.probe);
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

function appendRollerRunnerVisuals(
  args: AppendDrawerRunnerVisualsArgs,
  materials: RunnerMaterials,
  probe: RunnerMaterialProbe | null
): void {
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
  const fixedFlangeW = policy.visualFixedFlangeWidthM;
  const movingFlangeW = policy.visualMovingFlangeWidthM;
  const flangeT = policy.visualFlangeThicknessM;
  const frontWheelZ = fixedCenterZ + length / 2 - policy.visualWheelRadiusM * 1.35;
  const rearWheelZ = movingLocalZ - length / 2 + policy.visualWheelRadiusM * 1.35;

  for (const side of [-1, 1] as const) {
    // Drawer member: attached directly to the drawer side.
    const movingWebX = side * (args.drawerWidthM / 2 + webT / 2);
    const movingFlangeX = side * (args.drawerWidthM / 2 + movingFlangeW / 2);
    addBox({
      THREE: args.THREE,
      probe,
      parent: args.movingParent,
      material: materials.rollerSteel,
      size: [webT, policy.profileHeightM, length],
      position: [movingWebX, railY, movingLocalZ],
      ownerPartId: args.ownerPartId,
      role: `roller-moving-web-${side < 0 ? 'left' : 'right'}`,
    });
    addBox({
      THREE: args.THREE,
      probe,
      parent: args.movingParent,
      material: materials.rollerSteel,
      size: [movingFlangeW, flangeT, length],
      position: [movingFlangeX, railY - policy.profileHeightM / 2 + flangeT / 2, movingLocalZ],
      ownerPartId: args.ownerPartId,
      role: `roller-moving-flange-${side < 0 ? 'left' : 'right'}`,
    });

    // Cabinet member: anchor the outer face to the actual cabinet-side mounting
    // plane. The old implementation inferred that plane from drawer width + the
    // nominal 12.5 mm planning clearance, which made the runner float whenever
    // the rendered drawer-box clearance differed from that nominal value.
    const fixedWebLocalX = side * (args.mountingWidthM / 2 - webT / 2);
    const fixedFlangeLocalX = side * (args.mountingWidthM / 2 - fixedFlangeW / 2);
    addBox({
      THREE: args.THREE,
      probe,
      parent: args.fixedParent,
      material: materials.rollerSteel,
      size: [webT, policy.profileHeightM, length],
      position: [args.closedPosition.x + fixedWebLocalX, args.closedPosition.y + railY, fixedCenterZ],
      ownerPartId: args.ownerPartId,
      role: `roller-fixed-web-${side < 0 ? 'left' : 'right'}`,
    });
    addBox({
      THREE: args.THREE,
      probe,
      parent: args.fixedParent,
      material: materials.rollerSteel,
      size: [fixedFlangeW, flangeT, length],
      position: [
        args.closedPosition.x + fixedFlangeLocalX,
        args.closedPosition.y + railY + policy.profileHeightM / 2 - flangeT / 2,
        fixedCenterZ,
      ],
      ownerPartId: args.ownerPartId,
      role: `roller-fixed-flange-${side < 0 ? 'left' : 'right'}`,
    });
    addBox({
      THREE: args.THREE,
      probe,
      parent: args.fixedParent,
      material: materials.rollerSteel,
      size: [fixedFlangeW, flangeT, length],
      position: [
        args.closedPosition.x + fixedFlangeLocalX,
        args.closedPosition.y + railY - policy.profileHeightM / 2 + flangeT / 2,
        fixedCenterZ,
      ],
      ownerPartId: args.ownerPartId,
      role: `roller-fixed-lower-flange-${side < 0 ? 'left' : 'right'}`,
    });

    // Keep the wheel inside the real gap between the drawer side and cabinet
    // wall instead of centering it in an assumed 12.5 mm gap.
    const wheelX = side * ((args.drawerWidthM + args.mountingWidthM) / 4);
    addWheel({
      THREE: args.THREE,
      probe,
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
      probe,
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

function appendBlumRunnerVisuals(
  args: AppendDrawerRunnerVisualsArgs,
  materials: RunnerMaterials,
  probe: RunnerMaterialProbe | null
): void {
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
    // TANDEM is side-fastened to the cabinet and concealed beneath the drawer.
    // Keep the fixed visual anchored to the actual cabinet mounting plane. Blum's
    // 21 mm figure is the minimum planning envelope, not a literal solid width.
    // The simplified body bridges the actual cabinet-to-drawer gap and continues
    // beneath the drawer by the configured visual reach so it fully nests over
    // the moving member in the closed position.
    const cabinetPlaneAbsX = args.mountingWidthM / 2;
    const drawerSideAbsX = args.drawerWidthM / 2;
    const movingInnerAbsX = Math.max(0, drawerSideAbsX - policy.visualMovingUnderDrawerReachM);
    const fixedTargetInnerAbsX = Math.max(0, drawerSideAbsX - policy.visualFixedUnderDrawerReachM);
    const fixedRailWidth = Math.min(
      cabinetPlaneAbsX,
      Math.max(policy.cabinetRunnerEnvelopeWidthM, cabinetPlaneAbsX - fixedTargetInnerAbsX)
    );
    const fixedInnerAbsX = cabinetPlaneAbsX - fixedRailWidth;
    const fixedRailX = side * (cabinetPlaneAbsX - fixedRailWidth / 2);
    const fixedWallWebThickness = Math.min(policy.visualFixedWallWebThicknessM, fixedRailWidth);
    const fixedWallRiseHeight = fixedRailWidth * policy.visualFixedWallRiseHeightToRailWidthRatio;
    const fixedWallX = side * (cabinetPlaneAbsX - fixedWallWebThickness / 2);
    // The horizontal rail occupies the bottom of the L-profile. Align the wall web's
    // bottom with the rail bottom, then let it rise along the cabinet side.
    const fixedRailBottomY = railY - policy.visualRailHeightM / 2;
    const fixedWallY = fixedRailBottomY + fixedWallRiseHeight / 2;

    // The previous model stopped the moving member at the drawer side. That can
    // place it beside the fixed member whenever the application's generic drawer
    // clearance is wider than Blum's real drawer machining envelope. A telescopic
    // runner must instead be nested in the fixed member when closed. Preserve a
    // real under-drawer reach, bridge only the actual gap, and then overlap the
    // fixed envelope by the visual nesting depth.
    const nestedOverlap = Math.min(policy.visualMovingNestedOverlapM, fixedRailWidth);
    const movingOuterAbsX = Math.min(
      cabinetPlaneAbsX,
      Math.max(drawerSideAbsX, fixedInnerAbsX + nestedOverlap)
    );
    const movingRailWidth = Math.max(0, movingOuterAbsX - movingInnerAbsX);
    const movingRailX = side * ((movingInnerAbsX + movingOuterAbsX) / 2);
    // The front locking device is attached to the drawer and engages the runner.
    // Center it on the same coupled span so it cannot visually float beside the
    // runner when the generic drawer-box clearance is wider than Blum's own.
    const lockX = movingRailX;

    // Fixed cabinet-mounted body of the concealed runner.
    addBox({
      THREE: args.THREE,
      probe,
      parent: args.fixedParent,
      material: materials.blumSteel,
      size: [fixedRailWidth, policy.visualRailHeightM, length],
      position: [args.closedPosition.x + fixedRailX, args.closedPosition.y + railY, fixedCenterZ],
      ownerPartId: args.ownerPartId,
      role: `blum-fixed-runner-${side < 0 ? 'left' : 'right'}`,
    });
    addBox({
      THREE: args.THREE,
      probe,
      parent: args.fixedParent,
      material: materials.blumSteel,
      size: [fixedWallWebThickness, fixedWallRiseHeight, length],
      position: [args.closedPosition.x + fixedWallX, args.closedPosition.y + fixedWallY, fixedCenterZ],
      ownerPartId: args.ownerPartId,
      role: `blum-fixed-wall-web-${side < 0 ? 'left' : 'right'}`,
    });

    // Telescoping member that travels with the drawer.
    addBox({
      THREE: args.THREE,
      probe,
      parent: args.movingParent,
      material: materials.blumInner,
      size: [movingRailWidth, policy.visualInnerRailHeightM, length * 0.9],
      position: [movingRailX, innerY, movingLocalZ + length * 0.025],
      ownerPartId: args.ownerPartId,
      role: `blum-moving-runner-${side < 0 ? 'left' : 'right'}`,
    });

    // TANDEM locking device: left/right, directly below the front of the drawer.
    addBox({
      THREE: args.THREE,
      probe,
      parent: args.movingParent,
      material: materials.blumLock,
      size: [policy.visualLockWidthM, policy.visualLockHeightM, policy.visualLockDepthM],
      position: [
        lockX,
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
    !(args.mountingWidthM >= args.drawerWidthM) ||
    !(args.drawerHeightM > 0) ||
    !(args.drawerDepthM > 0) ||
    !args.fixedParent ||
    !args.movingParent
  ) {
    return;
  }
  const probe = createRunnerMaterialProbe(args.App);
  const materials = getRunnerMaterials(args.App, args.THREE, probe);
  if (!materials) return;
  const runnerType = normalizeDrawerRunnerType(args.runnerType);
  if (runnerType === 'blum') appendBlumRunnerVisuals(args, materials, probe);
  else appendRollerRunnerVisuals(args, materials, probe);
  publishRunnerMaterialProbe(args.App, probe);
}
