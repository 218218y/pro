import { createDoorEdgeHandleProfile, createDrawerEdgeHandleProfile } from './edge_handle_profile.js';
import {
  appFromCtx,
  ensureHandlesSurface,
  getHandlesThree,
  normEdgeHandleVariant,
  type CreateHandleMeshCtx,
  type NodeLike,
} from './handles_shared.js';
import { normalizeHandleFinishColor, resolveHandleFinishPalette } from '../features/finish_palette/api.js';
import {
  EDGE_HANDLE_SIZE_POLICY,
  STANDARD_HANDLE_RENDER_POLICY,
} from '../../shared/dimensions/handle_policy.js';

function recordPersistentMaterialCacheUse(material: unknown, cacheHit: boolean): void {
  if (typeof __WP_BUILD_PERF__ === 'undefined' || __WP_BUILD_PERF__ !== true) return;
  if (!material || typeof material !== 'object') return;
  const rec = material as Record<string, unknown>;
  const userData =
    rec.userData && typeof rec.userData === 'object' ? (rec.userData as Record<string, unknown>) : {};
  userData.__wpPerfPersistentCacheOwner = 'handles';
  if (cacheHit) {
    userData.__wpPerfPersistentCacheHitCount = (Number(userData.__wpPerfPersistentCacheHitCount) || 0) + 1;
    if (userData.__wpPerfDisposedByCleanGroup === true) {
      userData.__wpPerfReturnedAfterDisposeCount =
        (Number(userData.__wpPerfReturnedAfterDisposeCount) || 0) + 1;
    }
  }
  rec.userData = userData;
}

export function createHandleMeshV7(
  type: unknown,
  w: number,
  h: number,
  isLeftHinge: boolean,
  isDrawer = false,
  ctx?: CreateHandleMeshCtx
): NodeLike | null {
  const App = appFromCtx(ctx);
  const { cache } = ensureHandlesSurface(App);
  const THREE = getHandlesThree(App);

  if (!type || type === 'none') return null;

  const g = new THREE.Group();
  g.name = 'handle_group_v7';
  g.userData = { __kind: 'handle', handleType: type, isHandle: true };

  const edgeHandleVariant = normEdgeHandleVariant(ctx?.edgeHandleVariant);
  const handleColor = normalizeHandleFinishColor(ctx?.handleColor);
  const palette = resolveHandleFinishPalette(handleColor);
  const edgeHandleMatByColor = (cache._edgeHandleMatByColor =
    cache._edgeHandleMatByColor || Object.create(null));
  const stdHandleMatByColor = (cache._stdHandleMatByColor =
    cache._stdHandleMatByColor || Object.create(null));

  if (type === 'edge') {
    const cachedEdgeMat = edgeHandleMatByColor[handleColor];
    const edgeMat =
      cachedEdgeMat ||
      (edgeHandleMatByColor[handleColor] = new THREE.MeshStandardMaterial({
        color: palette.hex,
        emissive: palette.emissiveHex,
        emissiveIntensity: 0.08,
        roughness: palette.roughness,
        metalness: palette.metalness,
      }));
    recordPersistentMaterialCacheUse(edgeMat, !!cachedEdgeMat);

    if (isDrawer) {
      const targetEdgeLen =
        edgeHandleVariant === 'long'
          ? EDGE_HANDLE_SIZE_POLICY.longLengthM
          : EDGE_HANDLE_SIZE_POLICY.shortLengthM;
      const handleW = Math.max(
        EDGE_HANDLE_SIZE_POLICY.minLengthM,
        Math.min(w - EDGE_HANDLE_SIZE_POLICY.drawerWidthClearanceM, targetEdgeLen)
      );
      const profile = createDrawerEdgeHandleProfile({
        THREE,
        material: edgeMat,
        length: handleW,
      });
      if (profile) g.add(profile);
    } else {
      const handleH =
        edgeHandleVariant === 'long'
          ? EDGE_HANDLE_SIZE_POLICY.longLengthM
          : EDGE_HANDLE_SIZE_POLICY.shortLengthM;
      const xPos = isLeftHinge
        ? w + EDGE_HANDLE_SIZE_POLICY.doorAnchorOffsetM
        : -w - EDGE_HANDLE_SIZE_POLICY.doorAnchorOffsetM;
      const profile = createDoorEdgeHandleProfile({
        THREE,
        material: edgeMat,
        length: handleH,
        anchorX: xPos,
        isLeftHinge,
      });
      if (profile) g.add(profile);
    }
    return g;
  }

  const cachedStdMat = stdHandleMatByColor[handleColor];
  const stdMat =
    cachedStdMat ||
    (stdHandleMatByColor[handleColor] = new THREE.MeshStandardMaterial({
      color: palette.hex,
      emissive: palette.emissiveHex,
      emissiveIntensity: 0.08,
      roughness: palette.roughness,
      metalness: palette.metalness,
    }));
  recordPersistentMaterialCacheUse(stdMat, !!cachedStdMat);

  if (isDrawer) {
    const geo = new THREE.BoxGeometry(
      STANDARD_HANDLE_RENDER_POLICY.drawerWidthM,
      STANDARD_HANDLE_RENDER_POLICY.drawerHeightM,
      STANDARD_HANDLE_RENDER_POLICY.drawerDepthM
    );
    const mesh = new THREE.Mesh(geo, stdMat);
    mesh.userData = { __keepMaterial: true };
    mesh.position.set(0, 0, STANDARD_HANDLE_RENDER_POLICY.frontZM);
    if (typeof ctx?.addOutlines !== 'function') {
      throw new TypeError('[handles_mesh] snapshot outline binding is required');
    }
    ctx.addOutlines(mesh);
    g.add(mesh);
  } else {
    const geo = new THREE.BoxGeometry(
      STANDARD_HANDLE_RENDER_POLICY.doorWidthM,
      STANDARD_HANDLE_RENDER_POLICY.doorHeightM,
      STANDARD_HANDLE_RENDER_POLICY.doorDepthM
    );
    const mesh = new THREE.Mesh(geo, stdMat);
    mesh.userData = { __keepMaterial: true };
    const offset = STANDARD_HANDLE_RENDER_POLICY.doorOffsetM;
    const xPos = isLeftHinge ? w - offset : -w + offset;
    mesh.position.set(xPos, 0, STANDARD_HANDLE_RENDER_POLICY.frontZM);
    if (typeof ctx?.addOutlines !== 'function') {
      throw new TypeError('[handles_mesh] snapshot outline binding is required');
    }
    ctx.addOutlines(mesh);
    g.add(mesh);
  }
  return g;
}
