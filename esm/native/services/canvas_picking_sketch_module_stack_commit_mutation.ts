import type { RecordMap } from './canvas_picking_sketch_module_stack_commit_contracts.js';
import { readRecordValue } from './canvas_picking_sketch_module_stack_commit_shared.js';
import {
  resolveSketchStackVerticalAnchor,
  type SketchStackVerticalAnchor,
} from '../features/sketch_stack_positioning.js';

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
  topY?: number | undefined;
  totalHeight: number;
  pad?: number | undefined;
}): {
  baseYAbs: number;
  yNormC: number;
  yNormBase: number;
  yAnchor: SketchStackVerticalAnchor;
} {
  const baseYAbs = args.centerY - args.stackH / 2;
  const topY = args.topY ?? args.bottomY + args.totalHeight;
  return {
    baseYAbs,
    yNormC: Math.max(0, Math.min(1, (args.centerY - args.bottomY) / args.totalHeight)),
    yNormBase: Math.max(0, Math.min(1, (baseYAbs - args.bottomY) / args.totalHeight)),
    yAnchor: resolveSketchStackVerticalAnchor({
      centerY: args.centerY,
      bottomY: args.bottomY,
      topY,
      stackH: args.stackH,
      ...(args.pad !== undefined ? { pad: args.pad } : {}),
    }),
  };
}
