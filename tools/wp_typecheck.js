/**
 * tools/wp_typecheck.js
 *
 * Cross-platform TypeScript checker for our gradual migration.
 * Runs `tsc` via Node to avoid OS-specific shims.
 */

import { createTypecheckHelpText } from './wp_typecheck_shared.js';
import { parseTypecheckArgs } from './wp_typecheck_state.js';
import { runTypecheckFlow } from './wp_typecheck_flow.js';

const args = parseTypecheckArgs(process.argv.slice(2));

if (args.help) {
  console.log(createTypecheckHelpText());
  process.exit(0);
}

const result = runTypecheckFlow({
  root: process.cwd(),
  node: process.execPath,
  runAll: args.runAll,
  mode: args.mode,
  env: process.env,
  log: console.log,
  warn: console.warn,
  error: console.error,
});

if (!result.ok) {
  if (result.errorMessage) {
    console.error(result.errorMessage);
  }
  if (result.cause) {
    console.error(result.cause);
  }
  process.exit(result.exitCode || 1);
}
