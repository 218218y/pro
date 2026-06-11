// Visual synchronization and drawer/runtime metadata for doors runtime.
//
// Public surface stays thin while door motion/state reconciliation and drawer
// runtime/meta ownership live in dedicated seams.

export { forceUpdatePerState, syncVisualsNow } from './doors_runtime_visuals_doors.js';
export {
  rebuildDrawerMeta,
  getDrawerMetaMap,
  installDrawerMeta,
  isInternalDrawerIdStrict,
  snapDrawersToTargets,
} from './doors_runtime_visuals_drawers.js';
