#!/usr/bin/env node
/*
  WardrobePro - lightweight quality gate (mode-aware)

  Detects whether this repo is legacy (./js) or Pure ESM (./esm) and runs:
  1) Syntax check for JS/TS source files under the detected source root.
  2) Policy counters (different per mode).

  Usage:
    node tools/wp_check.js
    node tools/wp_check.js --strict

  Optional:
    --baseline <path>       Baseline JSON path (default: tools/wp_baseline.json)
    --write-baseline        Writes the current counts to baseline path
    --json                  Prints a machine-readable JSON report and exits
    --gate / --regress      Compare counts vs baseline (fails on regressions)
*/

import {
  countByExtension,
  readBaseline,
  rel,
  ROOT,
  walkSourceFiles,
  writeBaseline,
} from './wp_check_shared.js';
import { createCheckJsonReport, detectMode, parseCheckArgs } from './wp_check_state.js';
import { assertGate, assertStrict, collectPolicyStats } from './wp_check_policy.js';
import { runSyntaxChecks } from './wp_check_syntax.js';

function printSyntaxErrors(errors) {
  for (const { file, msg } of errors) {
    console.error(`\n[SyntaxError] ${rel(ROOT, file)}\n${msg}\n`);
  }
}

function printGateFailures(result) {
  if (result.missingBaseline) {
    console.error('[WP Check] GATE requested but baseline is missing/unreadable.');
    process.exit(2);
  }
  console.error('\n[WP Check] GATE FAIL (regressions):');
  for (const [needle, value, baselineValue] of result.failures) {
    console.error(`  - ${needle}: ${value} (baseline ${baselineValue})`);
  }
  process.exit(1);
}

function printStrictFailures(result) {
  console.error('\n[WP Check] STRICT FAIL:');
  for (const [needle, value] of result.failures) console.error(`  - ${needle}: ${value}`);
  process.exit(1);
}

function main() {
  const args = parseCheckArgs(process.argv.slice(2));
  const { mode, srcRoot } = detectMode();
  if (!mode) {
    console.error('❌ Could not detect project mode (missing ./js and ./esm).');
    process.exit(2);
  }

  if (!args.jsonOut) {
    console.log(`[WP Check] Mode: ${mode}`);
    console.log(`[WP Check] Source: ${rel(ROOT, srcRoot)}`);
  }

  const files = walkSourceFiles(srcRoot);
  const fileTypes = countByExtension(files);
  if (!args.jsonOut) console.log(`[WP Check] Files: ${files.length}`);
  if (!args.jsonOut && Object.keys(fileTypes).length) {
    const extSummary = Object.entries(fileTypes)
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([ext, count]) => `${ext}:${count}`)
      .join(', ');
    console.log(`[WP Check] File types: ${extSummary}`);
  }

  const syntax = runSyntaxChecks(files, { root: ROOT });
  if (syntax.syntaxErrors) {
    printSyntaxErrors(syntax.errors);
    console.error(`[WP Check] FAIL: ${syntax.syntaxErrors} syntax error(s).`);
    process.exit(1);
  }
  if (!args.jsonOut) console.log('[WP Check] OK: syntax.');
  if (!args.jsonOut && syntax.tsSyntaxSkipped > 0) {
    console.warn(
      `[WP Check] WARN: skipped TS syntax parsing for ${syntax.tsSyntaxSkipped} file(s) because TypeScript was not available.`
    );
  }

  const { needles, totals, byDir } = collectPolicyStats(mode, srcRoot, files);
  if (args.writeBaseline) {
    writeBaseline(args.baselinePath, mode, needles, totals, byDir);
    console.log(`[WP Check] Wrote baseline: ${rel(ROOT, args.baselinePath)}`);
  }

  if (args.jsonOut) {
    console.log(
      JSON.stringify(
        createCheckJsonReport({
          mode,
          files: files.length,
          fileTypes,
          syntaxTsSkipped: syntax.tsSyntaxSkipped,
          totals,
          byDir,
          strict: args.strict,
          gate: args.gate,
        }),
        null,
        2
      )
    );
    process.exit(0);
  }

  console.log('\n[WP Check] Policy stats:');
  for (const [needle, value] of Object.entries(totals)) console.log(`  - ${needle}: ${value}`);

  if (args.gate) {
    const gateResult = assertGate(readBaseline(args.baselinePath), totals);
    if (!gateResult.ok) printGateFailures(gateResult);
    console.log('\n[WP Check] GATE OK.');
  }

  if (args.strict) {
    const strictResult = assertStrict(mode, totals);
    if (!strictResult.ok) printStrictFailures(strictResult);
    console.log('\n[WP Check] STRICT OK.');
  }
}

main();
