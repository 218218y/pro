import type { AppContainer } from '../../../types';
import { SKETCH_BOX_PREVIEW_CORE_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';
import { blockRemovableSideContentBuildIfModuleSideMissing } from './canvas_picking_removable_part_remove_constraints.js';
import {
  clampSketchModuleStorageCenterY,
  commitSketchModuleRod,
  commitSketchModuleShelf,
  commitSketchModuleStorageBarrier,
  findNearestSketchModuleRod,
  findNearestSketchModuleShelf,
  findNearestSketchModuleStorageBarrier,
} from './canvas_picking_sketch_module_vertical_content.js';
import {
  doesSketchModuleVerticalRangeCollideWithDrawers,
  resolveSketchModuleRodCollisionHeight,
  resolveSketchModuleShelfCollisionHeight,
  resolveSketchModuleVerticalRangePlacementAgainstDrawers,
} from './canvas_picking_sketch_module_vertical_content_collision.js';
import {
  filterSketchModuleContentItemsForCell,
  resolveSketchModulePartitionCell,
  resolveSketchModulePartitionScopeOrder,
  resolveSketchModulePointerNorm,
  type SketchModulePartitionGeometry,
} from './canvas_picking_sketch_module_partition.js';
import {
  createRandomId,
  parseSketchShelfTool,
  parseSketchStorageHeight,
  type CommitSketchModuleSurfaceToolArgs,
} from './canvas_picking_sketch_module_surface_commit_shared.js';

function readSketchExtrasList(
  cfg: CommitSketchModuleSurfaceToolArgs['cfg'],
  key: string
): Record<string, unknown>[] {
  const extra = cfg.sketchExtras;
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return [];
  const value = (extra as Record<string, unknown>)[key];
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)
      )
    : [];
}

type DirectPartitionContext = {
  geometry: SketchModulePartitionGeometry;
  cell: NonNullable<ReturnType<typeof resolveSketchModulePartitionCell>>;
  xNorm: number;
  scopeOrder: number;
  drawers: Record<string, unknown>[];
  extDrawers: Record<string, unknown>[];
};

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function resolveDirectPartitionContext(
  args: CommitSketchModuleSurfaceToolArgs
): DirectPartitionContext | null {
  const metrics = args.resolveSketchBoxPlacementMetrics();
  const innerW = readFiniteNumber(metrics.innerW);
  const internalCenterX = readFiniteNumber(metrics.internalCenterX);
  if (innerW == null || !(innerW > 0) || internalCenterX == null) return null;
  const pointerX = readFiniteNumber(metrics.hitLocalX) ?? internalCenterX;
  const geometry: SketchModulePartitionGeometry = {
    innerW,
    internalCenterX,
    bottomY: args.bottomY,
    topY: args.topY,
    woodThick: args.woodThick,
  };
  const cell = resolveSketchModulePartitionCell({
    sketchExtras: args.cfg.sketchExtras,
    geometry,
    pointerX,
    pointerY: args.hitYClamped,
  });
  if (!cell) return null;
  const norm = resolveSketchModulePointerNorm({ geometry, pointerX, pointerY: args.hitYClamped });
  const drawers = filterSketchModuleContentItemsForCell({
    sketchExtras: args.cfg.sketchExtras,
    geometry,
    items: readSketchExtrasList(args.cfg, 'drawers'),
    cell,
  }).map(candidate => candidate.item);
  const extDrawers = filterSketchModuleContentItemsForCell({
    sketchExtras: args.cfg.sketchExtras,
    geometry,
    items: readSketchExtrasList(args.cfg, 'extDrawers'),
    cell,
  }).map(candidate => candidate.item);
  return {
    geometry,
    cell,
    xNorm: norm.xNorm,
    scopeOrder: resolveSketchModulePartitionScopeOrder(args.cfg.sketchExtras),
    drawers,
    extDrawers,
  };
}

function clampDirectPartitionCenterY(args: {
  context: DirectPartitionContext;
  pad: number;
  heightM: number;
  pointerY: number;
}): number {
  const half = Math.max(0, args.heightM) / 2;
  const lo = args.context.cell.bottomY + args.pad + half;
  const hi = args.context.cell.topY - args.pad - half;
  if (!(hi >= lo)) return (args.context.cell.bottomY + args.context.cell.topY) / 2;
  return Math.max(lo, Math.min(hi, args.pointerY));
}

function resolveScopedVerticalItems(args: {
  cfg: CommitSketchModuleSurfaceToolArgs['cfg'];
  context: DirectPartitionContext;
  key: string;
}): Array<{ item: Record<string, unknown>; index: number }> {
  return filterSketchModuleContentItemsForCell({
    sketchExtras: args.cfg.sketchExtras,
    geometry: args.context.geometry,
    items: readSketchExtrasList(args.cfg, args.key),
    cell: args.context.cell,
  });
}

type SketchModuleVerticalContentKind = 'shelf' | 'rod' | 'storage';

function getSketchModuleVerticalContentLabel(kind: SketchModuleVerticalContentKind): string {
  if (kind === 'rod') return 'מוט תלייה לפי סקיצה';
  if (kind === 'storage') return 'אוגר מצעים לפי סקיצה';
  return 'מדף לפי סקיצה';
}

function toastSketchVerticalContentCollisionFailure(args: {
  App?: AppContainer | undefined;
  kind: SketchModuleVerticalContentKind;
}): void {
  if (!args.App) return;
  const label = getSketchModuleVerticalContentLabel(args.kind);
  __wp_toast(args.App, `לא ניתן לבנות ${label} במיקום זה, כי הוא מתנגש במגירות לפי סקיצה קיימות.`, 'error');
}

function isShelfCommitBlockedBySketchDrawers(
  args: CommitSketchModuleSurfaceToolArgs & { variant: string }
): boolean {
  const shelves = readSketchExtrasList(args.cfg, 'shelves');
  const match = findNearestSketchModuleShelf({
    shelves,
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
    pointerY: args.hitY0,
  });
  if (match && match.dy <= SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM) return false;

  return doesSketchModuleVerticalRangeCollideWithDrawers({
    cfgRef: args.cfg,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
    centerY: args.bottomY + args.yNorm * args.totalHeight,
    heightM: resolveSketchModuleShelfCollisionHeight({
      variant: args.variant,
      woodThick: args.woodThick,
    }),
  });
}

function isSketchRodCommitRemovingExistingRod(args: CommitSketchModuleSurfaceToolArgs): boolean {
  const rods = readSketchExtrasList(args.cfg, 'rods');
  const match = findNearestSketchModuleRod({
    rods,
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
    pointerY: args.hitY0,
  });
  return !!(match && match.dy <= SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM);
}

function isRodCommitBlockedBySketchDrawers(args: CommitSketchModuleSurfaceToolArgs): boolean {
  const rods = readSketchExtrasList(args.cfg, 'rods');
  const match = findNearestSketchModuleRod({
    rods,
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
    pointerY: args.hitY0,
  });
  if (match && match.dy <= SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM) return false;

  return doesSketchModuleVerticalRangeCollideWithDrawers({
    cfgRef: args.cfg,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
    centerY: args.bottomY + args.yNorm * args.totalHeight,
    heightM: resolveSketchModuleRodCollisionHeight(),
  });
}

function resolveStorageCommitPlacementAgainstSketchDrawers(
  args: CommitSketchModuleSurfaceToolArgs & { heightM: number }
): { blocked: boolean; pointerY: number } {
  const barriers = readSketchExtrasList(args.cfg, 'storageBarriers');
  const yCenterAbs = clampSketchModuleStorageCenterY({
    bottomY: args.bottomY,
    topY: args.topY,
    pad: args.pad,
    heightM: args.heightM,
    pointerY: args.hitYClamped,
  });
  const match = findNearestSketchModuleStorageBarrier({
    storageBarriers: barriers,
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
    pointerY: yCenterAbs,
  });
  if (match && match.dy <= SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsBoxM) {
    return { blocked: false, pointerY: args.hitYClamped };
  }

  const placement = resolveSketchModuleVerticalRangePlacementAgainstDrawers({
    cfgRef: args.cfg,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
    desiredCenterY: args.hitYClamped,
    heightM: args.heightM,
  });
  return { blocked: placement.blocked, pointerY: placement.centerY };
}

export function tryCommitSketchModuleVerticalContentTool(args: CommitSketchModuleSurfaceToolArgs): boolean {
  const partition = resolveDirectPartitionContext(args);

  if (args.tool.startsWith('sketch_shelf:')) {
    const { variant, shelfDepthM } = parseSketchShelfTool(args.tool);
    if (partition) {
      const shelves = resolveScopedVerticalItems({ cfg: args.cfg, context: partition, key: 'shelves' });
      const match = findNearestSketchModuleShelf({
        shelves: shelves.map(candidate => candidate.item),
        bottomY: args.bottomY,
        totalHeight: args.totalHeight,
        pointerY: args.hitY0,
      });
      if (match && match.dy <= SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM) {
        const originalIndex = shelves[match.index]?.index;
        const list = readSketchExtrasList(args.cfg, 'shelves');
        if (originalIndex != null) list.splice(originalIndex, 1);
        const extra = args.cfg.sketchExtras as Record<string, unknown> | undefined;
        if (extra) extra.shelves = list;
        return true;
      }
      const heightM = resolveSketchModuleShelfCollisionHeight({ variant, woodThick: args.woodThick });
      const centerY = clampDirectPartitionCenterY({
        context: partition,
        pad: args.pad,
        heightM,
        pointerY: args.hitYClamped,
      });
      if (
        doesSketchModuleVerticalRangeCollideWithDrawers({
          cfgRef: args.cfg,
          drawers: partition.drawers,
          extDrawers: partition.extDrawers,
          bottomY: args.bottomY,
          topY: args.topY,
          totalHeight: args.totalHeight,
          pad: args.pad,
          centerY,
          heightM,
        })
      ) {
        toastSketchVerticalContentCollisionFailure({ App: args.App, kind: 'shelf' });
        return true;
      }
      commitSketchModuleShelf({
        cfg: args.cfg,
        bottomY: args.bottomY,
        totalHeight: args.totalHeight,
        pointerY: centerY,
        yNorm: Math.max(0, Math.min(1, (centerY - args.bottomY) / args.totalHeight)),
        xNorm: partition.xNorm,
        scopeOrder: partition.scopeOrder,
        variant,
        shelfDepthM,
        removeEps: -1,
      });
      return true;
    }

    if (isShelfCommitBlockedBySketchDrawers({ ...args, variant })) {
      toastSketchVerticalContentCollisionFailure({ App: args.App, kind: 'shelf' });
      return true;
    }
    commitSketchModuleShelf({
      cfg: args.cfg,
      bottomY: args.bottomY,
      totalHeight: args.totalHeight,
      pointerY: args.hitY0,
      yNorm: args.yNorm,
      variant,
      shelfDepthM,
      removeEps: SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM,
    });
    return true;
  }

  if (args.tool === 'sketch_rod') {
    const scopedRods = partition
      ? resolveScopedVerticalItems({ cfg: args.cfg, context: partition, key: 'rods' })
      : null;
    const scopedRodMatch = scopedRods
      ? findNearestSketchModuleRod({
          rods: scopedRods.map(candidate => candidate.item),
          bottomY: args.bottomY,
          totalHeight: args.totalHeight,
          pointerY: args.hitY0,
        })
      : null;
    const removesScopedRod = !!(
      scopedRodMatch && scopedRodMatch.dy <= SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM
    );
    if (
      args.App &&
      !(partition ? removesScopedRod : isSketchRodCommitRemovingExistingRod(args)) &&
      blockRemovableSideContentBuildIfModuleSideMissing({
        App: args.App,
        moduleKey: args.moduleKey,
        isBottomStack: args.isBottomStack,
      })
    ) {
      return true;
    }
    if (partition) {
      if (removesScopedRod) {
        const originalIndex = scopedRods?.[scopedRodMatch!.index]?.index;
        const list = readSketchExtrasList(args.cfg, 'rods');
        if (originalIndex != null) list.splice(originalIndex, 1);
        const extra = args.cfg.sketchExtras as Record<string, unknown> | undefined;
        if (extra) extra.rods = list;
        return true;
      }
      const heightM = resolveSketchModuleRodCollisionHeight();
      const centerY = clampDirectPartitionCenterY({
        context: partition,
        pad: args.pad,
        heightM,
        pointerY: args.hitYClamped,
      });
      if (
        doesSketchModuleVerticalRangeCollideWithDrawers({
          cfgRef: args.cfg,
          drawers: partition.drawers,
          extDrawers: partition.extDrawers,
          bottomY: args.bottomY,
          topY: args.topY,
          totalHeight: args.totalHeight,
          pad: args.pad,
          centerY,
          heightM,
        })
      ) {
        toastSketchVerticalContentCollisionFailure({ App: args.App, kind: 'rod' });
        return true;
      }
      commitSketchModuleRod({
        cfg: args.cfg,
        bottomY: args.bottomY,
        totalHeight: args.totalHeight,
        pointerY: centerY,
        yNorm: Math.max(0, Math.min(1, (centerY - args.bottomY) / args.totalHeight)),
        xNorm: partition.xNorm,
        scopeOrder: partition.scopeOrder,
        removeEps: -1,
      });
      return true;
    }

    if (isRodCommitBlockedBySketchDrawers(args)) {
      toastSketchVerticalContentCollisionFailure({ App: args.App, kind: 'rod' });
      return true;
    }
    commitSketchModuleRod({
      cfg: args.cfg,
      bottomY: args.bottomY,
      totalHeight: args.totalHeight,
      pointerY: args.hitY0,
      yNorm: args.yNorm,
      removeEps: SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM,
    });
    return true;
  }

  if (args.tool.startsWith('sketch_storage:')) {
    const heightM = parseSketchStorageHeight(args.tool);
    if (partition) {
      const barriers = resolveScopedVerticalItems({
        cfg: args.cfg,
        context: partition,
        key: 'storageBarriers',
      });
      const clampedCenterY = clampSketchModuleStorageCenterY({
        bottomY: partition.cell.bottomY,
        topY: partition.cell.topY,
        pad: args.pad,
        heightM,
        pointerY: args.hitYClamped,
      });
      const match = findNearestSketchModuleStorageBarrier({
        storageBarriers: barriers.map(candidate => candidate.item),
        bottomY: args.bottomY,
        totalHeight: args.totalHeight,
        pointerY: clampedCenterY,
      });
      if (match && match.dy <= SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsBoxM) {
        const originalIndex = barriers[match.index]?.index;
        const list = readSketchExtrasList(args.cfg, 'storageBarriers');
        if (originalIndex != null) list.splice(originalIndex, 1);
        const extra = args.cfg.sketchExtras as Record<string, unknown> | undefined;
        if (extra) extra.storageBarriers = list;
        return true;
      }
      const placement = resolveSketchModuleVerticalRangePlacementAgainstDrawers({
        cfgRef: args.cfg,
        drawers: partition.drawers,
        extDrawers: partition.extDrawers,
        bottomY: args.bottomY,
        topY: args.topY,
        totalHeight: args.totalHeight,
        pad: args.pad,
        desiredCenterY: args.hitYClamped,
        heightM,
        limitBottomY: partition.cell.bottomY,
        limitTopY: partition.cell.topY,
      });
      if (placement.blocked) {
        toastSketchVerticalContentCollisionFailure({ App: args.App, kind: 'storage' });
        return true;
      }
      commitSketchModuleStorageBarrier({
        cfg: args.cfg,
        bottomY: args.bottomY,
        topY: args.topY,
        totalHeight: args.totalHeight,
        pad: args.pad,
        pointerY: placement.centerY,
        xNorm: partition.xNorm,
        scopeOrder: partition.scopeOrder,
        heightM,
        removeEps: -1,
        idFactory: () => createRandomId('ss'),
      });
      return true;
    }

    const placement = resolveStorageCommitPlacementAgainstSketchDrawers({ ...args, heightM });
    if (placement.blocked) {
      toastSketchVerticalContentCollisionFailure({ App: args.App, kind: 'storage' });
      return true;
    }
    commitSketchModuleStorageBarrier({
      cfg: args.cfg,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      pad: args.pad,
      pointerY: placement.pointerY,
      heightM,
      removeEps: SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsBoxM,
      idFactory: () => createRandomId('ss'),
    });
    return true;
  }

  return false;
}
