import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import { setManualWidth } from '../actions/room_actions.js';
import { runPerfAction } from '../../../services/api.js';
import {
  applyUiRawScalarPatch,
  setUiCellDimsDepth,
  setUiCellDimsHeight,
  setUiCellDimsWidth,
  setUiSingleDoorPos,
  setUiStackSplitLowerDoors,
  setUiStackSplitLowerDoorsManual,
  setUiStructureSelect,
} from '../actions/store_actions.js';
import {
  normalizeSingleDoorPos,
  safeJsonParse,
  sumDoorsFromStructure,
} from './structure_tab_library_helpers.js';
import { applyStructureTemplateRecomputeBatch, structureTabReportNonFatal } from './structure_tab_core.js';
import { normalizeStructureRawValue } from './structure_tab_dimension_constraints.js';
import {
  buildRawUiPatch,
  normalizeDoorsValue,
  readRawPatch,
  readSingleDoorPosOr,
  type DisplayedValueReader,
  type StructureRawPatch,
  type StructureTabNumericKey,
  type StructureUiPatch,
} from './structure_tab_structure_mutations_shared.js';

function readStructurePerfMetricName(key: StructureTabNumericKey): string | null {
  switch (key) {
    case 'width':
      return 'structure.dimensions.width.commit';
    case 'height':
      return 'structure.dimensions.height.commit';
    case 'depth':
      return 'structure.dimensions.depth.commit';
    default:
      return null;
  }
}

export function commitStructureRawValue(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  key: StructureTabNumericKey;
  nextValue: number;
  getDisplayedRawValue: DisplayedValueReader;
  wardrobeType: string;
  isChestMode: boolean;
  isManualWidth: boolean;
  width: number;
  height: number;
  depth: number;
  doors: number;
  structureSelectRaw: string;
  singleDoorPosRaw: string;
}): void {
  const {
    app,
    meta,
    key,
    nextValue,
    getDisplayedRawValue,
    wardrobeType,
    isChestMode,
    isManualWidth,
    width,
    height,
    depth,
    doors,
    structureSelectRaw,
    singleDoorPosRaw,
  } = args;
  const perfMetricName = readStructurePerfMetricName(key);
  const runWithPerf = (task: () => void): void => {
    if (!perfMetricName) {
      task();
      return;
    }
    runPerfAction(
      app,
      perfMetricName,
      () => {
        task();
        return true;
      },
      { detail: { key } }
    );
  };

  const normalizedValue = normalizeStructureRawValue({
    key,
    value: nextValue,
    wardrobeType,
    isChestMode,
    width,
    height,
    depth,
    doors,
  });
  if (normalizedValue == null) return;

  const value =
    key === 'doors' || key === 'stackSplitLowerDoors' ? Math.round(normalizedValue) : normalizedValue;

  const prevDisplayedValue = getDisplayedRawValue(key);
  const isIntegerField = key === 'doors' || key === 'stackSplitLowerDoors';
  const unchanged = isIntegerField
    ? Math.round(Number(prevDisplayedValue) || 0) === Math.round(Number(value) || 0)
    : Math.abs((Number(prevDisplayedValue) || 0) - (Number(value) || 0)) < 0.0001;
  if (unchanged) return;

  if (key === 'cellDimsWidth' || key === 'cellDimsHeight' || key === 'cellDimsDepth') {
    try {
      if (key === 'cellDimsWidth') {
        setUiCellDimsWidth(app, value, meta.uiOnlyImmediate('react:structure:cellDimsWidth'));
      } else if (key === 'cellDimsHeight') {
        setUiCellDimsHeight(app, value, meta.uiOnlyImmediate('react:structure:cellDimsHeight'));
      } else {
        setUiCellDimsDepth(app, value, meta.uiOnlyImmediate('react:structure:cellDimsDepth'));
      }
    } catch (err) {
      structureTabReportNonFatal('commitStructureRawValue.cellDims', err);
    }
    return;
  }

  if (key === 'stackSplitLowerDoors') {
    const doorsN = Math.max(0, Math.round(Number(value) || 0));
    const uiPatch = buildRawUiPatch({ stackSplitLowerDoors: doorsN, stackSplitLowerDoorsManual: true });
    const source = 'react:structure:stackSplitLowerDoors';
    const m = meta.noBuildImmediate(source);

    try {
      applyStructureTemplateRecomputeBatch({
        app,
        source,
        meta: m,
        uiPatch,
        statePatch: { ui: uiPatch },
        mutate: () => {
          setUiStackSplitLowerDoors(app, doorsN, m);
          setUiStackSplitLowerDoorsManual(app, true, m);
        },
      });
    } catch (err) {
      structureTabReportNonFatal('commitStructureRawValue.stackSplitLowerDoors', err);
    }
    return;
  }

  if (key === 'doors') {
    const doorsN = normalizeDoorsValue(wardrobeType, value);
    const perDoor = wardrobeType === 'sliding' ? 80 : 40;
    const isNoMainWardrobe = wardrobeType !== 'sliding' && doorsN === 0;

    let treatManualWidth = !!isManualWidth;
    if (treatManualWidth) {
      try {
        const curDoors = normalizeDoorsValue(wardrobeType, doors);
        const curWidth = Number(width) || 0;
        const expectedAutoNow = curDoors * perDoor;
        if (curWidth > 0 && Math.abs(curWidth - expectedAutoNow) < 0.51) {
          treatManualWidth = false;
        }
      } catch (err) {
        structureTabReportNonFatal('commitStructureRawValue.autoFixManualWidth', err);
      }
    }

    const rawPatch: StructureRawPatch = { doors: doorsN };
    if (!treatManualWidth) {
      const autoWidth = normalizeStructureRawValue({
        key: 'width',
        value: doorsN * perDoor,
        wardrobeType,
        isChestMode,
        width,
        height,
        depth,
        doors: doorsN,
      });
      rawPatch.width = isNoMainWardrobe ? 0 : (autoWidth ?? doorsN * perDoor);
    }

    const uiPatch: StructureUiPatch = { raw: rawPatch };

    if (wardrobeType !== 'sliding' && doorsN > 0) {
      const parsed =
        structureSelectRaw && structureSelectRaw.trim() ? safeJsonParse(structureSelectRaw) : null;
      const sum = sumDoorsFromStructure(parsed);
      if (sum != null && sum !== doorsN) uiPatch.structureSelect = '';

      const nextStructRaw =
        typeof uiPatch.structureSelect === 'string' ? String(uiPatch.structureSelect) : structureSelectRaw;
      const nextParsed = nextStructRaw && nextStructRaw.trim() ? safeJsonParse(nextStructRaw) : null;
      const isDefaultNext = nextParsed === 'default' || nextParsed == null;

      if (doorsN % 2 === 1 && isDefaultNext) {
        const normalized = normalizeSingleDoorPos(doorsN, singleDoorPosRaw);
        const nextPos = readSingleDoorPosOr(normalized, 'left');
        if (nextPos !== String(singleDoorPosRaw || '')) uiPatch.singleDoorPos = nextPos;
      } else {
        const rawPos = String(singleDoorPosRaw || '').trim();
        const normalized = normalizeSingleDoorPos(doorsN, rawPos);
        if (rawPos) {
          if (!normalized) uiPatch.singleDoorPos = 'left';
          else if (normalized !== rawPos) uiPatch.singleDoorPos = normalized;
        }
      }
    }

    const source = 'react:structure:doors';
    const m = meta.noBuildImmediate(source);
    const statePatch: Record<string, unknown> = { ui: uiPatch };
    if (treatManualWidth !== !!isManualWidth) {
      statePatch.config = { isManualWidth: treatManualWidth };
    }

    try {
      applyStructureTemplateRecomputeBatch({
        app,
        source,
        meta: m,
        uiPatch,
        statePatch,
        mutate: () => {
          if (treatManualWidth !== !!isManualWidth) {
            setManualWidth(
              app,
              treatManualWidth,
              meta.noBuild(
                meta.noHistory(undefined, 'react:structure:doors:manualWidth'),
                'react:structure:doors:manualWidth'
              )
            );
          }

          applyUiRawScalarPatch(app, readRawPatch(uiPatch), m);

          if (Object.prototype.hasOwnProperty.call(uiPatch, 'structureSelect')) {
            setUiStructureSelect(app, uiPatch.structureSelect, m);
          }
          if (Object.prototype.hasOwnProperty.call(uiPatch, 'singleDoorPos')) {
            setUiSingleDoorPos(app, uiPatch.singleDoorPos, m);
          }
        },
      });
    } catch (err) {
      structureTabReportNonFatal('commitStructureRawValue.doors', err);
    }
    return;
  }

  const extraLowerManual: StructureRawPatch =
    key === 'stackSplitLowerDepth'
      ? { stackSplitLowerDepthManual: true }
      : key === 'stackSplitLowerWidth'
        ? { stackSplitLowerWidthManual: true }
        : {};

  const uiPatch = buildRawUiPatch({ [key]: value, ...extraLowerManual });
  const source = `react:structure:${key}`;
  const m = meta.noBuildImmediate(source);
  const statePatch: Record<string, unknown> = { ui: uiPatch };
  if (key === 'width' && !isManualWidth) {
    statePatch.config = { isManualWidth: true };
  }

  try {
    runWithPerf(() => {
      applyStructureTemplateRecomputeBatch({
        app,
        source,
        meta: m,
        uiPatch,
        statePatch,
        mutate: () => {
          if (key === 'width' && !isManualWidth) {
            setManualWidth(
              app,
              true,
              meta.noBuild(
                meta.noHistory(undefined, 'react:structure:manualWidth'),
                'react:structure:manualWidth'
              )
            );
          }
          applyUiRawScalarPatch(app, readRawPatch(uiPatch), m);
        },
      });
    });
  } catch (err) {
    structureTabReportNonFatal('commitStructureRawValue.scalar', err);
  }
}
