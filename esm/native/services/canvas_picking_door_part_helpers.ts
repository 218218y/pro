// Door/drawer identity helpers extracted from canvas_picking_core_helpers.
//
// This owner keeps part-key normalization, stack scoping, nearest actionable
// hit resolution, and door-specific config reads out of the runtime helper seam.

import type { AppContainer } from '../../../types';
import type { HitObjectLike } from './canvas_picking_engine.js';
import { __wp_asHitObject, __wp_asRecord, __wp_map, __wp_str } from './canvas_picking_core_shared.js';

function __wp_isRemoved(App: AppContainer, partId: string): boolean {
  const raw = String(partId || '');
  const m = __wp_map(App, 'removedDoorsMap');
  if (!raw) return false;

  // Canonical segmented-door ids: store/check removed_<id> using *_full/_top/_mid/_bot keys (never base ids).
  const id0 = raw.indexOf('removed_') === 0 ? raw.slice(8) : raw;
  const id = __wp_canonDoorPartKeyForMaps(id0);
  if (!id) return false;

  const rk = `removed_${id}`;
  if (!!m[rk]) return true;

  // Segmented parts inherit from the full door key.
  if (id.endsWith('_top') || id.endsWith('_mid') || id.endsWith('_bot')) {
    const full = id.replace(/_(top|mid|bot)$/i, '_full');
    return !!m[`removed_${full}`];
  }

  return false;
}

function __wp_isDoorLikePartId(partId: unknown): boolean {
  const pid = typeof partId === 'string' ? partId : String(partId ?? '');
  if (!pid) return false;
  if (/^(?:lower_)?d\d+(?:_|$)/.test(pid) && !pid.includes('_draw_')) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/.test(pid)) return true;
  if (pid.startsWith('sliding') || pid.startsWith('slide')) return true;
  if (pid.startsWith('lower_sliding')) return true;
  if (
    pid.startsWith('corner_door') ||
    pid.startsWith('corner_pent_door') ||
    pid.startsWith('lower_corner_door') ||
    pid.startsWith('lower_corner_pent_door')
  )
    return true;
  return false;
}

function __wp_isDrawerLikePartId(partId: unknown): boolean {
  const pid = typeof partId === 'string' ? partId : String(partId ?? '');
  if (!pid) return false;
  if (/^(?:lower_)?d\d+_draw_/.test(pid)) return true;
  if (pid.includes('_draw_')) return true;
  if (pid.includes('drawer') || pid.includes('draw') || pid.includes('chest')) return true;
  return false;
}

function __wp_isDoorOrDrawerLikePartId(partId: unknown): boolean {
  return __wp_isDoorLikePartId(partId) || __wp_isDrawerLikePartId(partId);
}

// Segmented doors (hinged + corner doors) persist per-door maps using *_full/_top/_bot keys.
// Older payloads may have stored base keys (no suffix). Those are migrated at load-time.
function __wp_isSegmentedDoorBaseId(partId: unknown): boolean {
  const pid = typeof partId === 'string' ? partId : String(partId ?? '');
  if (!pid) return false;
  if (/^(?:lower_)?d\d+$/.test(pid)) return true;
  if (/^(?:lower_)?corner_door_\d+$/.test(pid)) return true;
  if (/^(?:lower_)?corner_pent_door_\d+$/.test(pid)) return true;
  return false;
}

function __wp_canonDoorPartKeyForMaps(partId: unknown): string {
  const pid = typeof partId === 'string' ? partId : String(partId ?? '');
  if (!pid) return '';
  if (pid.endsWith('_full') || pid.endsWith('_top') || pid.endsWith('_bot') || pid.endsWith('_mid'))
    return pid;
  if (__wp_isSegmentedDoorBaseId(pid)) return pid + '_full';
  return pid;
}

function __wp_scopeCornerPartKeyForStack(
  partId: unknown,
  stackKey: 'top' | 'bottom' | null | undefined
): string {
  const pid = typeof partId === 'string' ? partId : String(partId ?? '');
  if (!pid) return '';
  if (stackKey !== 'bottom') return pid;
  if (pid.startsWith('lower_')) return pid;
  if (pid.startsWith('corner_')) return `lower_${pid}`;
  return pid;
}

function __wp_scopeCornerPartKeysForStack(
  partIds: readonly string[],
  stackKey: 'top' | 'bottom' | null | undefined
): string[] {
  const out: string[] = [];
  for (let i = 0; i < partIds.length; i++) out.push(__wp_scopeCornerPartKeyForStack(partIds[i], stackKey));
  return out;
}

function __wp_resolveNearestActionablePartFromHit(
  App: AppContainer,
  startObj: HitObjectLike | null
): {
  nearestPartId: string | null;
  actionablePartId: string | null;
  doorId: string | null;
  drawerId: string | null;
} {
  let nearestPartId: string | null = null;
  let actionablePartId: string | null = null;
  let doorId: string | null = null;
  let drawerId: string | null = null;

  let cur = startObj;
  while (cur) {
    const rawPid = cur.userData && cur.userData.partId ? cur.userData.partId : null;
    if (rawPid != null) {
      const pid = __wp_str(App, rawPid);
      if (!nearestPartId) nearestPartId = pid;
      if (!actionablePartId && __wp_isDoorOrDrawerLikePartId(pid)) actionablePartId = pid;
      if (!doorId && __wp_isDoorLikePartId(pid)) doorId = pid;
      if (!drawerId && __wp_isDrawerLikePartId(pid)) drawerId = pid;
      if (actionablePartId && doorId && drawerId) break;
    }
    cur = __wp_asHitObject(__wp_asRecord(cur)?.parent);
  }

  return { nearestPartId, actionablePartId, doorId, drawerId };
}

function __wp_hingeDir(App: AppContainer, hingeKey: string, def?: string): 'left' | 'right' {
  const key = String(hingeKey || '');
  const m = __wp_map(App, 'hingeMap');
  let v = m[key];
  if (v == null && !key.startsWith('door_hinge_')) v = m['door_hinge_' + key];
  if (v == null && !key.endsWith('_hinge')) v = m[key + '_hinge'];
  if (v == null) return String(def || 'left') === 'right' ? 'right' : 'left';
  return v ? 'right' : 'left';
}

function __wp_colorGet(App: AppContainer, partKey: string): string {
  const key = String(partKey || '');
  // Door special types (mirror/glass) are stored in a dedicated map so "special colors"
  // won't overwrite the actual door style.
  const sm = __wp_map(App, 'doorSpecialMap');
  const sv = sm[key];
  if (sv === 'mirror' || sv === 'glass') return sv;
  const m = __wp_map(App, 'individualColors');
  const v = m[key];
  return typeof v === 'string' && v ? v : 'default';
}

export {
  __wp_isRemoved,
  __wp_isDoorLikePartId,
  __wp_isDrawerLikePartId,
  __wp_isDoorOrDrawerLikePartId,
  __wp_isSegmentedDoorBaseId,
  __wp_canonDoorPartKeyForMaps,
  __wp_scopeCornerPartKeyForStack,
  __wp_scopeCornerPartKeysForStack,
  __wp_resolveNearestActionablePartFromHit,
  __wp_hingeDir,
  __wp_colorGet,
};
