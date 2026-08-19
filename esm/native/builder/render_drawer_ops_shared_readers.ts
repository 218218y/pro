import type {
  BuilderAddFoldedClothesFn,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderOutlineFn,
} from '../../../types';
import { readDoorStyleMap } from '../features/door_authoring/api.js';
import { readDrawerRunnerTypeFromConfig } from './drawer_runner_policy.js';
import { isFunction, isRecord, readObject3D } from './render_drawer_ops_shared_guards.js';
import type {
  DrawerConfig,
  GetPartColorValueFn,
  GetPartMaterialFn,
} from './render_drawer_ops_shared_types.js';

function readObjectMap(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function readStringNullableMap(value: unknown): Record<string, string | null | undefined> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string | null | undefined> = Object.create(null);
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') out[key] = entry;
    else if (entry === null) out[key] = null;
    else if (typeof entry === 'undefined') out[key] = undefined;
  }
  return out;
}

export function readDrawerConfig(value: unknown): DrawerConfig {
  if (!isRecord(value)) return { drawerRunnerType: 'roller' };
  const groovesMap = readObjectMap(value.groovesMap);
  const doorTrimMap = readObjectMap(value.doorTrimMap);
  const drawerDividersMap = readObjectMap(value.drawerDividersMap);
  const doorSpecialMap = readStringNullableMap(value.doorSpecialMap);
  const curtainMap = readObjectMap(value.curtainMap);
  const mirrorLayoutMap = readObjectMap(value.mirrorLayoutMap);
  const grooveLayoutMap = readObjectMap(value.grooveLayoutMap);
  return {
    ...(groovesMap !== undefined ? { groovesMap } : {}),
    ...(doorTrimMap !== undefined ? { doorTrimMap } : {}),
    ...(drawerDividersMap !== undefined ? { drawerDividersMap } : {}),
    ...(doorSpecialMap !== undefined ? { doorSpecialMap } : {}),
    doorStyleMap: readDoorStyleMap(value.doorStyleMap),
    ...(curtainMap !== undefined ? { curtainMap } : {}),
    ...(mirrorLayoutMap !== undefined ? { mirrorLayoutMap } : {}),
    ...(grooveLayoutMap !== undefined ? { grooveLayoutMap } : {}),
    isMultiColorMode: value.isMultiColorMode === true,
    isLibraryMode: value.isLibraryMode === true,
    drawerRunnerType: readDrawerRunnerTypeFromConfig(value),
  };
}

export function readGetPartMaterial(value: unknown): GetPartMaterialFn | null {
  if (!isFunction(value)) return null;
  return partId => value(partId);
}

export function readGetPartColorValue(value: unknown): GetPartColorValueFn | null {
  if (!isFunction(value)) return null;
  return partId => value(partId);
}

export function readOutlineFn(value: unknown): BuilderOutlineFn | null {
  if (!isFunction(value)) return null;
  return mesh => value(mesh);
}

export function readCreateDoorVisual(value: unknown): BuilderCreateDoorVisualFn | null {
  if (!isFunction(value)) return null;
  return (
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
  ) => {
    const next = readObject3D(
      value(
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
      )
    );
    if (!next) throw new Error('[render_drawer_ops] createDoorVisual returned invalid object');
    return next;
  };
}

export function readCreateInternalDrawerBox(value: unknown): BuilderCreateInternalDrawerBoxFn | null {
  if (!isFunction(value)) return null;
  return (w, h, d, mat, drawerMat, outlineFunc, hasDivider, addHandle, options) => {
    const next = readObject3D(value(w, h, d, mat, drawerMat, outlineFunc, hasDivider, addHandle, options));
    if (!next) throw new Error('[render_drawer_ops] createInternalDrawerBox returned invalid object');
    return next;
  };
}

export function readAddFoldedClothes(value: unknown): BuilderAddFoldedClothesFn | null {
  if (!isFunction(value)) return null;
  return (shelfX, shelfY, shelfZ, width, parentGroup, maxHeight, maxDepth, policy) =>
    value(shelfX, shelfY, shelfZ, width, parentGroup, maxHeight, maxDepth, policy);
}
