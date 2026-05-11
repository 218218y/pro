// Chest-Mode Build Pipeline (ESM)
//
// Keeps the builder core clean: chest-only builds have a different flow (no module loop).
// Best-effort side effects are preserved (render/update/finalize are wrapped)
// to avoid breaking UX during chest-only edits.

import { CHEST_MODE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { guardVoid } from '../runtime/api.js';
import { runBuilderChestModeFollowThrough } from '../runtime/builder_service_access.js';

function asFiniteNumber(v: unknown, name: string): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`[WardrobePro] Chest mode: ${name} must be a finite number`);
  }
  return n;
}

type BuildChestModeIfNeededParams = {
  App?: unknown;
  ui?: {
    isChestMode?: boolean;
    baseType?: string;
    baseLegStyle?: string;
    baseLegColor?: string;
    basePlinthHeightCm?: number | string;
    baseLegHeightCm?: number | string;
    baseLegWidthCm?: number | string;
    colorChoice?: string;
    customColor?: string;
    doorStyle?: string;
    groovesEnabled?: boolean;
    chestCommodeEnabled?: boolean;
    chestCommodeMirrorHeightCm?: number | string;
    chestCommodeMirrorWidthCm?: number | string;
  } | null;
  widthCm?: number | string;
  heightCm?: number | string;
  depthCm?: number | string;
  drawersCount?: number | string;
  buildChestOnly?: (args: {
    H: number;
    totalW: number;
    D: number;
    drawersCount: number;
    baseType: string;
    baseLegStyle: string;
    baseLegColor: string;
    basePlinthHeightCm: number | string;
    baseLegHeightCm: number | string;
    baseLegWidthCm: number | string;
    colorChoice: string;
    customColor: string;
    doorStyle: string;
    isGroovesEnabled: boolean;
    chestCommodeEnabled: boolean;
    chestCommodeMirrorHeightCm: number | string;
    chestCommodeMirrorWidthCm: number | string;
  }) => void;
};

export function buildChestModeIfNeeded(params: BuildChestModeIfNeededParams | null | undefined) {
  const p = params || {};
  const ui = p.ui || null;

  if (!ui?.isChestMode) return false;

  const widthCm = asFiniteNumber(p.widthCm ?? 0, 'widthCm');
  const heightCm = asFiniteNumber(p.heightCm ?? 0, 'heightCm');
  const depthCm = asFiniteNumber(p.depthCm ?? 0, 'depthCm');

  const drawersCountRaw = typeof p.drawersCount === 'number' ? p.drawersCount : Number(p.drawersCount ?? 0);
  const drawersCount = Number.isFinite(drawersCountRaw) ? drawersCountRaw : 0;

  const buildChestOnly = p.buildChestOnly;
  if (typeof buildChestOnly !== 'function') {
    throw new Error('[WardrobePro] Builder tools missing: modules.buildChestOnly');
  }

  buildChestOnly({
    H: heightCm / 100,
    totalW: widthCm / 100,
    D: depthCm / 100,
    drawersCount: drawersCount,
    baseType: typeof ui.baseType === 'string' ? ui.baseType : '',
    baseLegStyle: typeof ui.baseLegStyle === 'string' ? ui.baseLegStyle : '',
    baseLegColor: typeof ui.baseLegColor === 'string' ? ui.baseLegColor : '',
    basePlinthHeightCm: ui.basePlinthHeightCm ?? '',
    baseLegHeightCm: ui.baseLegHeightCm ?? '',
    baseLegWidthCm: ui.baseLegWidthCm ?? '',
    colorChoice: typeof ui.colorChoice === 'string' ? ui.colorChoice : '',
    customColor: typeof ui.customColor === 'string' ? ui.customColor : '',
    doorStyle: typeof ui.doorStyle === 'string' ? ui.doorStyle : 'flat',
    isGroovesEnabled: !!ui.groovesEnabled,
    chestCommodeEnabled: !!ui.chestCommodeEnabled,
    chestCommodeMirrorHeightCm:
      ui.chestCommodeMirrorHeightCm ?? CHEST_MODE_DIMENSIONS.commode.defaultMirrorHeightCm,
    chestCommodeMirrorWidthCm: ui.chestCommodeMirrorWidthCm ?? widthCm,
  });

  const base = { where: 'builder/chest_mode_pipeline' };

  guardVoid(p.App, { ...base, op: 'builder.chestModeFollowThrough', failFast: true }, () => {
    runBuilderChestModeFollowThrough(p.App, {
      applyHandles: true,
      renderViewport: true,
      finalizeRegistry: true,
    });
  });
  return true;
}
