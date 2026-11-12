import { CARCASS_INTERIOR_GRID_POLICY } from '../../shared/dimensions/carcass_interior_grid_policy.js';
import { computeInteriorPresetOps } from '../features/interior_layout_presets/api.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import type { InteriorHoverTarget } from './canvas_picking_hover_targets_shared.js';
import type {
  AppContainer,
  HoverModuleConfigLike,
  LayoutPreviewPayload,
  ShelfVariant,
} from './canvas_picking_interior_hover_shared.js';
import {
  asHoverCustomData,
  readBooleanArray,
  readNumber,
  readGridDivisions,
  readString,
} from './canvas_picking_interior_hover_shared.js';

export function buildLayoutPreviewPayload(args: {
  App: AppContainer;
  target: InteriorHoverTarget;
  shelfYs: number[];
  rodYs: number[];
  storageBarrier: { y: number; h: number; z: number } | null;
  shelfVariant?: ShelfVariant | undefined;
}): LayoutPreviewPayload {
  const { App, target, shelfYs, rodYs, storageBarrier, shelfVariant } = args;
  return {
    App,
    THREE: getThreeMaybe(App),
    anchor: target.hitSelectorObj ?? null,
    x: target.internalCenterX,
    internalZ: target.internalZ,
    innerW: target.innerW,
    internalDepth: target.internalDepth,
    ...(readNumber(target.info.braceFrontZ) != null
      ? { braceFrontZ: readNumber(target.info.braceFrontZ)! }
      : {}),
    woodThick: target.woodThick,
    shelfYs,
    rodYs,
    storageBarrier,
    shelfVariant,
    op: 'add',
  };
}

export function buildPresetLayoutPreviewPayload(args: {
  App: AppContainer;
  target: InteriorHoverTarget;
  layoutType: string;
}): LayoutPreviewPayload {
  const { App, target, layoutType } = args;
  const ops = computeInteriorPresetOps(layoutType);
  const divisions = readGridDivisions(
    CARCASS_INTERIOR_GRID_POLICY.divisions,
    CARCASS_INTERIOR_GRID_POLICY.divisions
  );
  const step =
    divisions > 0 ? target.spanH / divisions : target.spanH / CARCASS_INTERIOR_GRID_POLICY.divisions;

  const shelfYs = Array.isArray(ops.shelves)
    ? ops.shelves
        .map(v => Number(v))
        .filter(v => Number.isFinite(v) && v >= 1 && v < divisions)
        .map(v => target.bottomY + v * step)
    : [];
  const rodYs = Array.isArray(ops.rods)
    ? ops.rods
        .map(r => {
          const yFactor = readNumber(r?.yFactor);
          const yAdd = readNumber(r?.yAdd) ?? 0;
          return yFactor != null ? target.bottomY + yFactor * step + yAdd : NaN;
        })
        .filter(v => Number.isFinite(v))
    : [];
  const barrierH = readNumber(ops.storageBarrier?.barrierH) ?? 0;
  const storageBarrier =
    barrierH > 0
      ? {
          y: target.bottomY + barrierH / 2,
          h: barrierH,
          z: target.internalZ + target.internalDepth / 2 - 0.06,
        }
      : null;

  return buildLayoutPreviewPayload({
    App,
    target,
    shelfYs,
    rodYs,
    storageBarrier,
    shelfVariant: ops.shelfVariant,
  });
}

export function readSavedGridDivisions(cfgRef: HoverModuleConfigLike | null, defaultValue: number): number {
  return readNumber(cfgRef?.gridDivisions) ?? defaultValue;
}

export function readExistingShelfVariant(args: {
  braceList: number[];
  shelfIndex: number;
  shelfVariants: unknown[];
  cfgRef?: { isCustom?: unknown; layout?: unknown } | null;
}): ShelfVariant {
  const { braceList, shelfIndex, shelfVariants } = args;
  const isPresetBrace =
    args.cfgRef &&
    !args.cfgRef.isCustom &&
    computeInteriorPresetOps(args.cfgRef.layout).shelfVariant === 'brace';
  const isBraceExisting = isPresetBrace || braceList.some(v => Number(v) === shelfIndex);
  const savedVariant =
    typeof shelfVariants[shelfIndex - 1] === 'string' ? String(shelfVariants[shelfIndex - 1]) : '';
  if (savedVariant === 'winter_brace') return savedVariant;
  return isBraceExisting || savedVariant === 'brace'
    ? 'brace'
    : savedVariant === 'double' || savedVariant === 'glass' || savedVariant === 'regular'
      ? savedVariant
      : 'regular';
}

export function hasShelfAtIndex(
  cfgRef: { isCustom?: unknown; customData?: unknown; layout?: unknown },
  shelfIndex: number
): boolean {
  if (!Number.isInteger(shelfIndex) || shelfIndex < 1) return false;
  if (cfgRef.isCustom) {
    const shelvesArr = readBooleanArray(asHoverCustomData(cfgRef.customData)?.shelves);
    return !!shelvesArr[shelfIndex - 1];
  }
  const layout = readString(cfgRef.layout, 'shelves');
  if (layout === 'shelves' || layout === 'mixed') return true;
  return computeInteriorPresetOps(layout).shelves.includes(shelfIndex);
}
