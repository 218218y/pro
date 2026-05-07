import {
  cmToM,
  INTERIOR_FITTINGS_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { asRecord } from '../runtime/record.js';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import {
  readSelectorEnvelopeFromObject,
  resolveSelectorInternalMetrics,
} from './canvas_picking_selector_internal_metrics.js';
import type {
  ManualLayoutSketchHoverModuleContext,
  ManualLayoutSketchHoverModuleFlowArgs,
} from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import { SKETCH_BOX_TOOL_PREFIX as __SKETCH_BOX_TOOL_PREFIX } from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import { readNum, readRecordValue } from './canvas_picking_manual_layout_sketch_hover_module_shared.js';

type ManualLayoutSketchHoverModuleBaseContext = Pick<
  ManualLayoutSketchHoverModuleContext,
  | 'hitLocalX'
  | 'isBottom'
  | 'info'
  | 'bottomY'
  | 'topY'
  | 'woodThick'
  | 'innerW'
  | 'internalCenterX'
  | 'internalDepth'
  | 'internalZ'
  | 'spanH'
  | 'pad'
  | 'yClamped'
  | 'isBox'
  | 'isStorage'
  | 'isShelf'
  | 'isRod'
  | 'isDrawers'
  | 'isExtDrawers'
  | 'variant'
  | 'shelfDepthM'
  | 'shelfDepthOverrideM'
  | 'boxSpec'
  | 'boxH'
  | 'boxWidthOverrideM'
  | 'boxDepthOverrideM'
  | 'storageH'
>;

export function resolveManualLayoutSketchHoverModuleBaseContext(
  args: ManualLayoutSketchHoverModuleFlowArgs
): ManualLayoutSketchHoverModuleBaseContext | null {
  const {
    App,
    tool,
    freeBoxSpec,
    hitModuleKey,
    hitSelectorObj,
    hitStack,
    hitY,
    hitLocalX: initialHitLocalX,
    __hideSketchPreviewAndClearHover,
  } = args;
  const hitLocalX = initialHitLocalX;

  const isBottom = hitStack === 'bottom';
  const grid = getInternalGridMap(App, isBottom);
  const infoKey = typeof hitModuleKey === 'number' ? String(hitModuleKey) : String(hitModuleKey);
  const info = readRecordValue(grid, infoKey);
  if (!info || typeof info !== 'object') {
    __hideSketchPreviewAndClearHover();
    return null;
  }

  const bottomY = readNum(info, 'effectiveBottomY');
  const topY = readNum(info, 'effectiveTopY');
  if (typeof bottomY !== 'number' || typeof topY !== 'number' || !(topY > bottomY)) {
    __hideSketchPreviewAndClearHover();
    return null;
  }

  const selectorEnvelope = hitSelectorObj ? readSelectorEnvelopeFromObject(hitSelectorObj) : null;
  const selectorMetrics = resolveSelectorInternalMetrics({
    info,
    selectorEnvelope,
  });

  const woodThick = selectorMetrics.woodThick;
  const innerW = selectorMetrics.innerW;
  const internalCenterX = selectorMetrics.internalCenterX;
  const internalDepth = selectorMetrics.internalDepth;
  const internalZ = selectorMetrics.internalZ;

  const spanH = topY - bottomY;
  const storageDims = INTERIOR_FITTINGS_DIMENSIONS.storage;
  const boxGeometryDims = SKETCH_BOX_DIMENSIONS.geometry;
  const pad = Math.min(
    storageDims.clampPadMaxM,
    Math.max(storageDims.clampPadMinM, woodThick * storageDims.clampPadWoodRatio)
  );
  let yClamped = Math.max(bottomY + pad, Math.min(topY - pad, hitY));

  const isBox = tool.startsWith(__SKETCH_BOX_TOOL_PREFIX);
  const isStorage = tool.startsWith('sketch_storage:');
  const isShelf = tool.startsWith('sketch_shelf:');
  const isRod = tool === 'sketch_rod';
  const isDrawers = isSketchInternalDrawersTool(tool);
  const isExtDrawers = tool.startsWith('sketch_ext_drawers:');
  let variant = '';
  let shelfDepthM: number | null = null;
  if (isShelf) {
    const raw = tool.slice('sketch_shelf:'.length).trim();
    const at = raw.indexOf('@');
    const v0 = at >= 0 ? raw.slice(0, at) : raw;
    variant = v0.trim();
    if (at >= 0) {
      const n = Number(raw.slice(at + 1).trim());
      if (Number.isFinite(n) && n > 0) shelfDepthM = cmToM(n);
    }
  }

  const shelfDepthOverrideM = shelfDepthM;
  const boxSpec = isBox ? freeBoxSpec : null;

  let boxH: number = boxGeometryDims.defaultOuterHeightM;
  let boxWidthOverrideM: number | null = null;
  let boxDepthOverrideM: number | null = null;
  if (isBox) {
    const heightCm = boxSpec ? Number(readRecordValue(boxSpec, 'heightCm')) : NaN;
    const widthCm = boxSpec ? Number(readRecordValue(boxSpec, 'widthCm')) : NaN;
    const depthCm = boxSpec ? Number(readRecordValue(boxSpec, 'depthCm')) : NaN;
    if (Number.isFinite(heightCm))
      boxH = Math.max(boxGeometryDims.minOuterHeightM, Math.min(spanH, cmToM(heightCm)));
    if (Number.isFinite(widthCm) && widthCm > 0) boxWidthOverrideM = cmToM(widthCm);
    if (Number.isFinite(depthCm) && depthCm > 0) boxDepthOverrideM = cmToM(depthCm);
  }

  let storageH: number = storageDims.barrierHeightM;
  if (isStorage) {
    const raw = tool.slice('sketch_storage:'.length).trim();
    const n = Number(raw);
    if (Number.isFinite(n)) storageH = Math.max(storageDims.barrierHeightMinM, Math.min(spanH, cmToM(n)));
  }

  if (isBox) {
    const half = boxH / 2;
    const lo = bottomY + pad + half;
    const hi = topY - pad - half;
    if (hi > lo) yClamped = Math.max(lo, Math.min(hi, yClamped));
  }

  if (isStorage) {
    const half = storageH / 2;
    const lo = bottomY + pad + half;
    const hi = topY - pad - half;
    if (hi > lo) yClamped = Math.max(lo, Math.min(hi, yClamped));
  }

  return {
    hitLocalX,
    isBottom,
    info: asRecord(info) || {},
    bottomY,
    topY,
    woodThick,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    spanH,
    pad,
    yClamped,
    isBox,
    isStorage,
    isShelf,
    isRod,
    isDrawers,
    isExtDrawers,
    variant,
    shelfDepthM,
    shelfDepthOverrideM,
    boxSpec,
    boxH,
    boxWidthOverrideM,
    boxDepthOverrideM,
    storageH,
  };
}
