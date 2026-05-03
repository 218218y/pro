// Runtime selectors public facade (ESM)
//
// Purpose:
// - Keep the public runtime selector contract stable.
// - Keep normalization/defaults, pure snapshot reads, and store/App adapters in
//   focused owners so runtime access surfaces have one clear boundary.
//
// Notes:
// - No DOM access.
// - Fail-soft: never throw.

export type { RuntimeRecordLike } from './runtime_selectors_shared.js';
export { DEFAULTS } from './runtime_selectors_shared.js';
export {
  readRuntimeBoolFromSnapshot,
  readRuntimeNullableNumberFromSnapshot,
  readRuntimeNumberFromSnapshot,
  readRuntimeScalarFromSnapshot,
  readRuntimeScalarOrDefault,
} from './runtime_selectors_snapshot.js';
export {
  readRuntimeScalarFromApp,
  readRuntimeScalarFromStore,
  readRuntimeScalarOrDefaultFromApp,
  readRuntimeScalarOrDefaultFromStore,
  readRuntimeStateFromApp,
} from './runtime_selectors_store.js';
