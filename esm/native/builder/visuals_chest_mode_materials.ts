import { readMap } from '../runtime/maps_access.js';
import { hasCustomUploadedTexture } from '../runtime/textures_cache_access.js';
import { getBaseLegColorHex, type BaseLegColor } from '../features/base_leg_support.js';
import { getCfg } from './store_access.js';

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

export type ChestModeBodyMaterialState = {
  colorHex: string;
  useTexture: boolean;
};

export type ChestModeMaterialPalette = {
  globalBodyMat: unknown;
  drawerBoxMat: unknown;
  legMat: unknown;
};

const EMPTY_CONFIG_STATE: ConfigStateLike = {};

export function resolveChestModeBodyMaterialState(input: {
  App?: AppContainer;
  colorChoice?: unknown;
  customColor?: unknown;
  cfg?: ConfigStateLike;
  hasCustomTexture?: boolean;
  findSavedColor?: ((cfg: ConfigStateLike, id: string) => SavedColorLike | null) | null;
}): ChestModeBodyMaterialState {
  const colorChoice = String(input.colorChoice || '#ffffff');
  const customColor = String(input.customColor || '#ffffff');
  const cfg = input.cfg || (input.App ? getCfg(input.App) : EMPTY_CONFIG_STATE);
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
  return {
    globalBodyMat: getMaterial(input.bodyState.colorHex, 'front', input.bodyState.useTexture),
    drawerBoxMat: getMaterial(null, 'body'),
    legMat: getMaterial(getBaseLegColorHex(input.legColor), 'metal'),
  };
}

export function createChestModePartMaterialResolver(input: {
  App: AppContainer;
  THREE: ThreeLike;
  globalBodyMat: unknown;
  cfg?: ConfigStateLike;
  getMaterial?: BuilderGetMaterialFn | null;
  individualColors?: IndividualColorsMap | null;
  resolveMirrorMaterial?: (() => unknown) | null;
}): (partId: string) => unknown {
  const App = input.App;
  const THREE = input.THREE;
  const cfg = input.cfg || getCfg(App);
  const getMaterial =
    input.getMaterial || ((...args: Parameters<BuilderGetMaterialFn>) => getChestModeMaterial(App, ...args));
  const individualColors =
    input.individualColors ||
    readChestModeIndividualColorsMap(readMap(App, 'individualColors')) ||
    readChestModeIndividualColorsMap(cfg.individualColors);
  const resolveMirrorMaterial =
    input.resolveMirrorMaterial || (() => getMirrorMaterialFromServices(App, THREE));

  return (partId: string) => {
    const isMulti = !!cfg.isMultiColorMode;
    if (isMulti && individualColors && individualColors[partId]) {
      const value = individualColors[partId];
      if (value === 'mirror') return resolveMirrorMaterial();
      if (value === 'glass') return input.globalBodyMat;
      if (String(value).startsWith('saved_')) {
        const saved = findSavedColorById(cfg, String(value));
        if (saved) return getMaterial(saved.value, 'front', saved.type === 'texture');
      }
      return getMaterial(value, 'front', false);
    }
    return input.globalBodyMat;
  };
}
