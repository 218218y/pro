import type { RecordMap } from './canvas_picking_sketch_module_stack_commit_contracts.js';
import { readNumber, readRecordValue } from './canvas_picking_sketch_module_stack_commit_shared.js';

export function removeStandardDrawer(args: {
  cfg: RecordMap;
  hoverRemovePid: string | null;
  hoverRemoveSlot: number | null;
}): boolean {
  const { cfg, hoverRemovePid, hoverRemoveSlot } = args;
  const pid = hoverRemovePid || '';
  const slot =
    hoverRemoveSlot != null
      ? hoverRemoveSlot
      : (() => {
          const m = pid.match(/_slot_(\d+)/);
          const s = m ? Number(m[1]) : NaN;
          return Number.isFinite(s) ? s : null;
        })();
  if (slot == null) return false;

  const arr0 = Array.isArray(cfg.intDrawersList) ? cfg.intDrawersList : null;
  if (Array.isArray(arr0)) {
    for (let i = arr0.length - 1; i >= 0; i--) {
      if (Number(arr0[i]) === slot) arr0.splice(i, 1);
    }
  }
  if (readNumber(cfg.intDrawersSlot) === slot) {
    try {
      delete cfg.intDrawersSlot;
    } catch {
      cfg.intDrawersSlot = null;
    }
  }
  return true;
}

export function removeStackItemById(list: RecordMap[], removeId: string | null): boolean {
  if (!removeId) return false;
  const idx = list.findIndex(it => String(readRecordValue(it, 'id')) === removeId);
  if (idx < 0) return false;
  list.splice(idx, 1);
  return true;
}

export function buildNormalizedStackPosition(args: {
  centerY: number;
  stackH: number;
  bottomY: number;
  totalHeight: number;
}): {
  baseYAbs: number;
  yNormC: number;
  yNormBase: number;
} {
  const baseYAbs = args.centerY - args.stackH / 2;
  return {
    baseYAbs,
    yNormC: Math.max(0, Math.min(1, (args.centerY - args.bottomY) / args.totalHeight)),
    yNormBase: Math.max(0, Math.min(1, (baseYAbs - args.bottomY) / args.totalHeight)),
  };
}
