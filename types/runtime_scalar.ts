// Canonical typed runtime scalar writes.

import type { RuntimeStateLike } from './build';

export type RuntimeScalarKey =
  | 'sketchMode'
  | 'globalClickMode'
  | 'doorsOpen'
  | 'doorsLastToggleTime'
  | 'drawersOpenId'
  | 'restoring'
  | 'systemReady'
  | 'roomDesignActive'
  | 'notesPicking'
  | 'failFast'
  | 'verboseConsoleErrors'
  | 'verboseConsoleErrorsDedupeMs'
  | 'debug'
  | 'wardrobeWidthM'
  | 'wardrobeHeightM'
  | 'wardrobeDepthM'
  | 'wardrobeDoorsCount';

export type RuntimeScalarValueMap = {
  [K in RuntimeScalarKey]-?: Exclude<RuntimeStateLike[K], undefined>;
};

export type RuntimeScalarValue<K extends RuntimeScalarKey> = RuntimeScalarValueMap[K];

export const RUNTIME_SCALAR_KEYS = [
  'sketchMode',
  'globalClickMode',
  'doorsOpen',
  'doorsLastToggleTime',
  'drawersOpenId',
  'restoring',
  'systemReady',
  'roomDesignActive',
  'notesPicking',
  'failFast',
  'verboseConsoleErrors',
  'verboseConsoleErrorsDedupeMs',
  'debug',
  'wardrobeWidthM',
  'wardrobeHeightM',
  'wardrobeDepthM',
  'wardrobeDoorsCount',
] as const satisfies readonly RuntimeScalarKey[];

const RUNTIME_SCALAR_KEY_SET = new Set<string>(RUNTIME_SCALAR_KEYS);

export function isRuntimeScalarKey(key: unknown): key is RuntimeScalarKey {
  return typeof key === 'string' && RUNTIME_SCALAR_KEY_SET.has(key);
}

export type RuntimeActionScalarKey = RuntimeScalarKey | 'paintColor' | 'handlesType' | 'interiorManualTool';

export type RuntimeActionScalarValueMap = {
  [K in RuntimeActionScalarKey]-?: Exclude<RuntimeStateLike[K], undefined>;
};

export type RuntimeActionScalarValue<K extends RuntimeActionScalarKey> = RuntimeActionScalarValueMap[K];

export const RUNTIME_ACTION_SCALAR_KEYS = [
  ...RUNTIME_SCALAR_KEYS,
  'paintColor',
  'handlesType',
  'interiorManualTool',
] as const satisfies readonly RuntimeActionScalarKey[];

const RUNTIME_ACTION_SCALAR_KEY_SET = new Set<string>(RUNTIME_ACTION_SCALAR_KEYS);

export function isRuntimeActionScalarKey(key: unknown): key is RuntimeActionScalarKey {
  return typeof key === 'string' && RUNTIME_ACTION_SCALAR_KEY_SET.has(key);
}

type MissingRuntimeActionScalarKey = Exclude<
  RuntimeActionScalarKey,
  (typeof RUNTIME_ACTION_SCALAR_KEYS)[number]
>;
type AssertNoMissingRuntimeActionScalarKey = MissingRuntimeActionScalarKey extends never ? true : never;
const RUNTIME_ACTION_SCALAR_KEYS_COMPLETE: AssertNoMissingRuntimeActionScalarKey = true;
void RUNTIME_ACTION_SCALAR_KEYS_COMPLETE;

type MissingRuntimeScalarKey = Exclude<RuntimeScalarKey, (typeof RUNTIME_SCALAR_KEYS)[number]>;
type AssertNoMissingRuntimeScalarKey = MissingRuntimeScalarKey extends never ? true : never;
const RUNTIME_SCALAR_KEYS_COMPLETE: AssertNoMissingRuntimeScalarKey = true;
void RUNTIME_SCALAR_KEYS_COMPLETE;
