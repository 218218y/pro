#!/usr/bin/env node
/**
 * tools/wp_build_dist.js
 *
 * Build TS sources into runnable ESM JS under ./dist.
 */

import { resolveProjectRoot } from './wp_build_dist_shared.js';
import { createBuildDistHelpText, parseBuildDistArgs } from './wp_build_dist_state.js';
import { runBuildDistFlow } from './wp_build_dist_flow.js';

function main() {
  const args = parseBuildDistArgs(process.argv.slice(2));
  if (args.help) {
    console.log(createBuildDistHelpText());
    return;
  }

  const root = resolveProjectRoot(import.meta.url);

  try {
    const result = runBuildDistFlow({ root, args });
    console.log(result.successMessage);
  } catch (err) {
    if (err && err.buildDistHandled) {
      console.error(err.message || String(err));
      process.exit(typeof err.exitCode === 'number' ? err.exitCode : 1);
      return;
    }
    console.error(err);
    process.exit(1);
  }
}

main();
