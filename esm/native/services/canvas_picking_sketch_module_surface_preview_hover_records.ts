import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type { RecordMap } from './canvas_picking_sketch_module_surface_preview_contracts.js';

export function createShelfRemoveHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  removeKind: 'sketch' | 'base';
  removeIdx: number | null;
  shelfIndex: number | null;
}): RecordMap {
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    moduleKey: args.host.moduleKey,
    isBottom: args.host.isBottom,
    hostModuleKey: args.host.moduleKey,
    hostIsBottom: args.host.isBottom,
    kind: 'shelf',
    op: 'remove',
    removeKind: args.removeKind,
    removeIdx: args.removeIdx ?? undefined,
    shelfIndex: args.shelfIndex ?? undefined,
  };
}

export function createRodRemoveHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  removeKind: 'sketch' | 'base';
  removeIdx: number | null;
  rodIndex: number | null;
}): RecordMap {
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    moduleKey: args.host.moduleKey,
    isBottom: args.host.isBottom,
    hostModuleKey: args.host.moduleKey,
    hostIsBottom: args.host.isBottom,
    kind: 'rod',
    op: 'remove',
    removeKind: args.removeKind,
    removeIdx: args.removeIdx ?? undefined,
    rodIndex: args.rodIndex ?? undefined,
  };
}
