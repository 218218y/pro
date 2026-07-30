import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import {
  INTERIOR_ROD_RENDER_POLICY,
  INTERIOR_SHELF_GEOMETRY_POLICY,
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_GRID_POLICY,
  MATERIAL_THICKNESS_POLICY,
  SKETCH_BOX_PREVIEW_CORE_POLICY,
} from '../../shared/dimensions/manual_layout_free_box_plans_dimension_policy.js';
import { computeInteriorPresetOps } from '../features/interior_layout_presets/api.js';
import { asRecord } from '../runtime/record.js';
import {
  type BraceShelvesFreeBoxPlan,
  clampUnit,
  type ManualLayoutFreeBoxShelfGridPlan,
  normalizeGridDivisions,
  normalizeShelfVariant,
  type PresetLayoutFreeBoxPlan,
  readContentItemXNorm,
  readNumber,
  readRecordNumber,
  readRecordValue,
  type RecordMap,
  resolveShelfDepth,
  shelfThicknessForVariant,
} from './canvas_picking_manual_layout_free_box_contracts.js';
import {
  pickSketchBoxSegment,
  pickSketchBoxVerticalSegment,
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from './canvas_picking_sketch_box_dividers.js';
import { createSketchBoxVerticalPreviewState } from './canvas_picking_sketch_box_vertical_content_preview_state.js';
import { buildSketchBoxVerticalContentBlockers } from './canvas_picking_sketch_box_vertical_content_blockers.js';
import { doesSketchBoxVerticalCandidateCollide } from './canvas_picking_sketch_box_vertical_content_occupancy.js';

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
  const woodThick = args.woodThick ?? MATERIAL_THICKNESS_POLICY.wood.thicknessM;
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
    step < INTERIOR_SHELF_GEOMETRY_POLICY.spanMinHeightM ||
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
  const segLeftX = readNumber(activeSegment?.leftX) ?? boxLeftX;
  const segRightX = readNumber(activeSegment?.rightX) ?? args.targetGeo.centerX + args.targetGeo.innerW / 2;
  const previewX = readNumber(activeSegment?.centerX) ?? args.targetGeo.centerX;
  const previewW = readNumber(activeSegment?.width) ?? args.targetGeo.innerW;
  const contentXNorm =
    readNumber(activeSegment?.xNorm) ?? clampUnit((previewX - boxLeftX) / args.targetGeo.innerW);
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
  const segLeftX = readNumber(activeSegment?.leftX) ?? boxLeftX;
  const segRightX = readNumber(activeSegment?.rightX) ?? args.targetGeo.centerX + args.targetGeo.innerW / 2;
  const previewX = readNumber(activeSegment?.centerX) ?? args.targetGeo.centerX;
  const previewW = readNumber(activeSegment?.width) ?? args.targetGeo.innerW;
  const contentXNorm =
    readNumber(activeSegment?.xNorm) ?? clampUnit((previewX - boxLeftX) / args.targetGeo.innerW);

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
  const woodThick = args.woodThick ?? MATERIAL_THICKNESS_POLICY.wood.thicknessM;
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
  const divs = INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault;
  const step = divs > 0 ? state.cellHeight / divs : 0;
  const ops = computeInteriorPresetOps(args.layoutType);
  const shelfH = shelfThicknessForVariant('regular', woodThick);
  const rodH = INTERIOR_ROD_RENDER_POLICY.radiusM * 2;
  const shelfDepthM = resolveShelfDepth({ variant: 'regular', innerD: args.targetGeo.innerD, woodThick });
  const shelfYs: number[] = [];
  const shelfYNorms: number[] = [];
  const rodYs: number[] = [];
  const rodYNorms: number[] = [];
  let blockedReason: string | null = null;

  if (!(state.cellHeight > 0)) blockedReason = 'no-room';

  const rows = Array.isArray(ops.shelves) ? ops.shelves : [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = readNumber(rows[i]);
    if (row == null || row <= 0 || row >= divs) continue;
    const y = state.cellBottomY + row * step;
    shelfYs.push(y);
    shelfYNorms.push(state.boxYNormFromCenter(y));
  }
  if (
    shelfYs.length &&
    (step < INTERIOR_SHELF_GEOMETRY_POLICY.spanMinHeightM || !state.hasVerticalRoomFor(shelfH))
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
            INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM,
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

export function resolveBraceShelvesFreeBoxPlan(args: {
  targetBox: unknown;
  targetGeo: { centerX: number; innerW: number; innerD: number; innerBackZ: number };
  targetCenterY: number;
  targetHeight: number;
  pointerX: number;
  pointerY: number;
  woodThick?: number;
}): BraceShelvesFreeBoxPlan | null {
  const woodThick = args.woodThick ?? MATERIAL_THICKNESS_POLICY.wood.thicknessM;
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
  const tolerance = SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM;
  for (let i = 0; i < shelves.length; i += 1) {
    const shelf = shelves[i];
    const yNorm = readRecordNumber(shelf, 'yNorm');
    if (yNorm == null) continue;
    const xNorm = readContentItemXNorm(shelf);
    if (xNorm == null) continue;
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
      shelfId: formatIdentityValue(readIdentityValue(shelfIdRaw)) || null,
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
