import type { RoomArchitecturePlan } from '../../../types';
import {
  INTERIOR_SHELF_PIN_BORING_POLICY,
  INTERIOR_SHELF_PIN_RENDER_POLICY,
} from './render_interior_preset_ops_shelves.js';
import type {
  InteriorGeometryLike,
  InteriorGroupLike,
  InteriorMaterialLike,
  InteriorMeshLike,
  InteriorTHREESurface,
} from './render_interior_ops_contracts.js';
import type { RemovedFrameSideShelfExposure } from './removed_frame_side_construction_plan.js';
import { boxFromCenterSize, intersectsActiveRoomColumnCutObstacle } from './room_architecture_geometry.js';

type BoringPosition = { x: number; y: number; z: number };

/** Pure positioning plan; the same front/back offsets are used by the physical shelf pins. */
export function planFullShelfPinBoring(args: {
  bottomY: number;
  topY: number;
  leftInnerX: number;
  rightInnerX: number;
  internalZ: number;
  internalDepth: number;
  regularDepth: number;
  exposedSide?: RemovedFrameSideShelfExposure | null;
}): BoringPosition[] {
  const { bottomY, topY, leftInnerX, rightInnerX, internalZ, internalDepth, regularDepth } = args;
  const { pitchM, endClearanceM, surfaceOffsetM } = INTERIOR_SHELF_PIN_BORING_POLICY;
  if (
    ![bottomY, topY, leftInnerX, rightInnerX, internalZ, internalDepth, regularDepth].every(
      Number.isFinite
    ) ||
    topY - bottomY < endClearanceM * 2 ||
    rightInnerX <= leftInnerX ||
    internalDepth <= 0 ||
    regularDepth <= 0
  ) {
    return [];
  }

  const usableDepth = Math.min(internalDepth, regularDepth);
  const maxOffset = usableDepth / 2 - INTERIOR_SHELF_PIN_RENDER_POLICY.maxDepthSideClearanceM;
  const edgeOffset = Math.max(
    INTERIOR_SHELF_PIN_RENDER_POLICY.minEdgeOffsetM,
    Math.min(INTERIOR_SHELF_PIN_RENDER_POLICY.edgeOffsetDefaultM, maxOffset)
  );
  const backZ = internalZ - internalDepth / 2;
  const depthPositions = [backZ + edgeOffset, backZ + usableDepth - edgeOffset];
  if (depthPositions[1]! <= depthPositions[0]!) return [];

  const sides = [
    { x: leftInnerX + surfaceOffsetM, hidden: args.exposedSide === 'left' || args.exposedSide === 'both' },
    { x: rightInnerX - surfaceOffsetM, hidden: args.exposedSide === 'right' || args.exposedSide === 'both' },
  ];
  const rowCount = Math.floor((topY - bottomY - 2 * endClearanceM + 1e-9) / pitchM) + 1;
  const positions: BoringPosition[] = [];
  for (let row = 0; row < rowCount; row++) {
    const y = bottomY + endClearanceM + row * pitchM;
    for (const side of sides) {
      if (side.hidden) continue;
      for (const z of depthPositions) positions.push({ x: side.x, y, z });
    }
  }
  return positions;
}

type BoringInstancedMesh = InteriorMeshLike & {
  setMatrixAt: (index: number, matrix: unknown) => void;
  instanceMatrix?: { needsUpdate?: boolean };
};

type BoringThreeSurface = InteriorTHREESurface & {
  InstancedMesh?: new (geometry: unknown, material: unknown, count: number) => BoringInstancedMesh;
  Matrix4?: new () => {
    makeRotationZ: (angle: number) => unknown;
    setPosition: (x: number, y: number, z: number) => unknown;
  };
};

/** Visual bore mouths on the inner side faces; one instanced draw call on normal Three.js builds. */
export function addFullShelfPinBoring(args: {
  enabled: boolean;
  threeSurface: InteriorTHREESurface | null;
  group: InteriorGroupLike;
  roomArchitecturePlan: RoomArchitecturePlan;
  moduleKey: string;
  bottomY: number;
  topY: number;
  leftInnerX: number;
  rightInnerX: number;
  internalZ: number;
  internalDepth: number;
  regularDepth: number;
  exposedSide?: RemovedFrameSideShelfExposure | null;
}): void {
  const { threeSurface, group, roomArchitecturePlan } = args;
  if (!args.enabled || !threeSurface || typeof group.add !== 'function') return;
  const radius = INTERIOR_SHELF_PIN_RENDER_POLICY.radiusM;
  const positions = planFullShelfPinBoring(args).filter(
    ({ x, y, z }) =>
      !intersectsActiveRoomColumnCutObstacle(
        roomArchitecturePlan,
        boxFromCenterSize({ x, y, z, width: radius * 2, height: radius * 2, depth: radius * 2 })
      )
  );
  if (!positions.length) return;

  const surface = threeSurface as BoringThreeSurface;
  const geometry: InteriorGeometryLike = new surface.CylinderGeometry(
    radius,
    radius,
    INTERIOR_SHELF_PIN_BORING_POLICY.visualDepthM,
    INTERIOR_SHELF_PIN_RENDER_POLICY.radialSegments
  );
  const material: InteriorMaterialLike = new surface.MeshBasicMaterial({ color: 0x242424 });
  material.__keepMaterial = true;
  const decorate = (mesh: InteriorMeshLike) => {
    mesh.userData = {
      ...mesh.userData,
      __kind: 'shelf_pin_bore',
      __ignoreRaycast: true,
      moduleKey: args.moduleKey,
      pitchM: INTERIOR_SHELF_PIN_BORING_POLICY.pitchM,
      diameterM: radius * 2,
    };
    mesh.raycast = () => undefined;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  };

  if (surface.InstancedMesh && surface.Matrix4) {
    const mesh = new surface.InstancedMesh(geometry, material, positions.length);
    const matrix = new surface.Matrix4();
    for (let index = 0; index < positions.length; index++) {
      const { x, y, z } = positions[index]!;
      matrix.makeRotationZ(Math.PI / 2);
      matrix.setPosition(x, y, z);
      mesh.setMatrixAt(index, matrix);
    }
    if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
    decorate(mesh);
    group.add(mesh);
    return;
  }

  // Test doubles and rendering adapters without instancing share the same geometry and material.
  for (const { x, y, z } of positions) {
    const mesh = new surface.Mesh(geometry, material);
    if (mesh.rotation) mesh.rotation.z = Math.PI / 2;
    mesh.position?.set?.(x, y, z);
    decorate(mesh);
    group.add(mesh);
  }
}
