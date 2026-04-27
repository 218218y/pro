// Corner wing: material resolution + multi-color/special doors

import { getCfg } from './store_access.js';
import { getCommonMatsOrThrow } from './common_mats_resolver.js';
import { asRecord, cloneRecord } from '../runtime/record.js';

import type {
  AppContainer,
  BuilderGetMaterialFn,
  ConfigStateLike,
  DoorSpecialMap,
  DoorSpecialValue,
  HandlesMap,
  IndividualColorsMap,
  SavedColorLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types/index.js';

type MaterialsLike = {
  body: unknown;
  front: unknown;
};

type ThreeCtorLike = Pick<ThreeLike, 'MeshBasicMaterial' | 'MeshStandardMaterial' | 'DoubleSide'>;

type GetMirrorMaterialFn = (args: { App: unknown; THREE: unknown }) => unknown;

type RenderOpsLike = {
  getMirrorMaterial?: GetMirrorMaterialFn;
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
  bodyMat: unknown;
  frontMat: unknown;
};

function asSavedColorSnapshot(value: unknown, App: AppContainer): ConfigStateLike {
  return asRecord<ConfigStateLike>(value) || getCfg(App);
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

function __savedColorById(cfg: ConfigStateLike, id: string): SavedColorLike | null {
  const list = Array.isArray(cfg.savedColors) ? cfg.savedColors : [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item && item.id === id) return item;
  }
  return null;
}

function __appUtilStr(App: AppContainer, value: unknown): string {
  const util = App.util;
  return util && typeof util.str === 'function' ? String(util.str(value)) : String(value ?? '');
}

export function createCornerWingMaterials(args: {
  App: AppContainer;
  THREE: ThreeCtorLike;
  ro: RenderOpsLike | UnknownRecord | null | undefined;
  materials: MaterialsLike;
  getMaterial: GetMaterialFn;
  cfgSnapshot: ConfigStateLike | UnknownRecord | null | undefined;
  readMap: (name: string) => unknown;
  stackKey: 'top' | 'bottom';
  stackSplitEnabled: boolean;
  stackScopePartKey?: (partId: unknown) => string;
}): CornerWingMaterialsResult {
  const { App, THREE, ro, materials, getMaterial, readMap, stackKey, stackSplitEnabled, stackScopePartKey } =
    args;

  const cfg = asSavedColorSnapshot(args.cfgSnapshot, App);
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
    const useScopedNamespace =
      stackSplitEnabled && stackKey === 'bottom' && typeof stackScopePartKey === 'function';
    const scopedId = useScopedNamespace ? String(stackScopePartKey(baseId) || '') : baseId;
    const scopedVal = scopedId ? rec[scopedId] : undefined;
    if (typeof scopedVal !== 'undefined') return scopedVal;
    // Root fix for stacked corner wardrobes:
    // when the lower unit has its own lower_* namespace, it must NOT silently inherit
    // upper-unit per-part overrides (paint / mirror / glass / curtain) from the unscoped key.
    if (useScopedNamespace && scopedId && scopedId !== baseId) return undefined;
    return rec[baseId];
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
    if (getMirrorMaterial) return getMirrorMaterial({ App, THREE });
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
      const colorKey = __appUtilStr(App, colorValue);
      if (colorValue === 'mirror' || colorValue === 'glass') return defaultMat;
      if (colorKey.startsWith('saved_')) {
        const saved = __savedColorById(cfg, colorKey);
        if (saved && saved.type === 'texture' && saved.textureData) {
          return getMaterial(saved.value, 'front', true);
        }
      }
      return getMaterial(colorValue, 'front', false);
    }
    return defaultMat;
  };

  const bodyMat = getCornerMat('corner_body', materials.body);
  const frontMat = materials.front;

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
    bodyMat,
    frontMat,
  };
}
