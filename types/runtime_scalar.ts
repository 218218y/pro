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
