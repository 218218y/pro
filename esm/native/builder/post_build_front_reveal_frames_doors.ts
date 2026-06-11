// Front reveal frame door flow (Pure ESM)
//
// Owns hinged/sliding door iteration and segmented sketch-door local frames.

import { getDoorsArray } from '../runtime/render_access.js';
import type { BuildContextLike, Object3DLike } from '../../../types/index.js';

import {
  asObject3D,
  asRecord,
  getDoorEntryGroup,
  isRecord,
  readBoundsAxis,
  readFunction,
  readKey,
  type DoorRuntimeEntryLike,
} from './post_build_extras_shared.js';
import type { FrontRevealFramesRuntime } from './post_build_front_reveal_frames_runtime.js';

export function applyFrontRevealDoorFrames(ctx: BuildContextLike, runtime: FrontRevealFramesRuntime): void {
  const { App, THREE, wardrobeGroup } = runtime;
  const doorsArr = getDoorsArray(App);

  const fallbackDoorGroups: Object3DLike[] = [];
  if (doorsArr.length === 0) {
    try {
      if (wardrobeGroup.traverse) {
        wardrobeGroup.traverse((obj: Object3DLike) => {
          const ud = obj && obj.userData;
          if (!ud) return;
          const pid = ud.partId ? String(ud.partId) : '';
          if (!pid) return;
          if (!/^d\d+_/.test(pid)) return;
          const w = Number(ud.__doorWidth);
          const h = Number(ud.__doorHeight);
          if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
          fallbackDoorGroups.push(obj);
        });
      }
    } catch (error) {
      runtime.reportSoft('applyFrontRevealFrames.collectFallbackDoors', error);
    }
  }

  const doorEntries: DoorRuntimeEntryLike[] = doorsArr.length > 0 ? doorsArr : fallbackDoorGroups;

  for (let i = 0; i < doorEntries.length; i++) {
    const entry = doorEntries[i];
    const g = getDoorEntryGroup(entry);
    if (!g || !g.userData || !g.position) continue;
    const type =
      typeof readKey(asRecord(entry), 'type') === 'string'
        ? String(readKey(asRecord(entry), 'type'))
        : 'hinged';
    if (type !== 'hinged' && type !== 'sliding') continue;

    const partId = g.userData.partId ?? readKey(asRecord(entry), 'id');
    const resolvers = ctx && isRecord(ctx) ? ctx.resolvers : null;
    const r = isRecord(resolvers) ? resolvers : null;
    const removeDoorsEnabled = !!(r && readKey(r, 'removeDoorsEnabled'));
    const isDoorRemovedRaw = readFunction(r, 'isDoorRemoved');
    const isDoorRemoved = isDoorRemovedRaw ? (pid: unknown) => !!isDoorRemovedRaw(pid) : null;
    if (typeof g.userData.__wpDoorRemoved === 'boolean') {
      if (g.userData.__wpDoorRemoved) continue;
    } else if (removeDoorsEnabled && typeof isDoorRemoved === 'function' && partId != null) {
      if (isDoorRemoved(partId)) continue;
    }

    let w = Number(g.userData.__doorWidth);
    let h = Number(g.userData.__doorHeight);
    if (!Number.isFinite(w) || w <= 0) {
      const ew = Number(readKey(asRecord(entry), 'width'));
      if (Number.isFinite(ew) && ew > 0) w = ew;
    }
    if (!Number.isFinite(h) || h <= 0) {
      try {
        const box = new THREE.Box3().setFromObject(g);
        const size = new THREE.Vector3();
        box.getSize(size);
        if (Number.isFinite(size.y) && size.y > 0) h = size.y;
      } catch (error) {
        runtime.reportSoft('applyFrontRevealFrames.measureDoorHeight', error);
      }
    }
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) continue;

    let xLeft = -w / 2;
    let xRight = w / 2;
    if (type === 'hinged') {
      const hingeLeft = !!g.userData.__hingeLeft;
      xLeft = hingeLeft ? 0 : -w;
      xRight = hingeLeft ? w : 0;
    }
    const yMin = -h / 2;
    const yMax = h / 2;

    const t = Number(g.userData.__wpFrontThickness);
    const thickness = Number.isFinite(t) && t > 0 ? t : type === 'sliding' ? 0.022 : 0.018;

    let sign = 1;
    if (type === 'hinged') {
      sign = Number(g.position.z) >= 0 ? 1 : -1;
      const ov = runtime.getRevealZSignOverride(asRecord(g.userData));
      if (ov != null) sign = ov;
    }
    const z = sign * (thickness / 2 + runtime.zNudge);

    if (g.userData.__wpSketchSegmentedDoor) {
      const children = Array.isArray(g.children) ? g.children : [];
      for (let ci = 0; ci < children.length; ci++) {
        const seg = asObject3D(children[ci]);
        const segUd = asRecord(seg && seg.userData);
        if (!seg || !segUd || !segUd.__wpSketchDoorSegment) continue;
        runtime.removeLocalFrames(seg);
        const segBounds = runtime.getObjectLocalBounds(seg);
        const segMinX = readBoundsAxis(segBounds, 'x', 'min');
        const segMaxX = readBoundsAxis(segBounds, 'x', 'max');
        const segMinY = readBoundsAxis(segBounds, 'y', 'min');
        const segMaxY = readBoundsAxis(segBounds, 'y', 'max');
        if (
          !Number.isFinite(segMinX) ||
          !Number.isFinite(segMaxX) ||
          !(segMaxX > segMinX) ||
          !Number.isFinite(segMinY) ||
          !Number.isFinite(segMaxY) ||
          !(segMaxY > segMinY)
        ) {
          continue;
        }
        const segMat = runtime.pickRevealLineMaterial(seg);
        const segLines = runtime.buildRectLines(segMinX, segMaxX, segMinY, segMaxY, z, segMat || undefined);
        if (segLines) seg.add(segLines);
      }
      continue;
    }

    const lineMat = runtime.pickRevealLineMaterial(g);
    const lines = runtime.buildRectLines(xLeft, xRight, yMin, yMax, z, lineMat || undefined);
    if (lines) g.add(lines);
  }
}
