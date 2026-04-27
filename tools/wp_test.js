#!/usr/bin/env node

import { createSanitizedChildEnv } from './wp_node_child_env.js';
import { resolveProjectRoot } from './wp_test_shared.js';
import { parseTestArgs } from './wp_test_state.js';
import { runTestFlow } from './wp_test_flow.js';

function run() {
  const projectRoot = resolveProjectRoot();
  const flags = parseTestArgs(process.argv.slice(2));
  const childEnvInfo = createSanitizedChildEnv(process.env);
  const childEnv = childEnvInfo.env;

  if (childEnvInfo.removedInvalidLocalStorageFile) {
    const sourceLabel = childEnvInfo.touchedKeys?.length
      ? childEnvInfo.touchedKeys.join(', ')
      : 'NODE_OPTIONS';
    console.warn(
      `[WardrobePro] Ignoring invalid localstorage node-option flag for child test processes (${sourceLabel}).`
    );
  }

  const result = runTestFlow({
    projectRoot,
    childEnv,
    flags,
  });

  if (!result.files.length) {
    console.log(result.message);
    return;
  }

  if (!result.ok) {
    console.error(`[WardrobePro] ${result.fail} test(s) failed.`);
    process.exit(1);
  }

  console.log('[WardrobePro] All tests passed.');
}

run();
