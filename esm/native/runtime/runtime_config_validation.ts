// Runtime config validation + normalization (Pure ESM)
//
// Goals:
// - Accept only canonical typed values for known runtime fields.
// - Preserve unknown keys for forward-compatible feature configuration.
// - Return explicit issues; the boot boundary treats every issue as fatal.
//
// NOTE: This module must be side-effect free on import.

export type {
  RuntimeConfigIssueKind,
  RuntimeConfigIssue,
  ValidateOpts,
} from './runtime_config_validation_shared.js';
export { validateRuntimeFlags } from './runtime_config_validation_flags.js';
export { validateRuntimeConfig } from './runtime_config_validation_config.js';
