import type { AppContainer } from '../../../types';
import { INTERIOR_STORAGE_BARRIER_POLICY } from '../../shared/dimensions/interior_storage_policy.js';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import { SKETCH_BOX_SHELF_PREVIEW_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { __wp_raycastReuse } from './canvas_picking_core_helpers.js';
import {
  __wp_clearSketchHover,
  __wp_findSketchFreeBoxLocalHit,
  __wp_getViewportRoots,
  __wp_intersectScreenWithLocalZPlane,
  __wp_measureWardrobeLocalBox,
  __wp_parseSketchBoxToolSpec,
  __wp_readInteriorModuleConfigRef,
  __wp_writeSketchHover,
} from './canvas_picking_local_helpers.js';
import {
  type BraceShelvesFreeBoxPlan,
  type ManualFreeContentKind,
  type ManualLayoutFreeBoxShelfGridPlan,
  normalizeShelfVariant,
  type PresetLayoutFreeBoxPlan,
  readRecordValue,
  type RecordMap,
  resolveManualToolContentKind,
} from './canvas_picking_manual_layout_free_box_contracts.js';
import {
  resolveBraceShelvesFreeBoxPlan,
  resolveManualLayoutFreeBoxShelfGridPlan,
  resolvePresetLayoutFreeBoxPlan,
} from './canvas_picking_manual_layout_free_box_plans.js';
import type { SketchFreePlacementHostLike } from './canvas_picking_sketch_free_commit.js';
import {
  createBraceShelvesHoverRecord,
  createPresetLayoutHoverRecord,
  createShelfGridHoverRecord,
} from './canvas_picking_manual_layout_free_box_hover_protocol.js';
import { resolveManualLayoutSketchHoverFreePlaneContext } from './canvas_picking_manual_layout_sketch_hover_free_context.js';
import {
  findSketchFreeHoverTargetBox,
  type SketchFreeHoverContentKind,
} from './canvas_picking_sketch_free_surface_preview.js';
import {
  getSketchFreeBoxPartPrefix,
  pickSketchFreeBoxHost,
  resolveSketchFreeBoxGeometry,
} from './canvas_picking_sketch_free_boxes.js';
import {
  pickSketchBoxSegment,
  pickSketchBoxVerticalSegment,
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from './canvas_picking_sketch_box_dividers.js';
import { resolveSketchBoxVerticalContentPreview } from './canvas_picking_sketch_box_vertical_content_preview.js';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';

export type {
  BraceShelvesFreeBoxPlan,
  ManualLayoutFreeBoxShelfGridPlan,
  PresetLayoutFreeBoxPlan,
} from './canvas_picking_manual_layout_free_box_contracts.js';
export {
  resolveBraceShelvesFreeBoxPlan,
  resolveManualLayoutFreeBoxShelfGridPlan,
  resolvePresetLayoutFreeBoxPlan,
} from './canvas_picking_manual_layout_free_box_plans.js';
export {
  tryCommitBraceShelvesFreeBoxFromHover,
  tryCommitManualLayoutFreeBoxFromHover,
  tryCommitPresetLayoutFreeBoxFromHover,
} from './canvas_picking_manual_layout_free_box_commit.js';

type ManualLayoutFreeBoxTargetContext = {
  host: SketchFreePlacementHostLike;
  wardrobeGroup: unknown;
  wardrobeBox: { centerY?: unknown; height?: unknown };
  wardrobeBackZ: number;
  intersects: ReturnType<typeof __wp_raycastReuse>;
  target: {
    boxId: string;
    targetBox: unknown;
    targetGeo: { centerX: number; innerW: number; innerD: number; innerBackZ: number };
    targetCenterY: number;
    targetHeight: number;
    pointerX: number;
    pointerY: number;
  };
};

type ManualLayoutFreeBoxHoverArgs = {
  App: AppContainer;
  tool: string;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  currentGridDivisions: number;
  shelfVariant: string;
  setLayoutPreview: ((args: RecordMap) => unknown) | null;
  setSketchPreview: ((args: RecordMap) => unknown) | null;
  hideLayoutPreview: () => void;
  hideSketchPreview: () => void;
};

function resolveTargetScanContentKind(kind: ManualFreeContentKind): SketchFreeHoverContentKind {
  return kind === 'shelf_grid' ? 'shelf' : kind;
}

function resolveManualLayoutFreeBoxTarget(args: {
  App: AppContainer;
  tool: string;
  contentKind: ManualFreeContentKind;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): ManualLayoutFreeBoxTargetContext | null {
  const { App, tool, contentKind, ndcX, ndcY, raycaster, mouse } = args;
  const { camera, wardrobeGroup } = __wp_getViewportRoots(App);
  if (!camera || !wardrobeGroup) return null;

  const context = resolveManualLayoutSketchHoverFreePlaneContext({
    App,
    tool,
    ndcX,
    ndcY,
    camera,
    wardrobeGroup,
    raycaster,
    mouse,
    __wp_parseSketchBoxToolSpec,
    __wp_pickSketchFreeBoxHost: pickSketchFreeBoxHost,
    __wp_measureWardrobeLocalBox,
    __wp_intersectScreenWithLocalZPlane,
    __wp_readInteriorModuleConfigRef,
  });
  if (!context) return null;

  const intersects = __wp_raycastReuse({
    App,
    raycaster,
    mouse,
    camera,
    ndcX,
    ndcY,
    objects: [wardrobeGroup],
    recursive: true,
  });

  const target = findSketchFreeHoverTargetBox({
    App,
    tool,
    contentKind: resolveTargetScanContentKind(contentKind),
    hostModuleKey: context.host.moduleKey,
    freeBoxes: context.freeBoxes,
    planeHit: context.planeHit,
    wardrobeBox: context.wardrobeBox,
    wardrobeBackZ: context.wardrobeBackZ,
    intersects,
    localParent: wardrobeGroup,
    resolveSketchFreeBoxGeometry,
    getSketchFreeBoxPartPrefix,
    findSketchFreeBoxLocalHit: __wp_findSketchFreeBoxLocalHit,
    projectPointerToLocalZPlane: planeZ =>
      __wp_intersectScreenWithLocalZPlane({
        App,
        raycaster,
        mouse,
        camera,
        ndcX,
        ndcY,
        localParent: wardrobeGroup,
        planeZ,
      }),
  });
  if (!target) return null;

  return {
    host: context.host,
    wardrobeGroup,
    wardrobeBox: context.wardrobeBox,
    wardrobeBackZ: context.wardrobeBackZ,
    intersects,
    target,
  };
}

function writeShelfGridHoverPreview(args: {
  App: AppContainer;
  wardrobeGroup: unknown;
  plan: ManualLayoutFreeBoxShelfGridPlan;
  shelfVariant: string;
  setLayoutPreview: ((args: RecordMap) => unknown) | null;
  hideSketchPreview: () => void;
}): boolean {
  if (!args.setLayoutPreview) return false;
  args.hideSketchPreview();
  args.setLayoutPreview({
    App: args.App,
    THREE: getThreeMaybe(args.App),
    anchorParent: args.wardrobeGroup,
    x: args.plan.previewX,
    internalZ: args.plan.previewInternalZ,
    innerW: args.plan.previewW,
    internalDepth: args.plan.previewInnerD,
    woodThick: args.plan.previewWoodThick,
    shelfYs: args.plan.shelfYs,
    rodYs: [],
    storageBarrier: null,
    shelfVariant: normalizeShelfVariant(args.shelfVariant),
    op: args.plan.blockedReason ? 'blocked' : 'add',
    blockedReason: args.plan.blockedReason ?? undefined,
  });
  return true;
}

function writePresetLayoutHoverPreview(args: {
  App: AppContainer;
  wardrobeGroup: unknown;
  plan: PresetLayoutFreeBoxPlan;
  setLayoutPreview: ((args: RecordMap) => unknown) | null;
  hideSketchPreview: () => void;
}): boolean {
  if (!args.setLayoutPreview) return false;
  args.hideSketchPreview();
  args.setLayoutPreview({
    App: args.App,
    THREE: getThreeMaybe(args.App),
    anchorParent: args.wardrobeGroup,
    x: args.plan.previewX,
    internalZ: args.plan.previewInternalZ,
    innerW: args.plan.previewW,
    internalDepth: args.plan.previewInnerD,
    woodThick: args.plan.previewWoodThick,
    shelfYs: args.plan.shelfYs,
    rodYs: args.plan.rodYs,
    storageBarrier: args.plan.storageBarrier,
    shelfVariant: 'regular',
    op: args.plan.blockedReason ? 'blocked' : 'add',
    blockedReason: args.plan.blockedReason ?? undefined,
  });
  return true;
}

function writeBraceShelvesHoverPreview(args: {
  App: AppContainer;
  wardrobeGroup: unknown;
  plan: BraceShelvesFreeBoxPlan;
  setSketchPreview: ((args: RecordMap) => unknown) | null;
  hideLayoutPreview: () => void;
}): boolean {
  if (!args.setSketchPreview) return false;
  const isBrace = args.plan.nextVariant === 'brace';
  args.hideLayoutPreview();
  args.setSketchPreview({
    App: args.App,
    THREE: getThreeMaybe(args.App),
    anchorParent: args.wardrobeGroup,
    kind: 'shelf',
    variant: args.plan.nextVariant,
    x: args.plan.previewX,
    y: args.plan.shelfY,
    z: args.plan.previewInternalZ - args.plan.previewInnerD / 2 + args.plan.nextDepthM / 2,
    w: Math.max(
      SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
      args.plan.previewW -
        (isBrace
          ? SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfBraceClearanceM
          : SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRegularClearanceM)
    ),
    h: args.plan.nextVariant === 'brace' ? args.plan.previewWoodThick : args.plan.previewWoodThick,
    d: args.plan.nextDepthM,
    woodThick: args.plan.previewWoodThick,
    op: 'add',
  });
  return true;
}

function tryHandleShelfGridHover(
  args: ManualLayoutFreeBoxHoverArgs,
  targetContext: ManualLayoutFreeBoxTargetContext
): boolean {
  if (!args.setLayoutPreview) return false;
  if (args.setSketchPreview) {
    const removalPreview = resolveSketchBoxVerticalContentPreview({
      host: {
        tool: args.tool,
        moduleKey: targetContext.host.moduleKey,
        isBottom: targetContext.host.isBottom,
      },
      contentKind: 'shelf',
      boxId: targetContext.target.boxId,
      freePlacement: true,
      targetBox: targetContext.target.targetBox,
      targetGeo: targetContext.target.targetGeo,
      targetCenterY: targetContext.target.targetCenterY,
      targetHeight: targetContext.target.targetHeight,
      pointerX: targetContext.target.pointerX,
      pointerY: targetContext.target.pointerY,
      woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
      shelfVariant: args.shelfVariant,
      readSketchBoxDividers,
      readSketchBoxHorizontalDividers,
      resolveSketchBoxSegments,
      pickSketchBoxSegment,
      resolveSketchBoxVerticalSegments,
      pickSketchBoxVerticalSegment,
    });
    const removalKind = readRecordValue(removalPreview?.hoverRecord, 'contentKind');
    const removalOp = readRecordValue(removalPreview?.hoverRecord, 'op');
    if (removalOp === 'remove' && (removalKind === 'rod' || removalKind === 'storage')) {
      __wp_writeSketchHover(args.App, removalPreview!.hoverRecord);
      args.hideLayoutPreview();
      args.setSketchPreview({
        App: args.App,
        THREE: getThreeMaybe(args.App),
        anchorParent: targetContext.wardrobeGroup,
        ...removalPreview!.preview,
      });
      return true;
    }
  }
  const plan = resolveManualLayoutFreeBoxShelfGridPlan({
    targetBox: targetContext.target.targetBox,
    targetGeo: targetContext.target.targetGeo,
    targetCenterY: targetContext.target.targetCenterY,
    targetHeight: targetContext.target.targetHeight,
    pointerX: targetContext.target.pointerX,
    pointerY: targetContext.target.pointerY,
    currentGridDivisions: args.currentGridDivisions,
    shelfVariant: args.shelfVariant,
  });

  __wp_writeSketchHover(
    args.App,
    createShelfGridHoverRecord({
      host: targetContext.host,
      boxId: targetContext.target.boxId,
      plan,
      shelfVariant: args.shelfVariant,
    })
  );
  args.hideLayoutPreview();
  return writeShelfGridHoverPreview({
    App: args.App,
    wardrobeGroup: targetContext.wardrobeGroup,
    plan,
    shelfVariant: args.shelfVariant,
    setLayoutPreview: args.setLayoutPreview,
    hideSketchPreview: args.hideSketchPreview,
  });
}

function tryHandleSingleVerticalHover(
  args: ManualLayoutFreeBoxHoverArgs,
  targetContext: ManualLayoutFreeBoxTargetContext,
  contentKind: 'rod' | 'storage'
): boolean {
  if (!args.setSketchPreview) return false;
  const preview = resolveSketchBoxVerticalContentPreview({
    host: { tool: args.tool, moduleKey: targetContext.host.moduleKey, isBottom: targetContext.host.isBottom },
    contentKind,
    boxId: targetContext.target.boxId,
    freePlacement: true,
    targetBox: targetContext.target.targetBox,
    targetGeo: targetContext.target.targetGeo,
    targetCenterY: targetContext.target.targetCenterY,
    targetHeight: targetContext.target.targetHeight,
    pointerX: targetContext.target.pointerX,
    pointerY: targetContext.target.pointerY,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    storageHeight: contentKind === 'storage' ? INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM : null,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });
  if (!preview) return false;
  __wp_writeSketchHover(args.App, preview.hoverRecord);
  args.hideLayoutPreview();
  args.setSketchPreview({
    App: args.App,
    THREE: getThreeMaybe(args.App),
    anchorParent: targetContext.wardrobeGroup,
    ...preview.preview,
  });
  return true;
}

export function tryHandlePresetLayoutFreeBoxHover(args: {
  App: AppContainer;
  layoutType: string;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  setLayoutPreview: ((args: RecordMap) => unknown) | null;
  hideLayoutPreview: () => void;
  hideSketchPreview: () => void;
}): boolean {
  const targetContext = resolveManualLayoutFreeBoxTarget({
    App: args.App,
    tool: args.layoutType || 'shelves',
    contentKind: 'shelf_grid',
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    raycaster: args.raycaster,
    mouse: args.mouse,
  });
  if (!targetContext) return false;
  const plan = resolvePresetLayoutFreeBoxPlan({
    targetBox: targetContext.target.targetBox,
    targetGeo: targetContext.target.targetGeo,
    targetCenterY: targetContext.target.targetCenterY,
    targetHeight: targetContext.target.targetHeight,
    pointerX: targetContext.target.pointerX,
    pointerY: targetContext.target.pointerY,
    layoutType: args.layoutType || 'shelves',
  });
  __wp_writeSketchHover(
    args.App,
    createPresetLayoutHoverRecord({
      host: targetContext.host,
      boxId: targetContext.target.boxId,
      plan,
    })
  );
  args.hideLayoutPreview();
  return writePresetLayoutHoverPreview({
    App: args.App,
    wardrobeGroup: targetContext.wardrobeGroup,
    plan,
    setLayoutPreview: args.setLayoutPreview,
    hideSketchPreview: args.hideSketchPreview,
  });
}

export function tryHandleBraceShelvesFreeBoxHover(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  setSketchPreview: ((args: RecordMap) => unknown) | null;
  hideLayoutPreview: () => void;
  hideSketchPreview: () => void;
}): boolean {
  const targetContext = resolveManualLayoutFreeBoxTarget({
    App: args.App,
    tool: 'brace_shelves',
    contentKind: 'shelf_grid',
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    raycaster: args.raycaster,
    mouse: args.mouse,
  });
  if (!targetContext) return false;
  const plan = resolveBraceShelvesFreeBoxPlan({
    targetBox: targetContext.target.targetBox,
    targetGeo: targetContext.target.targetGeo,
    targetCenterY: targetContext.target.targetCenterY,
    targetHeight: targetContext.target.targetHeight,
    pointerX: targetContext.target.pointerX,
    pointerY: targetContext.target.pointerY,
  });
  if (!plan) {
    __wp_clearSketchHover(args.App);
    args.hideSketchPreview();
    return false;
  }
  __wp_writeSketchHover(
    args.App,
    createBraceShelvesHoverRecord({
      host: targetContext.host,
      boxId: targetContext.target.boxId,
      plan,
    })
  );
  return writeBraceShelvesHoverPreview({
    App: args.App,
    wardrobeGroup: targetContext.wardrobeGroup,
    plan,
    setSketchPreview: args.setSketchPreview,
    hideLayoutPreview: args.hideLayoutPreview,
  });
}

export function tryHandleManualLayoutFreeBoxHover(args: ManualLayoutFreeBoxHoverArgs): boolean {
  const contentKind = resolveManualToolContentKind(args.tool);
  if (!contentKind) return false;
  const targetContext = resolveManualLayoutFreeBoxTarget({
    App: args.App,
    tool: args.tool,
    contentKind,
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    raycaster: args.raycaster,
    mouse: args.mouse,
  });
  if (!targetContext) return false;
  if (contentKind === 'shelf_grid') return tryHandleShelfGridHover(args, targetContext);
  return tryHandleSingleVerticalHover(args, targetContext, contentKind);
}
