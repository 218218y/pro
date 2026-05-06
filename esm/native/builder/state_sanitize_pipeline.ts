import type { AppContainer, UnknownRecord } from '../../../types';

import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { coerceFiniteInt, coerceFiniteNumber } from '../runtime/num_coerce.js';
import { syncDimensionRuntimePatch } from '../runtime/dimension_sync_coalescer.js';
import { metaUiOnly } from '../runtime/meta_profiles_access.js';
import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  DEFAULT_CHEST_DRAWERS_COUNT,
  WARDROBE_CHEST_DRAWERS_MAX,
  WARDROBE_CHEST_DRAWERS_MIN,
  WARDROBE_CHEST_HEIGHT_MIN,
  WARDROBE_CHEST_WIDTH_MIN,
  WARDROBE_DEPTH_MAX,
  WARDROBE_DEPTH_MIN,
  WARDROBE_DOORS_MAX,
  WARDROBE_HEIGHT_MAX,
  WARDROBE_HEIGHT_MIN,
  WARDROBE_SLIDING_DOORS_MIN,
  WARDROBE_WIDTH_MAX,
  WARDROBE_WIDTH_MIN,
  getDefaultDepthForWardrobeType,
  getDefaultDoorsForWardrobeType,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

type SanitizedDims = {
  skipBuild: boolean;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  chestDrawersCount: number;
};

// Builder State Sanitizer (ESM)
//
// Responsibilities:
// - Sanitize width/height/depth/doors from store-driven UI state (NO DOM).
// - Keep builder buildUi snapshot and runtime store in sync.
// - Provide a single canonical place for dimension bounds and "mid-edit" skip rules.
//
// This module is intentionally side-effectful (syncs runtime), but it never triggers builds.

/**
 * @typedef {object} SanitizedDims
 * @property {boolean} skipBuild
 * @property {number} widthCm
 * @property {number} heightCm
 * @property {number} depthCm
 * @property {number} doorsCount
 * @property {number} chestDrawersCount
 */

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

function asRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

function _toNum(v: unknown, fb: number): number {
  const n = coerceFiniteNumber(v);
  return typeof n === 'number' ? n : fb;
}

function _toInt(v: unknown, fb: number): number {
  const n = coerceFiniteInt(v);
  return typeof n === 'number' ? n : fb;
}

/**
 * Compute sanitized dimensions and sync them to runtime.
 *
 * @param {{
 *   App: AppContainer | null | undefined,
 *   ui: UnknownRecord | null | undefined,
 *   cfg: UnknownRecord | null | undefined,
 * }} args
 * @returns {SanitizedDims}
 */
export function sanitizeBuildDimsAndSyncRuntime(args: {
  App: AppContainer | null | undefined;
  ui: UnknownRecord | null | undefined;
  cfg: UnknownRecord | null | undefined;
}): SanitizedDims {
  const App = args && args.App;
  const ui = (args && args.ui) || {};
  const cfg = (args && args.cfg) || {};

  const raw = asRecord(ui.raw) || {};

  const isChestMode = !!ui.isChestMode;
  const isSliding = typeof cfg.wardrobeType !== 'undefined' && cfg.wardrobeType === 'sliding';
  const minDoorsAllowed = isSliding ? WARDROBE_SLIDING_DOORS_MIN : 0;
  const minWLimit = isChestMode ? WARDROBE_CHEST_WIDTH_MIN : WARDROBE_WIDTH_MIN;
  const minHLimit = isChestMode ? WARDROBE_CHEST_HEIGHT_MIN : WARDROBE_HEIGHT_MIN;

  const defaultDepth = getDefaultDepthForWardrobeType(cfg.wardrobeType);
  const defaultDoors = getDefaultDoorsForWardrobeType(cfg.wardrobeType);

  const rawWidth = _toNum(raw.width, DEFAULT_WIDTH);
  const rawHeight = _toNum(raw.height, DEFAULT_HEIGHT);
  const rawDepth = _toNum(raw.depth, defaultDepth);
  // Prefer raw['doors'] but fall back to ui.doors (some loaders/flows persist only the normalized field).
  const rawDoors = _toInt(raw['doors'] != null ? raw['doors'] : ui.doors, defaultDoors);
  const rawChestDrawers = _toInt(raw.chestDrawersCount, DEFAULT_CHEST_DRAWERS_COUNT);

  const forceBuild = !!ui.forceBuild;
  const activeId = ui.__activeId ? String(ui.__activeId) : '';

  // Mid-edit skip rules (do NOT throw; just skip build to avoid fight with the input field).
  if (!forceBuild) {
    if (activeId === 'width' && (rawWidth < minWLimit || rawWidth > WARDROBE_WIDTH_MAX)) {
      return { skipBuild: true, widthCm: 0, heightCm: 0, depthCm: 0, doorsCount: 0, chestDrawersCount: 0 };
    }
    if (activeId === 'height' && (rawHeight < minHLimit || rawHeight > WARDROBE_HEIGHT_MAX)) {
      return { skipBuild: true, widthCm: 0, heightCm: 0, depthCm: 0, doorsCount: 0, chestDrawersCount: 0 };
    }
    if (activeId === 'depth' && (rawDepth < WARDROBE_DEPTH_MIN || rawDepth > WARDROBE_DEPTH_MAX)) {
      return { skipBuild: true, widthCm: 0, heightCm: 0, depthCm: 0, doorsCount: 0, chestDrawersCount: 0 };
    }
    if (activeId === 'doors' && (rawDoors < minDoorsAllowed || rawDoors > WARDROBE_DOORS_MAX)) {
      return { skipBuild: true, widthCm: 0, heightCm: 0, depthCm: 0, doorsCount: 0, chestDrawersCount: 0 };
    }
  }

  const isNoMainWardrobe = !isChestMode && !isSliding && rawDoors === 0;
  const widthCm = isNoMainWardrobe ? 0 : Math.max(minWLimit, Math.min(WARDROBE_WIDTH_MAX, rawWidth));
  const heightCm = Math.max(minHLimit, Math.min(WARDROBE_HEIGHT_MAX, rawHeight));
  const depthCm = Math.max(WARDROBE_DEPTH_MIN, Math.min(WARDROBE_DEPTH_MAX, rawDepth));

  const doorsCount = Math.max(minDoorsAllowed, Math.min(WARDROBE_DOORS_MAX, rawDoors));

  const chestDrawersCount = Math.max(
    WARDROBE_CHEST_DRAWERS_MIN,
    Math.min(WARDROBE_CHEST_DRAWERS_MAX, rawChestDrawers || DEFAULT_CHEST_DRAWERS_COUNT)
  );

  // Keep sanitized dims in sync (build UI snapshot + runtime store).
  // Fail-fast here on purpose: silent desyncs are much harder to debug than a visible exception.
  if (App) {
    const B = ensureBuilderService(App, 'native/builder/state_sanitize_pipeline');
    B.buildUi = B.buildUi && typeof B.buildUi === 'object' ? B.buildUi : {};

    B.buildUi.width = widthCm;
    B.buildUi.height = heightCm;
    B.buildUi.depth = depthCm;
    B.buildUi.doors = doorsCount;

    B.buildUi.raw = B.buildUi.raw && typeof B.buildUi.raw === 'object' ? B.buildUi.raw : {};
    B.buildUi.raw.width = widthCm;
    B.buildUi.raw.height = heightCm;
    B.buildUi.raw.depth = depthCm;
    B.buildUi.raw['doors'] = doorsCount;

    const patch = {
      wardrobeWidthM: widthCm / 100,
      wardrobeHeightM: heightCm / 100,
      wardrobeDepthM: depthCm / 100,
      wardrobeDoorsCount: doorsCount,
    };
    const meta = metaUiOnly(App, { source: 'builder:dims' }, 'builder:dims');
    syncDimensionRuntimePatch(App, patch, meta, { activeId: forceBuild ? '' : activeId });
  }

  return { skipBuild: false, widthCm, heightCm, depthCm, doorsCount, chestDrawersCount };
}
