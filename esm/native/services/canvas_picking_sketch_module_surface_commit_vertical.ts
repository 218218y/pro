import type { AppContainer } from '../../../types';
import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
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

type SketchModuleVerticalContentKind = 'shelf' | 'rod' | 'storage';

function getSketchModuleVerticalContentLabel(kind: SketchModuleVerticalContentKind): string {
  if (kind === 'rod') return 'מוט תלייה לפי סקיצה';
  if (kind === 'storage') return 'אוגר מצעים לפי סקיצה';
  return 'מדף לפי סקיצה';
}

function toastSketchVerticalContentCollisionFailure(args: {
  App?: AppContainer;
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
  if (match && match.dy <= SKETCH_BOX_DIMENSIONS.preview.removeEpsShelfM) return false;

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
  return !!(match && match.dy <= SKETCH_BOX_DIMENSIONS.preview.removeEpsShelfM);
}

function isRodCommitBlockedBySketchDrawers(args: CommitSketchModuleSurfaceToolArgs): boolean {
  const rods = readSketchExtrasList(args.cfg, 'rods');
  const match = findNearestSketchModuleRod({
    rods,
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
    pointerY: args.hitY0,
  });
  if (match && match.dy <= SKETCH_BOX_DIMENSIONS.preview.removeEpsShelfM) return false;

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
  if (match && match.dy <= SKETCH_BOX_DIMENSIONS.preview.removeEpsBoxM) {
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
  if (args.tool.startsWith('sketch_shelf:')) {
    const { variant, shelfDepthM } = parseSketchShelfTool(args.tool);
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
      removeEps: SKETCH_BOX_DIMENSIONS.preview.removeEpsShelfM,
    });
    return true;
  }

  if (args.tool === 'sketch_rod') {
    if (
      args.App &&
      !isSketchRodCommitRemovingExistingRod(args) &&
      blockRemovableSideContentBuildIfModuleSideMissing({
        App: args.App,
        moduleKey: args.moduleKey,
        isBottomStack: args.isBottomStack,
      })
    ) {
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
      removeEps: SKETCH_BOX_DIMENSIONS.preview.removeEpsShelfM,
    });
    return true;
  }

  if (args.tool.startsWith('sketch_storage:')) {
    const heightM = parseSketchStorageHeight(args.tool);
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
      removeEps: SKETCH_BOX_DIMENSIONS.preview.removeEpsBoxM,
      idFactory: () => createRandomId('ss'),
    });
    return true;
  }

  return false;
}
