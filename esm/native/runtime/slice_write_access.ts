// Shared slice write helpers (Canonical-first, Store-backed)
//
// Goal:
// - Keep ui/runtime/mode/config/meta write helpers aligned on one low-level router.
// - Prefer namespaced action surfaces first, then dedicated store leaf writers.
// - Keep root-level patch fallbacks explicit and opt-in, not hidden policy.

export { asRecord } from './slice_write_access_shared.js';

export {
  getWriteAppLike,
  getWriteActions,
  getWriteStore,
  getSliceNamespace,
  getSingleSlicePatchRoute,
  hasSliceWriterSeam,
  patchSliceWithStoreFallback,
  touchMetaWithStoreFallback,
  hasCanonicalPatchDispatch,
  dispatchCanonicalPatchPayload,
} from './slice_write_access_core.js';

export {
  hasDedicatedSliceWriterSeam,
  patchSliceWithDedicatedWriter,
  touchMetaWithDedicatedWriter,
  hasDedicatedCanonicalPatchDispatch,
  dispatchDedicatedCanonicalPatchPayload,
} from './slice_write_access_dedicated.js';
