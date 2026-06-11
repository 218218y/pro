import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type { RecordMap } from './canvas_picking_sketch_module_surface_preview_contracts.js';

export function createShelfAddHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  yNorm: number;
  variant: string | null;
  depthM?: number | null;
  blockedReason?: string | null;
}): RecordMap {
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    moduleKey: args.host.moduleKey,
    isBottom: args.host.isBottom,
    hostModuleKey: args.host.moduleKey,
    hostIsBottom: args.host.isBottom,
    kind: 'shelf',
    op: 'add',
    yNorm: Number.isFinite(args.yNorm) ? Math.max(0, Math.min(1, args.yNorm)) : undefined,
    variant: args.variant || undefined,
    depthM: args.depthM != null && Number.isFinite(args.depthM) && args.depthM > 0 ? args.depthM : undefined,
    __wpBlockedReason: args.blockedReason || undefined,
  };
}

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

export function createStorageRemoveHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  removeKind: 'sketch' | 'base';
  removeIdx: number | null;
}): RecordMap {
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    moduleKey: args.host.moduleKey,
    isBottom: args.host.isBottom,
    hostModuleKey: args.host.moduleKey,
    hostIsBottom: args.host.isBottom,
    kind: 'storage',
    op: 'remove',
    removeKind: args.removeKind,
    removeIdx: args.removeIdx ?? undefined,
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
