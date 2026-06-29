// Corner-cell UI-derived default layout helpers.
// Owns corner-side / width / door-count policy so patch + snapshot owners stay focused.

import { CORNER_WING_DIMENSIONS, CM_PER_METER } from '../../../shared/wardrobe_dimension_tokens_shared.js';
import { isRecord, type UnknownRecord } from './corner_cells_contracts.js';

function readCornerUiRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function readCornerSideFromUi(uiSnapshot: unknown): 'left' | 'right' {
  const ui = readCornerUiRecord(uiSnapshot);
  return ui.cornerSide === 'left' ? 'left' : 'right';
}

function readCornerDoorsCountFromUi(uiSnapshot: unknown): number {
  const ui = readCornerUiRecord(uiSnapshot);
  const parsedDoors = typeof ui.cornerDoors === 'number' ? ui.cornerDoors : NaN;
  const doors = Number.isFinite(parsedDoors) ? Math.round(parsedDoors) : NaN;
  if (Number.isFinite(doors) && doors >= 0) return doors;

  let wingLenCm =
    typeof ui.cornerWidth === 'number' && Number.isFinite(ui.cornerWidth) ? ui.cornerWidth : NaN;
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
