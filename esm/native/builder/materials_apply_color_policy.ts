import { hasCustomUploadedTexture } from '../runtime/textures_cache_access.js';
import { readMap } from '../runtime/maps_access.js';
import type { AppContainer, BuilderMaterialsServiceLike, SavedColorLike } from '../../../types';
import type { IndividualColorsMap } from '../../../types/maps';
import {
  asObject,
  getBuildUi,
  getMaterialsCfg,
  getUiVal,
  type BuildUiLike,
  type MaterialsCfgLike,
  type PartStackKey,
} from './materials_apply_shared.js';

export type MaterialGetter = NonNullable<BuilderMaterialsServiceLike['getMaterial']>;

export type MaterialsApplyColorContext = {
  ui: BuildUiLike;
  cfg: MaterialsCfgLike;
  globalFrontMat: unknown;
  getPartMat: (partId: string, stackKey: PartStackKey) => unknown;
};

function readSavedColors(cfg: MaterialsCfgLike): SavedColorLike[] {
  return Array.isArray(cfg.savedColors) ? cfg.savedColors : [];
}

function findSavedColor(cfg: MaterialsCfgLike, id: string): SavedColorLike | null {
  const savedColors = readSavedColors(cfg);
  for (let i = 0; i < savedColors.length; i += 1) {
    const saved = savedColors[i];
    if (saved && saved.id === id) return saved;
  }
  return null;
}

export function readPartId(value: unknown): string | null {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export function readStackKey(value: unknown): PartStackKey {
  if (value === 'top' || value === 'bottom') return value;
  return null;
}

export function scopeCornerPartKeyForStack(partId: string, stackKey: PartStackKey): string {
  if (!partId || stackKey !== 'bottom') return partId;
  if (partId.startsWith('lower_')) return partId;
  if (partId.startsWith('corner_')) return `lower_${partId}`;
  return partId;
}

export function readPartColorEntry(args: {
  individualColors: IndividualColorsMap | null | undefined;
  isMulti: boolean;
  partId: string;
  stackKey: PartStackKey;
}): unknown {
  const { individualColors, isMulti, partId, stackKey } = args;
  if (!partId || !isMulti || !individualColors) return undefined;

  const scopedPartId = scopeCornerPartKeyForStack(partId, stackKey);
  if (scopedPartId !== partId) {
    if (Object.prototype.hasOwnProperty.call(individualColors, scopedPartId)) {
      return individualColors[scopedPartId];
    }
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(individualColors, partId)) {
    return individualColors[partId];
  }

  if (
    partId === 'cornice_wave_front' ||
    partId === 'cornice_wave_side_left' ||
    partId === 'cornice_wave_side_right'
  ) {
    return Object.prototype.hasOwnProperty.call(individualColors, 'cornice_color')
      ? individualColors.cornice_color
      : undefined;
  }

  if (
    partId === 'corner_cornice_front' ||
    partId === 'corner_cornice_side_left' ||
    partId === 'corner_cornice_side_right' ||
    partId === 'lower_corner_cornice_front' ||
    partId === 'lower_corner_cornice_side_left' ||
    partId === 'lower_corner_cornice_side_right'
  ) {
    const groupKey = partId.startsWith('lower_') ? 'lower_corner_cornice' : 'corner_cornice';
    return Object.prototype.hasOwnProperty.call(individualColors, groupKey)
      ? individualColors[groupKey]
      : undefined;
  }

  return undefined;
}

function resolveGlobalFrontMaterial(args: {
  ui: BuildUiLike;
  cfg: MaterialsCfgLike;
  getMaterial: MaterialGetter;
  App: AppContainer;
}): unknown {
  const { ui, cfg, getMaterial, App } = args;

  let colorChoice = String(getUiVal(ui, 'color', '#ffffff') || '#ffffff');
  let colorHex = colorChoice;
  let useTexture = false;
  let textureDataURL: string | null = null;

  if (colorHex === 'custom') {
    textureDataURL = typeof cfg.customUploadedDataURL === 'string' ? cfg.customUploadedDataURL : null;
    if (textureDataURL) {
      useTexture = true;
    } else if (hasCustomUploadedTexture(App)) {
      useTexture = true;
    } else {
      colorHex = String(getUiVal(ui, 'customColorPicker', '#ffffff') || '#ffffff');
    }
  } else if (colorHex.indexOf('saved_') === 0) {
    const saved = findSavedColor(cfg, colorHex);
    if (saved && saved.type === 'texture' && saved.textureData) {
      useTexture = true;
      textureDataURL = String(saved.textureData);
    } else if (saved && typeof saved.value === 'string') {
      colorHex = saved.value;
    }
  }

  return getMaterial(colorHex, 'front', useTexture, textureDataURL);
}

export function createPartMaterialResolver(args: {
  ui: BuildUiLike;
  cfg: MaterialsCfgLike;
  getMaterial: MaterialGetter;
  globalFrontMat: unknown;
}): (partId: string, stackKey: PartStackKey) => unknown {
  const { ui, cfg, getMaterial, globalFrontMat } = args;
  const isMulti = !!cfg.isMultiColorMode;
  const mapFromCfg = asObject<IndividualColorsMap>(cfg.individualColors);

  return (partId: string, stackKey: PartStackKey) => {
    if (!partId) return globalFrontMat;
    const entry = readPartColorEntry({
      individualColors: mapFromCfg,
      isMulti,
      partId,
      stackKey,
    });
    if (typeof entry === 'undefined') return globalFrontMat;
    if (entry === 'mirror' || entry === 'glass') return globalFrontMat;

    const selection = String(entry || '');
    if (selection.indexOf('saved_') === 0) {
      const saved = findSavedColor(cfg, selection);
      if (saved) {
        if (saved.type === 'texture' && saved.textureData) {
          return getMaterial(saved.value, 'front', true, String(saved.textureData));
        }
        return getMaterial(saved.value, 'front', false);
      }
    }

    if (selection === 'custom') {
      const customColor = String(getUiVal(ui, 'customColorPicker', '#ffffff') || '#ffffff');
      return getMaterial(customColor, 'front', false);
    }

    return getMaterial(selection, 'front', false);
  };
}

export function resolveMaterialsApplyColorContext(args: {
  App: AppContainer;
  getMaterial: MaterialGetter;
}): MaterialsApplyColorContext | null {
  const { App, getMaterial } = args;
  const ui = getBuildUi(App);
  const cfg = getMaterialsCfg(App);
  const mapFromRuntime = asObject<IndividualColorsMap>(readMap(App, 'individualColors'));
  const globalFrontMat = resolveGlobalFrontMaterial({ ui, cfg, getMaterial, App });
  if (!globalFrontMat) return null;

  const effectiveCfg: MaterialsCfgLike = mapFromRuntime ? { ...cfg, individualColors: mapFromRuntime } : cfg;

  return {
    ui,
    cfg: effectiveCfg,
    globalFrontMat,
    getPartMat: createPartMaterialResolver({
      ui,
      cfg: effectiveCfg,
      getMaterial,
      globalFrontMat,
    }),
  };
}
