// Corner wing: material resolution + multi-color/special doors

import { CORNER_SHELF_GROUP_PART_ID } from '../features/shelf_part_identity.js';
import { readDoorVisualMapEntry } from '../features/door_visual_map_lookup.js';
import { getCommonMatsOrThrow } from './common_mats_resolver.js';
import { asRecord, cloneRecord } from '../runtime/record.js';

import type {
  AppContainer,
  BuilderGetMaterialFn,
  BuilderGetMirrorMaterialFn,
  ConfigStateLike,
  DoorSpecialMap,
  DoorSpecialValue,
  HandlesMap,
  IndividualColorsMap,
  ThreeLike,
  UnknownRecord,
} from '../../../types/index.js';
import { resolveSelectionFrontMaterial } from './material_selection.js';

type MaterialsLike = {
  body: unknown;
  front: unknown;
  defaultShelfMat?: unknown;
  braceShelfMat?: unknown;
};

type RenderOpsLike = {
  getMirrorMaterial?: BuilderGetMirrorMaterialFn;
};

type GetMaterialFn = BuilderGetMaterialFn;
type ScopedReaderLike = ((key: string) => unknown) | null | undefined;
type SpecialDoorMode = 'mirror' | 'glass' | null;
type PartMap = UnknownRecord;

type CornerWingMaterialsResult = {
  masoniteMat: unknown;
  whiteMat: unknown;
  shadowMat: unknown;
  backPanelMaterialArray: unknown[];
  ghostDoorMat: unknown;
  individualColors: IndividualColorsMap;
  handlesMap: HandlesMap;
  doorSpecialMap: DoorSpecialMap;
  readScopedMapVal: (mapObj: PartMap | null | undefined, partId: unknown) => unknown;
  readScopedReader: (reader: ScopedReaderLike, partId: unknown) => unknown;
  getMirrorMat: () => unknown;
  resolveSpecial: (partId: string, curtainVal: unknown) => SpecialDoorMode;
  getCornerMat: (partId: string, defaultMat: unknown) => unknown;
  getCornerShelfMat: (partId: string, isBraceShelf?: boolean) => unknown;
  bodyMat: unknown;
  frontMat: unknown;
  defaultShelfMat: unknown;
  braceShelfMat: unknown;
};

function requireConfigSnapshot(value: unknown): ConfigStateLike {
  const cfg = asRecord<ConfigStateLike>(value);
  if (!cfg) throw new TypeError('[corner_materials] cfgSnapshot is required');
  return cfg;
}

function asMapRecord<T extends PartMap>(value: unknown): T | null {
  return asRecord<T>(value);
}

function ensureMapRecord<T extends PartMap>(value: unknown): T {
  return cloneRecord<T>(value);
}

function readDoorSpecialValue(value: unknown): DoorSpecialValue {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  return null;
}

function isCornerWingFloorPartId(partId: string): boolean {
  return partId === 'corner_floor' || partId === 'corner_floor_blind' || /^corner_floor_c\d+$/.test(partId);
}

function isCornerWingSidePartId(partId: string): boolean {
  return partId === 'corner_wing_side_left' || partId === 'corner_wing_side_right';
}

function isCornerPentagonAttachPartId(partId: string): boolean {
  return partId === 'corner_pent_attach_main' || partId === 'corner_pent_attach_wing';
}

function readOwnMapValue(map: PartMap, partId: string): unknown {
  return Object.prototype.hasOwnProperty.call(map, partId) ? map[partId] : undefined;
}

function readUniformArchivedUnifiedColor(
  map: PartMap,
  requiredKeys: string[],
  absentKeys: string[]
): unknown {
  for (let i = 0; i < absentKeys.length; i += 1) {
    if (typeof readOwnMapValue(map, absentKeys[i]) !== 'undefined') return undefined;
  }
  let color: unknown;
  for (let i = 0; i < requiredKeys.length; i += 1) {
    const value = readOwnMapValue(map, requiredKeys[i]);
    if (typeof value !== 'string' || !value) return undefined;
    if (i === 0) color = value;
    else if (value !== color) return undefined;
  }
  return color;
}

function readArchivedUnifiedCornerWingColor(map: PartMap): unknown {
  return readUniformArchivedUnifiedColor(
    map,
    [
      'corner_ceil',
      'corner_wing_side_left',
      'corner_wing_side_right',
      'lower_corner_wing_side_left',
      'lower_corner_wing_side_right',
      'lower_corner_floor',
    ],
    ['corner_floor', 'lower_corner_ceil']
  );
}

function readArchivedUnifiedCornerPentagonColor(map: PartMap): unknown {
  return readUniformArchivedUnifiedColor(
    map,
    [
      'corner_pent_ceil',
      'corner_pent_attach_main',
      'corner_pent_attach_wing',
      'lower_corner_pent_attach_main',
      'lower_corner_pent_attach_wing',
      'lower_corner_pent_floor',
    ],
    ['corner_pent_floor', 'lower_corner_pent_ceil']
  );
}

function readUnifiedCornerBaseKeyForLowerOuterBoard(partId: string): string | null {
  if (isCornerWingSidePartId(partId)) return partId;
  if (isCornerWingFloorPartId(partId)) return 'corner_floor';
  if (isCornerPentagonAttachPartId(partId)) return partId;
  if (partId === 'corner_pent_floor') return 'corner_pent_floor';
  return null;
}

function resolveUnifiedTopMiddleFloorColorKey(
  partId: string,
  stackKey: 'top' | 'bottom',
  unifiedFrame: boolean
): string | null {
  if (!unifiedFrame || stackKey !== 'top') return null;
  if (partId === 'corner_stack_mid_floor') return partId;
  if (partId === 'corner_stack_mid_floor_blind') return partId;
  if (/^corner_stack_mid_floor_c\d+$/.test(partId)) return partId;
  if (partId === 'corner_floor') return 'corner_stack_mid_floor';
  if (partId === 'corner_floor_blind') return 'corner_stack_mid_floor_blind';
  const cellMatch = /^corner_floor_c(\d+)$/.exec(partId);
  return cellMatch?.[1] ? `corner_stack_mid_floor_c${cellMatch[1]}` : null;
}

function shouldSuppressUnifiedTopMiddleBoard(
  partId: string,
  stackKey: 'top' | 'bottom',
  unifiedFrame: boolean
): boolean {
  if (resolveUnifiedTopMiddleFloorColorKey(partId, stackKey, unifiedFrame)) return false;
  if (!unifiedFrame || stackKey !== 'top') return false;
  return isCornerWingFloorPartId(partId) || partId === 'corner_pent_floor';
}

function __appUtilStr(App: AppContainer, value: unknown): string {
  const util = App.util;
  return util && typeof util.str === 'function' ? String(util.str(value)) : String(value ?? '');
}

export function createCornerWingMaterials(args: {
  App: AppContainer;
  THREE: ThreeLike;
  ro: RenderOpsLike | UnknownRecord | null | undefined;
  materials: MaterialsLike;
  getMaterial: GetMaterialFn;
  cfgSnapshot: ConfigStateLike | UnknownRecord;
  sketchMode: boolean;
  readMap: (name: string) => unknown;
  stackKey: 'top' | 'bottom';
  stackSplitEnabled: boolean;
  stackSplitUnifiedFrame?: boolean;
  stackScopePartKey?: (partId: unknown) => string;
}): CornerWingMaterialsResult {
  const { App, THREE, ro, materials, getMaterial, readMap, stackKey, stackSplitEnabled, stackScopePartKey } =
    args;
  const stackSplitUnifiedFrame = !!args.stackSplitUnifiedFrame;

  const cfg = requireConfigSnapshot(args.cfgSnapshot);
  const commonMats = getCommonMatsOrThrow({ App, THREE });
  const { masoniteMat, whiteMat, shadowMat } = commonMats;

  // Keep the corner back-panel face layout identical to the regular wardrobe back panel:
  // BoxGeometry material order is [+X, -X, +Y, -Y, +Z, -Z].
  // The interior-visible face is +Z (white), while the rear and thin outer edges stay masonite brown.
  const backPanelMaterialArray = [masoniteMat, masoniteMat, masoniteMat, masoniteMat, whiteMat, masoniteMat];
  const ghostDoorMat = new THREE.MeshBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  });

  const getNamedMap = <T extends PartMap>(name: string): T => {
    const raw = readMap(name);
    return ensureMapRecord<T>(raw);
  };

  const individualColors = getNamedMap<IndividualColorsMap>('individualColors');
  const handlesMap = getNamedMap<HandlesMap>('handlesMap');
  const doorSpecialMap = getNamedMap<DoorSpecialMap>('doorSpecialMap');

  const readScopedMapVal = (mapObj: PartMap | null | undefined, partId: unknown): unknown => {
    const rec = asMapRecord<PartMap>(mapObj);
    if (!rec) return undefined;
    const baseId = String(partId || '');
    if (!baseId) return undefined;
    const isIndividualColorsMap = rec === individualColors;
    if (isIndividualColorsMap) {
      const unifiedTopMiddleFloorKey = resolveUnifiedTopMiddleFloorColorKey(
        baseId,
        stackKey,
        stackSplitUnifiedFrame
      );
      if (unifiedTopMiddleFloorKey) {
        const scopedEntry = readDoorVisualMapEntry(rec, unifiedTopMiddleFloorKey);
        if (scopedEntry) return scopedEntry.value;
        const ownValue = readOwnMapValue(rec, unifiedTopMiddleFloorKey);
        return typeof ownValue !== 'undefined' ? ownValue : undefined;
      }
      if (shouldSuppressUnifiedTopMiddleBoard(baseId, stackKey, stackSplitUnifiedFrame)) {
        return undefined;
      }
    }
    const useScopedNamespace =
      stackSplitEnabled && stackKey === 'bottom' && typeof stackScopePartKey === 'function';
    const scopedId = useScopedNamespace ? String(stackScopePartKey(baseId) || '') : baseId;
    const archivedWingColor = isIndividualColorsMap ? readArchivedUnifiedCornerWingColor(rec) : undefined;
    const archivedPentagonColor = isIndividualColorsMap
      ? readArchivedUnifiedCornerPentagonColor(rec)
      : undefined;
    const unifiedBaseKey =
      isIndividualColorsMap && stackSplitUnifiedFrame && useScopedNamespace
        ? readUnifiedCornerBaseKeyForLowerOuterBoard(baseId)
        : null;
    const ignoreArchivedScopedUnifiedFrameColor =
      isIndividualColorsMap &&
      !stackSplitUnifiedFrame &&
      useScopedNamespace &&
      ((typeof archivedWingColor !== 'undefined' &&
        (isCornerWingSidePartId(baseId) || isCornerWingFloorPartId(baseId))) ||
        (typeof archivedPentagonColor !== 'undefined' &&
          (isCornerPentagonAttachPartId(baseId) || baseId === 'corner_pent_floor')));
    const ignoreScopedUnifiedFrameColor =
      (!!unifiedBaseKey || ignoreArchivedScopedUnifiedFrameColor) && scopedId !== baseId;
    const scopedEntry =
      scopedId && !ignoreScopedUnifiedFrameColor ? readDoorVisualMapEntry(rec, scopedId) : null;
    if (scopedEntry) return scopedEntry.value;
    if (scopedId && !ignoreScopedUnifiedFrameColor && Object.prototype.hasOwnProperty.call(rec, scopedId)) {
      return rec[scopedId];
    }
    if (unifiedBaseKey) {
      const unifiedBaseEntry = readDoorVisualMapEntry(rec, unifiedBaseKey);
      if (unifiedBaseEntry) return unifiedBaseEntry.value;
      if (Object.prototype.hasOwnProperty.call(rec, unifiedBaseKey)) return rec[unifiedBaseKey];
      if (typeof archivedWingColor !== 'undefined' && isCornerWingFloorPartId(baseId))
        return archivedWingColor;
      if (typeof archivedPentagonColor !== 'undefined' && baseId === 'corner_pent_floor') {
        return archivedPentagonColor;
      }
    }
    // Root fix for stacked corner wardrobes:
    // when the lower unit has its own lower_* namespace, it must NOT silently inherit
    // upper-unit per-part overrides (paint / mirror / glass / curtain) from the unscoped key.
    if (useScopedNamespace && scopedId && scopedId !== baseId) return undefined;
    const baseEntry = readDoorVisualMapEntry(rec, baseId);
    if (baseEntry) return baseEntry.value;
    if (isIndividualColorsMap && !stackSplitUnifiedFrame && stackKey === 'top') {
      if (typeof archivedWingColor !== 'undefined' && isCornerWingFloorPartId(baseId))
        return archivedWingColor;
      if (typeof archivedPentagonColor !== 'undefined' && baseId === 'corner_pent_floor') {
        return archivedPentagonColor;
      }
    }
    return undefined;
  };

  const readScopedReader = (reader: ScopedReaderLike, partId: unknown): unknown => {
    if (typeof reader !== 'function') return undefined;
    const baseId = String(partId || '');
    if (!baseId) return undefined;
    const useScopedNamespace =
      stackSplitEnabled && stackKey === 'bottom' && typeof stackScopePartKey === 'function';
    const scopedId = useScopedNamespace ? String(stackScopePartKey(baseId) || '') : baseId;
    const scopedVal = scopedId ? reader(scopedId) : undefined;
    if (typeof scopedVal !== 'undefined') return scopedVal;
    if (useScopedNamespace && scopedId && scopedId !== baseId) return undefined;
    return reader(baseId);
  };

  const renderOps = asRecord<RenderOpsLike>(ro);
  const getMirrorMaterial =
    renderOps && typeof renderOps.getMirrorMaterial === 'function' ? renderOps.getMirrorMaterial : null;
  const getMirrorMat = () => {
    if (getMirrorMaterial) {
      return getMirrorMaterial({
        App,
        THREE,
        materialSnapshot: { cfgSnapshot: cfg, sketchMode: args.sketchMode },
      });
    }
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1,
      roughness: 0.02,
    });
  };

  const resolveSpecial = (partId: string, curtainVal: unknown): SpecialDoorMode => {
    const scopedSpecial = readDoorSpecialValue(readScopedMapVal(doorSpecialMap, partId));
    if (scopedSpecial === 'mirror') return 'mirror';
    if (scopedSpecial === 'glass') return 'glass';

    const scopedColor = readScopedMapVal(individualColors, partId);
    if (scopedColor === 'mirror') return 'mirror';
    if (scopedColor === 'glass') return 'glass';

    return curtainVal === 'glass' ? 'glass' : null;
  };

  const getCornerMat = (partId: string, defaultMat: unknown): unknown => {
    const scopedColor = readScopedMapVal(individualColors, partId);
    if (cfg.isMultiColorMode && scopedColor) {
      const colorValue = scopedColor ?? null;
      if (colorValue === 'mirror' || colorValue === 'glass') return defaultMat;
      return resolveSelectionFrontMaterial({
        selection: colorValue,
        cfg,
        getMaterial,
        toStr: (value, defaultValue) => __appUtilStr(App, value ?? defaultValue),
      });
    }
    return defaultMat;
  };

  const bodyMat = getCornerMat('corner_body', materials.body);
  const frontMat = materials.front;
  const defaultShelfMat = materials.defaultShelfMat || bodyMat;
  const braceShelfMat = materials.braceShelfMat || bodyMat;

  const getCornerShelfMat = (partId: string, isBraceShelf = false): unknown => {
    const groupMaterial = getCornerMat(
      CORNER_SHELF_GROUP_PART_ID,
      isBraceShelf ? braceShelfMat : defaultShelfMat
    );
    return getCornerMat(partId, groupMaterial);
  };

  return {
    masoniteMat,
    whiteMat,
    shadowMat,
    backPanelMaterialArray,
    ghostDoorMat,
    individualColors,
    handlesMap,
    doorSpecialMap,
    readScopedMapVal,
    readScopedReader,
    getMirrorMat,
    resolveSpecial,
    getCornerMat,
    getCornerShelfMat,
    bodyMat,
    frontMat,
    defaultShelfMat,
    braceShelfMat,
  };
}
