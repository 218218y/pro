import { getDrawersArray, getWardrobeGroup } from '../runtime/render_access.js';
import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { createHandleMeshV7 } from './handles_mesh.js';
import type { HandlesApplyRuntime } from './handles_apply_shared.js';
import { asNode, readBox3, readMatrix4, type NodeLike } from './handles_shared.js';
import type { DrawerVisualEntryLike } from '../../../types';

export function applyDrawerHandles(runtime: HandlesApplyRuntime): void {
  const safeDrawers = collectSafeDrawers(runtime);
  const processedUUIDs = new Set();
  const computeGroupMaxZLocal = createGroupMaxZLocalReader(runtime);

  for (const g of safeDrawers) {
    if (processedUUIDs.has(g.uuid)) continue;
    processedUUIDs.add(g.uuid);

    const id = g.userData.partId;
    runtime.removeExistingHandleChildren(g);

    const hType = runtime.getHandleType(id);
    if (!hType || hType === 'none') continue;

    const drawW = g.userData.__doorWidth || HANDLE_DIMENSIONS.placement.drawerDefaultWidthM;
    const drawH = g.userData.__doorHeight || HANDLE_DIMENSIONS.placement.drawerDefaultHeightM;
    const handle = createHandleMeshV7(hType, drawW, drawH, true, true, {
      App: runtime.App,
      edgeHandleVariant: hType === 'edge' ? runtime.getEdgeHandleVariant(id) : undefined,
      handleColor: runtime.getHandleColor(id),
    });
    if (!handle) continue;

    positionDrawerHandleZ(g, handle, hType, computeGroupMaxZLocal);
    positionDrawerHandleY(runtime, g, handle, hType, drawH);
    g.add(handle);
  }
}

function collectSafeDrawers(runtime: HandlesApplyRuntime): NodeLike[] {
  const safeDrawers: NodeLike[] = [];
  const pushSafeDrawer = (node: NodeLike | null | undefined): void => {
    if (!node || safeDrawers.includes(node)) return;
    safeDrawers.push(node);
  };

  const drawersArray = getDrawersArray(runtime.App);
  if (Array.isArray(drawersArray)) {
    drawersArray.forEach((d: DrawerVisualEntryLike) => {
      pushSafeDrawer(asNode(d && d.group));
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

function isDrawerLikeGroup(node: NodeLike | null | undefined): boolean {
  if (!node || node.isGroup !== true) return false;
  const partId = node.userData && node.userData.partId ? String(node.userData.partId) : '';
  if (!partId || !partId.includes('drawer')) return false;
  const doorW = Number(node.userData && node.userData.__doorWidth);
  const doorH = Number(node.userData && node.userData.__doorHeight);
  return Number.isFinite(doorW) && doorW > 0 && Number.isFinite(doorH) && doorH > 0;
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
  if (group.userData && Number.isFinite(group.userData.__frontMaxZ)) {
    maxZ = Number(group.userData.__frontMaxZ);
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
    if (group.userData && Number.isFinite(group.userData.__doorHeight)) {
      handle.position.y = Number(group.userData.__doorHeight) / 2 + eps;
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

  if (Number.isFinite(group.userData.__handleAbsY)) {
    const targetAbsY = runtime.clampAbsYToGroup(
      Number(group.userData.__handleAbsY),
      Number(group.position?.y),
      Number(drawH)
    );
    handle.position.y = targetAbsY - group.position.y;
    return;
  }

  handle.position.y =
    drawH < HANDLE_DIMENSIONS.placement.shortDrawerHeightThresholdM
      ? HANDLE_DIMENSIONS.placement.shortDrawerStandardYOffsetM
      : 0;
}
