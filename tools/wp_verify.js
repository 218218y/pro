#!/usr/bin/env node

// WardrobePro verification runner (release gate)
//
// Goal: one command before distribution:
//   npm run verify
//
// Runs (in order):
//   check:strict -> format:check -> lint -> typecheck:all -> cycles -> esm check
//   -> ui/api/layer contracts -> wiring guard -> tests -> bundle -> bundle:site2

import { createSanitizedChildEnv } from './wp_node_child_env.js';
import { resolveProjectRoot } from './wp_verify_shared.js';
import { parseVerifyArgs } from './wp_verify_state.js';
import { runVerifyFlow } from './wp_verify_flow.js';

function main() {
  const flags = parseVerifyArgs(process.argv.slice(2));
  const projectRoot = resolveProjectRoot(import.meta.url);
  const childEnvInfo = createSanitizedChildEnv(process.env);
  const childEnv = childEnvInfo.env;

  console.log('[WardrobePro] verify: running full pre-release suite...');
  if (childEnvInfo.removedInvalidLocalStorageFile) {
    const sourceLabel =
      childEnvInfo.touchedKeys && childEnvInfo.touchedKeys.length
        ? childEnvInfo.touchedKeys.join(', ')
        : 'NODE_OPTIONS';
    console.warn(
      `[WardrobePro] verify: ignoring invalid localstorage node-option flag for child processes (${sourceLabel}).`
    );
  }
  if (flags.gate) console.log('[WardrobePro] verify: gate mode enabled (--gate/--strict).');
  if (flags.skipBundle) {
    console.log('[WardrobePro] verify: bundle steps are disabled (--ci/--no-bundle/--no-bundles).');
  }

  try {
    const result = runVerifyFlow({ projectRoot, childEnv, flags });
    console.log(result.successMessage);
  } catch (err) {
    if (err && err.verifyHandled) {
      if (err.cause) console.error(err.cause);
      process.exit(typeof err.exitCode === 'number' ? err.exitCode : 1);
      return;
    }
    console.error(err);
    process.exit(1);
  }
}

main();
