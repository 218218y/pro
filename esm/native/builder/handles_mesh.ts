import { addOutlines } from './render_ops_extras.js';
import { createDoorEdgeHandleProfile, createDrawerEdgeHandleProfile } from './edge_handle_profile.js';
import {
  appFromCtx,
  ensureHandlesSurface,
  getHandlesThree,
  normEdgeHandleVariant,
  type CreateHandleMeshCtx,
  type NodeLike,
} from './handles_shared.js';
import { normalizeHandleFinishColor, resolveHandleFinishPalette } from '../features/handle_finish_shared.js';
import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

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
    const edgeMat =
      edgeHandleMatByColor[handleColor] ||
      (edgeHandleMatByColor[handleColor] = new THREE.MeshStandardMaterial({
        color: palette.hex,
        emissive: palette.emissiveHex,
        emissiveIntensity: 0.08,
        roughness: palette.roughness,
        metalness: palette.metalness,
      }));

    if (isDrawer) {
      const targetEdgeLen =
        edgeHandleVariant === 'long'
          ? HANDLE_DIMENSIONS.edge.longLengthM
          : HANDLE_DIMENSIONS.edge.shortLengthM;
      const handleW = Math.max(
        HANDLE_DIMENSIONS.edge.minLengthM,
        Math.min(w - HANDLE_DIMENSIONS.edge.drawerWidthClearanceM, targetEdgeLen)
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
          ? HANDLE_DIMENSIONS.edge.longLengthM
          : HANDLE_DIMENSIONS.edge.shortLengthM;
      const xPos = isLeftHinge
        ? w + HANDLE_DIMENSIONS.edge.doorAnchorOffsetM
        : -w - HANDLE_DIMENSIONS.edge.doorAnchorOffsetM;
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

  const stdMat =
    stdHandleMatByColor[handleColor] ||
    (stdHandleMatByColor[handleColor] = new THREE.MeshStandardMaterial({
      color: palette.hex,
      emissive: palette.emissiveHex,
      emissiveIntensity: 0.08,
      roughness: palette.roughness,
      metalness: palette.metalness,
    }));

  if (isDrawer) {
    const geo = new THREE.BoxGeometry(
      HANDLE_DIMENSIONS.standard.drawerWidthM,
      HANDLE_DIMENSIONS.standard.drawerHeightM,
      HANDLE_DIMENSIONS.standard.drawerDepthM
    );
    const mesh = new THREE.Mesh(geo, stdMat);
    mesh.userData = { __keepMaterial: true };
    mesh.position.set(0, 0, HANDLE_DIMENSIONS.standard.frontZM);
    if (typeof addOutlines === 'function') addOutlines(mesh, ctx);
    g.add(mesh);
  } else {
    const geo = new THREE.BoxGeometry(
      HANDLE_DIMENSIONS.standard.doorWidthM,
      HANDLE_DIMENSIONS.standard.doorHeightM,
      HANDLE_DIMENSIONS.standard.doorDepthM
    );
    const mesh = new THREE.Mesh(geo, stdMat);
    mesh.userData = { __keepMaterial: true };
    const offset = HANDLE_DIMENSIONS.standard.doorOffsetM;
    const xPos = isLeftHinge ? w - offset : -w + offset;
    mesh.position.set(xPos, 0, HANDLE_DIMENSIONS.standard.frontZM);
    if (typeof addOutlines === 'function') addOutlines(mesh, ctx);
    g.add(mesh);
  }
  return g;
}
