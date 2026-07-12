import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { SketchModuleBoxContentLike } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { SketchBoxContentCommand } from './canvas_picking_sketch_box_content_command.js';
import {
  createRandomId,
  ensureSketchBoxContentList,
} from './canvas_picking_sketch_box_content_commit_boxes.js';
import type { CommitSketchModuleBoxContentArgs } from './canvas_picking_sketch_box_content_commit_contracts.js';
import { toastInternalDrawerRemovedShelves } from './canvas_picking_internal_drawer_shelf_replacement.js';
import { buildToggleHoverRecord } from './canvas_picking_sketch_box_content_commit_toggle.js';
import { inferSketchStackVerticalAnchorFromNormalizedItem } from '../features/sketch_stack_positioning.js';
import { markSketchInternalDrawersDirty } from '../features/sketch_drawer_sizing.js';
import {
  resolveSketchInternalDrawerCassetteRange,
  verticalRangesTouchOrOverlap,
} from '../features/sketch_internal_drawer_cassette.js';
import {
  clampSketchCommitUnitNumber,
  writeSketchCommitClampedUnitNumber,
  writeSketchCommitPositiveNumber,
} from './canvas_picking_sketch_commit_geometry.js';
import {
  SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND,
  SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY,
  createSketchBoxRegularExternalDrawerItem,
  removeSketchBoxRegularExternalDrawersInCell,
} from '../features/sketch_box_regular_external_drawers.js';

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPositiveNumber(value: unknown): number | null {
  const parsed = readNumber(value);
  return parsed != null && parsed > 0 ? parsed : null;
}

function shelfHeightForBoxVariant(variant: unknown, woodThick: number): number {
  const kind = typeof variant === 'string' && variant ? variant : 'regular';
  if (kind === 'glass') return MATERIAL_DIMENSIONS.glassShelf.thicknessM;
  if (kind === 'double' || !kind) {
    return Math.max(woodThick, woodThick * INTERIOR_FITTINGS_DIMENSIONS.shelves.doubleThicknessMultiplier);
  }
  return woodThick;
}

function boxShelfMatchesDrawerColumn(args: {
  shelf: SketchModuleBoxContentLike;
  contentXNorm: number | null;
}): boolean {
  const shelfXNorm = readNumber(args.shelf.xNorm);
  if (args.contentXNorm == null || shelfXNorm == null) return true;
  return Math.abs(shelfXNorm - args.contentXNorm) <= 0.34;
}

function removeBoxShelvesTouchingInternalDrawerCassette(args: {
  box: Record<string, unknown>;
  item: SketchModuleBoxContentLike;
  stackH: number | null;
  contentXNorm: number | null;
  woodThick?: unknown;
}): number {
  const shelves = Array.isArray(args.box.shelves) ? (args.box.shelves as SketchModuleBoxContentLike[]) : null;
  if (!shelves?.length) return 0;
  const boxHeight = readPositiveNumber(args.box.heightM ?? args.box.height);
  if (boxHeight == null) return 0;
  const baseNorm = readNumber(args.item.yNorm);
  const centerNorm = readNumber(args.item.yNormC);
  const stackH = readPositiveNumber(args.stackH);
  if (stackH == null) return 0;
  const stackBaseY =
    baseNorm != null ? baseNorm * boxHeight : centerNorm != null ? centerNorm * boxHeight - stackH / 2 : null;
  if (stackBaseY == null) return 0;
  const woodThick = readPositiveNumber(args.woodThick) ?? MATERIAL_DIMENSIONS.wood.thicknessM;
  const cassette = resolveSketchInternalDrawerCassetteRange({
    baseY: stackBaseY,
    stackH,
    woodThick,
  });

  let removedCount = 0;
  for (let i = shelves.length - 1; i >= 0; i -= 1) {
    const shelf = shelves[i];
    if (!shelf || !boxShelfMatchesDrawerColumn({ shelf, contentXNorm: args.contentXNorm })) continue;
    const yNorm = readNumber(shelf.yNorm);
    if (yNorm == null) continue;
    const shelfH = shelfHeightForBoxVariant(shelf.variant, woodThick);
    const shelfCenterY = yNorm * boxHeight;
    if (
      verticalRangesTouchOrOverlap({
        minY: cassette.minY,
        maxY: cassette.maxY,
        otherMinY: shelfCenterY - shelfH / 2,
        otherMaxY: shelfCenterY + shelfH / 2,
      })
    ) {
      shelves.splice(i, 1);
      removedCount += 1;
    }
  }
  return removedCount;
}

function clampNorm(value: number | null, defaultValue: number): number {
  return clampSketchCommitUnitNumber(value, defaultValue);
}

function removeBoxContentById(list: SketchModuleBoxContentLike[], removeId: string): boolean {
  if (!removeId) return false;
  const idx = list.findIndex(it => it.id != null && String(it.id) === removeId);
  if (idx < 0) return false;
  list.splice(idx, 1);
  return true;
}

function removeBoxContentFromExistingList(
  box: Record<string, unknown>,
  key: string,
  removeId: string
): boolean {
  const raw = box[key];
  return Array.isArray(raw) ? removeBoxContentById(raw as SketchModuleBoxContentLike[], removeId) : false;
}

function removeSketchExternalDrawerContentById(args: {
  box: Record<string, unknown>;
  extDrawers: SketchModuleBoxContentLike[];
  removeId: string;
}): boolean {
  return (
    removeBoxContentById(args.extDrawers, args.removeId) ||
    removeBoxContentFromExistingList(args.box, SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY, args.removeId)
  );
}

function findBoxContentById(
  list: SketchModuleBoxContentLike[],
  itemId: string
): SketchModuleBoxContentLike | null {
  if (!itemId) return null;
  return list.find(it => it.id != null && String(it.id) === itemId) || null;
}

function upsertRegularExternalDrawerItem(args: {
  list: SketchModuleBoxContentLike[];
  box: Record<string, unknown>;
  removeId: string | null;
  contentXNorm: number | null;
  boxYNorm: number | null;
  boxBaseYNorm: number | null;
  drawerCount: number;
  hasShoeDrawer: boolean;
}): SketchModuleBoxContentLike | null {
  if (args.drawerCount <= 0 && !args.hasShoeDrawer) {
    removeBoxContentById(args.list, args.removeId || '');
    return null;
  }

  const existing = findBoxContentById(args.list, args.removeId || '');
  const item = createSketchBoxRegularExternalDrawerItem({
    id: existing?.id != null && String(existing.id) ? String(existing.id) : createRandomId('sbrd'),
    xNorm: args.contentXNorm ?? (existing?.xNorm as number | null | undefined),
    yNormC: args.boxYNorm ?? (existing?.yNormC as number | null | undefined),
    yNorm: args.boxBaseYNorm ?? (existing?.yNorm as number | null | undefined),
    count: args.drawerCount,
    hasShoeDrawer: args.hasShoeDrawer,
  }) as SketchModuleBoxContentLike;

  removeSketchBoxRegularExternalDrawersInCell(
    args.box,
    {
      xNorm: item.xNorm as number | null,
      yNormC: item.yNormC as number | null,
    },
    String(item.id)
  );

  const targetList = Array.isArray(args.box[SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY])
    ? (args.box[SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY] as SketchModuleBoxContentLike[])
    : args.list;
  const current = findBoxContentById(targetList, String(item.id));
  if (current) Object.assign(current, item);
  else targetList.push(item);
  return current || item;
}

function inferCommittedBoxDrawerAnchor(args: {
  yNormC: number;
  yNorm?: number;
}): ReturnType<typeof inferSketchStackVerticalAnchorFromNormalizedItem> {
  return inferSketchStackVerticalAnchorFromNormalizedItem({
    item: { yNormC: args.yNormC, yNorm: args.yNorm },
    stackH: 0,
    totalHeight: 1,
  });
}

function writeSketchCommitOptionalDrawerXNorm(item: SketchModuleBoxContentLike, value: number | null): void {
  if (value != null) writeSketchCommitClampedUnitNumber(item, 'xNorm', value, 0.5);
}

function buildDrawerItem(args: {
  idPrefix: string;
  boxYNorm: number | null;
  boxBaseYNorm: number | null;
  contentXNorm: number | null;
  drawerCount?: number;
  drawerHeightM?: number | null;
  stackH?: number | null;
}): SketchModuleBoxContentLike {
  const yNormC = clampNorm(args.boxYNorm, 0.5);
  const yNorm = args.boxBaseYNorm != null ? clampNorm(args.boxBaseYNorm, 0.5) : undefined;
  const item: SketchModuleBoxContentLike = {
    id: createRandomId(args.idPrefix),
    yNormC,
    yAnchor: inferCommittedBoxDrawerAnchor({ yNormC, yNorm }),
  };
  if (args.boxBaseYNorm != null) item.yNorm = yNorm;
  writeSketchCommitOptionalDrawerXNorm(item, args.contentXNorm);
  writeSketchCommitPositiveNumber(item, 'count', args.drawerCount);
  writeSketchCommitPositiveNumber(item, 'drawerHeightM', args.drawerHeightM);
  return item;
}

export function tryCommitSketchBoxDrawerContent(args: {
  commitArgs: CommitSketchModuleBoxContentArgs;
  command: SketchBoxContentCommand | null;
  hoverOp: 'add' | 'remove';
}): { handled: boolean; nextHover: Record<string, unknown> | null } {
  const { commitArgs, command, hoverOp } = args;
  const hoverMode = commitArgs.hoverMode || 'none';
  const hoverHost = commitArgs.hoverHost || null;
  const boxId = commitArgs.boxId;
  if (commitArgs.contentKind === 'drawers') {
    if (command?.kind !== 'internal-drawers') return { handled: false, nextHover: null };
    const { contentXNorm, boxYNorm, boxBaseYNorm, removeId, drawerHeightM, drawerH, stackH } = command;
    const list = ensureSketchBoxContentList(commitArgs.box, 'drawers');
    if (hoverOp === 'remove') {
      if (!removeId) return { handled: false, nextHover: null };
      removeBoxContentById(list, removeId);
      if (commitArgs.cfg) markSketchInternalDrawersDirty(commitArgs.cfg);
      return {
        handled: true,
        nextHover: buildToggleHoverRecord({
          hoverMode,
          hoverRec: commitArgs.hoverRec,
          hoverHost,
          boxId,
          contentKind: 'drawers',
          op: 'add',
          removeId: '',
          drawerHeightM,
          drawerH,
        }),
      };
    }

    const item = buildDrawerItem({
      idPrefix: 'sd',
      boxYNorm,
      boxBaseYNorm,
      contentXNorm,
      drawerHeightM,
      stackH,
    });
    list.push(item);
    const removedShelfCount = removeBoxShelvesTouchingInternalDrawerCassette({
      box: commitArgs.box as Record<string, unknown>,
      item,
      stackH,
      contentXNorm,
      woodThick: commitArgs.woodThick,
    });
    toastInternalDrawerRemovedShelves(commitArgs.App, removedShelfCount);
    if (commitArgs.cfg) markSketchInternalDrawersDirty(commitArgs.cfg);
    return {
      handled: true,
      nextHover: buildToggleHoverRecord({
        hoverMode,
        hoverRec: commitArgs.hoverRec,
        hoverHost,
        boxId,
        contentKind: 'drawers',
        op: 'remove',
        removeId: String(item.id),
        drawerHeightM,
        drawerH,
      }),
    };
  }

  if (commitArgs.contentKind === 'ext_drawers') {
    if (command?.kind !== 'sketch-external-drawers') return { handled: false, nextHover: null };
    const { contentXNorm, boxYNorm, boxBaseYNorm, removeId, drawerHeightM, drawerH, stackH, drawerCount } =
      command;
    const list = ensureSketchBoxContentList(commitArgs.box, 'extDrawers');
    if (hoverOp === 'remove') {
      if (!removeId) return { handled: false, nextHover: null };
      removeSketchExternalDrawerContentById({
        box: commitArgs.box as Record<string, unknown>,
        extDrawers: list,
        removeId,
      });
      return {
        handled: true,
        nextHover: buildToggleHoverRecord({
          hoverMode,
          hoverRec: commitArgs.hoverRec,
          hoverHost,
          boxId,
          contentKind: 'ext_drawers',
          op: 'add',
          removeId: '',
          drawerCount,
          drawerHeightM,
          drawerH,
        }),
      };
    }

    const item = buildDrawerItem({
      idPrefix: 'sed',
      boxYNorm,
      boxBaseYNorm,
      contentXNorm,
      drawerCount,
      drawerHeightM,
      stackH,
    });
    list.push(item);
    return {
      handled: true,
      nextHover: buildToggleHoverRecord({
        hoverMode,
        hoverRec: commitArgs.hoverRec,
        hoverHost,
        boxId,
        contentKind: 'ext_drawers',
        op: 'remove',
        removeId: String(item.id),
        drawerCount,
        drawerHeightM,
        drawerH,
      }),
    };
  }

  if (commitArgs.contentKind === SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND) {
    if (command?.kind !== 'regular-external-drawers') return { handled: false, nextHover: null };
    const { contentXNorm, boxYNorm, boxBaseYNorm, removeId, drawerCount, hasShoeDrawer } = command;
    const list = ensureSketchBoxContentList(commitArgs.box, SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY);
    upsertRegularExternalDrawerItem({
      list,
      box: commitArgs.box as Record<string, unknown>,
      removeId,
      contentXNorm,
      boxYNorm,
      boxBaseYNorm,
      drawerCount,
      hasShoeDrawer,
    });

    return { handled: true, nextHover: null };
  }

  return { handled: false, nextHover: null };
}
