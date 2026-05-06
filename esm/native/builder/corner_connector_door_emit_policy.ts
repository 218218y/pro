import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getModulesActions } from '../runtime/actions_access_domains.js';

import { markEdgeHandleDefaultNone } from './edge_handle_default_none_runtime.js';

import type { CornerConnectorDoorContext } from './corner_connector_door_emit_contracts.js';

type ValueRecord = Record<string, unknown>;

export function resolveCornerConnectorDoorSplitPolicy(
  ctx: CornerConnectorDoorContext,
  doorBaseId: string
): {
  topSplitEnabled: boolean;
  bottomSplitEnabled: boolean;
  shouldSplit: boolean;
} {
  const topSplitEnabled = ctx.splitDoors && isSplit(ctx, doorBaseId);
  const bottomSplitEnabled = ctx.splitDoors && isSplitBottom(ctx, doorBaseId);
  return {
    topSplitEnabled,
    bottomSplitEnabled,
    shouldSplit: ctx.splitDoors && (topSplitEnabled || bottomSplitEnabled),
  };
}

export function resolveCornerConnectorDefaultHandleAbsY(
  ctx: CornerConnectorDoorContext,
  doorBaseId: string
): number {
  maybeSeedEdgeHandleDefaultNone(ctx, doorBaseId);

  let defaultHandleAbsY = getCornerPentSharedAlignedHandleBaseAbsY(ctx);
  if (ctx.isLongEdgeHandleVariantForPart(ctx.cfg0, doorBaseId)) {
    defaultHandleAbsY += getCornerPentSharedLongHandleLiftAbsY(ctx);
  }
  return defaultHandleAbsY;
}

function maybeSeedEdgeHandleDefaultNone(ctx: CornerConnectorDoorContext, doorBaseId: string): void {
  if (!(ctx.cfg0 && ctx.asRecord(ctx.cfg0).globalHandleType === 'edge' && ctx.App)) return;
  markEdgeHandleDefaultNone(ctx.App, ctx.stackKey === 'bottom' ? 'bottom' : 'top', doorBaseId, 'pent');
}

function getCornerPentSharedAlignedHandleBaseAbsY(ctx: CornerConnectorDoorContext): number {
  try {
    return ctx.edgeHandleAlignedBaseAbsYForCornerCells(
      ctx.cfg0,
      getCornerPentSharedRawCellCfgs(ctx),
      ctx.startY,
      ctx.woodThick
    );
  } catch {
    return HANDLE_DIMENSIONS.edge.defaultGlobalAbsYM;
  }
}

function getCornerPentSharedLongHandleLiftAbsY(ctx: CornerConnectorDoorContext): number {
  try {
    return ctx.edgeHandleLongLiftAbsYForCornerCells(ctx.cfg0, getCornerPentSharedRawCellCfgs(ctx));
  } catch {
    return 0;
  }
}

function getCornerPentSharedRawCellCfgs(ctx: CornerConnectorDoorContext): ValueRecord[] {
  try {
    const list0 = ctx.readModulesConfigurationListFromConfigSnapshot(ctx.config, 'modulesConfiguration');
    const out: ValueRecord[] = [];
    for (let cellIndex = 0; cellIndex < 1; cellIndex++) {
      let raw: unknown = Array.isArray(list0) ? list0[cellIndex] : null;
      if (!raw || typeof raw !== 'object') {
        try {
          const modulesRec = getModulesActions(ctx.App);
          const ensureCell = readEnsureCornerCellAt(modulesRec);
          if (ensureCell) raw = ensureCell(cellIndex);
        } catch (error) {
          ctx.reportErrorThrottled(ctx.App, error, {
            where: 'corner_connector_door_emit',
            op: 'shared-raw-cells',
            throttleMs: 4000,
          });
        }
      }
      const rawCfg = readConfigRecord(raw);
      const fallbackCfg = readConfigRecord(ctx.config);
      if (rawCfg) out.push(rawCfg);
      else if (fallbackCfg) out.push(fallbackCfg);
      else out.push({});
    }
    return out;
  } catch {
    return [];
  }
}

function isSplit(ctx: CornerConnectorDoorContext, baseId: unknown): boolean {
  if (ctx.stackKey === 'bottom') {
    return ctx.isSplitExplicitInMap(ctx.splitMap0, ctx.stackScopePartKey(baseId));
  }
  return ctx.isSplitEnabledInMap(ctx.splitMap0, baseId, true);
}

function isSplitBottom(ctx: CornerConnectorDoorContext, baseId: unknown): boolean {
  return ctx.isSplitBottomEnabledInMap(
    ctx.splitBottomMap0,
    ctx.stackKey === 'bottom' ? ctx.stackScopePartKey(baseId) : baseId
  );
}

function readConfigRecord(value: unknown): ValueRecord | null {
  return isRecord(value) ? value : null;
}

function readEnsureCornerCellAt(value: unknown): ((index: number) => unknown) | null {
  const modulesRec = readConfigRecord(value);
  const fn = modulesRec ? modulesRec.ensureCornerCellAt : null;
  return typeof fn === 'function' ? (index: number) => fn(index) : null;
}

function isRecord(value: unknown): value is ValueRecord {
  return !!value && typeof value === 'object';
}
