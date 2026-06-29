import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveExternalDrawerFitFromBody } from '../../shared/wardrobe_construction_validation_shared.js';
import { resolveCornerCellHexGeometry } from './corner_wing_hex_cell_geometry.js';
import { readFiniteNumber, type CornerCell, type CornerCellCfg } from './corner_geometry_plan.js';
import type {
  CornerWingCellCfgResolver,
  CornerWingCellDerivationArgs,
} from './corner_wing_extension_cells_contracts.js';

export function buildCornerWingCells(
  args: CornerWingCellDerivationArgs,
  doorCount: number,
  defaultDoorWidth: number,
  getCellCfg: CornerWingCellCfgResolver
): CornerCell[] {
  const globalAbsHeightCm = (args.startY + args.wingH) * 100;
  const globalDepthCm = args.wingD * 100;
  const cornerCells: CornerCell[] = [];
  if (!(doorCount > 0) || !(defaultDoorWidth > 0.0001)) return cornerCells;

  const cellCount = Math.max(1, Math.ceil(doorCount / CORNER_WING_DIMENSIONS.cells.doorsPerCell));
  const doorsInCellList: number[] = [];
  const defaultCellWidths: number[] = [];
  const cellCfgs: CornerCellCfg[] = [];

  for (let ci = 0; ci < cellCount; ci += 1) {
    const doorStart = ci * CORNER_WING_DIMENSIONS.cells.doorsPerCell;
    const doorsInCell = Math.min(
      CORNER_WING_DIMENSIONS.cells.doorsPerCell,
      Math.max(0, doorCount - doorStart)
    );
    doorsInCellList.push(Math.max(1, doorsInCell));
    defaultCellWidths.push(Math.max(0.0001, Math.max(1, doorsInCell) * defaultDoorWidth));
    cellCfgs.push(getCellCfg(ci));
  }

  const cellWidths = resolveCornerWingCellWidths(
    args.activeWidth,
    doorsInCellList,
    defaultCellWidths,
    cellCfgs
  );
  let cursorX = args.blindWidth;

  for (let ci = 0; ci < cellCount; ci += 1) {
    const doorStart = ci * CORNER_WING_DIMENSIONS.cells.doorsPerCell;
    const doorsInCell = Math.min(
      CORNER_WING_DIMENSIONS.cells.doorsPerCell,
      Math.max(0, doorCount - doorStart)
    );
    const width = cellWidths[ci];
    const startX = cursorX;
    const centerX = startX + width / 2;
    cursorX += width;
    const key = `corner:${ci}`;
    const cfgCell = cellCfgs[ci];
    const { bodyHeight, hasActiveHeight } = resolveCornerWingCellHeight(args, cfgCell, globalAbsHeightCm);
    const drawerFit = resolveExternalDrawerFitFromBody({
      startY: args.startY,
      cabinetBodyHeight: bodyHeight,
      woodThick: args.woodThick,
      hasShoe: cfgCell.hasShoeDrawer,
      regCount: cfgCell.extDrawersCount,
    });
    const drawerHeightTotal = drawerFit.drawerHeightTotal;
    const effectiveBottomY = args.startY + args.woodThick + drawerHeightTotal;
    const effectiveCfgCell =
      drawerFit.hasShoe === cfgCell.hasShoeDrawer && drawerFit.regCount === cfgCell.extDrawersCount
        ? cfgCell
        : { ...cfgCell, hasShoeDrawer: drawerFit.hasShoe, extDrawersCount: drawerFit.regCount };

    const effectiveTopY = args.startY + bodyHeight - args.woodThick;
    const gridDivisions =
      cfgCell.isCustom && cfgCell.gridDivisions
        ? cfgCell.gridDivisions
        : CORNER_WING_DIMENSIONS.cells.defaultGridDivisions;
    const localGridStep = (effectiveTopY - effectiveBottomY) / gridDivisions;

    const { depth, hasActiveDepth } = resolveCornerWingCellDepth(args, cfgCell, globalDepthCm);
    const hexGeometry = resolveCornerCellHexGeometry({
      cfgCell,
      cellWidthM: width,
      defaultDepthM: args.wingD,
      woodThickM: args.woodThick,
    });
    const renderDepth = hexGeometry ? hexGeometry.sideDepthM : depth;

    cornerCells.push({
      idx: ci,
      key,
      doorStart,
      doorsInCell,
      width,
      startX,
      centerX,
      bodyHeight,
      depth: renderDepth,
      __hasActiveHeight: hasActiveHeight,
      __hasActiveDepth: hasActiveDepth,
      __hasActiveSpecialDims: hasActiveHeight || hasActiveDepth || !!hexGeometry,
      __hexCellGeometry: hexGeometry,
      cfg: effectiveCfgCell,
      drawerHeightTotal,
      effectiveBottomY,
      effectiveTopY,
      gridDivisions,
      localGridStep,
    });
  }

  return cornerCells;
}

function resolveCornerWingCellWidths(
  activeWidth: number,
  doorsInCellList: number[],
  defaultCellWidths: number[],
  cellCfgs: CornerCellCfg[]
): number[] {
  const cellCount = cellCfgs.length;
  const fixedWidths: (number | null)[] = new Array(cellCount).fill(null);
  let fixedSum = 0;
  let missingUnits = 0;

  for (let ci = 0; ci < cellCount; ci += 1) {
    const storedWidthCm = readStoredWidthCm(cellCfgs[ci]);
    if (typeof storedWidthCm === 'number' && Number.isFinite(storedWidthCm) && storedWidthCm > 0) {
      const widthM = storedWidthCm / 100;
      fixedWidths[ci] = widthM;
      fixedSum += widthM;
    } else {
      missingUnits += doorsInCellList[ci];
    }
  }

  let remainingWidth = activeWidth - fixedSum;
  if (!Number.isFinite(remainingWidth) || remainingWidth < 0) remainingWidth = 0;
  const denominator = missingUnits > 0 ? missingUnits : 1;
  const widths: number[] = [];

  for (let ci = 0; ci < cellCount; ci += 1) {
    const doorsUnits = Math.max(1, doorsInCellList[ci]);
    const fixedWidth = fixedWidths[ci];
    let width = fixedWidth != null ? fixedWidth : (remainingWidth * doorsUnits) / denominator;
    if (!Number.isFinite(width) || width <= 0) width = defaultCellWidths[ci];
    const minWidth =
      fixedWidth != null
        ? Math.max(CORNER_WING_DIMENSIONS.cells.minWidthM, CORNER_WING_DIMENSIONS.cells.minDoorUnitWidthM)
        : Math.max(
            CORNER_WING_DIMENSIONS.cells.minWidthM,
            doorsUnits * CORNER_WING_DIMENSIONS.cells.minDoorUnitWidthM
          );
    if (width < minWidth) width = minWidth;
    widths.push(width);
  }

  const sumWidth = widths.reduce((acc, value) => acc + value, 0);
  const delta = activeWidth - sumWidth;
  if (
    Number.isFinite(delta) &&
    Math.abs(delta) > CORNER_WING_DIMENSIONS.cells.widthAdjustmentEpsilonM &&
    widths.length > 0
  ) {
    let adjustIndex = -1;
    for (let i = widths.length - 1; i >= 0; i -= 1) {
      if (fixedWidths[i] == null) {
        adjustIndex = i;
        break;
      }
    }
    if (adjustIndex < 0) adjustIndex = widths.length - 1;
    widths[adjustIndex] = Math.max(CORNER_WING_DIMENSIONS.cells.minWidthM, widths[adjustIndex] + delta);
  }

  return widths;
}

function resolveCornerWingCellHeight(
  args: CornerWingCellDerivationArgs,
  cfgCell: CornerCellCfg,
  globalAbsHeightCm: number
): { bodyHeight: number; hasActiveHeight: boolean } {
  let bodyHeight = args.cabinetBodyHeight;
  const { heightCm, baseHeightCm } = readStoredHeightCm(cfgCell);
  const baseAbs = baseHeightCm != null ? baseHeightCm : globalAbsHeightCm;
  const hasActiveHeight =
    heightCm != null && Number.isFinite(heightCm) && Math.abs(heightCm - baseAbs) > 1e-6;
  if (hasActiveHeight && heightCm != null) {
    const minAbsCm =
      (args.startY + args.woodThick * CORNER_WING_DIMENSIONS.cells.minBodyWoodMultiplier) * 100;
    const absCm = Math.max(minAbsCm, heightCm);
    const derivedBodyHeight = absCm / 100 - args.startY;
    if (Number.isFinite(derivedBodyHeight) && derivedBodyHeight > 0) {
      bodyHeight = Math.max(
        args.woodThick * CORNER_WING_DIMENSIONS.cells.minBodyWoodMultiplier,
        derivedBodyHeight
      );
    }
  }
  return { bodyHeight, hasActiveHeight: !!hasActiveHeight };
}

function resolveCornerWingCellDepth(
  args: CornerWingCellDerivationArgs,
  cfgCell: CornerCellCfg,
  globalDepthCm: number
): { depth: number; hasActiveDepth: boolean } {
  let depth = args.wingD;
  const { depthCm, baseDepthCm } = readStoredDepthCm(cfgCell);
  const base = baseDepthCm != null ? baseDepthCm : globalDepthCm;
  const hasActiveDepth = depthCm != null && Number.isFinite(depthCm) && Math.abs(depthCm - base) > 1e-6;
  if (hasActiveDepth && depthCm != null) {
    const minAbsCm = Math.max(
      CORNER_WING_DIMENSIONS.cells.minAbsDepthCm,
      args.woodThick * CORNER_WING_DIMENSIONS.cells.minAbsDepthWoodMultiplier * 100
    );
    const absCm = Math.max(minAbsCm, depthCm);
    const depthM = absCm / 100;
    if (Number.isFinite(depthM) && depthM > 0)
      depth = Math.max(CORNER_WING_DIMENSIONS.wing.minDepthM, depthM);
  }
  return { depth, hasActiveDepth: !!hasActiveDepth };
}

function readStoredWidthCm(cfgMod: unknown): number | null {
  const mod = isValueRecord(cfgMod) ? cfgMod : null;
  const specialDims = mod && isValueRecord(mod.specialDims) ? mod.specialDims : null;
  const raw = specialDims ? specialDims.widthCm : null;
  const parsed = readFiniteNumber(raw);
  return parsed != null && parsed > 0 ? parsed : null;
}

function readStoredHeightCm(cfgMod: unknown): { heightCm: number | null; baseHeightCm: number | null } {
  const mod = isValueRecord(cfgMod) ? cfgMod : null;
  const specialDims = mod && isValueRecord(mod.specialDims) ? mod.specialDims : null;
  const heightRaw = specialDims ? specialDims.heightCm : null;
  const baseHeightRaw = specialDims ? specialDims.baseHeightCm : null;
  const height = readFiniteNumber(heightRaw);
  const baseHeight = readFiniteNumber(baseHeightRaw);
  return {
    heightCm: height != null && height > 0 ? height : null,
    baseHeightCm: baseHeight != null && baseHeight > 0 ? baseHeight : null,
  };
}

function readStoredDepthCm(cfgMod: unknown): { depthCm: number | null; baseDepthCm: number | null } {
  const mod = isValueRecord(cfgMod) ? cfgMod : null;
  const specialDims = mod && isValueRecord(mod.specialDims) ? mod.specialDims : null;
  const depthRaw = specialDims ? specialDims.depthCm : null;
  const baseDepthRaw = specialDims ? specialDims.baseDepthCm : null;
  const depth = readFiniteNumber(depthRaw);
  const baseDepth = readFiniteNumber(baseDepthRaw);
  return {
    depthCm: depth != null && depth > 0 ? depth : null,
    baseDepthCm: baseDepth != null && baseDepth > 0 ? baseDepth : null,
  };
}

function isValueRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
