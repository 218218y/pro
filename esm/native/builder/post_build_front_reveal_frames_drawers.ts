// Front reveal frame drawer flow (Pure ESM)
//
// Owns drawer iteration, scene-derived drawer discovery, and drawer reveal placement.

import { getDrawersArray } from '../runtime/render_access.js';
import { FRONT_REVEAL_FRAME_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { Object3DLike } from '../../../types/index.js';

import {
  asRecord,
  getDrawerEntryGroup,
  readKey,
  type Box3Like,
  type DrawerRuntimeEntryLike,
} from './post_build_extras_shared.js';
import type { FrontRevealFramesRuntime } from './post_build_front_reveal_frames_runtime.js';

export function applyFrontRevealDrawerFrames(runtime: FrontRevealFramesRuntime): void {
  const { App, wardrobeGroup } = runtime;
  const drawersArr = getDrawersArray(App);

  const sceneDrawerGroups: Object3DLike[] = [];
  if (drawersArr.length === 0) {
    try {
      if (wardrobeGroup.traverse) {
        wardrobeGroup.traverse((obj: Object3DLike) => {
          const ud = obj && obj.userData;
          if (!ud) return;
          const pid = ud.partId ? String(ud.partId) : '';
          if (!pid) return;
          const drawerLike = pid.indexOf('drawer') !== -1 || pid.startsWith('div_int_');
          if (!drawerLike) return;
          sceneDrawerGroups.push(obj);
        });
      }
    } catch (error) {
      runtime.reportSoft('applyFrontRevealFrames.collectSceneDrawers', error);
    }
  }

  const drawerEntries: DrawerRuntimeEntryLike[] = drawersArr.length > 0 ? drawersArr : sceneDrawerGroups;

  for (let i = 0; i < drawerEntries.length; i++) {
    const entry = drawerEntries[i];
    const g = getDrawerEntryGroup(entry);
    if (!g || !g.userData || !g.position) continue;

    const pid =
      (g.userData && g.userData.partId != null ? String(g.userData.partId) : '') ||
      (readKey(asRecord(entry), 'id') != null ? String(readKey(asRecord(entry), 'id')) : '');
    const isDrawerLike =
      /^d\d+_draw_(?:shoe|\d+)$/.test(pid) ||
      /^(?:lower_)?corner_c\d+_draw_(?:shoe|\d+)$/.test(pid) ||
      /^chest_drawer_\d+$/.test(pid) ||
      pid.startsWith('div_int_') ||
      pid.indexOf('drawer') !== -1;
    if (!isDrawerLike) continue;

    const ud = g.userData || {};
    let w = Number(ud.__doorWidth);
    let h = Number(ud.__doorHeight);
    let localBounds: Box3Like | null = null;

    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      localBounds = runtime.getObjectLocalBounds(g);
      if (localBounds) {
        const sz = new runtime.THREE.Vector3();
        localBounds.getSize(sz);
        if (!Number.isFinite(w) || w <= 0) w = Number(sz.x);
        if (!Number.isFinite(h) || h <= 0) h = Number(sz.y);
      }
    }

    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) continue;

    const faceOffsetX = Number(ud.__wpFaceOffsetX || 0);
    const faceOffsetY = Number(ud.__wpFaceOffsetY || 0);
    const offsetX = Number.isFinite(faceOffsetX) ? faceOffsetX : 0;
    const offsetY = Number.isFinite(faceOffsetY) ? faceOffsetY : 0;
    const xLeft = -w / 2 + offsetX;
    const xRight = w / 2 + offsetX;
    const yMin = -h / 2 + offsetY;
    const yMax = h / 2 + offsetY;

    let z: number | null = null;
    const explicitFrontMax = Number(ud.__frontMaxZ);
    if (
      Number.isFinite(explicitFrontMax) &&
      Math.abs(explicitFrontMax) > FRONT_REVEAL_FRAME_DIMENSIONS.frontZPresenceEpsilonM
    ) {
      z = explicitFrontMax + (explicitFrontMax >= 0 ? runtime.zNudge : -runtime.zNudge);
    }

    if (z == null) {
      if (!localBounds) localBounds = runtime.getObjectLocalBounds(g);
      const localFrontMax = Number(localBounds?.max?.z ?? NaN);
      if (
        Number.isFinite(localFrontMax) &&
        Math.abs(localFrontMax) > FRONT_REVEAL_FRAME_DIMENSIONS.frontZPresenceEpsilonM
      ) {
        z = localFrontMax + (localFrontMax >= 0 ? runtime.zNudge : -runtime.zNudge);
      }
    }

    if (z == null) {
      const t = Number(ud.__wpFrontThickness);
      const thickness = Number.isFinite(t) && t > 0 ? t : FRONT_REVEAL_FRAME_DIMENSIONS.drawerFrontThicknessM;
      let sign = Number(g.position.z) >= 0 ? 1 : -1;
      const ov = runtime.getRevealZSignOverride(asRecord(ud));
      if (ov != null) sign = ov;
      z = sign * (thickness / 2 + runtime.zNudge);
    }

    const lineMat = runtime.pickRevealLineMaterial(g);
    const lines = runtime.buildRectLines(xLeft, xRight, yMin, yMax, z, lineMat || undefined);
    if (lines) g.add(lines);
  }
}
