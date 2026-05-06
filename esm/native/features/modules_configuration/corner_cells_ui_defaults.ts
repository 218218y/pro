// Corner-cell UI-derived default layout helpers.
// Owns corner-side / width / door-count policy so patch + snapshot owners stay focused.

import { CORNER_WING_DIMENSIONS, CM_PER_METER } from '../../../shared/wardrobe_dimension_tokens_shared.js';
import { isRecord, type UnknownRecord } from './corner_cells_contracts.js';

function readCornerUiRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function readCornerSideFromUi(uiSnapshot: unknown): 'left' | 'right' {
  const ui = readCornerUiRecord(uiSnapshot);
  const raw = readCornerUiRecord(ui.raw);
  const sideVal = ui.cornerSide ?? ui.cornerDirection ?? raw.cornerSide ?? raw.cornerDirection;
  return sideVal === 'left' ? 'left' : 'right';
}

function readCornerDoorsCountFromUi(uiSnapshot: unknown): number {
  const ui = readCornerUiRecord(uiSnapshot);
  const raw = readCornerUiRecord(ui.raw);
  const doorsRaw =
    ui.cornerDoors ??
    ui.cornerDoorCount ??
    ui.cornerDoorsCount ??
    raw.cornerDoors ??
    raw.cornerDoorCount ??
    raw.cornerDoorsCount;
  const parsedDoors = parseFloat(String(doorsRaw));
  const doors = Number.isFinite(parsedDoors) ? Math.round(parsedDoors) : NaN;
  if (Number.isFinite(doors) && doors >= 0) return doors;

  const widthRaw =
    ui.cornerWidth ??
    ui.cornerWidthCm ??
    ui.cornerWingWidthCm ??
    raw.cornerWidth ??
    raw.cornerWidthCm ??
    raw.cornerWingWidthCm;
  let wingLenCm = Number.isFinite(parseFloat(String(widthRaw))) ? parseFloat(String(widthRaw)) : NaN;
  if (!Number.isFinite(wingLenCm)) wingLenCm = CORNER_WING_DIMENSIONS.wing.defaultWidthCm;
  if (wingLenCm < 0) wingLenCm = 0;
  const wingLenM = wingLenCm / CM_PER_METER;
  return wingLenM > CORNER_WING_DIMENSIONS.wing.minActiveWidthM
    ? Math.max(
        1,
        Math.round(
          wingLenM /
            (CORNER_WING_DIMENSIONS.cells.doorsPerCell * CORNER_WING_DIMENSIONS.cells.minDoorUnitWidthM)
        )
      )
    : 0;
}

export function resolveTopCornerCellDefaultLayout(index: number): string {
  return index === 0 ? 'hanging_top2' : 'shelves';
}

export function resolveTopCornerCellDefaultLayoutFromUi(uiSnapshot: unknown, index: number): string {
  const cellIndex = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;
  const cornerSide = readCornerSideFromUi(uiSnapshot);
  const doors = readCornerDoorsCountFromUi(uiSnapshot);
  const cellCount = Math.max(1, Math.ceil(Math.max(0, doors) / CORNER_WING_DIMENSIONS.cells.doorsPerCell));
  if (cornerSide === 'left' && cellCount > 1) return cellIndex === cellCount - 1 ? 'hanging_top2' : 'shelves';
  return cellIndex === 0 ? 'hanging_top2' : 'shelves';
}
