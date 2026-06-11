// Maps access helpers (Canonical)
//
// Goal:
// - Provide a single, stable way to read/write App.maps surfaces across layers.
// - Avoid repeating `App.maps && typeof App.maps.getMap === 'function'` everywhere.
// - Keep boot/migration resilient (helpers never throw).
//
// IMPORTANT:
// - This file lives in `runtime/` so it can be imported from builder/services/kernel/platform.
// - UI should prefer importing via `services/api.js` (public services surface).

export {
  normalizeColorSwatchesOrderSnapshot,
  normalizeKnownMapSnapshot,
  normalizeSavedColorObjectsSnapshot,
  normalizeSavedColorsSnapshot,
} from './maps_access_normalizers.js';
export {
  isSplitBottomEnabledInMap,
  isSplitEnabledInMap,
  isSplitExplicitInMap,
  readSplitPosListFromMap,
  splitBottomKey,
  splitKey,
  splitPosKey,
} from './maps_access_split_helpers.js';
export {
  getCurtainReader,
  getGrooveReader,
  readHandle,
  readMap,
  readMapOrEmpty,
} from './maps_access_readers.js';
export {
  toggleDivider,
  toggleGrooveKey,
  writeHandle,
  writeHinge,
  writeMapKey,
  writeSplit,
  writeSplitBottom,
} from './maps_access_writers.js';
export {
  readSavedColors,
  writeColorSwatchesOrder,
  writeSavedColors,
} from './maps_access_saved_collections.js';
