import type { AppContainer } from '../../../types';

import { getDoorsOpenViaService } from '../runtime/doors_access.js';
import { readFiniteNumberOrNull } from '../runtime/render_runtime_primitives.js';

import {
  type FrontOverlayCache,
  type TraversableLike,
  type VisualDeps,
  readDoorGroup,
  readDoorVisual,
  readFrontOverlayCache,
  readWardrobeGroup,
} from './render_loop_visual_effects_shared.js';

function smoothstep01(t: number) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

export function updateRenderLoopFrontOverlaySeamsVisibility(
  App: AppContainer,
  deps: Pick<
    VisualDeps,
    | 'frontOverlayState'
    | 'collectFrontOverlayNodes'
    | 'getWardrobeGroup'
    | 'getDoorsArray'
    | 'applyOpacityScale'
  >
): void {
  const wg = readWardrobeGroup(deps.getWardrobeGroup(App));
  if (!wg) return;

  let openNorm = 0;
  let inGlobalDoorTransition = false;
  const doorsOpen = getDoorsOpenViaService(App);
  const globalDoorsOpen = typeof doorsOpen === 'boolean' ? doorsOpen : false;

  const nowMs = Date.now();
  const frontOverlayState = deps.frontOverlayState(App);
  const prevOpen = !!frontOverlayState.prevGlobalDoorsOpen;
  frontOverlayState.prevGlobalDoorsOpen = globalDoorsOpen;

  let until = Number(frontOverlayState.transitionUntilMs || 0);
  if (prevOpen && !globalDoorsOpen) {
    const closeGraceMs = 3500;
    until = nowMs + closeGraceMs;
    frontOverlayState.transitionUntilMs = until;
  }

  inGlobalDoorTransition = globalDoorsOpen || nowMs < until;
  if (globalDoorsOpen) openNorm = 1;

  if (inGlobalDoorTransition) {
    const doors = deps.getDoorsArray(App);
    if (doors) {
      for (let i = 0; i < doors.length; i++) {
        const d = readDoorVisual(doors[i]);
        if (!d || !d.group) continue;

        if (d.isOpen === true) {
          openNorm = 1;
          break;
        }

        const group = readDoorGroup(d.group);
        if (!group) continue;
        if (d.type === 'hinged') {
          const ry = readFiniteNumberOrNull(group.rotation?.y) ?? 0;
          const denom = 0.3;
          const n = Math.abs(ry) / denom;
          if (n > openNorm) openNorm = n > 1 ? 1 : n;
          if (openNorm >= 1) break;
        } else if (d.type === 'sliding') {
          const gx = readFiniteNumberOrNull(group.position?.x) ?? 0;
          const gz = readFiniteNumberOrNull(group.position?.z) ?? 0;
          const ox = typeof d.originalX === 'number' && Number.isFinite(d.originalX) ? d.originalX : gx;
          const oz = typeof d.originalZ === 'number' && Number.isFinite(d.originalZ) ? d.originalZ : gz;
          const dx = gx - ox;
          const dz = gz - oz;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const denom = 0.06;
          const n = dist / denom;
          if (n > openNorm) openNorm = n > 1 ? 1 : n;
          if (openNorm >= 1) break;
        }
      }
    }
  }

  const t = openNorm < 0 ? 0 : openNorm > 1 ? 1 : openNorm;
  const alpha = 1 - smoothstep01(t);
  const frame = Number(frontOverlayState.frameCounter || 0) + 1;
  frontOverlayState.frameCounter = frame;

  const wgUuid = typeof wg.uuid === 'string' ? wg.uuid : '';

  let cache: FrontOverlayCache | null = readFrontOverlayCache(frontOverlayState.cache);

  // Startup/idle frames usually have closed doors and a fully opaque front overlay.
  // In that state there is nothing to update, so avoid the initial wardrobeGroup
  // traversal entirely. The cache is still built on the first real transition, and
  // an existing cache is still used to restore alpha back to 1 when closing doors.
  if (alpha >= 0.999 && !inGlobalDoorTransition && (!cache || cache.wgUuid !== wgUuid)) {
    if (cache && cache.wgUuid !== wgUuid) frontOverlayState.cache = null;
    return;
  }

  const needsRescan =
    !cache ||
    cache.wgUuid !== wgUuid ||
    (alpha < 0.999 && (!Number.isFinite(cache.lastScanFrame) || frame - cache.lastScanFrame > 12));

  if (needsRescan) {
    const listRaw = deps.collectFrontOverlayNodes(wg);
    const list = Array.isArray(listRaw)
      ? listRaw.filter((item): item is TraversableLike => !!item && typeof item === 'object')
      : [];
    const lastAlpha = cache ? readFiniteNumberOrNull(cache.lastAlpha) : null;
    cache = { wgUuid, list, lastAlpha, lastScanFrame: frame };
    frontOverlayState.cache = cache;
  }

  const prevAlpha = cache ? (readFiniteNumberOrNull(cache.lastAlpha) ?? Number.NaN) : Number.NaN;
  if (Number.isFinite(prevAlpha) && Math.abs(prevAlpha - alpha) < 0.02) return;
  if (cache) cache.lastAlpha = alpha;

  const list = cache && Array.isArray(cache.list) ? cache.list : [];
  for (let i = 0; i < list.length; i++) {
    const obj = list[i];
    if (!obj) continue;

    const baseVisible =
      obj.userData && typeof obj.userData.__wpBaseVisible === 'boolean' ? obj.userData.__wpBaseVisible : true;

    if (!baseVisible) {
      obj.visible = false;
      continue;
    }

    if (alpha <= 0.001) {
      obj.visible = false;
    } else {
      obj.visible = true;
      deps.applyOpacityScale(App, obj, alpha);
    }
  }
}
