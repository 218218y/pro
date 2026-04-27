import type {
  AppContainer,
  BuilderCalculateModuleStructureFn,
  ModuleConfigLike,
  BuildContextLike,
  ThreeLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';

export type ValueRecord = UnknownRecord;
export type UnknownFn = (...args: never[]) => unknown;

export type GetMaterialFn = (
  color: string | null,
  kind: string,
  useTexture?: boolean,
  textureDataURL?: string | null
) => unknown;

export function isRecord(x: unknown): x is ValueRecord {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

export function readRecord(x: unknown): ValueRecord | null {
  return isRecord(x) ? x : null;
}

export function readUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function readRecordArray<T extends UnknownRecord = UnknownRecord>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item): item is T => isRecord(item)) : [];
}

export function isFunction<Fn extends UnknownFn>(value: unknown): value is Fn {
  return typeof value === 'function';
}

export function readFunction<Fn extends UnknownFn>(value: unknown): Fn | null {
  return isFunction<Fn>(value) ? value : null;
}

export function isThreeLike(value: unknown): value is ThreeLike {
  return !!value && typeof value === 'object';
}

export function readThreeLike(value: unknown): ThreeLike | null {
  return isThreeLike(value) ? value : null;
}

export function isUiStateLike(value: unknown): value is UiStateLike {
  return isRecord(value);
}

export function isModuleConfigLike(value: unknown): value is ModuleConfigLike {
  return isRecord(value);
}

export function isBuildContextLike(value: unknown): value is BuildContextLike {
  return isRecord(value);
}

export function isCalculateModuleStructureFn(value: unknown): value is BuilderCalculateModuleStructureFn {
  return typeof value === 'function';
}

export function readFiniteNumberArray(value: unknown): number[] | null {
  return Array.isArray(value) && value.every(n => typeof n === 'number' && Number.isFinite(n))
    ? [...value]
    : null;
}

export function readUiState(value: unknown): UiStateLike | null {
  return isUiStateLike(value) ? value : null;
}

export function readModuleConfig(value: unknown): ModuleConfigLike | null {
  return isModuleConfigLike(value) ? value : null;
}

export function readBuildContext(value: unknown): BuildContextLike | null {
  return isBuildContextLike(value) ? value : null;
}

export function readCalculateModuleStructure(value: unknown): BuilderCalculateModuleStructureFn | null {
  return isCalculateModuleStructureFn(value) ? value : null;
}

export function createMissingGetMaterial(label: string): GetMaterialFn {
  return () => {
    throw new Error(`[WardrobePro] Missing getMaterial (${label})`);
  };
}

export function readStringProp(obj: ValueRecord | null, key: string): string | null {
  const value = obj ? obj[key] : null;
  return typeof value === 'string' ? value : null;
}

export function cloneUnknownValue(App: AppContainer, value: unknown): unknown {
  if (value == null || typeof value !== 'object') return value;
  const seed = Array.isArray(value) ? [] : {};
  const cloned = App.util && typeof App.util.clone === 'function' ? App.util.clone(value, seed) : value;
  return cloned !== value ? cloned : JSON.parse(JSON.stringify(value));
}
