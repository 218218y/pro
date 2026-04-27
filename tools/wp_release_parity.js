#!/usr/bin/env node
/**
 * WardrobePro - release parity / packaging checks
 */

import { printReleaseParityReport } from './wp_release_parity_console.js';
import { runReleaseParityChecks } from './wp_release_parity_checks.js';
import { parseArgs } from './wp_release_parity_shared.js';

export { runReleaseParityChecks } from './wp_release_parity_checks.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let report;
  try {
    report = await runReleaseParityChecks(args);
  } catch (e) {
    console.error('[WP Release Parity] Failed:', e && e.stack ? e.stack : String(e));
    process.exit(1);
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!args.quiet) {
    printReleaseParityReport({ args, report });
  }

  if (!report.ok) process.exit(1);
}

main();
