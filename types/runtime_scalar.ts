// Typed runtime scalar keys and their value types.
//
// Goal:
// - Provide a safe, typed surface for the most common runtime toggles.
// - Keep migration incremental (runtime slice still allows arbitrary keys).

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
  sketchMode: boolean;
  globalClickMode: boolean;
  doorsOpen: boolean;
  doorsLastToggleTime: number;
  drawersOpenId: string | number | null;
  restoring: boolean;
  systemReady: boolean;
  roomDesignActive: boolean;
  notesPicking: boolean;
  failFast: boolean;
  verboseConsoleErrors: boolean;
  verboseConsoleErrorsDedupeMs: number;
  debug: boolean;
  wardrobeWidthM: number | null;
  wardrobeHeightM: number | null;
  wardrobeDepthM: number | null;
  wardrobeDoorsCount: number | null;
};

export type RuntimeScalarValue<K extends RuntimeScalarKey> = RuntimeScalarValueMap[K];
