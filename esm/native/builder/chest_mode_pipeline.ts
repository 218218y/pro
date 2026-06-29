// Chest-Mode Build Pipeline (ESM)
//
// Keeps the builder core clean: chest-only builds have a different flow (no module loop).
// Best-effort side effects are preserved (render/update/finalize are wrapped)
// to avoid breaking UX during chest-only edits.

import { CHEST_MODE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { guardVoid } from '../runtime/api.js';
import {
  getDefaultBaseLegWidthCm,
  normalizeBaseLegHeightCm,
  normalizeBaseLegStyle,
  normalizeBaseLegWidthCm,
} from '../features/base_leg_support.js';
import { normalizeBasePlinthHeightCm } from '../features/base_plinth_support.js';
import {
  normalizeBaseLegPlatformFrontOverhangCm,
  normalizeBaseLegPlatformSideOverhangCm,
} from '../features/platform_overhang_support.js';
import { runBuilderChestModeFollowThrough } from '../runtime/builder_service_access.js';
import { requireChestModeConfigSnapshot } from './visuals_chest_mode_config.js';

import type { BuilderContentsRenderPolicy, ConfigStateLike, UnknownRecord } from '../../../types/index.js';

function asFiniteNumber(v: unknown, name: string): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  throw new Error(`[WardrobePro] Chest mode: ${name} must be a finite number`);
}

type BuildChestModeIfNeededParams = {
  App?: unknown;
  ui?: {
    isChestMode?: boolean;
    baseType?: string;
    baseLegStyle?: string;
    baseLegColor?: string;
    baseLegPlatformMode?: string;
    baseLegPlatformSideMode?: string;
    baseLegPlatformSideOverhangCm?: number;
    baseLegPlatformFrontOverhangCm?: number;
    basePlinthHeightCm?: number;
    baseLegHeightCm?: number;
    baseLegWidthCm?: number;
    colorChoice?: string;
    customColor?: string;
    doorStyle?: string;
    groovesEnabled?: boolean;
    chestCommodeEnabled?: boolean;
    chestCommodeMirrorHeightCm?: number;
    chestCommodeMirrorWidthCm?: number;
  } | null;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  drawersCount?: number;
  cfgSnapshot?: ConfigStateLike | UnknownRecord | null;
  renderPolicy?: BuilderContentsRenderPolicy;
  buildChestOnly?: (args: {
    H: number;
    totalW: number;
    D: number;
    drawersCount: number;
    baseType: string;
    baseLegStyle: string;
    baseLegColor: string;
    baseLegPlatformMode: string;
    baseLegPlatformSideMode: string;
    baseLegPlatformSideOverhangCm: number;
    baseLegPlatformFrontOverhangCm: number;
    basePlinthHeightCm: number;
    baseLegHeightCm: number;
    baseLegWidthCm: number;
    colorChoice: string;
    customColor: string;
    doorStyle: string;
    isGroovesEnabled: boolean;
    chestCommodeEnabled: boolean;
    chestCommodeMirrorHeightCm: number;
    chestCommodeMirrorWidthCm: number;
    cfgSnapshot: ConfigStateLike | UnknownRecord;
    renderPolicy: BuilderContentsRenderPolicy;
  }) => void;
};

export function buildChestModeIfNeeded(params: BuildChestModeIfNeededParams | null | undefined) {
  const p = params || {};
  const ui = p.ui || null;

  if (!ui?.isChestMode) return false;

  const widthCm = asFiniteNumber(p.widthCm ?? 0, 'widthCm');
  const heightCm = asFiniteNumber(p.heightCm ?? 0, 'heightCm');
  const depthCm = asFiniteNumber(p.depthCm ?? 0, 'depthCm');

  const drawersCount = asFiniteNumber(p.drawersCount ?? 0, 'drawersCount');

  const baseLegStyle = normalizeBaseLegStyle(ui.baseLegStyle);

  const buildChestOnly = p.buildChestOnly;
  if (typeof buildChestOnly !== 'function') {
    throw new Error('[WardrobePro] Builder tools missing: modules.buildChestOnly');
  }

  const cfgSnapshot = requireChestModeConfigSnapshot(p.cfgSnapshot, 'builder/chest_mode_pipeline');
  const renderPolicy = p.renderPolicy;
  if (!renderPolicy || typeof renderPolicy.sketchMode !== 'boolean') {
    throw new Error('[WardrobePro] Chest mode: snapshot renderPolicy is required');
  }

  buildChestOnly({
    H: heightCm / 100,
    totalW: widthCm / 100,
    D: depthCm / 100,
    drawersCount: drawersCount,
    baseType: typeof ui.baseType === 'string' ? ui.baseType : '',
    baseLegStyle: typeof ui.baseLegStyle === 'string' ? ui.baseLegStyle : '',
    baseLegColor: typeof ui.baseLegColor === 'string' ? ui.baseLegColor : '',
    baseLegPlatformMode: typeof ui.baseLegPlatformMode === 'string' ? ui.baseLegPlatformMode : 'stage',
    baseLegPlatformSideMode:
      typeof ui.baseLegPlatformSideMode === 'string' ? ui.baseLegPlatformSideMode : 'overhang',
    baseLegPlatformSideOverhangCm: normalizeBaseLegPlatformSideOverhangCm(ui.baseLegPlatformSideOverhangCm),
    baseLegPlatformFrontOverhangCm: normalizeBaseLegPlatformFrontOverhangCm(
      ui.baseLegPlatformFrontOverhangCm
    ),
    basePlinthHeightCm: normalizeBasePlinthHeightCm(ui.basePlinthHeightCm),
    baseLegHeightCm: normalizeBaseLegHeightCm(ui.baseLegHeightCm),
    baseLegWidthCm: normalizeBaseLegWidthCm(ui.baseLegWidthCm, getDefaultBaseLegWidthCm(baseLegStyle)),
    colorChoice: typeof ui.colorChoice === 'string' ? ui.colorChoice : '',
    customColor: typeof ui.customColor === 'string' ? ui.customColor : '',
    doorStyle: typeof ui.doorStyle === 'string' ? ui.doorStyle : 'flat',
    isGroovesEnabled: !!ui.groovesEnabled,
    chestCommodeEnabled: !!ui.chestCommodeEnabled,
    chestCommodeMirrorHeightCm:
      ui.chestCommodeMirrorHeightCm ?? CHEST_MODE_DIMENSIONS.commode.defaultMirrorHeightCm,
    chestCommodeMirrorWidthCm: ui.chestCommodeMirrorWidthCm ?? widthCm,
    cfgSnapshot,
    renderPolicy,
  });

  const base = { where: 'builder/chest_mode_pipeline' };

  guardVoid(p.App, { ...base, op: 'builder.chestModeFollowThrough', failFast: true }, () => {
    runBuilderChestModeFollowThrough(p.App, {
      applyHandles: true,
      renderViewport: true,
      finalizeRegistry: true,
      cfgSnapshot,
      addOutlines: renderPolicy.addOutlines,
      removeDoorsEnabled: false,
    });
  });
  return true;
}
