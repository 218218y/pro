#!/usr/bin/env node

import path from 'node:path';
import { createSanitizedChildEnv } from './wp_node_child_env.js';
import { fileExists, npmRun, resolveProjectRoot, runCmd } from './wp_verify_shared.js';
import { runVerifyLane, runVerifyLanePlan } from './wp_verify_lane_flow.js';

function parseArgs(argv) {
  const flags = new Set(argv || []);
  return {
    full: flags.has('--full'),
    requireDeps: flags.has('--require-deps'),
  };
}

function hasDependencyTree(projectRoot) {
  const requiredPaths = [
    'node_modules/react/package.json',
    'node_modules/react-dom/package.json',
    'node_modules/@types/react/package.json',
    'node_modules/@types/react-dom/package.json',
    'node_modules/tsx/package.json',
  ];
  return requiredPaths.every(rel => fileExists(path.join(projectRoot, rel)));
}

function runCoreCloseout({ projectRoot, childEnv }) {
  const contractTests = [
    'tests/builder_bootstrap_install_contracts.test.js',
    'tests/builder_room_corner_canonical_contracts.test.js',
    'tests/builder_surface_family_contracts.test.js',
    'tests/models_service_contracts.test.js',
    'tests/platform_runtime_access_contracts.test.js',
  ];

  runCmd({
    projectRoot,
    childEnv,
    cmd: process.execPath,
    args: ['--test', ...contractTests],
    label: `node --test ${contractTests.join(' ')}`,
  });

  const typechecks = [
    'typecheck:builder',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:platform',
    'typecheck:kernel',
  ];
  for (const scriptName of typechecks) npmRun({ projectRoot, childEnv, scriptName });
  npmRun({ projectRoot, childEnv, scriptName: 'contract:layers' });
  npmRun({ projectRoot, childEnv, scriptName: 'contract:api' });
}

function runFullCloseout({ projectRoot, childEnv }) {
  npmRun({ projectRoot, childEnv, scriptName: 'typecheck:ui' });
  runVerifyLane({ projectRoot, childEnv, laneName: 'ui-dist-probe' });
  runVerifyLanePlan({
    projectRoot,
    childEnv,
    laneNames: ['public-surfaces', 'builder-surfaces', 'domain-surfaces', 'runtime-access-surfaces'],
  });
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const projectRoot = resolveProjectRoot(import.meta.url);
  const childEnvInfo = createSanitizedChildEnv(process.env);
  const childEnv = childEnvInfo.env;
  const depsReady = hasDependencyTree(projectRoot);

  console.log('[WardrobePro] phase-close verify: running closeout suite...');
  if (childEnvInfo.removedInvalidLocalStorageFile) {
    const sourceLabel =
      childEnvInfo.touchedKeys && childEnvInfo.touchedKeys.length
        ? childEnvInfo.touchedKeys.join(', ')
        : 'NODE_OPTIONS';
    console.warn(
      `[WardrobePro] phase-close verify: ignoring invalid localstorage node-option flag for child processes (${sourceLabel}).`
    );
  }

  runCoreCloseout({ projectRoot, childEnv });

  if (!depsReady) {
    const msg =
      '[WardrobePro] phase-close verify: node_modules is incomplete; skipping dependency-backed closeout steps (typecheck:ui, typecheck:dist, and broad verify:* packs).';
    if (flags.requireDeps || flags.full) {
      console.error(msg);
      process.exit(1);
      return;
    }
    console.warn(msg);
    console.log(
      '[WardrobePro] phase-close verify: core closeout passed. Install dependencies and rerun with --full for the broad suite.'
    );
    return;
  }

  if (flags.full) {
    runFullCloseout({ projectRoot, childEnv });
    console.log('[WardrobePro] phase-close verify: full closeout passed.');
    return;
  }

  console.log(
    '[WardrobePro] phase-close verify: core closeout passed. Dependencies are present; rerun with --full for the broad suite.'
  );
}

main();
