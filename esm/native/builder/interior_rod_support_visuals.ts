// Hanging-rod end support hardware.
//
// Keep the visual hardware coupled to the rod renderers rather than to UI/layout
// state: every final rod renderer calls this helper immediately after emitting a
// rod, so rebuilding/removing the rod also removes its supports.

import { BUILDER_HINGED_DOOR_HARDWARE_METAL_FINISH } from './hinged_door_motion_metadata.js';

export const INTERIOR_ROD_SUPPORT_VISUAL_POLICY = Object.freeze({
  cupInnerClearanceM: 0.001,
  cupTubeRadiusM: 0.002,
  cupProjectionMinM: 0.012,
  defaultMountGapM: 0.02,
  mountPlateRadiusM: 0.024,
  mountPlateThicknessM: 0.003,
  rodInsertionRatioOfMountGap: 0.6,
  rodInsertionVisibleLipMinM: 0.004,
  cupArcLengthRad: Math.PI * 1.5,
  cupOpenGapAngleRad: Math.PI / 2,
  cupOpenGapCenterAngleRad: Math.PI / 2,
  mountPlateArcLengthRad: Math.PI * 1.5,
  mountPlateOpenGapAngleRad: Math.PI / 2,
  mountPlateOpenGapCenterAngleRad: Math.PI / 2,
  cupRadialSegments: 8,
  cupTubularSegments: 24,
  mountPlateRadialSegments: 20,
});

type RodAxis = 'x' | 'z';
type RodSupportRole = 'cup' | 'mount_plate' | 'rod_extension';

type RodSupportObjectLike = Record<string, unknown> & {
  position?: { set?: (x: number, y: number, z: number) => unknown };
  rotation?: { x?: number; y?: number; z?: number };
  scale?: {
    x?: number;
    y?: number;
    z?: number;
    set?: (x: number, y: number, z: number) => unknown;
  };
  userData?: Record<string, unknown>;
};

type RodSupportMeshStandardMaterialLike = Record<string, unknown> & {
  color?: number;
  metalness?: number;
  roughness?: number;
  emissive?: number;
  emissiveIntensity?: number;
};

type RodSupportThreeLike = {
  MeshStandardMaterial?: new (params: RodSupportMeshStandardMaterialLike) => unknown;
  TorusGeometry?: new (
    radius?: number,
    tube?: number,
    radialSegments?: number,
    tubularSegments?: number,
    arc?: number
  ) => unknown;
  CylinderGeometry?: new (
    radiusTop: number,
    radiusBottom: number,
    height: number,
    radialSegments: number,
    heightSegments?: number,
    openEnded?: boolean,
    thetaStart?: number,
    thetaLength?: number
  ) => unknown;
  Mesh?: new (geometry: unknown, material: unknown) => RodSupportObjectLike;
};

type RodSupportParentLike = {
  add?: (obj: unknown) => unknown;
};

export type AppendInteriorRodEndSupportsArgs = {
  THREE: RodSupportThreeLike | null | undefined;
  parent: RodSupportParentLike | null | undefined;
  material: unknown;
  centerX: number;
  centerY: number;
  centerZ: number;
  rodLength: number;
  rodRadius: number;
  axis?: RodAxis;
  negativeMountCoord?: number | null;
  positiveMountCoord?: number | null;
  addOutlines?: ((obj: RodSupportObjectLike) => unknown) | null;
  ownerPartId?: string | null;
};

function markRodSupportHardware(
  mesh: RodSupportObjectLike,
  side: 'negative' | 'positive',
  role: RodSupportRole,
  ownerPartId: string | null | undefined
): void {
  mesh.userData = {
    ...mesh.userData,
    __kind: 'wardrobe_rod_support',
    __wpRodSupportHardware: true,
    __wpRodSupportSide: side,
    __wpRodSupportRole: role,
    __wpMeasurementIgnoreInteriorBoundary: true,
    __ignoreRaycast: true,
    __keepMaterial: true,
    ...(ownerPartId ? { __wpRodOwnerPartId: ownerPartId } : {}),
  };
}

function setMeshPosition(mesh: RodSupportObjectLike, x: number, y: number, z: number): boolean {
  if (!mesh.position || typeof mesh.position.set !== 'function') return false;
  mesh.position.set(x, y, z);
  return true;
}

function stretchCupAlongRodAxis(
  mesh: RodSupportObjectLike,
  projectionM: number,
  tubeRadiusM: number
): boolean {
  if (!mesh.scale) return false;
  const axialScale = projectionM / (2 * tubeRadiusM);
  if (!(axialScale > 0) || !Number.isFinite(axialScale)) return false;
  // TorusGeometry lies in local XY, so its local Z is the normal to the half-ring.
  // Stretching only that local axis turns the half-ring into the projecting metal cup.
  if (typeof mesh.scale.set === 'function') mesh.scale.set(1, 1, axialScale);
  else mesh.scale.z = axialScale;
  return true;
}

function resolveThreeQuarterArcStart(gapCenterAngleRad: number, gapAngleRad: number): number {
  return gapCenterAngleRad + gapAngleRad / 2;
}

function rotateCupOpenUpward(mesh: RodSupportObjectLike, axis: RodAxis): void {
  if (!mesh.rotation) return;
  // TorusGeometry starts at local +X and sweeps counterclockwise in its local XY plane.
  // Rotate the 270deg arc so the missing 90deg mouth stays centered upward.
  mesh.rotation.z = resolveThreeQuarterArcStart(
    INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupOpenGapCenterAngleRad,
    INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupOpenGapAngleRad
  );
  if (axis === 'x') mesh.rotation.y = Math.PI / 2;
}

function rotateCylinderToRodAxis(mesh: RodSupportObjectLike, axis: RodAxis): void {
  if (!mesh.rotation) return;
  // CylinderGeometry's height axis is local Y.
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  else mesh.rotation.x = Math.PI / 2;
}

function resolveMountPlateThetaStart(axis: RodAxis): number {
  const start = resolveThreeQuarterArcStart(
    INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountPlateOpenGapCenterAngleRad,
    INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountPlateOpenGapAngleRad
  );
  return axis === 'x' ? start : start - (Math.PI * 3) / 2;
}

function addHardwareMesh(args: {
  mesh: RodSupportObjectLike;
  parent: RodSupportParentLike;
  side: 'negative' | 'positive';
  role: RodSupportRole;
  ownerPartId?: string | null;
  addOutlines?: ((obj: RodSupportObjectLike) => unknown) | null;
}): void {
  markRodSupportHardware(args.mesh, args.side, args.role, args.ownerPartId);
  if (typeof args.addOutlines === 'function') args.addOutlines(args.mesh);
  args.parent.add?.(args.mesh);
}

function readMountCoord(value: number | null | undefined, rodEndCoord: number, sign: -1 | 1): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : rodEndCoord + sign * INTERIOR_ROD_SUPPORT_VISUAL_POLICY.defaultMountGapM;
}

const rodSupportHardwareMaterialCache = new WeakMap<object, unknown>();

function resolveRodSupportHardwareMaterial(THREE: RodSupportThreeLike, fallbackMaterial: unknown): unknown {
  if (typeof THREE.MeshStandardMaterial !== 'function') return fallbackMaterial;

  const cached = rodSupportHardwareMaterialCache.get(THREE as object);
  if (cached) return cached;

  const material = new THREE.MeshStandardMaterial(BUILDER_HINGED_DOOR_HARDWARE_METAL_FINISH);
  rodSupportHardwareMaterialCache.set(THREE as object, material);
  return material;
}

export function resolveInteriorRodSupportInsertionDepth(mountGapM: number): number {
  if (!(mountGapM > 0) || !Number.isFinite(mountGapM)) return 0;

  const preferred = mountGapM * INTERIOR_ROD_SUPPORT_VISUAL_POLICY.rodInsertionRatioOfMountGap;
  const maxAllowed = Math.max(0, mountGapM - INTERIOR_ROD_SUPPORT_VISUAL_POLICY.rodInsertionVisibleLipMinM);
  return Math.min(preferred, maxAllowed);
}

/**
 * Adds the two fixed end supports for a rendered hanging rod.
 *
 * Each support is intentionally render-only hardware. A half-round plate sits
 * flush against the mounting surface and a U-shaped half-ring projects directly
 * from that plate into the cabinet to cradle the rod. A short cylindrical rod
 * continuation overlaps into the cup so the visible rod is seated inside the
 * support without changing the canonical rod span used by layout/collision logic.
 */
export function appendInteriorRodEndSupports(args: AppendInteriorRodEndSupportsArgs): number {
  const { THREE, parent } = args;
  if (
    !THREE ||
    !parent ||
    typeof parent.add !== 'function' ||
    typeof THREE.Mesh !== 'function' ||
    typeof THREE.TorusGeometry !== 'function' ||
    typeof THREE.CylinderGeometry !== 'function'
  ) {
    return 0;
  }

  const centerX = Number(args.centerX);
  const centerY = Number(args.centerY);
  const centerZ = Number(args.centerZ);
  const rodLength = Number(args.rodLength);
  const rodRadius = Number(args.rodRadius);
  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(centerZ) ||
    !(rodLength > 0) ||
    !(rodRadius > 0)
  ) {
    return 0;
  }

  const axis: RodAxis = args.axis === 'z' ? 'z' : 'x';
  const policy = INTERIOR_ROD_SUPPORT_VISUAL_POLICY;
  const cupMajorRadius = rodRadius + policy.cupInnerClearanceM + policy.cupTubeRadiusM;
  const supportMaterial = resolveRodSupportHardwareMaterial(THREE, args.material);
  let added = 0;

  for (const sign of [-1, 1] as const) {
    const side = sign < 0 ? 'negative' : 'positive';
    const rodEndCoord = axis === 'x' ? centerX + sign * (rodLength / 2) : centerZ + sign * (rodLength / 2);
    const requestedMountCoord = sign < 0 ? args.negativeMountCoord : args.positiveMountCoord;
    const mountCoord = readMountCoord(requestedMountCoord, rodEndCoord, sign);
    const mountGapM = Math.abs(mountCoord - rodEndCoord);
    const cupProjectionM = Math.max(policy.cupProjectionMinM, mountGapM);
    const inwardSign = -sign;
    const cupCenterCoord = mountCoord + inwardSign * (cupProjectionM / 2);

    const cup = new THREE.Mesh(
      new THREE.TorusGeometry(
        cupMajorRadius,
        policy.cupTubeRadiusM,
        policy.cupRadialSegments,
        policy.cupTubularSegments,
        policy.cupArcLengthRad
      ),
      supportMaterial
    );
    rotateCupOpenUpward(cup, axis);
    const cupReady = stretchCupAlongRodAxis(cup, cupProjectionM, policy.cupTubeRadiusM);
    const cupX = axis === 'x' ? cupCenterCoord : centerX;
    const cupZ = axis === 'z' ? cupCenterCoord : centerZ;
    if (cupReady && setMeshPosition(cup, cupX, centerY, cupZ)) {
      addHardwareMesh({
        mesh: cup,
        parent,
        side,
        role: 'cup',
        ...(args.ownerPartId === undefined ? {} : { ownerPartId: args.ownerPartId }),
        ...(args.addOutlines === undefined ? {} : { addOutlines: args.addOutlines }),
      });
      added += 1;
    }

    const rodInsertionM = resolveInteriorRodSupportInsertionDepth(mountGapM);
    if (rodInsertionM > 0) {
      const rodExtension = new THREE.Mesh(
        new THREE.CylinderGeometry(rodRadius, rodRadius, rodInsertionM, policy.cupTubularSegments),
        args.material
      );
      rotateCylinderToRodAxis(rodExtension, axis);
      const extensionCenterCoord = rodEndCoord + sign * (rodInsertionM / 2);
      const extensionX = axis === 'x' ? extensionCenterCoord : centerX;
      const extensionZ = axis === 'z' ? extensionCenterCoord : centerZ;
      if (setMeshPosition(rodExtension, extensionX, centerY, extensionZ)) {
        addHardwareMesh({
          mesh: rodExtension,
          parent,
          side,
          role: 'rod_extension',
          ...(args.ownerPartId === undefined ? {} : { ownerPartId: args.ownerPartId }),
          ...(args.addOutlines === undefined ? {} : { addOutlines: args.addOutlines }),
        });
        added += 1;
      }
    }

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(
        policy.mountPlateRadiusM,
        policy.mountPlateRadiusM,
        policy.mountPlateThicknessM,
        policy.mountPlateRadialSegments,
        1,
        false,
        resolveMountPlateThetaStart(axis),
        policy.mountPlateArcLengthRad
      ),
      supportMaterial
    );
    rotateCylinderToRodAxis(plate, axis);
    const plateCenterCoord = mountCoord + inwardSign * (policy.mountPlateThicknessM / 2);
    const plateX = axis === 'x' ? plateCenterCoord : centerX;
    const plateZ = axis === 'z' ? plateCenterCoord : centerZ;
    if (setMeshPosition(plate, plateX, centerY, plateZ)) {
      addHardwareMesh({
        mesh: plate,
        parent,
        side,
        role: 'mount_plate',
        ...(args.ownerPartId === undefined ? {} : { ownerPartId: args.ownerPartId }),
        ...(args.addOutlines === undefined ? {} : { addOutlines: args.addOutlines }),
      });
      added += 1;
    }
  }

  return added;
}
