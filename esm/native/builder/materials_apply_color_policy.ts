import { isDrawerBoxPartId } from '../features/drawer_box_identity.js';
import { isFrontColorBraceShelvesOnlyMode } from '../features/front_color_shelf_inheritance.js';
import {
  SHELF_GROUP_PART_ID,
  CORNER_SHELF_GROUP_PART_ID,
  isShelfBoardPartId,
  resolveShelfGroupPartId,
} from '../features/shelf_part_identity.js';
import type { AppContainer, BuilderMaterialsServiceLike } from '../../../types';
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
import { resolveGlobalFrontMaterialInput, resolveSelectionFrontMaterial } from './material_selection.js';

export type MaterialGetter = NonNullable<BuilderMaterialsServiceLike['getMaterial']>;

export type MaterialsApplyColorContext = {
  ui: BuildUiLike;
  cfg: MaterialsCfgLike;
  globalFrontMat: unknown;
  getPartMat: (partId: string, stackKey: PartStackKey, userData?: ValueRecord | null) => unknown;
};

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
}): unknown {
  const { ui, cfg, getMaterial } = args;
  const materialInput = resolveGlobalFrontMaterialInput({
    colorChoice: getUiVal(ui, 'color', '#ffffff'),
    customColor: getUiVal(ui, 'customColorPicker', '#ffffff'),
    cfg,
  });

  return getMaterial(materialInput.colorKey, 'front', materialInput.useTexture, materialInput.textureDataURL);
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

    return resolveSelectionFrontMaterial({
      selection: effectiveEntry,
      cfg,
      getMaterial,
      customColor: getUiVal(ui, 'customColorPicker', '#ffffff'),
    });
  };
}

export function resolveMaterialsApplyColorContext(args: {
  App: AppContainer;
  getMaterial: MaterialGetter;
}): MaterialsApplyColorContext | null {
  const { App, getMaterial } = args;
  const ui = getBuildUi(App);
  const cfg = getMaterialsCfg(App);
  const globalFrontMat = resolveGlobalFrontMaterial({ ui, cfg, getMaterial });
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
