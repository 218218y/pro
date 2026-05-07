import type { AppContainer, UnknownRecord } from '../../../types';
import {
  cmToM,
  mToCm,
  NO_MAIN_SKETCH_DIMENSIONS,
  WARDROBE_DEFAULTS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getCacheBag } from '../runtime/cache_access.js';
import { asRecord, getProp } from '../runtime/record.js';
import { __wp_cfg, __wp_ui } from './canvas_picking_core_helpers.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import {
  __readArrayRecordEntry,
  __readRawNumber,
  __readUiNumber,
  __readUiRaw,
} from './canvas_picking_projection_runtime_box_shared.js';
import type {
  __ProjectionLocalBox,
  __ProjectionLocalBoxWithBackZ,
} from './canvas_picking_projection_runtime_box_shared.js';
import { __asNum } from './canvas_picking_core_helpers.js';

function __readNoMainSketchWorkspaceMetrics(App: AppContainer): __ProjectionLocalBoxWithBackZ | null {
  try {
    const raw = asRecord(getCacheBag(App).noMainSketchWorkspaceMetrics);
    if (!raw) return null;
    const centerX = __asNum(raw.centerX, NaN);
    const centerY = __asNum(raw.centerY, NaN);
    const centerZ = __asNum(raw.centerZ, NaN);
    const width = __asNum(raw.width, NaN);
    const height = __asNum(raw.height, NaN);
    const depth = __asNum(raw.depth, NaN);
    if (
      !Number.isFinite(centerX) ||
      !Number.isFinite(centerY) ||
      !Number.isFinite(centerZ) ||
      !(width > 0) ||
      !(height > 0) ||
      !(depth > 0)
    ) {
      return null;
    }
    const backZRaw = __asNum(raw.backZ, NaN);
    return {
      centerX,
      centerY,
      centerZ,
      width,
      height,
      depth,
      backZ: Number.isFinite(backZRaw) ? backZRaw : undefined,
    };
  } catch {
    return null;
  }
}

function __readNoMainTopModuleSketchExtras(App: AppContainer): UnknownRecord | null {
  try {
    const cfg = __wp_cfg(App);
    const list = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
    const topModule = __readArrayRecordEntry(list, 0);
    return asRecord(topModule?.sketchExtras);
  } catch {
    return null;
  }
}

function __readNoMainWorkspaceWidthCm(App: AppContainer): number | null {
  try {
    const extra = __readNoMainTopModuleSketchExtras(App);
    const boxesRaw = getProp(extra, 'boxes');
    const boxes = Array.isArray(boxesRaw) ? boxesRaw : null;
    if (!boxes || boxes.length === 0) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let hasFreeBox = false;

    for (let i = 0; i < boxes.length; i++) {
      const rec = asRecord(boxes[i]);
      if (!rec || rec.freePlacement !== true) continue;

      const centerX = __asNum(rec.absX, NaN);
      const widthM = __asNum(rec.widthM, NaN);
      if (!Number.isFinite(centerX) || !Number.isFinite(widthM) || !(widthM > 0)) continue;

      const halfW = widthM / 2;
      minX = Math.min(minX, centerX - halfW);
      maxX = Math.max(maxX, centerX + halfW);
      hasFreeBox = true;
    }

    if (!hasFreeBox || !Number.isFinite(minX) || !Number.isFinite(maxX) || !(maxX > minX)) return null;

    return Math.max(0, mToCm(maxX - minX + NO_MAIN_SKETCH_DIMENSIONS.workspacePaddingM));
  } catch {
    return null;
  }
}

export function __readNoMainWardrobeFallbackBox(App: AppContainer): __ProjectionLocalBox | null {
  try {
    const ui = __wp_ui(App);
    const raw = __readUiRaw(ui);
    const doorsRaw = getProp(raw, 'doors') ?? getProp(ui, 'doors');
    const doors = Math.round(__asNum(doorsRaw, NaN));
    if (!Number.isFinite(doors) || doors !== 0) return null;

    const cachedNoMainMetrics = __readNoMainSketchWorkspaceMetrics(App);
    if (cachedNoMainMetrics) {
      return {
        centerX: cachedNoMainMetrics.centerX,
        centerY: cachedNoMainMetrics.centerY,
        centerZ: cachedNoMainMetrics.centerZ,
        width: cachedNoMainMetrics.width,
        height: cachedNoMainMetrics.height,
        depth: cachedNoMainMetrics.depth,
      };
    }

    const rawWidthCm = Math.max(0, __readRawNumber(raw, 'width', __readUiNumber(ui, 'width', 0)));
    const rawHeightCm = Math.max(0, __readRawNumber(raw, 'height', __readUiNumber(ui, 'height', 0)));
    const rawDepthCm = Math.max(0, __readRawNumber(raw, 'depth', __readUiNumber(ui, 'depth', 0)));

    const sketchWidthCm = __readNoMainWorkspaceWidthCm(App);
    const widthCm = Math.max(rawWidthCm, sketchWidthCm ?? 0, WARDROBE_DEFAULTS.widthCm);
    const heightCm = Math.max(rawHeightCm, WARDROBE_DEFAULTS.heightCm);
    const depthCm = Math.max(rawDepthCm, WARDROBE_DEFAULTS.byType.hinged.depthCm);

    return {
      centerX: 0,
      centerY: cmToM(heightCm) / 2,
      centerZ: -cmToM(depthCm) / 2,
      width: cmToM(widthCm),
      height: cmToM(heightCm),
      depth: cmToM(depthCm),
    };
  } catch {
    return null;
  }
}
