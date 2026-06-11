import {
  createDoorVisualCacheKey,
  getCachedDoorVisualGeometry,
  getCachedDoorVisualMaterial,
} from './visuals_and_contents_door_visual_cache.js';
import type { AppContainer, Object3DLike, ThreeLike } from '../../../types/index.js';
import type { TagDoorVisualPartFn } from './visuals_and_contents_door_visual_support_contracts.js';

export function appendSubtleDoorAccentBorder(args: {
  App: AppContainer;
  THREE: ThreeLike;
  visualGroup: Object3DLike;
  tagDoorVisualPart: TagDoorVisualPartFn;
  isSketch: boolean;
  zSign: number;
  targetW: number;
  targetH: number;
  faceZ: number;
  inset?: number;
  lineT?: number;
  opacity?: number;
}): void {
  const {
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    isSketch,
    zSign,
    targetW,
    targetH,
    faceZ,
    inset = 0.01,
    lineT = 0.0022,
    opacity = 0.18,
  } = args;
  if (!Number.isFinite(targetW) || !Number.isFinite(targetH) || !(targetW > 0.04) || !(targetH > 0.04))
    return;

  const safeInset = Math.max(0, Math.min(inset, targetW / 2 - 0.01, targetH / 2 - 0.01));
  const innerW = targetW - 2 * safeInset;
  const innerH = targetH - 2 * safeInset;
  if (!(innerW > 0.02) || !(innerH > 0.02)) return;
  const t = Math.max(0.0014, Math.min(lineT, innerW / 6, innerH / 6));
  if (!(innerW > 2 * t) || !(innerH > 2 * t)) return;

  const accentMat = getCachedDoorVisualMaterial(
    App,
    createDoorVisualCacheKey('door_accent_material', [isSketch, opacity]),
    () =>
      new THREE.MeshBasicMaterial({
        color: isSketch ? 0x000000 : 0x2b2b2b,
        transparent: true,
        opacity: isSketch ? Math.min(0.35, opacity + 0.08) : opacity,
        depthWrite: false,
      })
  );
  try {
    accentMat.userData = accentMat.userData || {};
    accentMat.userData.__keepMaterial = true;
  } catch {
    // ignore
  }

  const z = faceZ + 0.0009 * zSign;
  const addStrip = (sw: number, sh: number, x: number, y: number, partId: string) => {
    if (!(sw > 0) || !(sh > 0)) return;
    const geometry = getCachedDoorVisualGeometry(
      App,
      createDoorVisualCacheKey('door_accent_strip', [sw, sh]),
      () => new THREE.BoxGeometry(sw, sh, 0.001)
    );
    const strip = new THREE.Mesh(geometry, accentMat);
    strip.position.set(x, y, z);
    strip.renderOrder = 3;
    tagDoorVisualPart(strip, partId);
    visualGroup.add(strip);
  };

  const sideH = Math.max(0.001, innerH - 2 * t);
  addStrip(innerW, t, 0, innerH / 2 - t / 2, 'door_accent_top');
  addStrip(innerW, t, 0, -(innerH / 2 - t / 2), 'door_accent_bottom');
  addStrip(t, sideH, -(innerW / 2 - t / 2), 0, 'door_accent_left');
  addStrip(t, sideH, innerW / 2 - t / 2, 0, 'door_accent_right');
}
