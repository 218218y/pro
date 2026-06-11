import { getThreeMaybe } from '../runtime/three_access.js';
import type { InteriorHoverTarget } from './canvas_picking_hover_targets_shared.js';
import type {
  AppContainer,
  HoverModuleConfigLike,
  LayoutPreviewPayload,
  ShelfVariant,
} from './canvas_picking_interior_hover_shared.js';
import {
  readBooleanArray,
  readCustomData,
  readNumber,
  readString,
} from './canvas_picking_interior_hover_shared.js';

export function buildLayoutPreviewPayload(args: {
  App: AppContainer;
  target: InteriorHoverTarget;
  shelfYs: number[];
  rodYs: number[];
  storageBarrier: { y: number; h: number; z: number } | null;
  shelfVariant?: ShelfVariant;
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
    woodThick: target.woodThick,
    shelfYs,
    rodYs,
    storageBarrier,
    shelfVariant,
    op: 'add',
  };
}

export function readSavedGridDivisions(cfgRef: HoverModuleConfigLike | null, fallback: number): number {
  return readNumber(cfgRef?.gridDivisions) ?? fallback;
}

export function readExistingShelfVariant(args: {
  braceList: number[];
  shelfIndex: number;
  shelfVariants: unknown[];
}): ShelfVariant {
  const { braceList, shelfIndex, shelfVariants } = args;
  const isBraceExisting = braceList.some(v => Number(v) === shelfIndex);
  const savedVariant =
    typeof shelfVariants[shelfIndex - 1] === 'string' ? String(shelfVariants[shelfIndex - 1]) : '';
  return isBraceExisting || savedVariant === 'brace'
    ? 'brace'
    : savedVariant === 'double' || savedVariant === 'glass' || savedVariant === 'regular'
      ? savedVariant
      : 'regular';
}

export function hasShelfAtIndex(cfgRef: HoverModuleConfigLike, shelfIndex: number): boolean {
  if (cfgRef.isCustom) {
    const shelvesArr = readBooleanArray(readCustomData(cfgRef)?.shelves);
    return !!shelvesArr[shelfIndex - 1];
  }
  const layoutType = readString(cfgRef.layout, 'shelves');
  switch (layoutType) {
    case 'shelves':
    case 'mixed':
      return true;
    case 'hanging':
    case 'hanging_top2':
    case 'storage':
    case 'storage_shelf':
      return shelfIndex === 4 || shelfIndex === 5;
    case 'hanging_split':
      return shelfIndex === 1 || shelfIndex === 5;
    default:
      return false;
  }
}
