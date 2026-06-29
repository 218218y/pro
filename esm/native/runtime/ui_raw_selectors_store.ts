// ui.raw store adapters (ESM)
//
// Keeps store/root-state access separate from pure snapshot/canonical readers.

import { readUiStateFromStore } from './root_state_access.js';
import { readCanonicalUiRawDimsCmFromSnapshot } from './ui_raw_selectors_canonical.js';

export function readCanonicalUiRawDimsCmFromStore(store: unknown) {
  const ui = readUiStateFromStore(store);
  return readCanonicalUiRawDimsCmFromSnapshot(ui);
}
