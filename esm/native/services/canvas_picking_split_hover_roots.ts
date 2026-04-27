import type { AppContainer, UnknownRecord } from '../../../types';
import { getDoorsArray, getRenderSlot, getWardrobeGroup, setRenderSlot } from '../runtime/render_access.js';
import { __wp_asRecord, __wp_getCanvasPickingRuntime, __wp_str } from './canvas_picking_core_shared.js';
import { __wp_isDoorLikePartId } from './canvas_picking_door_part_helpers.js';
import { __wp_getSplitHoverDoorBaseKey } from './canvas_picking_split_hover_bounds.js';

export function __wp_getSplitHoverRaycastRoots(App: AppContainer): unknown {
  try {
    const wardrobeGroup = __wp_asRecord(getWardrobeGroup(App));
    if (!wardrobeGroup) return [];

    const picking = __wp_getCanvasPickingRuntime(App);
    const doorsArray = getDoorsArray(App);
    const now = Date.now();

    const prevRoots = Array.isArray(picking.__splitHoverRaycastRoots)
      ? picking.__splitHoverRaycastRoots
      : null;
    const prevDoorCount = Number.isFinite(picking.__splitHoverRaycastRootsDoorCount)
      ? Number(picking.__splitHoverRaycastRootsDoorCount)
      : -1;
    const builtAt = Number.isFinite(picking.__splitHoverRaycastRootsBuiltAt)
      ? Number(picking.__splitHoverRaycastRootsBuiltAt)
      : -1;
    const dirty = !!getRenderSlot(App, '__splitHoverPickablesDirty');

    if (prevRoots && !dirty && prevDoorCount === prevRoots.length && builtAt >= 0 && now - builtAt < 400) {
      return prevRoots;
    }

    const roots: UnknownRecord[] = [];
    const seen = new Set<UnknownRecord>();
    const boundsByBase: UnknownRecord = Object.create(null);

    const addDoorRoot = (node: UnknownRecord | null) => {
      const g0 = __wp_asRecord(node);
      if (!g0) return;
      if (typeof g0.parent === 'undefined') return;

      const userData = __wp_asRecord(g0.userData);
      const pid = userData && typeof userData.partId !== 'undefined' ? __wp_str(App, userData.partId) : '';
      if (pid && !__wp_isDoorLikePartId(pid)) return;

      if (userData) {
        const cachedBase =
          typeof userData.__wpSplitHoverDoorBaseKey === 'string'
            ? String(userData.__wpSplitHoverDoorBaseKey)
            : '';
        const baseKey = cachedBase || __wp_getSplitHoverDoorBaseKey(pid);
        if (baseKey && cachedBase !== baseKey) userData.__wpSplitHoverDoorBaseKey = baseKey;

        const h = Number(userData.__doorHeight);
        if (Number.isFinite(h) && h > 0) {
          const position = __wp_asRecord(g0.position);
          const y0 = typeof position?.y === 'number' ? Number(position.y) : 0;
          const yMin = y0 - h / 2;
          const yMax = y0 + h / 2;

          if (pid) boundsByBase[pid] = { minY: yMin, maxY: yMax };

          if (baseKey) {
            const prev = __wp_asRecord(boundsByBase[baseKey]);
            if (prev) {
              if (yMin < Number(prev.minY)) prev.minY = yMin;
              if (yMax > Number(prev.maxY)) prev.maxY = yMax;
            } else {
              boundsByBase[baseKey] = { minY: yMin, maxY: yMax };
            }
          }
        }
      }

      if (seen.has(g0)) return;
      seen.add(g0);
      roots.push(g0);
    };

    for (let i = 0; i < doorsArray.length; i++) {
      const entry = __wp_asRecord(doorsArray[i]);
      addDoorRoot(__wp_asRecord(entry?.group));
    }

    const queue: UnknownRecord[] = [wardrobeGroup];
    const visited = new Set<UnknownRecord>();
    while (queue.length) {
      const curr = __wp_asRecord(queue.shift());
      if (!curr || visited.has(curr)) continue;
      visited.add(curr);
      addDoorRoot(curr);
      const children = Array.isArray(curr.children) ? curr.children : [];
      for (let i = 0; i < children.length; i++) {
        const child = __wp_asRecord(children[i]);
        if (child && !visited.has(child)) queue.push(child);
      }
    }

    picking.__splitHoverRaycastRoots = roots;
    picking.__splitHoverRaycastRootsDoorCount = roots.length;
    picking.__splitHoverRaycastRootsBuiltAt = now;
    picking.__splitHoverDoorBoundsByBase = boundsByBase;
    picking.__splitHoverDoorBoundsBuiltAt = now;
    picking.__splitHoverDoorBoundsDoorCount = roots.length;

    setRenderSlot(App, '__splitHoverPickablesDirty', false);

    return roots;
  } catch {
    return [];
  }
}
