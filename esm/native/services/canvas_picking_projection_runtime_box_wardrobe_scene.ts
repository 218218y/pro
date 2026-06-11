import type { AppContainer } from '../../../types';
import { asRecord } from '../runtime/record.js';
import {
  __getThreeBoxSupport,
  __getWorldToLocalFn,
  __readBox3Bounds,
  __readMutableNodeRecord,
} from './canvas_picking_projection_runtime_shared.js';
import type { __Box3Like, __ProjectionLocalBox } from './canvas_picking_projection_runtime_box_shared.js';

function __shouldExcludeWardrobeBoundsNode(node: unknown): boolean {
  let cur = __readMutableNodeRecord(node);
  while (cur) {
    if (cur.visible === false) return true;
    const ud = asRecord(cur.userData);
    if (ud) {
      if (ud.__ignoreRaycast === true || ud.__wpExcludeWardrobeBounds === true) return true;
      const partId = typeof ud.partId === 'string' ? String(ud.partId) : '';
      if (partId.startsWith('sketch_box_free_')) return true;
    }
    cur = __readMutableNodeRecord(cur.parent);
  }
  return false;
}

export function __measureWardrobeSceneLocalBox(
  App: AppContainer,
  wardrobeGroup: unknown
): __ProjectionLocalBox | null {
  const wg = __readMutableNodeRecord(wardrobeGroup);
  if (!wg) return null;
  const three = __getThreeBoxSupport(App);
  if (!three || typeof wg.traverse !== 'function') return null;

  const box: __Box3Like = new three.Box3();
  const tmp: __Box3Like = new three.Box3();
  let hasAny = false;

  try {
    if (typeof wg.updateWorldMatrix === 'function') wg.updateWorldMatrix(true, true);
  } catch {
    // ignore
  }

  wg.traverse((node: unknown) => {
    const rec = __readMutableNodeRecord(node);
    if (!rec || rec === wg || __shouldExcludeWardrobeBoundsNode(rec)) return;
    if (!(rec.isMesh || rec.isLine || rec.isLineSegments)) return;
    if (!(rec.geometry && typeof tmp.setFromObject === 'function')) return;
    try {
      if (typeof tmp.makeEmpty === 'function') tmp.makeEmpty();
      tmp.setFromObject(rec);
      const bounds = __readBox3Bounds(tmp);
      if (!bounds) return;
      if (!hasAny) {
        if (typeof box.copy === 'function') box.copy(tmp);
        else if (typeof box.setFromObject === 'function') box.setFromObject(rec);
        hasAny = true;
      } else if (typeof box.union === 'function') {
        box.union(tmp);
      }
    } catch {
      // ignore
    }
  });

  if (!hasAny) return null;
  const bounds = __readBox3Bounds(box);
  if (!bounds) return null;

  const { min, max } = bounds;
  const center = new three.Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
  try {
    const worldToLocal = __getWorldToLocalFn(wg);
    if (worldToLocal) worldToLocal(center);
  } catch {
    // ignore
  }
  return {
    centerX: Number(center.x),
    centerY: Number(center.y),
    centerZ: Number(center.z),
    width: Math.max(0, max.x - min.x),
    height: Math.max(0, max.y - min.y),
    depth: Math.max(0, max.z - min.z),
  };
}
