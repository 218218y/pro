import type { AppContainer, UnknownRecord } from '../../../types';
import { NO_MAIN_SKETCH_WORKSPACE_POLICY } from '../../shared/dimensions/no_main_sketch_workspace_policy.js';
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

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPositiveNumber(value: unknown): number | null {
  const n = readFiniteNumber(value);
  return n != null && n > 0 ? n : null;
}

function __readNoMainSketchWorkspaceMetrics(App: AppContainer): __ProjectionLocalBoxWithBackZ | null {
  try {
    const raw = asRecord(getCacheBag(App).noMainSketchWorkspaceMetrics);
    if (!raw) return null;
    const centerX = readFiniteNumber(raw.centerX);
    const centerY = readFiniteNumber(raw.centerY);
    const centerZ = readFiniteNumber(raw.centerZ);
    const width = readPositiveNumber(raw.width);
    const height = readPositiveNumber(raw.height);
    const depth = readPositiveNumber(raw.depth);
    if (
      centerX == null ||
      centerY == null ||
      centerZ == null ||
      width == null ||
      height == null ||
      depth == null
    ) {
      return null;
    }
    const backZRaw = readFiniteNumber(raw.backZ);
    return {
      centerX,
      centerY,
      centerZ,
      width,
      height,
      depth,
      ...(backZRaw != null ? { backZ: backZRaw } : {}),
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

      const centerX = readFiniteNumber(rec.absX);
      const widthM = readPositiveNumber(rec.widthM);
      if (centerX == null || widthM == null) continue;

      const halfW = widthM / 2;
      minX = Math.min(minX, centerX - halfW);
      maxX = Math.max(maxX, centerX + halfW);
      hasFreeBox = true;
    }

    if (!hasFreeBox || !Number.isFinite(minX) || !Number.isFinite(maxX) || !(maxX > minX)) return null;

    return Math.max(
      0,
      NO_MAIN_SKETCH_WORKSPACE_POLICY.mToCm(
        maxX - minX + NO_MAIN_SKETCH_WORKSPACE_POLICY.noMainSketch.workspacePaddingM
      )
    );
  } catch {
    return null;
  }
}

export function __readNoMainWorkspaceBox(App: AppContainer): __ProjectionLocalBox | null {
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
    const widthCm = Math.max(
      rawWidthCm,
      sketchWidthCm ?? 0,
      NO_MAIN_SKETCH_WORKSPACE_POLICY.fallbackDimensionsCm.widthCm
    );
    const heightCm = Math.max(rawHeightCm, NO_MAIN_SKETCH_WORKSPACE_POLICY.fallbackDimensionsCm.heightCm);
    const depthCm = Math.max(rawDepthCm, NO_MAIN_SKETCH_WORKSPACE_POLICY.fallbackDimensionsCm.depthCm);

    return {
      centerX: 0,
      centerY: NO_MAIN_SKETCH_WORKSPACE_POLICY.cmToM(heightCm) / 2,
      centerZ: -NO_MAIN_SKETCH_WORKSPACE_POLICY.cmToM(depthCm) / 2,
      width: NO_MAIN_SKETCH_WORKSPACE_POLICY.cmToM(widthCm),
      height: NO_MAIN_SKETCH_WORKSPACE_POLICY.cmToM(heightCm),
      depth: NO_MAIN_SKETCH_WORKSPACE_POLICY.cmToM(depthCm),
    };
  } catch {
    return null;
  }
}
