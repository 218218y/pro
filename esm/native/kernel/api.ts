// Kernel public API surface (TypeScript, Pure ESM)
//
// Keep this file SMALL.
// Other layers should depend on kernel stores via this module, not by importing
// internal kernel files directly.

export { getState, getUi, getCfg, getMode, getRuntime, getMeta, isDirty } from './store_access.js';
export { getHistorySystem } from './history_access.js';
