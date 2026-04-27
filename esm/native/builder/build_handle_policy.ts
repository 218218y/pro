import { readRecord } from './build_flow_readers.js';

export function getExtraLongEdgeHandleLiftAbsY(
  cfg: unknown,
  moduleCfgList: unknown[] | null | undefined
): number {
  const c = readRecord(cfg);
  if (!c) return 0;

  const globalHandleType = c.globalHandleType;
  if (globalHandleType !== 'edge') return 0;

  const hm = readRecord(c.handlesMap);
  let hasLongEdgeVariant = false;

  if (hm) {
    if (hm.__wp_edge_handle_variant_global === 'long') {
      hasLongEdgeVariant = true;
    } else {
      for (const k of Object.keys(hm)) {
        if (k.startsWith('__wp_edge_handle_variant:') && hm[k] === 'long') {
          hasLongEdgeVariant = true;
          break;
        }
      }
    }
  }

  if (!hasLongEdgeVariant) return 0;

  let maxExtDrawersCount = 0;
  const arr = Array.isArray(moduleCfgList) ? moduleCfgList : [];
  for (const m of arr) {
    const mm = readRecord(m);
    if (!mm) continue;
    const v =
      typeof mm.extDrawersCount === 'number'
        ? mm.extDrawersCount
        : typeof mm.extDrawers === 'number'
          ? mm.extDrawers
          : 0;
    const count = Number.isFinite(v) ? Number(v) : 0;
    if (count > maxExtDrawersCount) maxExtDrawersCount = count;
  }

  // Long vertical edge handle is 40cm vs 20cm regular.
  // Keep the same ~5cm bottom clearance from the door bottom:
  // center should move up by half the delta => +10cm.
  return maxExtDrawersCount >= 4 ? 0.1 : 0;
}

export function getMaxGlobalExternalDrawerHeightM(moduleCfgList: unknown[] | null | undefined): number {
  let maxGlobalDrawerH = 0;
  const modules = Array.isArray(moduleCfgList) ? moduleCfgList : [];
  for (const mod of modules) {
    const mm = readRecord(mod);
    if (!mm) continue;
    let h = 0;
    if (mm.hasShoeDrawer || mm.extDrawers === 'shoe') h += 0.2;
    const c = Number(mm.extDrawersCount || (typeof mm.extDrawers === 'number' ? mm.extDrawers : 0));
    if (c > 0) h += c * 0.22;
    if (h > maxGlobalDrawerH) maxGlobalDrawerH = h;
  }
  return maxGlobalDrawerH;
}
