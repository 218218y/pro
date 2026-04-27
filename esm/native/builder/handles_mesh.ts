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
      const targetEdgeLen = edgeHandleVariant === 'long' ? 0.4 : 0.2;
      const handleW = Math.max(0.1, Math.min(w - 0.04, targetEdgeLen));
      const profile = createDrawerEdgeHandleProfile({
        THREE,
        material: edgeMat,
        length: handleW,
      });
      if (profile) g.add(profile);
    } else {
      const handleH = edgeHandleVariant === 'long' ? 0.4 : 0.2;
      const xPos = isLeftHinge ? w + 0.002 : -w - 0.002;
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
    const geo = new THREE.BoxGeometry(0.16, 0.01, 0.02);
    const mesh = new THREE.Mesh(geo, stdMat);
    mesh.userData = { __keepMaterial: true };
    mesh.position.set(0, 0, 0.02);
    if (typeof addOutlines === 'function') addOutlines(mesh, ctx);
    g.add(mesh);
  } else {
    const geo = new THREE.BoxGeometry(0.01, 0.16, 0.02);
    const mesh = new THREE.Mesh(geo, stdMat);
    mesh.userData = { __keepMaterial: true };
    const offset = 0.05;
    const xPos = isLeftHinge ? w - offset : -w + offset;
    mesh.position.set(xPos, 0, 0.02);
    if (typeof addOutlines === 'function') addOutlines(mesh, ctx);
    g.add(mesh);
  }
  return g;
}
