import { getDrawersArray, getWardrobeGroup } from '../runtime/render_access.js';
import { isDrawerBoxPartId, resolveDrawerBoxOwnerPartId } from '../features/drawer_box_identity.js';
import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveManualHandleLocalPosition } from '../features/manual_handle_position.js';
import { createHandleMeshV7 } from './handles_mesh.js';
import type { HandlesApplyRuntime } from './handles_apply_shared.js';
import { asNode, readBox3, readMatrix4, type NodeLike } from './handles_shared.js';
import {
  readDoorLeafRectFromGeometryUserData,
  readExplicitDoorRectFromGeometryUserData,
  readGeometryUserDataNumber,
  readGeometryUserDataNumberKey,
  readGeometryUserDataPositiveNumberKey,
} from './geometry_user_data_contracts.js';
import type { DrawerVisualEntryLike } from '../../../types';

export function applyDrawerHandles(runtime: HandlesApplyRuntime): void {
  const safeDrawers = collectSafeDrawers(runtime);
  const processedUUIDs = new Set();
  const computeGroupMaxZLocal = createGroupMaxZLocalReader(runtime);

  for (const g of safeDrawers) {
    if (processedUUIDs.has(g.uuid)) continue;
    processedUUIDs.add(g.uuid);

    const id = resolveDrawerHandlePartId(g);
    runtime.removeExistingHandleChildren(g);

    const hType = runtime.getHandleType(id);
    if (!hType || hType === 'none') continue;

    const drawW =
      readGeometryUserDataPositiveNumberKey(g.userData, '__doorWidth') ??
      HANDLE_DIMENSIONS.placement.drawerDefaultWidthM;
    const drawH =
      readGeometryUserDataPositiveNumberKey(g.userData, '__doorHeight') ??
      HANDLE_DIMENSIONS.placement.drawerDefaultHeightM;
    const handle = createHandleMeshV7(hType, drawW, drawH, true, true, {
      App: runtime.App,
      addOutlines: runtime.addOutlines,
      edgeHandleVariant: hType === 'edge' ? runtime.getEdgeHandleVariant(id) : undefined,
      handleColor: runtime.getHandleColor(id),
    });
    if (!handle) continue;

    positionDrawerHandleZ(g, handle, hType, computeGroupMaxZLocal);
    if (!positionDrawerHandleManual(runtime, g, handle, id)) {
      positionDrawerHandleY(runtime, g, handle, hType, drawH);
    }
    g.add(handle);
  }
}

function readDrawerHandleRectFromUserData(
  userData: NodeLike['userData'] | null | undefined
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  return (
    readExplicitDoorRectFromGeometryUserData(userData) ??
    readDoorLeafRectFromGeometryUserData(userData, { offsetKeys: ['__doorMeshOffsetX', '__wpFaceOffsetX'] })
  );
}

function positionDrawerHandleManual(
  runtime: HandlesApplyRuntime,
  group: NodeLike,
  handle: NodeLike,
  id: unknown
): boolean {
  const manualPosition = runtime.getManualHandlePosition(id);
  if (!manualPosition) return false;

  const rect = readDrawerHandleRectFromUserData(group.userData);
  const local = resolveManualHandleLocalPosition({ rect, position: manualPosition });
  if (!local) return false;

  handle.position.x = local.x;
  handle.position.y = local.y;
  return true;
}

function collectSafeDrawers(runtime: HandlesApplyRuntime): NodeLike[] {
  const safeDrawers: NodeLike[] = [];
  const pushSafeDrawer = (
    node: NodeLike | null | undefined,
    options: { allowDrawerBoxHost?: boolean } = {}
  ): void => {
    if (!node || safeDrawers.includes(node)) return;
    if (isDrawerBoxGroup(node) && options.allowDrawerBoxHost !== true) return;
    safeDrawers.push(node);
  };

  const drawersArray = getDrawersArray(runtime.App);
  if (Array.isArray(drawersArray)) {
    drawersArray.forEach((d: DrawerVisualEntryLike) => {
      pushSafeDrawer(asNode(d && d.group), { allowDrawerBoxHost: d?.isInternal === true });
    });
  }

  const __root = asNode(getWardrobeGroup(runtime.App));
  if (__root && typeof __root.traverse === 'function') {
    __root.traverse((c: NodeLike) => {
      if (!isDrawerLikeGroup(c) || hasDrawerAncestor(c)) return;
      pushSafeDrawer(c);
    });
  }

  return safeDrawers;
}

function resolveDrawerHandlePartId(node: NodeLike | null | undefined): string {
  const userData = node?.userData || {};
  const ownerPartId = resolveDrawerBoxOwnerPartId(userData);
  if (ownerPartId) return ownerPartId;
  return userData.partId == null ? '' : String(userData.partId);
}

function isDrawerBoxGroup(node: NodeLike | null | undefined): boolean {
  if (!node) return false;
  const userData = node.userData || {};
  const partId = userData.partId ? String(userData.partId) : '';
  return userData.__wpDrawerBox === true || isDrawerBoxPartId(partId);
}

function isDrawerLikeGroup(node: NodeLike | null | undefined): boolean {
  if (!node || node.isGroup !== true) return false;
  const userData = node.userData || {};
  const partId = userData.partId ? String(userData.partId) : '';
  if (isDrawerBoxGroup(node)) return false;
  if (!partId || !partId.includes('drawer')) return false;
  return (
    readGeometryUserDataPositiveNumberKey(userData, '__doorWidth') != null &&
    readGeometryUserDataPositiveNumberKey(userData, '__doorHeight') != null
  );
}

function hasDrawerAncestor(node: NodeLike | null | undefined): boolean {
  let cur = node && node.parent ? node.parent : null;
  while (cur) {
    if (isDrawerLikeGroup(cur)) return true;
    cur = cur.parent;
  }
  return false;
}

function createGroupMaxZLocalReader(runtime: HandlesApplyRuntime): (root: NodeLike) => number {
  const { THREE } = runtime;
  if (!THREE || !THREE.Box3 || !THREE.Matrix4) return () => HANDLE_DIMENSIONS.placement.frontZDefaultM;

  const __tmpBox3 = readBox3(new THREE.Box3());
  const __tmpInvM4 = readMatrix4(new THREE.Matrix4());
  const __tmpM4 = readMatrix4(new THREE.Matrix4());
  if (!__tmpBox3 || !__tmpInvM4 || !__tmpM4) return () => HANDLE_DIMENSIONS.placement.frontZDefaultM;

  return (root: NodeLike): number => {
    try {
      if (!root) return HANDLE_DIMENSIONS.placement.frontZDefaultM;
      if (typeof root.updateWorldMatrix === 'function') root.updateWorldMatrix(true, true);
      __tmpInvM4.copy(root.matrixWorld).invert();

      let maxZ = -Infinity;
      root.traverse?.((n: NodeLike) => {
        if (!n || !n.isMesh || !n.geometry) return;
        const geo = n.geometry;
        if (!geo.boundingBox && typeof geo.computeBoundingBox === 'function') geo.computeBoundingBox();
        if (!geo.boundingBox) return;

        __tmpBox3.copy(geo.boundingBox);
        __tmpM4.copy(n.matrixWorld);
        __tmpBox3.applyMatrix4(__tmpM4);
        __tmpBox3.applyMatrix4(__tmpInvM4);

        const boxMaxZ = __tmpBox3.max.z;
        if (typeof boxMaxZ === 'number' && Number.isFinite(boxMaxZ)) maxZ = Math.max(maxZ, boxMaxZ);
      });

      if (
        !Number.isFinite(maxZ) ||
        maxZ === -Infinity ||
        maxZ > HANDLE_DIMENSIONS.placement.maxTrustedLocalZM
      )
        return HANDLE_DIMENSIONS.placement.frontZDefaultM;
      return maxZ;
    } catch (_) {
      return HANDLE_DIMENSIONS.placement.frontZDefaultM;
    }
  };
}

function positionDrawerHandleZ(
  group: NodeLike,
  handle: NodeLike,
  hType: string,
  computeGroupMaxZLocal: (root: NodeLike) => number
): void {
  let maxZ = 0;
  const explicitFrontMaxZ = readGeometryUserDataNumberKey(group.userData, '__frontMaxZ');
  if (explicitFrontMaxZ != null) {
    maxZ = explicitFrontMaxZ;
  } else {
    maxZ = computeGroupMaxZLocal(group);
  }

  const eps = HANDLE_DIMENSIONS.placement.zPositionEpsilonM;
  let handleMinZ = Infinity;
  let handleMaxZ = -Infinity;
  handle.traverse?.((ch: NodeLike) => {
    if (ch && ch.isMesh && ch.geometry) {
      if (!ch.geometry.boundingBox && typeof ch.geometry.computeBoundingBox === 'function')
        ch.geometry.computeBoundingBox();
      const bb = ch.geometry.boundingBox;
      if (!bb) return;
      const localZ = ch.position && Number.isFinite(ch.position.z) ? ch.position.z : 0;
      const bbMinZ = typeof bb.min.z === 'number' ? bb.min.z : 0;
      const bbMaxZ = typeof bb.max.z === 'number' ? bb.max.z : 0;
      handleMinZ = Math.min(handleMinZ, localZ + bbMinZ);
      handleMaxZ = Math.max(handleMaxZ, localZ + bbMaxZ);
    }
  });
  if (!Number.isFinite(handleMinZ)) handleMinZ = 0;
  handle.position.z = maxZ - handleMinZ + eps;

  if (hType === 'edge' && Number.isFinite(handleMaxZ)) {
    const handleDepthZ = handleMaxZ - handleMinZ;
    const targetVisibleProtrusionZ = HANDLE_DIMENSIONS.placement.drawerEdgeVisibleProtrusionM;
    const seatInsetZ = Math.max(0, handleDepthZ - targetVisibleProtrusionZ);
    handle.position.z -= seatInsetZ;
  }
}

function positionDrawerHandleY(
  runtime: HandlesApplyRuntime,
  group: NodeLike,
  handle: NodeLike,
  hType: string,
  drawH: number
): void {
  const eps = HANDLE_DIMENSIONS.placement.zPositionEpsilonM;
  if (hType === 'edge') {
    const doorHeight = readGeometryUserDataPositiveNumberKey(group.userData, '__doorHeight');
    if (doorHeight != null) {
      handle.position.y = doorHeight / 2 + eps;
      return;
    }

    let maxY = 0;
    let foundParts = false;
    group.children.forEach((c: NodeLike) => {
      if (c.isMesh && c.geometry) {
        if (!c.geometry.boundingBox && typeof c.geometry.computeBoundingBox === 'function')
          c.geometry.computeBoundingBox();
        const y =
          c.position.y +
          (c.geometry.boundingBox && typeof c.geometry.boundingBox.max.y === 'number'
            ? c.geometry.boundingBox.max.y
            : 0);
        if (y > maxY) maxY = y;
        foundParts = true;
      }
    });
    if (!foundParts) maxY = drawH / 2;
    handle.position.y = maxY + eps;
    return;
  }

  const handleAbsY = readGeometryUserDataNumberKey(group.userData, '__handleAbsY');
  if (handleAbsY != null) {
    const groupY = readGeometryUserDataNumber(group.position?.y) ?? 0;
    const targetAbsY = runtime.clampAbsYToGroup(handleAbsY, groupY, drawH);
    handle.position.y = targetAbsY - groupY;
    return;
  }

  handle.position.y =
    drawH < HANDLE_DIMENSIONS.placement.shortDrawerHeightThresholdM
      ? HANDLE_DIMENSIONS.placement.shortDrawerStandardYOffsetM
      : 0;
}
