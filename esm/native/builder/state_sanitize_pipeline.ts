import type { AppContainer, UnknownRecord } from '../../../types';

import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { coerceFiniteInt, coerceFiniteNumber } from '../runtime/num_coerce.js';
import { syncDimensionRuntimePatch } from '../runtime/dimension_sync_coalescer.js';
import { metaUiOnly } from '../runtime/meta_profiles_access.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { WARDROBE_SANITIZATION_POLICY } from '../../shared/dimensions/wardrobe_sanitization_policy.js';

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
  const minDoorsAllowed = isSliding
    ? WARDROBE_SANITIZATION_POLICY.limits.doors.slidingMin
    : WARDROBE_SANITIZATION_POLICY.limits.doors.min;
  const minWLimit = isChestMode
    ? WARDROBE_SANITIZATION_POLICY.limits.width.chestMinCm
    : WARDROBE_SANITIZATION_POLICY.limits.width.minCm;
  const minHLimit = isChestMode
    ? WARDROBE_SANITIZATION_POLICY.limits.height.chestMinCm
    : WARDROBE_SANITIZATION_POLICY.limits.height.minCm;

  const defaultDepth = WARDROBE_SANITIZATION_POLICY.resolveDepthCm(cfg.wardrobeType);
  const defaultDoors = WARDROBE_SANITIZATION_POLICY.resolveDoorsCount(cfg.wardrobeType);

  const rawWidth = _toNum(raw.width, WARDROBE_SANITIZATION_POLICY.defaults.widthCm);
  const rawHeight = _toNum(raw.height, WARDROBE_SANITIZATION_POLICY.defaults.heightCm);
  const rawDepth = _toNum(raw.depth, defaultDepth);
  // Prefer raw['doors'] but fall back to ui.doors (some loaders/flows persist only the normalized field).
  const rawDoors = _toInt(raw['doors'] != null ? raw['doors'] : ui.doors, defaultDoors);
  const rawChestDrawers = _toInt(
    raw.chestDrawersCount,
    WARDROBE_SANITIZATION_POLICY.defaults.chestDrawersCount
  );

  const forceBuild = !!ui.forceBuild;
  const activeId = formatIdentityValue(readIdentityValue(ui.__activeId));

  // Mid-edit skip rules (do NOT throw; just skip build to avoid fight with the input field).
  if (!forceBuild) {
    if (
      activeId === 'width' &&
      (rawWidth < minWLimit || rawWidth > WARDROBE_SANITIZATION_POLICY.limits.width.maxCm)
    ) {
      return { skipBuild: true, widthCm: 0, heightCm: 0, depthCm: 0, doorsCount: 0, chestDrawersCount: 0 };
    }
    if (
      activeId === 'height' &&
      (rawHeight < minHLimit || rawHeight > WARDROBE_SANITIZATION_POLICY.limits.height.maxCm)
    ) {
      return { skipBuild: true, widthCm: 0, heightCm: 0, depthCm: 0, doorsCount: 0, chestDrawersCount: 0 };
    }
    if (
      activeId === 'depth' &&
      (rawDepth < WARDROBE_SANITIZATION_POLICY.limits.depth.minCm ||
        rawDepth > WARDROBE_SANITIZATION_POLICY.limits.depth.maxCm)
    ) {
      return { skipBuild: true, widthCm: 0, heightCm: 0, depthCm: 0, doorsCount: 0, chestDrawersCount: 0 };
    }
    if (
      activeId === 'doors' &&
      (rawDoors < minDoorsAllowed || rawDoors > WARDROBE_SANITIZATION_POLICY.limits.doors.max)
    ) {
      return { skipBuild: true, widthCm: 0, heightCm: 0, depthCm: 0, doorsCount: 0, chestDrawersCount: 0 };
    }
  }

  const isNoMainWardrobe = !isChestMode && !isSliding && rawDoors === 0;
  const widthCm = isNoMainWardrobe
    ? 0
    : Math.max(minWLimit, Math.min(WARDROBE_SANITIZATION_POLICY.limits.width.maxCm, rawWidth));
  const heightCm = Math.max(minHLimit, Math.min(WARDROBE_SANITIZATION_POLICY.limits.height.maxCm, rawHeight));
  const depthCm = Math.max(
    WARDROBE_SANITIZATION_POLICY.limits.depth.minCm,
    Math.min(WARDROBE_SANITIZATION_POLICY.limits.depth.maxCm, rawDepth)
  );

  const doorsCount = Math.max(
    minDoorsAllowed,
    Math.min(WARDROBE_SANITIZATION_POLICY.limits.doors.max, rawDoors)
  );

  const chestDrawersCount = Math.max(
    WARDROBE_SANITIZATION_POLICY.limits.chestDrawers.min,
    Math.min(
      WARDROBE_SANITIZATION_POLICY.limits.chestDrawers.max,
      rawChestDrawers || WARDROBE_SANITIZATION_POLICY.defaults.chestDrawersCount
    )
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
