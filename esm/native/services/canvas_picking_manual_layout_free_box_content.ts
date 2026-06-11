import type { AppContainer, UnknownRecord } from '../../../types';
import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { computeInteriorPresetOps } from '../features/interior_layout_presets/api.js';
import { getModulesActions } from '../runtime/actions_access_domains.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { asRecord } from '../runtime/record.js';
import { __wp_raycastReuse, __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import {
  __wp_getViewportRoots,
  __wp_intersectScreenWithLocalZPlane,
  __wp_measureWardrobeLocalBox,
  __wp_parseSketchBoxToolSpec,
  __wp_readInteriorModuleConfigRef,
  __wp_readSketchHover,
  __wp_writeSketchHover,
  __wp_clearSketchHover,
  __wp_findSketchFreeBoxLocalHit,
} from './canvas_picking_local_helpers.js';
import { resolveManualLayoutSketchHoverFreePlaneContext } from './canvas_picking_manual_layout_sketch_hover_free_context.js';
import { matchRecentSketchHover } from './canvas_picking_sketch_hover_matching.js';
import {
  commitSketchFreePlacementHoverRecord,
  type SketchFreePlacementHostLike,
} from './canvas_picking_sketch_free_commit.js';
import {
  ensureSketchModuleBoxes,
  findSketchModuleBoxById,
} from './canvas_picking_sketch_box_content_commit.js';
import {
  createRandomId,
  ensureSketchBoxContentList,
} from './canvas_picking_sketch_box_content_commit_boxes.js';
import { toastSketchBoxContentBlocked } from './canvas_picking_sketch_box_content_blocked.js';
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
import { createSketchBoxVerticalPreviewState } from './canvas_picking_sketch_box_vertical_content_preview_state.js';
import { resolveSketchBoxVerticalContentPreview } from './canvas_picking_sketch_box_vertical_content_preview.js';
import { buildSketchBoxVerticalContentBlockers } from './canvas_picking_sketch_box_vertical_content_blockers.js';
import { doesSketchBoxVerticalCandidateCollide } from './canvas_picking_sketch_box_vertical_content_occupancy.js';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';

type RecordMap = UnknownRecord;
type ManualFreeContentKind = 'shelf_grid' | 'rod' | 'storage';

export type ManualLayoutFreeBoxShelfGridPlan = {
  shelfYs: number[];
  shelfYNorms: number[];
  cellXNormMin: number;
  cellXNormMax: number;
  cellYNormMin: number;
  cellYNormMax: number;
  contentXNorm: number;
  previewX: number;
  previewW: number;
  previewInternalZ: number;
  previewInnerD: number;
  previewWoodThick: number;
  depthM: number;
  blockedReason: string | null;
};

export type PresetLayoutFreeBoxPlan = {
  layoutType: string;
  shelfYs: number[];
  shelfYNorms: number[];
  rodYs: number[];
  rodYNorms: number[];
  storageBarrier: { y: number; h: number; z: number } | null;
  storageYNorm: number | null;
  cellXNormMin: number;
  cellXNormMax: number;
  cellYNormMin: number;
  cellYNormMax: number;
  contentXNorm: number;
  previewX: number;
  previewW: number;
  previewInternalZ: number;
  previewInnerD: number;
  previewWoodThick: number;
  shelfDepthM: number;
  blockedReason: string | null;
};

export type BraceShelvesFreeBoxPlan = {
  shelfId: string | null;
  shelfIdx: number;
  shelfY: number;
  shelfYNorm: number;
  contentXNorm: number;
  previewX: number;
  previewW: number;
  previewInternalZ: number;
  previewInnerD: number;
  previewWoodThick: number;
  currentVariant: 'regular' | 'double' | 'glass' | 'brace';
  nextVariant: 'regular' | 'brace';
  nextDepthM: number;
};

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

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}

function readRecordNumberArray(record: unknown, key: string): number[] {
  const value = readRecordValue(record, key);
  return Array.isArray(value) ? value.map(readNumber).filter((n): n is number => n != null) : [];
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeGridDivisions(value: unknown): number {
  const parsed = readNumber(value);
  return parsed != null && parsed >= 2 && parsed <= 8
    ? Math.round(parsed)
    : INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault;
}

function normalizeShelfVariant(value: unknown): 'regular' | 'double' | 'glass' | 'brace' {
  return value === 'double' || value === 'glass' || value === 'brace' ? value : 'regular';
}

function shelfThicknessForVariant(variant: unknown, woodThick: number): number {
  const normalized = normalizeShelfVariant(variant);
  if (normalized === 'glass') return MATERIAL_DIMENSIONS.glassShelf.thicknessM;
  if (normalized === 'double') {
    return Math.max(woodThick, woodThick * INTERIOR_FITTINGS_DIMENSIONS.shelves.doubleThicknessMultiplier);
  }
  return woodThick;
}

function resolveShelfDepth(args: { variant: string; innerD: number; woodThick: number }): number {
  if (args.variant === 'brace') return args.innerD;
  return Math.min(args.innerD, Math.max(args.woodThick, INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM));
}

function normalizeBetween(value: unknown, min: number, max: number, defaultValue: number): number {
  const parsed = readNumber(value);
  if (parsed == null) return defaultValue;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.max(lo, Math.min(hi, parsed));
}

function resolveManualToolContentKind(tool: string): ManualFreeContentKind | null {
  if (tool === 'shelf') return 'shelf_grid';
  if (tool === 'rod') return 'rod';
  if (tool === 'storage') return 'storage';
  return null;
}

type ManualFreeVerticalRemovalContentKind = 'shelf' | 'rod' | 'storage';

const MANUAL_FREE_VERTICAL_REMOVAL_BY_TOOL: Record<string, readonly ManualFreeVerticalRemovalContentKind[]> =
  {
    shelf: ['rod', 'storage'],
    rod: ['shelf', 'storage'],
    storage: ['storage'],
  };

function findRecentManualFreeVerticalRemovalHover(args: {
  hover: unknown;
  tool: string;
  host: SketchFreePlacementHostLike;
}): { hoverRec: RecordMap; contentKind: ManualFreeVerticalRemovalContentKind } | null {
  const removalKinds = MANUAL_FREE_VERTICAL_REMOVAL_BY_TOOL[args.tool] || [];
  for (const contentKind of removalKinds) {
    const hoverRec = matchRecentSketchHover({
      hover: args.hover,
      tool: args.tool,
      kind: 'box_content',
      contentKind,
      host: args.host,
      toModuleKey: __wp_toModuleKey,
      requireFreePlacement: true,
    });
    if (hoverRec && readRecordValue(hoverRec, 'op') === 'remove') return { hoverRec, contentKind };
  }
  return null;
}

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

export function resolveManualLayoutFreeBoxShelfGridPlan(args: {
  targetBox: unknown;
  targetGeo: { centerX: number; innerW: number; innerD: number; innerBackZ: number };
  targetCenterY: number;
  targetHeight: number;
  pointerX: number;
  pointerY: number;
  currentGridDivisions: number;
  shelfVariant: string;
  woodThick?: number;
}): ManualLayoutFreeBoxShelfGridPlan {
  const woodThick = args.woodThick ?? MATERIAL_DIMENSIONS.wood.thicknessM;
  const state = createSketchBoxVerticalPreviewState({
    host: { tool: 'shelf', moduleKey: null, isBottom: false },
    contentKind: 'shelf',
    boxId: '',
    freePlacement: true,
    targetBox: args.targetBox,
    targetGeo: args.targetGeo,
    targetCenterY: args.targetCenterY,
    targetHeight: args.targetHeight,
    pointerX: args.pointerX,
    pointerY: args.pointerY,
    woodThick,
    shelfVariant: args.shelfVariant,
    shelfDepthOverrideM: null,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  const divs = normalizeGridDivisions(args.currentGridDivisions);
  const requestedCount = Math.max(0, divs - 1);
  const step = state.cellHeight / divs;
  const variant = normalizeShelfVariant(args.shelfVariant);
  const shelfH = shelfThicknessForVariant(variant, woodThick);
  let blockedReason =
    requestedCount <= 0 ||
    !(state.cellHeight > 0) ||
    step < INTERIOR_FITTINGS_DIMENSIONS.shelves.spanMinHeightM ||
    !state.hasVerticalRoomFor(shelfH)
      ? 'no-room'
      : null;

  const shelfYs: number[] = [];
  const shelfYNorms: number[] = [];
  for (let shelfIndex = 1; shelfIndex <= requestedCount; shelfIndex += 1) {
    const y = state.cellBottomY + shelfIndex * step;
    shelfYs.push(y);
    shelfYNorms.push(state.boxYNormFromCenter(y));
  }

  const activeSegment = state.activeSegment;
  const boxLeftX = args.targetGeo.centerX - args.targetGeo.innerW / 2;
  const segLeftX = readNumber((activeSegment as Record<string, unknown> | null)?.leftX) ?? boxLeftX;
  const segRightX =
    readNumber((activeSegment as Record<string, unknown> | null)?.rightX) ??
    args.targetGeo.centerX + args.targetGeo.innerW / 2;
  const previewX =
    readNumber((activeSegment as Record<string, unknown> | null)?.centerX) ?? args.targetGeo.centerX;
  const previewW =
    readNumber((activeSegment as Record<string, unknown> | null)?.width) ?? args.targetGeo.innerW;
  const contentXNorm =
    readNumber((activeSegment as Record<string, unknown> | null)?.xNorm) ??
    clampUnit((previewX - boxLeftX) / args.targetGeo.innerW);
  const depthM = resolveShelfDepth({ variant, innerD: args.targetGeo.innerD, woodThick });
  if (!blockedReason && shelfYs.length) {
    const blockers = buildSketchBoxVerticalContentBlockers({
      targetBox: args.targetBox,
      targetGeo: args.targetGeo,
      targetCenterY: args.targetCenterY,
      targetHeight: args.targetHeight,
      woodThick,
      boxSegments: state.boxSegments,
      activeSegment: state.activeSegment,
      verticalSegments: state.verticalSegments,
      activeVerticalSegment: state.activeVerticalSegment,
      pickSketchBoxSegment,
      pickSketchBoxVerticalSegment,
    });
    const collidesWithVerticalContent = shelfYs.some(centerY =>
      doesSketchBoxVerticalCandidateCollide({
        blockers,
        centerY,
        heightM: shelfH,
        blockerKinds: ['rod', 'storage'],
      })
    );
    if (collidesWithVerticalContent) blockedReason = 'collision';
  }

  return {
    shelfYs,
    shelfYNorms,
    cellXNormMin: clampUnit((segLeftX - boxLeftX) / args.targetGeo.innerW),
    cellXNormMax: clampUnit((segRightX - boxLeftX) / args.targetGeo.innerW),
    cellYNormMin: state.boxYNormFromCenter(state.cellBottomY),
    cellYNormMax: state.boxYNormFromCenter(state.cellTopY),
    contentXNorm,
    previewX,
    previewW,
    previewInternalZ: args.targetGeo.innerBackZ + args.targetGeo.innerD / 2,
    previewInnerD: args.targetGeo.innerD,
    previewWoodThick: woodThick,
    depthM,
    blockedReason,
  };
}

function resolveFreeBoxCellMetrics(args: {
  targetBox: unknown;
  targetGeo: { centerX: number; innerW: number; innerD: number; innerBackZ: number };
  targetCenterY: number;
  targetHeight: number;
  pointerX: number;
  pointerY: number;
  woodThick: number;
  shelfVariant?: string;
}) {
  const state = createSketchBoxVerticalPreviewState({
    host: { tool: 'shelf', moduleKey: null, isBottom: false },
    contentKind: 'shelf',
    boxId: '',
    freePlacement: true,
    targetBox: args.targetBox,
    targetGeo: args.targetGeo,
    targetCenterY: args.targetCenterY,
    targetHeight: args.targetHeight,
    pointerX: args.pointerX,
    pointerY: args.pointerY,
    woodThick: args.woodThick,
    shelfVariant: args.shelfVariant || 'regular',
    shelfDepthOverrideM: null,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  const activeSegment = state.activeSegment;
  const boxLeftX = args.targetGeo.centerX - args.targetGeo.innerW / 2;
  const segLeftX = readNumber((activeSegment as Record<string, unknown> | null)?.leftX) ?? boxLeftX;
  const segRightX =
    readNumber((activeSegment as Record<string, unknown> | null)?.rightX) ??
    args.targetGeo.centerX + args.targetGeo.innerW / 2;
  const previewX =
    readNumber((activeSegment as Record<string, unknown> | null)?.centerX) ?? args.targetGeo.centerX;
  const previewW =
    readNumber((activeSegment as Record<string, unknown> | null)?.width) ?? args.targetGeo.innerW;
  const contentXNorm =
    readNumber((activeSegment as Record<string, unknown> | null)?.xNorm) ??
    clampUnit((previewX - boxLeftX) / args.targetGeo.innerW);

  return {
    state,
    cellXNormMin: clampUnit((segLeftX - boxLeftX) / args.targetGeo.innerW),
    cellXNormMax: clampUnit((segRightX - boxLeftX) / args.targetGeo.innerW),
    cellYNormMin: state.boxYNormFromCenter(state.cellBottomY),
    cellYNormMax: state.boxYNormFromCenter(state.cellTopY),
    contentXNorm,
    previewX,
    previewW,
  };
}

export function resolvePresetLayoutFreeBoxPlan(args: {
  targetBox: unknown;
  targetGeo: { centerX: number; innerW: number; innerD: number; innerBackZ: number };
  targetCenterY: number;
  targetHeight: number;
  pointerX: number;
  pointerY: number;
  layoutType: string;
  woodThick?: number;
}): PresetLayoutFreeBoxPlan {
  const woodThick = args.woodThick ?? MATERIAL_DIMENSIONS.wood.thicknessM;
  const metrics = resolveFreeBoxCellMetrics({
    targetBox: args.targetBox,
    targetGeo: args.targetGeo,
    targetCenterY: args.targetCenterY,
    targetHeight: args.targetHeight,
    pointerX: args.pointerX,
    pointerY: args.pointerY,
    woodThick,
    shelfVariant: 'regular',
  });
  const state = metrics.state;
  const divs = INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault;
  const step = divs > 0 ? state.cellHeight / divs : 0;
  const ops = computeInteriorPresetOps(args.layoutType);
  const shelfH = shelfThicknessForVariant('regular', woodThick);
  const rodH = INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM * 2;
  const shelfDepthM = resolveShelfDepth({ variant: 'regular', innerD: args.targetGeo.innerD, woodThick });
  const shelfYs: number[] = [];
  const shelfYNorms: number[] = [];
  const rodYs: number[] = [];
  const rodYNorms: number[] = [];
  let blockedReason: string | null = null;

  if (!(state.cellHeight > 0)) blockedReason = 'no-room';

  const rows = Array.isArray(ops.shelves) ? ops.shelves : [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = Number(rows[i]);
    if (!Number.isFinite(row) || row <= 0 || row >= divs) continue;
    const y = state.cellBottomY + row * step;
    shelfYs.push(y);
    shelfYNorms.push(state.boxYNormFromCenter(y));
  }
  if (
    shelfYs.length &&
    (step < INTERIOR_FITTINGS_DIMENSIONS.shelves.spanMinHeightM || !state.hasVerticalRoomFor(shelfH))
  ) {
    blockedReason = 'no-room';
  }

  const rods = Array.isArray(ops.rods) ? ops.rods : [];
  for (let i = 0; i < rods.length; i += 1) {
    const rod = asRecord(rods[i]);
    const yFactor = readNumber(rod?.yFactor);
    if (yFactor == null) continue;
    const yAdd = readNumber(rod?.yAdd) ?? 0;
    const y = state.cellBottomY + yFactor * step + yAdd;
    rodYs.push(y);
    rodYNorms.push(state.boxYNormFromCenter(y));
  }
  if (rodYs.length && !state.hasVerticalRoomFor(rodH)) blockedReason = 'no-room';

  const barrierH = readNumber(asRecord(ops.storageBarrier)?.barrierH) ?? 0;
  const storageBarrier =
    barrierH > 0
      ? {
          y: state.cellBottomY + barrierH / 2,
          h: barrierH,
          z:
            args.targetGeo.innerBackZ +
            args.targetGeo.innerD +
            INTERIOR_FITTINGS_DIMENSIONS.storage.barrierFrontZOffsetM,
        }
      : null;
  const storageYNorm = storageBarrier ? state.boxYNormFromCenter(storageBarrier.y) : null;
  if (storageBarrier && !state.hasVerticalRoomFor(storageBarrier.h)) blockedReason = 'no-room';

  const allYs = [...shelfYs, ...rodYs, ...(storageBarrier ? [storageBarrier.y] : [])];
  if (
    allYs.some(
      y => !Number.isFinite(y) || y < state.cellBottomY - woodThick || y > state.cellTopY + woodThick
    )
  ) {
    blockedReason = 'no-room';
  }

  return {
    layoutType: args.layoutType || 'shelves',
    shelfYs,
    shelfYNorms,
    rodYs,
    rodYNorms,
    storageBarrier,
    storageYNorm,
    cellXNormMin: metrics.cellXNormMin,
    cellXNormMax: metrics.cellXNormMax,
    cellYNormMin: metrics.cellYNormMin,
    cellYNormMax: metrics.cellYNormMax,
    contentXNorm: metrics.contentXNorm,
    previewX: metrics.previewX,
    previewW: metrics.previewW,
    previewInternalZ: args.targetGeo.innerBackZ + args.targetGeo.innerD / 2,
    previewInnerD: args.targetGeo.innerD,
    previewWoodThick: woodThick,
    shelfDepthM,
    blockedReason,
  };
}

function readContentItemXNorm(item: unknown): number {
  return clampUnit(readRecordNumber(item, 'xNorm') ?? 0.5);
}

export function resolveBraceShelvesFreeBoxPlan(args: {
  targetBox: unknown;
  targetGeo: { centerX: number; innerW: number; innerD: number; innerBackZ: number };
  targetCenterY: number;
  targetHeight: number;
  pointerX: number;
  pointerY: number;
  woodThick?: number;
}): BraceShelvesFreeBoxPlan | null {
  const woodThick = args.woodThick ?? MATERIAL_DIMENSIONS.wood.thicknessM;
  const metrics = resolveFreeBoxCellMetrics({
    targetBox: args.targetBox,
    targetGeo: args.targetGeo,
    targetCenterY: args.targetCenterY,
    targetHeight: args.targetHeight,
    pointerX: args.pointerX,
    pointerY: args.pointerY,
    woodThick,
    shelfVariant: 'regular',
  });
  const state = metrics.state;
  const shelves = Array.isArray(readRecordValue(args.targetBox, 'shelves'))
    ? (readRecordValue(args.targetBox, 'shelves') as RecordMap[])
    : [];
  let best: BraceShelvesFreeBoxPlan | null = null;
  let bestDy = Infinity;
  const tolerance = SKETCH_BOX_DIMENSIONS.preview.removeEpsShelfM;
  for (let i = 0; i < shelves.length; i += 1) {
    const shelf = shelves[i];
    const yNorm = readRecordNumber(shelf, 'yNorm');
    if (yNorm == null) continue;
    const xNorm = readContentItemXNorm(shelf);
    if (xNorm < metrics.cellXNormMin - 1e-6 || xNorm > metrics.cellXNormMax + 1e-6) continue;
    if (yNorm < metrics.cellYNormMin - 1e-6 || yNorm > metrics.cellYNormMax + 1e-6) continue;
    const currentVariant = normalizeShelfVariant(readRecordValue(shelf, 'variant'));
    const shelfH = shelfThicknessForVariant(currentVariant, woodThick);
    const shelfY = state.clampBoxCenterY(
      args.targetCenterY - args.targetHeight / 2 + clampUnit(yNorm) * args.targetHeight,
      shelfH / 2
    );
    const dy = Math.abs(shelfY - args.pointerY);
    if (dy > tolerance || dy >= bestDy) continue;
    const nextVariant = currentVariant === 'brace' ? 'regular' : 'brace';
    const nextDepthM = resolveShelfDepth({ variant: nextVariant, innerD: args.targetGeo.innerD, woodThick });
    const shelfIdRaw = readRecordValue(shelf, 'id');
    bestDy = dy;
    best = {
      shelfId: shelfIdRaw != null ? String(shelfIdRaw) : null,
      shelfIdx: i,
      shelfY,
      shelfYNorm: clampUnit(yNorm),
      contentXNorm: xNorm,
      previewX: metrics.previewX,
      previewW: metrics.previewW,
      previewInternalZ: args.targetGeo.innerBackZ + args.targetGeo.innerD / 2,
      previewInnerD: args.targetGeo.innerD,
      previewWoodThick: woodThick,
      currentVariant,
      nextVariant,
      nextDepthM,
    };
  }
  return best;
}

function createShelfGridHoverRecord(args: {
  host: SketchFreePlacementHostLike;
  boxId: string;
  plan: ManualLayoutFreeBoxShelfGridPlan;
  shelfVariant: string;
}): RecordMap {
  return {
    ts: Date.now(),
    tool: 'shelf',
    moduleKey: args.host.moduleKey,
    isBottom: args.host.isBottom,
    hostModuleKey: args.host.moduleKey,
    hostIsBottom: args.host.isBottom,
    kind: 'box_content_grid',
    contentKind: 'shelf_grid',
    op: 'add',
    freePlacement: true,
    boxId: args.boxId,
    shelfYNorms: args.plan.shelfYNorms,
    cellXNormMin: args.plan.cellXNormMin,
    cellXNormMax: args.plan.cellXNormMax,
    cellYNormMin: args.plan.cellYNormMin,
    cellYNormMax: args.plan.cellYNormMax,
    contentXNorm: args.plan.contentXNorm,
    variant: normalizeShelfVariant(args.shelfVariant),
    depthM: args.plan.depthM,
    __wpBlockedReason: args.plan.blockedReason ?? undefined,
  };
}

function createPresetLayoutHoverRecord(args: {
  host: SketchFreePlacementHostLike;
  boxId: string;
  plan: PresetLayoutFreeBoxPlan;
}): RecordMap {
  return {
    ts: Date.now(),
    tool: 'layout_preset',
    moduleKey: args.host.moduleKey,
    isBottom: args.host.isBottom,
    hostModuleKey: args.host.moduleKey,
    hostIsBottom: args.host.isBottom,
    kind: 'box_content_preset',
    contentKind: 'layout_preset',
    op: 'add',
    freePlacement: true,
    boxId: args.boxId,
    layoutType: args.plan.layoutType,
    shelfYNorms: args.plan.shelfYNorms,
    rodYNorms: args.plan.rodYNorms,
    storageYNorm: args.plan.storageYNorm ?? undefined,
    storageHeightM: args.plan.storageBarrier?.h ?? undefined,
    cellXNormMin: args.plan.cellXNormMin,
    cellXNormMax: args.plan.cellXNormMax,
    cellYNormMin: args.plan.cellYNormMin,
    cellYNormMax: args.plan.cellYNormMax,
    contentXNorm: args.plan.contentXNorm,
    variant: 'regular',
    depthM: args.plan.shelfDepthM,
    __wpBlockedReason: args.plan.blockedReason ?? undefined,
  };
}

function createBraceShelvesHoverRecord(args: {
  host: SketchFreePlacementHostLike;
  boxId: string;
  plan: BraceShelvesFreeBoxPlan;
}): RecordMap {
  return {
    ts: Date.now(),
    tool: 'brace_shelves',
    moduleKey: args.host.moduleKey,
    isBottom: args.host.isBottom,
    hostModuleKey: args.host.moduleKey,
    hostIsBottom: args.host.isBottom,
    kind: 'box_content_brace_shelf',
    contentKind: 'brace_shelf',
    op: 'add',
    freePlacement: true,
    boxId: args.boxId,
    shelfId: args.plan.shelfId ?? undefined,
    shelfIdx: args.plan.shelfIdx,
    boxYNorm: args.plan.shelfYNorm,
    contentXNorm: args.plan.contentXNorm,
    variant: args.plan.nextVariant,
    depthM: args.plan.nextDepthM,
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
      SKETCH_BOX_DIMENSIONS.preview.shelfMinWidthM,
      args.plan.previewW -
        (isBrace
          ? SKETCH_BOX_DIMENSIONS.preview.shelfBraceClearanceM
          : SKETCH_BOX_DIMENSIONS.preview.shelfRegularClearanceM)
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
      woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
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
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
    storageHeight: contentKind === 'storage' ? INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM : null,
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

function removeShelvesInGridCell(args: {
  list: RecordMap[];
  cellXNormMin: number;
  cellXNormMax: number;
  cellYNormMin: number;
  cellYNormMax: number;
}): void {
  removeItemsInGridCell(args);
}

function removeItemsInGridCell(args: {
  list: RecordMap[];
  cellXNormMin: number;
  cellXNormMax: number;
  cellYNormMin: number;
  cellYNormMax: number;
}): void {
  const eps = 1e-6;
  for (let i = args.list.length - 1; i >= 0; i -= 1) {
    const item = args.list[i];
    const xNorm = readRecordNumber(item, 'xNorm') ?? 0.5;
    const yNorm = readRecordNumber(item, 'yNorm');
    if (yNorm == null) continue;
    if (
      xNorm >= args.cellXNormMin - eps &&
      xNorm <= args.cellXNormMax + eps &&
      yNorm >= args.cellYNormMin - eps &&
      yNorm <= args.cellYNormMax + eps
    ) {
      args.list.splice(i, 1);
    }
  }
}

function updateFreeBoxShelfVariant(args: { box: RecordMap; hoverRec: RecordMap }): boolean {
  const shelves = ensureSketchBoxContentList(args.box, 'shelves') as RecordMap[];
  const shelfId = readString(readRecordValue(args.hoverRec, 'shelfId'));
  const shelfIdx = readRecordNumber(args.hoverRec, 'shelfIdx');
  let index = -1;
  if (shelfId) index = shelves.findIndex(item => String(readRecordValue(item, 'id') ?? '') === shelfId);
  if (index < 0 && shelfIdx != null && shelfIdx >= 0 && shelfIdx < shelves.length)
    index = Math.floor(shelfIdx);
  if (index < 0) return false;
  const item = shelves[index];
  if (!item) return false;
  const variant = normalizeShelfVariant(readRecordValue(args.hoverRec, 'variant'));
  const depthM = readRecordNumber(args.hoverRec, 'depthM');
  item.variant = variant;
  if (depthM != null && depthM > 0) item.depthM = depthM;
  return true;
}

function commitShelfGridHover(args: {
  App: AppContainer;
  host: SketchFreePlacementHostLike;
  hoverRec: RecordMap;
}): boolean {
  const mods = getModulesActions(args.App);
  if (!mods || typeof mods.patchForStack !== 'function') return false;

  const blockedReason = readString(readRecordValue(args.hoverRec, '__wpBlockedReason'));
  if (blockedReason) {
    toastSketchBoxContentBlocked(args.App, 'shelf', blockedReason);
    __wp_clearSketchHover(args.App);
    return true;
  }

  const boxId = readString(readRecordValue(args.hoverRec, 'boxId'));
  if (!boxId) {
    __wp_clearSketchHover(args.App);
    return true;
  }

  const shelfYNorms = readRecordNumberArray(args.hoverRec, 'shelfYNorms').map(clampUnit);
  const variant = normalizeShelfVariant(readRecordValue(args.hoverRec, 'variant'));
  const depthM = readRecordNumber(args.hoverRec, 'depthM');
  const contentXNorm = clampUnit(readRecordNumber(args.hoverRec, 'contentXNorm') ?? 0.5);
  const cellXNormMin = normalizeBetween(readRecordValue(args.hoverRec, 'cellXNormMin'), 0, 1, 0);
  const cellXNormMax = normalizeBetween(readRecordValue(args.hoverRec, 'cellXNormMax'), 0, 1, 1);
  const cellYNormMin = normalizeBetween(readRecordValue(args.hoverRec, 'cellYNormMin'), 0, 1, 0);
  const cellYNormMax = normalizeBetween(readRecordValue(args.hoverRec, 'cellYNormMax'), 0, 1, 1);

  mods.patchForStack(
    args.host.isBottom ? 'bottom' : 'top',
    args.host.moduleKey,
    (cfg: RecordMap) => {
      const box = findSketchModuleBoxById(ensureSketchModuleBoxes(cfg), boxId, { freePlacement: true });
      if (!box) return;
      const shelves = ensureSketchBoxContentList(box, 'shelves') as RecordMap[];
      removeShelvesInGridCell({
        list: shelves,
        cellXNormMin,
        cellXNormMax,
        cellYNormMin,
        cellYNormMax,
      });
      for (const yNorm of shelfYNorms) {
        shelves.push({
          id: createRandomId('sbc'),
          yNorm,
          xNorm: contentXNorm,
          variant,
          ...(depthM != null && depthM > 0 ? { depthM } : {}),
        });
      }
    },
    { source: 'manualLayout.freeBoxShelfGrid', immediate: true }
  );
  __wp_clearSketchHover(args.App);
  return true;
}

function commitPresetLayoutHover(args: {
  App: AppContainer;
  host: SketchFreePlacementHostLike;
  hoverRec: RecordMap;
}): boolean {
  const mods = getModulesActions(args.App);
  if (!mods || typeof mods.patchForStack !== 'function') return false;

  const blockedReason = readString(readRecordValue(args.hoverRec, '__wpBlockedReason'));
  if (blockedReason) {
    toastSketchBoxContentBlocked(args.App, 'shelf', blockedReason);
    __wp_clearSketchHover(args.App);
    return true;
  }

  const boxId = readString(readRecordValue(args.hoverRec, 'boxId'));
  if (!boxId) {
    __wp_clearSketchHover(args.App);
    return true;
  }

  const shelfYNorms = readRecordNumberArray(args.hoverRec, 'shelfYNorms').map(clampUnit);
  const rodYNorms = readRecordNumberArray(args.hoverRec, 'rodYNorms').map(clampUnit);
  const storageYNorm = readRecordNumber(args.hoverRec, 'storageYNorm');
  const storageHeightM = readRecordNumber(args.hoverRec, 'storageHeightM');
  const variant = normalizeShelfVariant(readRecordValue(args.hoverRec, 'variant'));
  const depthM = readRecordNumber(args.hoverRec, 'depthM');
  const contentXNorm = clampUnit(readRecordNumber(args.hoverRec, 'contentXNorm') ?? 0.5);
  const cellXNormMin = normalizeBetween(readRecordValue(args.hoverRec, 'cellXNormMin'), 0, 1, 0);
  const cellXNormMax = normalizeBetween(readRecordValue(args.hoverRec, 'cellXNormMax'), 0, 1, 1);
  const cellYNormMin = normalizeBetween(readRecordValue(args.hoverRec, 'cellYNormMin'), 0, 1, 0);
  const cellYNormMax = normalizeBetween(readRecordValue(args.hoverRec, 'cellYNormMax'), 0, 1, 1);

  mods.patchForStack(
    args.host.isBottom ? 'bottom' : 'top',
    args.host.moduleKey,
    (cfg: RecordMap) => {
      const box = findSketchModuleBoxById(ensureSketchModuleBoxes(cfg), boxId, { freePlacement: true });
      if (!box) return;
      const shelves = ensureSketchBoxContentList(box, 'shelves') as RecordMap[];
      const rods = ensureSketchBoxContentList(box, 'rods') as RecordMap[];
      const storageBarriers = ensureSketchBoxContentList(box, 'storageBarriers') as RecordMap[];
      const clearArgs = { cellXNormMin, cellXNormMax, cellYNormMin, cellYNormMax };
      removeItemsInGridCell({ list: shelves, ...clearArgs });
      removeItemsInGridCell({ list: rods, ...clearArgs });
      removeItemsInGridCell({ list: storageBarriers, ...clearArgs });

      for (const yNorm of shelfYNorms) {
        shelves.push({
          id: createRandomId('sbc'),
          yNorm,
          xNorm: contentXNorm,
          variant,
          ...(depthM != null && depthM > 0 ? { depthM } : {}),
        });
      }
      for (const yNorm of rodYNorms) {
        rods.push({ id: createRandomId('sbc'), yNorm, xNorm: contentXNorm });
      }
      if (storageYNorm != null) {
        storageBarriers.push({
          id: createRandomId('sbc'),
          yNorm: clampUnit(storageYNorm),
          xNorm: contentXNorm,
          heightM:
            storageHeightM != null && storageHeightM > 0
              ? storageHeightM
              : INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM,
        });
      }
    },
    { source: 'layoutPreset.freeBox', immediate: true }
  );
  __wp_clearSketchHover(args.App);
  return true;
}

function commitBraceShelvesHover(args: {
  App: AppContainer;
  host: SketchFreePlacementHostLike;
  hoverRec: RecordMap;
}): boolean {
  const mods = getModulesActions(args.App);
  if (!mods || typeof mods.patchForStack !== 'function') return false;

  const boxId = readString(readRecordValue(args.hoverRec, 'boxId'));
  if (!boxId) {
    __wp_clearSketchHover(args.App);
    return true;
  }

  let updated = false;
  mods.patchForStack(
    args.host.isBottom ? 'bottom' : 'top',
    args.host.moduleKey,
    (cfg: RecordMap) => {
      const box = findSketchModuleBoxById(ensureSketchModuleBoxes(cfg), boxId, { freePlacement: true });
      if (!box) return;
      updated = updateFreeBoxShelfVariant({ box, hoverRec: args.hoverRec });
    },
    { source: 'braceShelves.freeBoxToggle', immediate: true }
  );
  __wp_clearSketchHover(args.App);
  return updated;
}

export function tryCommitPresetLayoutFreeBoxFromHover(App: AppContainer): boolean {
  const host = pickSketchFreeBoxHost(App);
  if (!host) return false;
  const hoverRec = matchRecentSketchHover({
    hover: __wp_readSketchHover(App),
    tool: 'layout_preset',
    kind: 'box_content_preset',
    contentKind: 'layout_preset',
    host,
    toModuleKey: __wp_toModuleKey,
    requireFreePlacement: true,
  });
  return hoverRec ? commitPresetLayoutHover({ App, host, hoverRec }) : false;
}

export function tryCommitBraceShelvesFreeBoxFromHover(App: AppContainer): boolean {
  const host = pickSketchFreeBoxHost(App);
  if (!host) return false;
  const hoverRec = matchRecentSketchHover({
    hover: __wp_readSketchHover(App),
    tool: 'brace_shelves',
    kind: 'box_content_brace_shelf',
    contentKind: 'brace_shelf',
    host,
    toModuleKey: __wp_toModuleKey,
    requireFreePlacement: true,
  });
  return hoverRec ? commitBraceShelvesHover({ App, host, hoverRec }) : false;
}

export function tryCommitManualLayoutFreeBoxFromHover(
  App: AppContainer,
  manualTool: unknown,
  floorY?: number
): boolean {
  const tool = typeof manualTool === 'string' ? manualTool : '';
  const contentKind = resolveManualToolContentKind(tool);
  if (!contentKind) return false;

  const host = pickSketchFreeBoxHost(App);
  if (!host) return false;

  const verticalRemoval = findRecentManualFreeVerticalRemovalHover({
    hover: __wp_readSketchHover(App),
    tool,
    host,
  });
  if (verticalRemoval) {
    const commit = commitSketchFreePlacementHoverRecord({
      App,
      host,
      hoverRec: verticalRemoval.hoverRec,
      freeBoxContentKind: verticalRemoval.contentKind,
      floorY,
    });
    if (!commit.committed) return false;
    if (commit.nextHover) __wp_writeSketchHover(App, commit.nextHover);
    else __wp_clearSketchHover(App);
    return true;
  }

  if (contentKind === 'shelf_grid') {
    const hoverRec = matchRecentSketchHover({
      hover: __wp_readSketchHover(App),
      tool,
      kind: 'box_content_grid',
      contentKind: 'shelf_grid',
      host,
      toModuleKey: __wp_toModuleKey,
      requireFreePlacement: true,
    });
    return hoverRec ? commitShelfGridHover({ App, host, hoverRec }) : false;
  }

  const hoverRec = matchRecentSketchHover({
    hover: __wp_readSketchHover(App),
    tool,
    kind: 'box_content',
    contentKind,
    host,
    toModuleKey: __wp_toModuleKey,
    requireFreePlacement: true,
  });
  if (!hoverRec) return false;
  const commit = commitSketchFreePlacementHoverRecord({
    App,
    host,
    hoverRec,
    freeBoxContentKind: contentKind,
    floorY,
  });
  if (!commit.committed) return false;
  if (commit.nextHover) __wp_writeSketchHover(App, commit.nextHover);
  else __wp_clearSketchHover(App);
  return true;
}
