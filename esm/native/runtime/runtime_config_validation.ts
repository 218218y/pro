// Runtime config validation + normalization (Pure ESM)
//
// Goals:
// - Accept permissive runtime config objects (loaded from wp_runtime_config.mjs).
// - Normalize common shapes (numbers/booleans/arrays) and clamp unsafe values.
// - Fail-fast ONLY when requested by the boot entry (QA/strict environments).
// - Preserve unknown keys (forward-compatible) while ensuring the known keys are safe.
//
// NOTE: This module must be side-effect free on import.

export type {
  RuntimeConfigIssueKind,
  RuntimeConfigIssue,
  ValidateOpts,
} from './runtime_config_validation_shared.js';
export { validateRuntimeFlags } from './runtime_config_validation_flags.js';
export { validateRuntimeConfig } from './runtime_config_validation_config.js';
