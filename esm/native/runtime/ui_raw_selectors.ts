// UI raw selectors public facade (ESM)
//
// Purpose:
// - Keep the public `ui.raw` selector contract stable.
// - Route tolerant snapshot reads, canonical-only reads, and store adapters to
//   focused owners so legacy fallback policy cannot leak into live/build paths.
//
// Notes:
// - No DOM access.
// - Fail-soft except for explicit canonical assertions.

export { coerceFiniteNumber, coerceFiniteInt } from './ui_raw_selectors_shared.js';
export type { EssentialUiDimKey, MutableUiSnapshotLike } from './ui_raw_selectors_shared.js';
export {
  ensureUiRawDimsFromSnapshot,
  hasEssentialUiDimsFromSnapshot,
  readUiRawDimsCmFromSnapshot,
  readUiRawIntFromSnapshot,
  readUiRawNumberFromSnapshot,
  readUiRawScalarFromSnapshot,
} from './ui_raw_selectors_snapshot.js';
export {
  assertCanonicalUiRawDims,
  hasCanonicalEssentialUiRawDimsFromSnapshot,
  readCanonicalUiRawDimsCmFromSnapshot,
  readCanonicalUiRawIntFromSnapshot,
  readCanonicalUiRawNumberFromSnapshot,
  readUiRawScalarFromCanonicalSnapshot,
} from './ui_raw_selectors_canonical.js';
export {
  readCanonicalUiRawDimsCmFromStore,
  readUiRawDimsCmFromStore,
  readUiRawIntFromStore,
  readUiRawIntFromStoreUi,
  readUiRawNumberFromStore,
  readUiRawNumberFromStoreUi,
} from './ui_raw_selectors_store.js';
