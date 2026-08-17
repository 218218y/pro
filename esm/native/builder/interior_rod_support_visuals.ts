// Hanging-rod end support hardware.
//
// Keep the visual hardware coupled to the rod renderers rather than to UI/layout
// state: every final rod renderer calls this helper immediately after emitting a
// rod, so rebuilding/removing the rod also removes its supports.

export const INTERIOR_ROD_SUPPORT_VISUAL_POLICY = Object.freeze({
  cupInnerClearanceM: 0.001,
  cupTubeRadiusM: 0.002,
  mountProjectionM: 0.02,
  mountPlateRadiusM: 0.024,
  mountPlateThicknessM: 0.003,
  mountArmHeightM: 0.004,
  mountArmDepthM: 0.01,
  cupRadialSegments: 8,
  cupTubularSegments: 24,
  mountPlateRadialSegments: 20,
});

type RodAxis = 'x' | 'z';

type RodSupportObjectLike = Record<string, unknown> & {
  position?: { set?: (x: number, y: number, z: number) => unknown };
  rotation?: { x?: number; y?: number; z?: number };
  userData?: Record<string, unknown>;
};

type RodSupportThreeLike = {
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
    radialSegments: number
  ) => unknown;
  BoxGeometry?: new (width: number, height: number, depth: number) => unknown;
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
  addOutlines?: ((obj: RodSupportObjectLike) => unknown) | null;
  ownerPartId?: string | null;
};

function markRodSupportHardware(
  mesh: RodSupportObjectLike,
  side: 'negative' | 'positive',
  ownerPartId: string | null | undefined
): void {
  mesh.userData = {
    ...mesh.userData,
    __kind: 'wardrobe_rod_support',
    __wpRodSupportHardware: true,
    __wpRodSupportSide: side,
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

function rotateCupOpenUpward(mesh: RodSupportObjectLike, axis: RodAxis): void {
  if (!mesh.rotation) return;
  // TorusGeometry starts as an upper semicircle in its local XY plane.
  // Rotate it 180deg around local Z so it becomes a lower U-shaped cup.
  mesh.rotation.z = Math.PI;
  if (axis === 'x') mesh.rotation.y = Math.PI / 2;
}

function rotatePlateToRodAxis(mesh: RodSupportObjectLike, axis: RodAxis): void {
  if (!mesh.rotation) return;
  // CylinderGeometry's height axis is local Y.
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  else mesh.rotation.x = Math.PI / 2;
}

function addHardwareMesh(args: {
  mesh: RodSupportObjectLike;
  parent: RodSupportParentLike;
  side: 'negative' | 'positive';
  ownerPartId?: string | null;
  addOutlines?: ((obj: RodSupportObjectLike) => unknown) | null;
}): void {
  markRodSupportHardware(args.mesh, args.side, args.ownerPartId);
  if (typeof args.addOutlines === 'function') args.addOutlines(args.mesh);
  args.parent.add?.(args.mesh);
}

/**
 * Adds the two fixed end supports for a rendered hanging rod.
 *
 * The support is intentionally render-only hardware: a U-shaped half-ring cups
 * the rod from below, a short metal arm reaches the side surface, and a round
 * mounting plate visually fixes the assembly to that surface.
 */
export function appendInteriorRodEndSupports(args: AppendInteriorRodEndSupportsArgs): number {
  const { THREE, parent } = args;
  if (
    !THREE ||
    !parent ||
    typeof parent.add !== 'function' ||
    typeof THREE.Mesh !== 'function' ||
    typeof THREE.TorusGeometry !== 'function' ||
    typeof THREE.CylinderGeometry !== 'function' ||
    typeof THREE.BoxGeometry !== 'function'
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
  const cupOuterRadius = cupMajorRadius + policy.cupTubeRadiusM;
  let added = 0;

  for (const sign of [-1, 1] as const) {
    const side = sign < 0 ? 'negative' : 'positive';
    const endX = axis === 'x' ? centerX + sign * (rodLength / 2) : centerX;
    const endZ = axis === 'z' ? centerZ + sign * (rodLength / 2) : centerZ;

    const cup = new THREE.Mesh(
      new THREE.TorusGeometry(
        cupMajorRadius,
        policy.cupTubeRadiusM,
        policy.cupRadialSegments,
        policy.cupTubularSegments,
        Math.PI
      ),
      args.material
    );
    rotateCupOpenUpward(cup, axis);
    if (setMeshPosition(cup, endX, centerY, endZ)) {
      addHardwareMesh({
        mesh: cup,
        parent,
        side,
        ownerPartId: args.ownerPartId,
        addOutlines: args.addOutlines,
      });
      added += 1;
    }

    const armLength = policy.mountProjectionM;
    const arm = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(armLength, policy.mountArmHeightM, policy.mountArmDepthM)
        : new THREE.BoxGeometry(policy.mountArmDepthM, policy.mountArmHeightM, armLength),
      args.material
    );
    const armX = axis === 'x' ? endX + sign * (armLength / 2) : endX;
    const armZ = axis === 'z' ? endZ + sign * (armLength / 2) : endZ;
    const armY = centerY - cupOuterRadius - policy.mountArmHeightM / 2;
    if (setMeshPosition(arm, armX, armY, armZ)) {
      addHardwareMesh({
        mesh: arm,
        parent,
        side,
        ownerPartId: args.ownerPartId,
        addOutlines: args.addOutlines,
      });
      added += 1;
    }

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(
        policy.mountPlateRadiusM,
        policy.mountPlateRadiusM,
        policy.mountPlateThicknessM,
        policy.mountPlateRadialSegments
      ),
      args.material
    );
    rotatePlateToRodAxis(plate, axis);
    const plateOffset = policy.mountProjectionM - policy.mountPlateThicknessM / 2;
    const plateX = axis === 'x' ? endX + sign * plateOffset : endX;
    const plateZ = axis === 'z' ? endZ + sign * plateOffset : endZ;
    if (setMeshPosition(plate, plateX, centerY, plateZ)) {
      addHardwareMesh({
        mesh: plate,
        parent,
        side,
        ownerPartId: args.ownerPartId,
        addOutlines: args.addOutlines,
      });
      added += 1;
    }
  }

  return added;
}
