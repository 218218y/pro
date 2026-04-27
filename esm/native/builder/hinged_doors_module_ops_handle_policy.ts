import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import {
  edgeHandleLongLiftAbsY as edgeHandleLongLiftAbsYImpl,
  isLongEdgeHandleVariantForPart,
  readModuleConfigRecord,
  readUnknownArray,
  topSplitHandleInsetForPart as topSplitHandleInsetForPartImpl,
} from './hinged_doors_shared.js';
import type { HingedDoorModuleOpsContext } from './hinged_doors_module_ops_contracts.js';

export function computeDefaultHandleAbsY(ctx: HingedDoorModuleOpsContext, doorId: number): number {
  let maxGlobalDrawerH = 0;
  let modsCfg: unknown[] = [];
  try {
    modsCfg =
      ctx.moduleCfgList ||
      readUnknownArray(readModulesConfigurationListFromConfigSnapshot(ctx.cfg, 'modulesConfiguration')) ||
      [];
    modsCfg.forEach((m: unknown) => {
      const mm = readModuleConfigRecord(m);
      if (!mm) return;
      let hh = 0;
      if (mm.hasShoeDrawer || mm.extDrawers === 'shoe') hh += 0.2;
      const cc = Number(mm.extDrawersCount || (typeof mm.extDrawers === 'number' ? mm.extDrawers : 0));
      if (cc > 0) hh += cc * 0.22;
      if (hh > maxGlobalDrawerH) maxGlobalDrawerH = hh;
    });
  } catch (e) {
    ctx.reportDoorSoftOnce('computeDefaultHandleAbsY.modulesConfig', e, { doorId });
  }
  let handleAbsHeight = 1.05;
  const maxDoorBottom = ctx.startY + ctx.woodThick + maxGlobalDrawerH;
  if (maxDoorBottom > 0.9) {
    const extraLongEdgeLift = edgeHandleLongLiftAbsYImpl(ctx.cfg, modsCfg);
    handleAbsHeight = maxDoorBottom + 0.15 + extraLongEdgeLift;
  }
  return handleAbsHeight;
}

export function hasExplicitHandleOverride(
  ctx: HingedDoorModuleOpsContext,
  doorId: number,
  id: string | number | null | undefined
): boolean {
  try {
    const hm =
      ctx.cfg && ctx.cfg.handlesMap && typeof ctx.cfg.handlesMap === 'object' ? ctx.cfg.handlesMap : null;
    if (!hm || !id) return false;
    return Object.prototype.hasOwnProperty.call(hm, String(id));
  } catch (e) {
    ctx.reportDoorSoftOnce('hasExplicitHandleOverride', e, { doorId, id });
    return false;
  }
}

export function clampHandleAbsY(
  ctx: HingedDoorModuleOpsContext,
  absY: number,
  segBottomY: number,
  segTopY: number,
  partId?: string
): number {
  const pad = isLongEdgeHandleVariantForPart(ctx.cfg, partId || '') ? 0.2 : 0.1;
  let y = absY;
  const minY = segBottomY + pad;
  const maxY = segTopY - pad;
  if (y < minY) y = minY;
  if (y > maxY) y = maxY;
  return y;
}

export function topSplitHandleInsetForPart(ctx: HingedDoorModuleOpsContext, partId: string): number {
  return topSplitHandleInsetForPartImpl(ctx.cfg, partId);
}
