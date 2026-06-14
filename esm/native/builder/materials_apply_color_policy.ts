import { isDrawerBoxPartId } from '../features/drawer_box_identity.js';
import { isFrontColorBraceShelvesOnlyMode } from '../features/front_color_shelf_inheritance.js';
import {
  SHELF_GROUP_PART_ID,
  CORNER_SHELF_GROUP_PART_ID,
  isShelfBoardPartId,
  resolveShelfGroupPartId,
} from '../features/shelf_part_identity.js';
import { hasCustomUploadedTexture } from '../runtime/textures_cache_access.js';
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
  type ValueRecord,
} from './materials_apply_shared.js';
import { readPartColorEntry } from './material_color_lookup.js';

export type MaterialGetter = NonNullable<BuilderMaterialsServiceLike['getMaterial']>;

export type MaterialsApplyColorContext = {
  ui: BuildUiLike;
  cfg: MaterialsCfgLike;
  globalFrontMat: unknown;
  getPartMat: (partId: string, stackKey: PartStackKey, userData?: ValueRecord | null) => unknown;
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

function isShelfLikePart(partId: string, userData?: ValueRecord | null): boolean {
  if (isShelfBoardPartId(partId)) return true;
  const groupPartId = typeof userData?.__wpShelfGroupPartId === 'string' ? userData.__wpShelfGroupPartId : '';
  return groupPartId === SHELF_GROUP_PART_ID || groupPartId === CORNER_SHELF_GROUP_PART_ID;
}

function resolveShelfGroupFromUserData(partId: string, userData?: ValueRecord | null): string | null {
  const groupPartId = typeof userData?.__wpShelfGroupPartId === 'string' ? userData.__wpShelfGroupPartId : '';
  if (groupPartId === SHELF_GROUP_PART_ID || groupPartId === CORNER_SHELF_GROUP_PART_ID) return groupPartId;
  return resolveShelfGroupPartId(partId);
}

function isBraceShelfUserData(userData?: ValueRecord | null): boolean {
  if (!userData) return false;
  if (userData.__wpShelfIsBrace === true) return true;
  return userData.__wpShelfVariant === 'brace';
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
}): (partId: string, stackKey: PartStackKey, userData?: ValueRecord | null) => unknown {
  const { ui, cfg, getMaterial, globalFrontMat } = args;
  const isMulti = !!cfg.isMultiColorMode;
  let whiteBodyMat: unknown | undefined;
  const getWhiteBodyMat = () => {
    if (!whiteBodyMat) whiteBodyMat = getMaterial('#ffffff', 'body', false);
    return whiteBodyMat || globalFrontMat;
  };
  const getDrawerBoxBaseMat = getWhiteBodyMat;
  const mapFromCfg = asObject<IndividualColorsMap>(cfg.individualColors);
  const frontColorBraceOnly = isFrontColorBraceShelvesOnlyMode(ui.frontColorShelfInheritanceMode);

  return (partId: string, stackKey: PartStackKey, userData?: ValueRecord | null) => {
    if (!partId) return globalFrontMat;
    const shelfLike = isShelfLikePart(partId, userData);
    const shelfGroupPartId = shelfLike ? resolveShelfGroupFromUserData(partId, userData) : null;
    const entry = readPartColorEntry({
      individualColors: mapFromCfg,
      isMulti,
      partId,
      stackKey,
    });
    const groupEntry =
      typeof entry === 'undefined' && shelfGroupPartId
        ? readPartColorEntry({
            individualColors: mapFromCfg,
            isMulti,
            partId: shelfGroupPartId,
            stackKey,
          })
        : undefined;
    const effectiveEntry = typeof entry === 'undefined' ? groupEntry : entry;
    if (
      isDrawerBoxPartId(partId) &&
      (typeof effectiveEntry === 'undefined' ||
        effectiveEntry === 'mirror' ||
        effectiveEntry === 'glass' ||
        !effectiveEntry)
    ) {
      return getDrawerBoxBaseMat();
    }
    if (typeof effectiveEntry === 'undefined') {
      if (frontColorBraceOnly && shelfLike) {
        return isBraceShelfUserData(userData) ? globalFrontMat : getWhiteBodyMat();
      }
      return globalFrontMat;
    }
    if (effectiveEntry === 'mirror' || effectiveEntry === 'glass') return globalFrontMat;

    const selection = String(effectiveEntry || '');
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
  const globalFrontMat = resolveGlobalFrontMaterial({ ui, cfg, getMaterial, App });
  if (!globalFrontMat) return null;

  return {
    ui,
    cfg,
    globalFrontMat,
    getPartMat: createPartMaterialResolver({
      ui,
      cfg,
      getMaterial,
      globalFrontMat,
    }),
  };
}
