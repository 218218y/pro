// Canonical ui.raw selectors public facade (ESM)
//
// Store/runtime/build consumers read only the closed `ui.raw` contract. Project ingress
// validates the current schema before state reaches these selectors.

export {
  assertCanonicalUiRawDims,
  hasCanonicalEssentialUiRawDimsFromSnapshot,
  readCanonicalUiRawDimsCmFromSnapshot,
  readCanonicalUiRawIntFromSnapshot,
  readCanonicalUiRawNumberFromSnapshot,
  readUiRawScalarFromCanonicalSnapshot,
} from './ui_raw_selectors_canonical.js';
export { readCanonicalUiRawDimsCmFromStore } from './ui_raw_selectors_store.js';
