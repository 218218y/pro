import { isDrawerBoxPartId } from '../features/drawer_box_identity.js';
import { hasCustomUploadedTexture } from '../runtime/textures_cache_access.js';
import { getBaseLegColorHex, type BaseLegColor } from '../features/base_leg_support.js';

import type {
  AppContainer,
  BuilderGetMaterialFn,
  ConfigStateLike,
  IndividualColorsMap,
  SavedColorLike,
  ThreeLike,
} from '../../../types/index.js';

import {
  findSavedColorById,
  getChestModeMaterial,
  getMirrorMaterialFromServices,
  readChestModeIndividualColorsMap,
} from './visuals_chest_mode_runtime.js';
import { requireChestModeConfigSnapshot } from './visuals_chest_mode_config.js';

export type ChestModeBodyMaterialState = {
  colorHex: string;
  useTexture: boolean;
};

export type ChestModeMaterialPalette = {
  globalBodyMat: unknown;
  drawerBoxMat: unknown;
  legMat: unknown;
};

export type ChestModePartColorValueResolverInput = {
  App?: AppContainer;
  cfg: ConfigStateLike;
  individualColors?: IndividualColorsMap | null;
};

export function resolveChestModeBodyMaterialState(input: {
  App?: AppContainer;
  colorChoice?: unknown;
  customColor?: unknown;
  cfg: ConfigStateLike;
  hasCustomTexture?: boolean;
  findSavedColor?: ((cfg: ConfigStateLike, id: string) => SavedColorLike | null) | null;
}): ChestModeBodyMaterialState {
  const colorChoice = String(input.colorChoice || '#ffffff');
  const customColor = String(input.customColor || '#ffffff');
  const cfg = requireChestModeConfigSnapshot(input.cfg, 'visuals_chest_mode.materials');
  const hasCustomTexture =
    typeof input.hasCustomTexture === 'boolean'
      ? input.hasCustomTexture
      : !!(input.App && hasCustomUploadedTexture(input.App));
  const findSavedColor = input.findSavedColor || findSavedColorById;

  let colorHex = colorChoice;
  let useTexture = false;

  if (colorHex === 'custom') {
    if (hasCustomTexture) useTexture = true;
    else colorHex = customColor;
  } else if (colorHex.startsWith('saved_')) {
    const saved = findSavedColor(cfg, colorHex);
    if (saved && saved.type === 'texture') useTexture = true;
    else if (saved && typeof saved.value === 'string') colorHex = saved.value;
  }

  return { colorHex, useTexture };
}

export function resolveChestModeMaterialPalette(input: {
  App: AppContainer;
  bodyState: ChestModeBodyMaterialState;
  legColor?: BaseLegColor | string;
  getMaterial?: BuilderGetMaterialFn | null;
}): ChestModeMaterialPalette {
  const getMaterial =
    input.getMaterial ||
    ((...args: Parameters<BuilderGetMaterialFn>) => getChestModeMaterial(input.App, ...args));
  const globalBodyMat = getMaterial(input.bodyState.colorHex, 'front', input.bodyState.useTexture);
  const drawerBoxMat = getMaterial('#ffffff', 'body', false);
  return {
    globalBodyMat,
    drawerBoxMat,
    legMat: getMaterial(getBaseLegColorHex(input.legColor), 'metal'),
  };
}

export function createChestModePartColorValueResolver(
  input: ChestModePartColorValueResolverInput
): (partId: string) => string | null | undefined {
  const cfg = requireChestModeConfigSnapshot(input.cfg, 'visuals_chest_mode.colorResolver');
  const individualColors =
    typeof input.individualColors === 'undefined'
      ? readChestModeIndividualColorsMap(cfg.individualColors)
      : readChestModeIndividualColorsMap(input.individualColors);

  return (partId: string) => {
    if (!cfg.isMultiColorMode || !individualColors || !partId) return undefined;
    if (!Object.prototype.hasOwnProperty.call(individualColors, partId)) return undefined;
    const value = individualColors[partId];
    if (value === null) return null;
    if (typeof value === 'undefined') return undefined;
    return String(value);
  };
}

export function resolveChestModeDrawerBoxMaterial(input: {
  globalDrawerBoxMat: unknown;
  drawerBoxMaterial?: unknown;
  drawerBoxColorValue?: unknown;
  partMaterial?: unknown;
  partColorValue?: unknown;
}): unknown {
  const rawValue =
    typeof input.drawerBoxColorValue !== 'undefined' ? input.drawerBoxColorValue : input.partColorValue;
  const value = typeof rawValue === 'string' ? rawValue : '';
  if (!value || value === 'mirror' || value === 'glass') return input.globalDrawerBoxMat;
  return input.drawerBoxMaterial || input.partMaterial || input.globalDrawerBoxMat;
}

export function createChestModePartMaterialResolver(input: {
  App: AppContainer;
  THREE: ThreeLike;
  globalBodyMat: unknown;
  drawerBoxMat?: unknown;
  cfg: ConfigStateLike;
  getMaterial?: BuilderGetMaterialFn | null;
  individualColors?: IndividualColorsMap | null;
  resolveMirrorMaterial?: (() => unknown) | null;
}): (partId: string) => unknown {
  const App = input.App;
  const THREE = input.THREE;
  const cfg = requireChestModeConfigSnapshot(input.cfg, 'visuals_chest_mode.materialResolver');
  const getMaterial =
    input.getMaterial || ((...args: Parameters<BuilderGetMaterialFn>) => getChestModeMaterial(App, ...args));
  const getPartColorValue = createChestModePartColorValueResolver({
    App,
    cfg,
    individualColors: input.individualColors,
  });
  const resolveMirrorMaterial =
    input.resolveMirrorMaterial || (() => getMirrorMaterialFromServices(App, THREE));

  return (partId: string) => {
    const value = getPartColorValue(partId);
    if (isDrawerBoxPartId(partId) && (!value || value === 'mirror' || value === 'glass')) {
      return input.drawerBoxMat || input.globalBodyMat;
    }
    if (!value) return input.globalBodyMat;
    if (value === 'mirror') return resolveMirrorMaterial();
    if (value === 'glass') return input.globalBodyMat;
    if (String(value).startsWith('saved_')) {
      const saved = findSavedColorById(cfg, String(value));
      if (saved) return getMaterial(saved.value, 'front', saved.type === 'texture');
    }
    return getMaterial(value, 'front', false);
  };
}
