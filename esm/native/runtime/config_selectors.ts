// Config selectors + normalization helpers (ESM)
//
// Purpose:
// - Keep all store.config scalar parsing rules in one place.
// - Allow legacy persisted values (string, '', null) without spreading checks everywhere.
// - Provide both snapshot-based and App/store-based readers.
//
// Notes:
// - No DOM access.
// - Fail-soft: never throw.

export {
  readConfigLooseScalarFromApp,
  readConfigNumberLooseFromApp,
  readConfigScalarFromApp,
  readConfigScalarFromSnapshot,
  readConfigScalarFromStore,
  readConfigScalarOrDefault,
  readConfigScalarOrDefaultFromApp,
  readConfigScalarOrDefaultFromStore,
  readConfigStateFromApp,
} from './config_selectors_scalars.js';
export {
  readConfigArrayFromSnapshot,
  readConfigBoolFromApp,
  readConfigBoolFromSnapshot,
  readConfigBoolFromStore,
  readConfigEnumFromApp,
  readConfigEnumFromSnapshot,
  readConfigEnumFromStore,
  readConfigMapFromSnapshot,
  readConfigNullableStringFromSnapshot,
  readConfigStringFromSnapshot,
} from './config_selectors_readers.js';
