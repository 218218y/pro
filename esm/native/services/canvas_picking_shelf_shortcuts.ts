import { readModeOpts } from './canvas_picking_interior_hover_state.js';
import {
  filterSketchModuleContentItemsForCell,
  resolveSketchModulePartitionCell,
  resolveSketchModulePartitionScopeOrder,
  resolveSketchModulePointerNorm,
} from './canvas_picking_sketch_module_partition.js';
import { asRecord } from './canvas_picking_layout_edit_flow_shared.js';
import { INTERIOR_STORAGE_BARRIER_POLICY } from '../../shared/dimensions/interior_storage_policy.js';
import { doesSketchModuleVerticalRangeCollideWithDrawers } from './canvas_picking_sketch_module_vertical_content_collision.js';
import {
  findNearestSketchModuleRod,
  findNearestSketchModuleStorageBarrier,
} from './canvas_picking_sketch_module_vertical_content_match.js';
import type { AppContainer, UnknownRecord } from '../../../types';
import type { ModuleKey } from './canvas_picking_layout_edit_flow_shared.js';
import {
  createSketchHoverHostIdentity,
  readSketchHoverHostIdentity,
} from './canvas_picking_sketch_hover_identity.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';

export type ShelfShortcutVariant = 'regular' | 'brace';
export type ShelfShortcutOperation = {
  action: 'convert' | 'remove';
  variant: ShelfShortcutVariant;
  previewOp: 'add' | 'remove';
};

export function readShelfShortcutVariant(app: AppContainer): ShelfShortcutVariant {
  return readModeOpts(app).shelfShortcutVariant === 'regular' ? 'regular' : 'brace';
}

export function resolveShelfShortcutOperation(
  shelf: UnknownRecord,
  target: ShelfShortcutVariant
): ShelfShortcutOperation {
  const isBrace = shelf.variant === 'brace' || shelf.variant === 'winter_brace';
  if (target === 'regular')
    return {
      action: isBrace ? 'convert' : 'remove',
      variant: 'regular',
      previewOp: isBrace ? 'add' : 'remove',
    };
  if (isBrace && shelf.braceShortcutAdded === true)
    return { action: 'remove', variant: 'brace', previewOp: 'remove' };
  return { action: 'convert', variant: isBrace ? 'regular' : 'brace', previewOp: isBrace ? 'remove' : 'add' };
}

export function applyShelfShortcutToList(
  shelves: unknown[],
  index: number,
  target: ShelfShortcutVariant
): boolean {
  const shelf = shelves[index];
  if (!shelf || typeof shelf !== 'object' || Array.isArray(shelf)) return false;
  const item = shelf as UnknownRecord;
  const operation = resolveShelfShortcutOperation(item, target);
  if (operation.action === 'remove') shelves.splice(index, 1);
  else {
    item.variant = operation.variant;
    // A conversion chooses the standard depth of its new shelf kind.
    delete item.depthM;
    delete item.braceShortcutAdded;
  }
  return true;
}

export type ShelfShortcutAddition = {
  y: number;
  yNorm: number;
  xNorm: number;
  scopeOrder: number;
  centerX: number;
  width: number;
  blocked: boolean;
};

export function createShelfShortcutAddHover(
  addition: ShelfShortcutAddition,
  moduleKey: ModuleKey,
  isBottom: boolean,
  variant: ShelfShortcutVariant
): UnknownRecord {
  return {
    ts: Date.now(),
    tool: 'brace_shelves',
    kind: 'shelf_shortcut_add',
    targetVariant: variant,
    ...createSketchHoverHostIdentity({ moduleKey, isBottom }),
    addition,
  };
}

export function readFreshShelfShortcutAddition(
  value: unknown,
  moduleKey: ModuleKey,
  isBottom: boolean,
  variant: ShelfShortcutVariant
): ShelfShortcutAddition | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as UnknownRecord;
  const host = readSketchHoverHostIdentity(rec, __wp_toModuleKey);
  if (
    rec.tool !== 'brace_shelves' ||
    rec.kind !== 'shelf_shortcut_add' ||
    rec.targetVariant !== variant ||
    !host ||
    String(host.moduleKey) !== String(moduleKey) ||
    host.isBottom !== isBottom ||
    typeof rec.ts !== 'number' ||
    !Number.isFinite(rec.ts) ||
    rec.ts > Date.now() ||
    Date.now() - rec.ts > 1200
  )
    return null;
  const addition = rec.addition;
  if (!addition || typeof addition !== 'object') return null;
  const a = addition as UnknownRecord;
  if (
    !['y', 'yNorm', 'xNorm', 'scopeOrder', 'centerX', 'width'].every(
      key => typeof a[key] === 'number' && Number.isFinite(a[key])
    ) ||
    typeof a.blocked !== 'boolean' ||
    Number(a.yNorm) < 0 ||
    Number(a.yNorm) > 1 ||
    Number(a.xNorm) < 0 ||
    Number(a.xNorm) > 1 ||
    !Number.isInteger(a.scopeOrder) ||
    Number(a.scopeOrder) < 0 ||
    Number(a.width) <= 0
  )
    return null;
  return a as ShelfShortcutAddition;
}

export function resolveShelfShortcutAddition(args: {
  config: UnknownRecord;
  bottomY: number;
  topY: number;
  pointerY: number;
  pointerX: number;
  innerW: number;
  internalCenterX: number;
  woodThick: number;
}): ShelfShortcutAddition | null {
  const { bottomY, topY, pointerY, woodThick } = args;
  const span = topY - bottomY;
  if (
    !(span > woodThick * 2) ||
    !Number.isFinite(pointerY) ||
    !Number.isFinite(args.pointerX) ||
    !(args.innerW > 0)
  )
    return null;
  const geometry = { ...args, bottomY, topY };
  const extras = args.config.sketchExtras;
  const cell = resolveSketchModulePartitionCell({
    sketchExtras: extras,
    geometry,
    pointerX: args.pointerX,
    pointerY,
  });
  const lo = (cell?.bottomY ?? bottomY) + woodThick;
  const hi = (cell?.topY ?? topY) - woodThick;
  if (hi < lo) return null;
  const y = Math.max(lo, Math.min(hi, pointerY));
  const norm = resolveSketchModulePointerNorm({
    geometry,
    pointerX: cell?.centerX ?? args.pointerX,
    pointerY: y,
  });
  const extra =
    extras && typeof extras === 'object' && !Array.isArray(extras) ? (extras as UnknownRecord) : {};
  const itemsForCell = (value: unknown): UnknownRecord[] =>
    filterSketchModuleContentItemsForCell({
      sketchExtras: extras,
      geometry,
      cell,
      items: Array.isArray(value)
        ? value.map(asRecord).filter((item): item is UnknownRecord => item !== null)
        : [],
    }).map(entry => entry.item);
  const rods = itemsForCell(extra.rods);
  const barriers = itemsForCell(extra.storageBarriers);
  const rod = findNearestSketchModuleRod({ rods, bottomY, totalHeight: span, pointerY: y });
  const collidesWithStorage = barriers.some(item => {
    const barrier = findNearestSketchModuleStorageBarrier({
      storageBarriers: [item],
      bottomY,
      totalHeight: span,
      pointerY: y,
    });
    return (
      barrier !== null &&
      barrier.dy < (barrier.heightM ?? INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM) / 2 + woodThick / 2
    );
  });
  const blocked =
    doesSketchModuleVerticalRangeCollideWithDrawers({
      drawers: itemsForCell(extra.drawers),
      extDrawers: itemsForCell(extra.extDrawers),
      bottomY,
      topY,
      totalHeight: span,
      pad: woodThick,
      centerY: y,
      heightM: woodThick,
    }) ||
    (rod !== null && rod.dy < woodThick * 2) ||
    collidesWithStorage;
  return {
    y,
    yNorm: norm.yNorm,
    xNorm: norm.xNorm,
    scopeOrder: resolveSketchModulePartitionScopeOrder(extras),
    centerX: cell?.centerX ?? args.internalCenterX,
    width: cell?.width ?? args.innerW,
    blocked,
  };
}

export function addShortcutShelf(
  config: UnknownRecord,
  addition: ShelfShortcutAddition,
  variant: ShelfShortcutVariant
): boolean {
  if (addition.blocked) return false;
  if (!config.sketchExtras) config.sketchExtras = {};
  const extra = config.sketchExtras as UnknownRecord;
  if (!Array.isArray(extra.shelves)) extra.shelves = [];
  (extra.shelves as UnknownRecord[]).push({
    yNorm: addition.yNorm,
    xNorm: addition.xNorm,
    scopeOrder: addition.scopeOrder,
    variant,
    ...(variant === 'brace' ? { braceShortcutAdded: true } : {}),
  });
  return true;
}
