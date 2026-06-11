import type {
  BuildCtxCreateFnsLike,
  BuildCtxDimsLike,
  BuildCtxFlagsLike,
  BuildCtxFnsLike,
  BuildCtxHingedLike,
  BuildCtxLayoutLike,
  BuildCtxMaterialsLike,
  BuildCtxResolversLike,
  BuildCtxStringsLike,
  BuilderAddFoldedClothesFn,
  BuilderAddHangingClothesFn,
  BuilderAddRealisticHangerFn,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderOutlineFn,
  BuildHingedDoorPivotEntryLike,
  BuilderCurtainResolver,
  BuilderDoorSplitResolver,
  BuilderDoorStateAccessorsLike,
  BuilderGrooveResolver,
  BuilderHingeDirResolver,
  BuilderPartColorResolver,
  BuilderPartMaterialResolver,
  HingeDir,
  ModuleConfigLike,
} from '../../../types/index.js';

export type ValueRecord = Record<string, unknown>;

export type DoorStateLike = BuilderDoorStateAccessorsLike;

export type ModuleLike = { doors?: number };

export type PivotEntryLike = BuildHingedDoorPivotEntryLike;

export function isValueRecord(value: unknown): value is ValueRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asValueRecord(value: unknown): ValueRecord {
  return isValueRecord(value) ? value : {};
}

export function asLayout(value: unknown): BuildCtxLayoutLike {
  return isValueRecord(value) ? value : {};
}

export function asDims(value: unknown): BuildCtxDimsLike {
  return isValueRecord(value) ? value : {};
}

export function asFlags(value: unknown): BuildCtxFlagsLike {
  return isValueRecord(value) ? value : {};
}

export function asStrings(value: unknown): BuildCtxStringsLike {
  return isValueRecord(value) ? value : {};
}

export function asResolvers(value: unknown): BuildCtxResolversLike {
  return isValueRecord(value) ? value : {};
}

export function asCreateFns(value: unknown): BuildCtxCreateFnsLike {
  return isValueRecord(value) ? value : {};
}

export function asBuildFns(value: unknown): BuildCtxFnsLike {
  return isValueRecord(value) ? value : {};
}

export function asMaterials(value: unknown): BuildCtxMaterialsLike {
  return isValueRecord(value) ? value : {};
}

export function asHinged(value: unknown): BuildCtxHingedLike {
  return isValueRecord(value) ? value : {};
}

function readModuleItem(value: unknown): ModuleLike {
  if (!isValueRecord(value)) return {};
  const doors = Number(value.doors);
  return Number.isFinite(doors) && doors > 0 ? { ...value, doors } : { ...value };
}

export function asModuleList(value: unknown): ModuleLike[] {
  if (!Array.isArray(value)) return [];
  return value.map(readModuleItem);
}

function readModuleConfig(value: unknown): ModuleConfigLike {
  return isValueRecord(value) ? { ...value } : {};
}

export function asModuleConfigList(value: unknown): ModuleConfigLike[] {
  if (!Array.isArray(value)) return [];
  return value.map(readModuleConfig);
}

export function asNumberList(value: unknown): number[] | null {
  return Array.isArray(value) ? value.map(v => Number(v)) : null;
}

export function asDoorState(value: unknown): DoorStateLike | undefined {
  if (!isValueRecord(value)) return undefined;
  const getHingeDir = readHingeDirResolver(value.getHingeDir);
  const isDoorSplit = readDoorSplitResolver(value.isDoorSplit);
  const isDoorSplitBottom = readDoorSplitResolver(value.isDoorSplitBottom);
  const curtainVal = readCurtainResolver(value.curtainVal);
  const grooveVal = readGrooveResolver(value.grooveVal);
  if (!getHingeDir || !isDoorSplit || !isDoorSplitBottom || !curtainVal || !grooveVal) return undefined;
  return { getHingeDir, isDoorSplit, isDoorSplitBottom, curtainVal, grooveVal };
}

export function asPivotEntryMap(value: unknown): Record<string, PivotEntryLike> {
  if (!isValueRecord(value)) return {};
  const out: Record<string, PivotEntryLike> = {};
  for (const [key, entry] of Object.entries(value)) {
    const next = asPivotEntry(entry);
    if (next) out[key] = next;
  }
  return out;
}

export function asPivotEntry(value: unknown): PivotEntryLike | null {
  return isValueRecord(value) ? { ...value } : null;
}

export function readCreateDoorVisual(value: unknown): BuilderCreateDoorVisualFn | undefined {
  if (typeof value !== 'function') return undefined;
  const createDoorVisual: BuilderCreateDoorVisualFn = (
    w,
    h,
    thickness,
    mat,
    style,
    hasGrooves,
    isMirror,
    curtainType,
    baseMaterial,
    frontFaceSign,
    forceCurtainFix,
    mirrorLayout,
    groovePartId,
    options
  ) =>
    Reflect.apply(value, undefined, [
      w,
      h,
      thickness,
      mat,
      style,
      hasGrooves,
      isMirror,
      curtainType,
      baseMaterial,
      frontFaceSign,
      forceCurtainFix,
      mirrorLayout,
      groovePartId,
      options,
    ]);
  return createDoorVisual;
}

export function readCreateInternalDrawerBox(value: unknown): BuilderCreateInternalDrawerBoxFn | undefined {
  if (typeof value !== 'function') return undefined;
  const createInternalDrawerBox: BuilderCreateInternalDrawerBoxFn = (
    w,
    h,
    d,
    mat,
    drawerMat,
    outlineFunc,
    hasDivider,
    addHandle,
    options
  ) =>
    Reflect.apply(value, undefined, [w, h, d, mat, drawerMat, outlineFunc, hasDivider, addHandle, options]);
  return createInternalDrawerBox;
}

export function readOutlineFn(value: unknown): BuilderOutlineFn | undefined {
  if (typeof value !== 'function') return undefined;
  const addOutlines: BuilderOutlineFn = mesh => Reflect.apply(value, undefined, [mesh]);
  return addOutlines;
}

export function readAddRealisticHanger(value: unknown): BuilderAddRealisticHangerFn | undefined {
  if (typeof value !== 'function') return undefined;
  const addRealisticHanger: BuilderAddRealisticHangerFn = (
    rodX,
    rodY,
    rodZ,
    parentGroup,
    moduleWidth,
    enabledOverride
  ) => Reflect.apply(value, undefined, [rodX, rodY, rodZ, parentGroup, moduleWidth, enabledOverride]);
  return addRealisticHanger;
}

export function readAddHangingClothes(value: unknown): BuilderAddHangingClothesFn | undefined {
  if (typeof value !== 'function') return undefined;
  const addHangingClothes: BuilderAddHangingClothesFn = (
    rodX,
    rodY,
    rodZ,
    width,
    parentGroup,
    maxHeight,
    isRestrictedDepth,
    showContentsOverride,
    doorStyleOverride
  ) =>
    Reflect.apply(value, undefined, [
      rodX,
      rodY,
      rodZ,
      width,
      parentGroup,
      maxHeight,
      isRestrictedDepth,
      showContentsOverride,
      doorStyleOverride,
    ]);
  return addHangingClothes;
}

export function readAddFoldedClothes(value: unknown): BuilderAddFoldedClothesFn | undefined {
  if (typeof value !== 'function') return undefined;
  const addFoldedClothes: BuilderAddFoldedClothesFn = (
    shelfX,
    shelfY,
    shelfZ,
    width,
    parentGroup,
    maxHeight,
    maxDepth
  ) => Reflect.apply(value, undefined, [shelfX, shelfY, shelfZ, width, parentGroup, maxHeight, maxDepth]);
  return addFoldedClothes;
}

export function readDoorRemovedResolver(value: unknown): ((partId: string) => boolean) | undefined {
  if (typeof value !== 'function') return undefined;
  return (partId: string) => !!Reflect.apply(value, undefined, [partId]);
}

export function readDoorSplitResolver(value: unknown): BuilderDoorSplitResolver | undefined {
  if (typeof value !== 'function') return undefined;
  return (map: unknown, doorIdNum: number) => !!Reflect.apply(value, undefined, [map, doorIdNum]);
}

export function readGrooveResolver(value: unknown): BuilderGrooveResolver | undefined {
  if (typeof value !== 'function') return undefined;
  return (doorIdNum: number, suffix: string, fullDefault: boolean) =>
    !!Reflect.apply(value, undefined, [doorIdNum, suffix, fullDefault]);
}

export function readCurtainResolver(value: unknown): BuilderCurtainResolver | undefined {
  if (typeof value !== 'function') return undefined;

  const resolver: BuilderCurtainResolver = (
    doorOrPartId: number | string,
    suffixOrFallback: string | null | undefined,
    fallback?: string | null | undefined
  ): string | null | undefined => {
    const args =
      typeof doorOrPartId === 'number'
        ? [doorOrPartId, suffixOrFallback, fallback]
        : [doorOrPartId, suffixOrFallback];
    const out = Reflect.apply(value, undefined, args);
    return typeof out === 'string' || out == null ? out : String(out);
  };

  return resolver;
}

export function readHingeDirResolver(value: unknown): BuilderHingeDirResolver | undefined {
  if (typeof value !== 'function') return undefined;
  return (hingeKey: string, fallback: HingeDir) => {
    const out = Reflect.apply(value, undefined, [hingeKey, fallback]);
    return out === 'right' ? 'right' : 'left';
  };
}

export function readGetPartMaterial(value: unknown): BuilderPartMaterialResolver | undefined {
  if (typeof value !== 'function') return undefined;
  return (partId: string) => Reflect.apply(value, undefined, [partId]);
}

export function readGetPartColorValue(value: unknown): BuilderPartColorResolver | undefined {
  if (typeof value !== 'function') return undefined;
  return (partId: string) => {
    const out = Reflect.apply(value, undefined, [partId]);
    return typeof out === 'string' || out == null ? out : String(out);
  };
}
