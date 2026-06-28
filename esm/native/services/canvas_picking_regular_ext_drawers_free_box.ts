import type { AppContainer, UnknownRecord } from '../../../types';
import { DRAWER_DIMENSIONS, MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveExternalDrawerFitFromBounds } from '../../shared/wardrobe_construction_validation_shared.js';
import {
  SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND,
  findSketchBoxRegularExternalDrawerInCell,
  normalizeSketchBoxRegularExternalDrawerCount,
  normalizeStoredSketchBoxRegularExternalDrawerCount,
  sketchBoxRegularExternalDrawerHasShoe,
} from '../features/sketch_box_regular_external_drawers.js';
import {
  getSketchFreeBoxPartPrefix,
  pickSketchFreeBoxHost,
  resolveSketchFreeBoxGeometry,
} from './canvas_picking_sketch_free_boxes.js';
import {
  findSketchFreeHoverTargetBox,
  type SketchFreeHoverHost,
} from './canvas_picking_sketch_free_surface_preview.js';
import {
  __wp_clearSketchHover,
  __wp_findSketchFreeBoxLocalHit,
  __wp_getViewportRoots,
  __wp_intersectScreenWithLocalZPlane,
  __wp_measureWardrobeLocalBox,
  __wp_pickSketchBoxSegment,
  __wp_pickSketchBoxVerticalSegment,
  __wp_readSketchBoxDividers,
  __wp_readSketchBoxHorizontalDividers,
  __wp_readSketchHover,
  __wp_resolveSketchBoxSegments,
  __wp_resolveSketchBoxVerticalSegments,
  __wp_writeSketchHover,
} from './canvas_picking_local_helpers.js';
import { __wp_toModuleKey, __wp_toast } from './canvas_picking_core_helpers.js';
import {
  applyShoeDrawerBaseAutoNoneIfNeeded,
  restoreShoeDrawerBaseIfNoShoeDrawersRemain,
} from './canvas_picking_shoe_drawer_base_auto_none.js';
import { commitSketchFreePlacementHoverRecord } from './canvas_picking_sketch_free_commit.js';
import { resolveSketchBoxStackPreviewContext } from './canvas_picking_sketch_box_stack_preview_context.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  ExtDrawersHoverPreviewArgs,
  SelectorLocalBox,
} from './canvas_picking_hover_preview_modes_shared.js';

const REGULAR_FREE_BOX_TOOL = 'ext_drawers_regular_free_box';
const HOVER_MAX_AGE_MS = 1500;

type RecordMap = UnknownRecord;

type HoverPreviewFns = {
  setPreview: ((args: RecordMap) => unknown) | null;
  hidePreview?: ((args: RecordMap) => unknown) | null;
  THREE: unknown;
};

function asRecord(value: unknown): RecordMap | null {
  return value && typeof value === 'object' ? (value as RecordMap) : null;
}

function readArray(value: unknown): RecordMap[] {
  return Array.isArray(value)
    ? value.map(item => asRecord(item)).filter((item): item is RecordMap => !!item)
    : [];
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readNumberOrDefault(value: unknown, defaultValue = NaN): number {
  const n = readNumber(value);
  return n == null ? defaultValue : n;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function readRegularDrawerSelection(
  readUi: ExtDrawersHoverPreviewArgs['readUi'],
  App: AppContainer
): {
  drawerType: string;
  drawerCount: number;
} {
  const ui = asRecord(readUi(App));
  const drawerType = typeof ui?.currentExtDrawerType === 'string' ? ui.currentExtDrawerType : 'regular';
  const drawerCount = normalizeSketchBoxRegularExternalDrawerCount(ui?.currentExtDrawerCount);
  return { drawerType, drawerCount };
}

function resolveFreeBoxHoverContext(args: ExtDrawersHoverPreviewArgs): {
  host: SketchFreeHoverHost;
  wardrobeGroup: unknown;
  wardrobeBox: SelectorLocalBox;
  wardrobeBackZ: number;
  freeBoxes: RecordMap[];
  planeHit: { x: number; y: number; z: number };
} | null {
  const { App, ndcX, ndcY, raycaster, mouse, readInteriorModuleConfigRef } = args;
  const roots = __wp_getViewportRoots(App);
  const camera = roots.camera;
  const wardrobeGroup = roots.wardrobeGroup;
  if (!camera || !wardrobeGroup) return null;

  const host = pickSketchFreeBoxHost(App);
  const wardrobeBox = __wp_measureWardrobeLocalBox(App) as SelectorLocalBox | null;
  const wardrobeCenterZ = readNumber(wardrobeBox?.centerZ);
  const wardrobeDepth = readNumber(wardrobeBox?.depth);
  const wardrobeBackZ =
    wardrobeCenterZ != null && wardrobeDepth != null ? wardrobeCenterZ - wardrobeDepth / 2 : NaN;
  if (!host || !wardrobeBox || !Number.isFinite(wardrobeBackZ)) return null;

  const planeHit = __wp_intersectScreenWithLocalZPlane({
    App,
    raycaster,
    mouse,
    camera,
    ndcX,
    ndcY,
    localParent: wardrobeGroup,
    planeZ: wardrobeBackZ,
  });
  if (!planeHit) return null;

  const cfgRef = readInteriorModuleConfigRef(App, host.moduleKey, host.isBottom);
  const extra = asRecord(cfgRef?.sketchExtras);
  const freeBoxes = readArray(extra?.boxes).filter(box => box.freePlacement === true);
  if (!freeBoxes.length) return null;

  return { host, wardrobeGroup, wardrobeBox, wardrobeBackZ, freeBoxes, planeHit };
}

function buildRegularDrawerPreview(args: {
  App: AppContainer;
  hoverFns: HoverPreviewFns;
  context: NonNullable<ReturnType<typeof resolveFreeBoxHoverContext>>;
  target: NonNullable<ReturnType<typeof findSketchFreeHoverTargetBox>>;
  drawerType: string;
  drawerCount: number;
}): boolean {
  const { App, hoverFns, context, target, drawerType, drawerCount } = args;
  if (!hoverFns.setPreview) return false;
  const woodThick = MATERIAL_DIMENSIONS.wood.thicknessM;
  const ctx = resolveSketchBoxStackPreviewContext({
    host: { tool: REGULAR_FREE_BOX_TOOL, moduleKey: context.host.moduleKey, isBottom: context.host.isBottom },
    contentKind: 'ext_drawers',
    boxId: target.boxId,
    freePlacement: true,
    targetBox: target.targetBox,
    targetGeo: target.targetGeo,
    targetCenterY: target.targetCenterY,
    targetHeight: target.targetHeight,
    pointerX: target.pointerX,
    pointerY: target.pointerY,
    woodThick,
    selectedDrawerCount: drawerCount,
    drawerHeightM: DRAWER_DIMENSIONS.external.regularHeightM,
    readSketchBoxDividers: __wp_readSketchBoxDividers,
    readSketchBoxHorizontalDividers: __wp_readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments: __wp_resolveSketchBoxSegments,
    pickSketchBoxSegment: __wp_pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments: __wp_resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment: __wp_pickSketchBoxVerticalSegment,
  });

  const activeXNorm = ctx.activeSegment ? ctx.activeSegment.xNorm : 0.5;
  const activeYNorm = ctx.activeVerticalSegment ? ctx.activeVerticalSegment.yNorm : 0.5;
  const existing = findSketchBoxRegularExternalDrawerInCell(target.targetBox, {
    xNorm: activeXNorm,
    yNormC: activeYNorm,
  });
  const existingRegularCount = existing
    ? normalizeStoredSketchBoxRegularExternalDrawerCount(existing.count)
    : 0;
  const existingHasShoe = existing ? sketchBoxRegularExternalDrawerHasShoe(existing) : false;
  const isShoe = drawerType === 'shoe';
  const op: 'add' | 'remove' = isShoe
    ? existingHasShoe
      ? 'remove'
      : 'add'
    : existingRegularCount === drawerCount
      ? 'remove'
      : 'add';
  const nextHasShoe = isShoe ? op === 'add' : existingHasShoe;
  const nextRegularCount = isShoe ? existingRegularCount : op === 'remove' ? 0 : drawerCount;

  const baseY = ctx.activeVerticalSegment ? ctx.boxBottomY : ctx.boxBottomY + woodThick;
  const fit = resolveExternalDrawerFitFromBounds({
    startY: baseY - woodThick,
    effectiveTopY: ctx.boxTopY,
    woodThick,
    hasShoe: nextHasShoe,
    regCount: nextRegularCount,
  });
  const blockedReason = op === 'add' && !fit.fitsRequested ? 'no-room' : null;
  const previewOp = blockedReason ? 'blocked' : op;
  const regH = DRAWER_DIMENSIONS.external.regularHeightM;
  const shoeH = DRAWER_DIMENSIONS.external.shoeHeightM;
  const actionStackH = isShoe ? shoeH : drawerCount * regH;
  const faceCenterX = ctx.frontOverlay
    ? ctx.frontOverlay.x
    : ctx.activeSegment
      ? ctx.activeSegment.centerX
      : target.targetGeo.centerX;
  const faceWidth = ctx.frontOverlay
    ? ctx.frontOverlay.w
    : ctx.activeSegment
      ? ctx.activeSegment.width
      : target.targetGeo.innerW;
  const previewW = Math.max(
    DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinWidthM,
    faceWidth - DRAWER_DIMENSIONS.external.visualWidthClearanceM
  );
  const previewD = ctx.frontOverlay ? ctx.frontOverlay.d : DRAWER_DIMENSIONS.external.visualThicknessM;
  const previewZ = ctx.frontOverlay
    ? ctx.frontOverlay.z
    : target.targetGeo.centerZ + target.targetGeo.outerD / 2 + DRAWER_DIMENSIONS.external.frontOffsetZM;
  const drawers = [];
  if (isShoe) {
    drawers.push({
      y: baseY + shoeH / 2,
      h: Math.max(
        DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM,
        shoeH - DRAWER_DIMENSIONS.external.visualHeightClearanceM
      ),
    });
  } else {
    const baseStackOffset = existingHasShoe ? shoeH : 0;
    for (let i = 0; i < drawerCount; i++) {
      drawers.push({
        y: baseY + baseStackOffset + i * regH + regH / 2,
        h: Math.max(
          DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM,
          regH - DRAWER_DIMENSIONS.external.visualHeightClearanceM
        ),
      });
    }
  }

  const hoverRecord = createManualLayoutSketchBoxContentHoverRecord({
    host: {
      tool: REGULAR_FREE_BOX_TOOL,
      moduleKey: context.host.moduleKey,
      isBottom: context.host.isBottom,
    },
    contentKind: SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND,
    boxId: target.boxId,
    freePlacement: true,
    op: blockedReason ? 'add' : op,
    removeId: blockedReason ? null : existing?.id != null ? String(existing.id) : null,
    contentXNorm: activeXNorm,
    boxYNorm: activeYNorm,
    boxBaseYNorm: clampUnit((ctx.boxBottomY - ctx.fullBoxBottomY) / Math.max(target.targetHeight, 1e-6)),
    yCenter: baseY + actionStackH / 2,
    baseY,
    stackH: actionStackH,
    drawerCount: nextRegularCount,
    hasShoeDrawer: nextHasShoe,
    drawerH: isShoe ? shoeH : regH,
    drawerHeightM: isShoe ? shoeH : regH,
    blockedReason,
  });
  __wp_writeSketchHover(App, hoverRecord);

  hoverFns.setPreview({
    App,
    THREE: hoverFns.THREE,
    anchorParent: context.wardrobeGroup,
    kind: 'ext_drawers',
    x: faceCenterX,
    y: baseY,
    z: previewZ,
    w: previewW,
    d: previewD,
    woodThick,
    drawers,
    op: previewOp,
    blockedReason: blockedReason ?? undefined,
  });
  return true;
}

export function tryHandleSketchBoxRegularExternalDrawersHoverPreview(
  args: ExtDrawersHoverPreviewArgs,
  hoverFns: HoverPreviewFns
): boolean {
  const selection = readRegularDrawerSelection(args.readUi, args.App);
  if (selection.drawerType !== 'regular' && selection.drawerType !== 'shoe') return false;
  const context = resolveFreeBoxHoverContext(args);
  if (!context) return false;

  const target = findSketchFreeHoverTargetBox({
    App: args.App,
    tool: REGULAR_FREE_BOX_TOOL,
    contentKind: 'ext_drawers',
    hostModuleKey: context.host.moduleKey,
    freeBoxes: context.freeBoxes,
    planeHit: context.planeHit,
    wardrobeBox: context.wardrobeBox,
    wardrobeBackZ: context.wardrobeBackZ,
    intersects: [],
    localParent: context.wardrobeGroup,
    resolveSketchFreeBoxGeometry,
    getSketchFreeBoxPartPrefix,
    findSketchFreeBoxLocalHit: __wp_findSketchFreeBoxLocalHit,
    projectPointerToLocalZPlane: planeZ =>
      __wp_intersectScreenWithLocalZPlane({
        App: args.App,
        raycaster: args.raycaster,
        mouse: args.mouse,
        camera: __wp_getViewportRoots(args.App).camera,
        ndcX: args.ndcX,
        ndcY: args.ndcY,
        localParent: context.wardrobeGroup,
        planeZ,
      }),
  });
  if (!target) return false;
  return buildRegularDrawerPreview({
    App: args.App,
    hoverFns,
    context,
    target,
    drawerType: selection.drawerType,
    drawerCount: selection.drawerCount,
  });
}

function readRecentRegularFreeBoxHover(App: AppContainer): RecordMap | null {
  const hover = asRecord(__wp_readSketchHover(App));
  if (!hover) return null;
  const ts = readNumberOrDefault(hover.ts, 0);
  if (!Number.isFinite(ts) || Date.now() - ts > HOVER_MAX_AGE_MS) return null;
  if (hover.kind !== 'box_content') return null;
  if (hover.contentKind !== SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND) return null;
  if (hover.freePlacement !== true) return null;
  return hover;
}

export function tryCommitSketchBoxRegularExternalDrawersHover(App: AppContainer): boolean {
  const hover = readRecentRegularFreeBoxHover(App);
  if (!hover) return false;
  const moduleKey = __wp_toModuleKey(hover.hostModuleKey ?? hover.moduleKey);
  if (moduleKey == null) return false;
  const host = { moduleKey, isBottom: hover.hostIsBottom === true || hover.isBottom === true };
  const addingShoeDrawer = hover.op === 'add' && hover.hasShoeDrawer === true;
  const removingShoeDrawer = hover.op === 'remove' && hover.hasShoeDrawer === false;
  const commit = commitSketchFreePlacementHoverRecord({
    App,
    host,
    hoverRec: hover,
    freeBoxContentKind: SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND,
    floorY: 0,
    contentSource: 'extDrawers.freeBoxRegular',
  });
  if (!commit.committed) return false;
  if (addingShoeDrawer) {
    applyShoeDrawerBaseAutoNoneIfNeeded(App, 'extDrawers.freeBoxRegular.shoe:autoBaseNone');
  } else if (removingShoeDrawer) {
    restoreShoeDrawerBaseIfNoShoeDrawersRemain(App, 'extDrawers.freeBoxRegular.shoe:autoBaseRestore');
  }
  if (commit.nextHover) __wp_writeSketchHover(App, commit.nextHover);
  else __wp_clearSketchHover(App);
  return true;
}

export function toastSketchBoxRegularExternalDrawersNoRoom(App: AppContainer): void {
  __wp_toast(App, 'אין מקום בתא זה למגירות חיצוניות רגילות.', 'error');
}
