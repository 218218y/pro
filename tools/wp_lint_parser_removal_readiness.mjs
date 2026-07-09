#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectLintRuleMatrix, ROOT } from './wp_lint_rule_matrix.mjs';
import { getLintArchitectureBaselineCount } from './wp_lint_architecture_contracts.mjs';

const __filename = fileURLToPath(import.meta.url);

const ALLOWED_TARGETS = new Set([
  'keep-eslint',
  'replace-by-oxlint',
  'replace-by-tsc',
  'replace-by-custom-contract',
  'drop-duplicate',
  'intentionally-accepted',
]);

const UNDECIDED_TARGETS = new Set(['manual-review', 'under-review', 'todo', 'tbd', 'candidate']);
const OXLINT_SYNTAX_COMMAND = 'npm run lint:ts-modern:syntax';
const CUSTOM_CONTRACT_COMMAND = 'npm run lint:contracts';
const TYPECHECK_COMMAND = 'npm run typecheck:runtime && npm run typecheck:dist';
const JS_ESLINT_COMMAND = 'npm run lint:js:strict';

const CUSTOM_CONTRACT_RULES = new Set([
  'no-restricted-globals',
  'no-restricted-imports',
  'no-restricted-syntax',
]);

function readPackageJson(root = ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
}

function hasTsOrTsxScope(row) {
  return row.appliesTo.includes('TS') || row.appliesTo.includes('TSX');
}

function getScript(pkg, name) {
  return (pkg.scripts && pkg.scripts[name]) || '';
}

function isBlockingOxlintSyntaxScript(pkg) {
  const command = getScript(pkg, 'lint:ts-modern:syntax');
  return (
    command.includes('wp_oxlint_audit.mjs') &&
    command.includes('--mode syntax') &&
    command.includes('--fail-on-diagnostics')
  );
}

function isLintContractsScriptWired(pkg) {
  const command = getScript(pkg, 'lint:contracts');
  return (
    command.includes('wp_lint_rule_matrix.mjs') &&
    command.includes('wp_lint_parity_report.mjs') &&
    command.includes('lint:architecture-contracts')
  );
}

function isParserRemovalDryRunScript(command) {
  return command.includes('wp_lint.js') && command.includes('--profile parser-removal-dry-run');
}

function isLintJsSeparated(pkg) {
  return isParserRemovalDryRunScript(getScript(pkg, 'lint:js'));
}

function isLintJsStrictSeparated(pkg) {
  const command = getScript(pkg, 'lint:js:strict');
  return isParserRemovalDryRunScript(command) && command.includes('--strict');
}

function isParserRemovalDryRunWired(pkg) {
  return isParserRemovalDryRunScript(getScript(pkg, 'lint:parser-removal-dry-run'));
}

function isTypecheckGateWired(pkg) {
  return Boolean(getScript(pkg, 'typecheck:runtime') && getScript(pkg, 'typecheck:dist'));
}

function futureOwnerForRow(row) {
  if (row.futureTarget === 'replace-by-oxlint') return 'Oxlint syntax';
  if (row.futureTarget === 'replace-by-custom-contract') return 'custom lint contracts';
  if (row.futureTarget === 'replace-by-tsc') return 'TypeScript typecheck';
  if (row.rule === 'no-undef') return 'ESLint JS/tools + TypeScript typecheck';
  if (row.futureTarget === 'keep-eslint') return 'ESLint compatibility';
  if (row.futureTarget === 'drop-duplicate') return 'duplicate removed by owner gate';
  return 'accepted policy';
}

function blockingCommandForRow(row) {
  if (row.futureTarget === 'replace-by-oxlint') return OXLINT_SYNTAX_COMMAND;
  if (row.futureTarget === 'replace-by-custom-contract') return CUSTOM_CONTRACT_COMMAND;
  if (row.futureTarget === 'replace-by-tsc') return TYPECHECK_COMMAND;
  if (row.rule === 'no-undef') return `${JS_ESLINT_COMMAND}; TS/TSX via ${TYPECHECK_COMMAND}`;
  if (row.futureTarget === 'keep-eslint') return 'npm run lint:legacy';
  return 'n/a';
}

function readinessNotesForRow(row) {
  if (row.futureTarget === 'replace-by-oxlint') {
    return 'Owned by the blocking Oxlint syntax lane at 0 diagnostics.';
  }
  if (row.futureTarget === 'replace-by-custom-contract') {
    return 'Owned by project lint contracts; architecture baseline must stay at 0.';
  }
  if (row.futureTarget === 'replace-by-tsc') {
    return 'Owned by TypeScript typecheck gates instead of ESLint parser selectors.';
  }
  if (row.rule === 'no-undef') {
    return 'Not a TS/TSX parser-removal blocker: ESLint keeps JS/tools globals, while TS/TSX relies on TypeScript typecheck.';
  }
  if (row.futureTarget === 'keep-eslint') {
    return hasTsOrTsxScope(row)
      ? 'Still TS/TSX-scoped under ESLint; this would block parser removal until narrowed or re-owned.'
      : 'Kept under ESLint for JS/tools/config only.';
  }
  if (row.futureTarget === 'drop-duplicate')
    return 'Duplicate coverage is intentionally dropped after the owning gate is blocking.';
  return 'Explicitly accepted for parser removal.';
}

function evaluateRow(row, context) {
  const issues = [];
  const target = row.futureTarget || '';

  if (!target || UNDECIDED_TARGETS.has(target)) {
    issues.push(`future target is not decided: ${target || '<missing>'}`);
  } else if (!ALLOWED_TARGETS.has(target)) {
    issues.push(`future target is not an allowed Stage 5 target: ${target}`);
  }

  if (target === 'replace-by-oxlint' && !context.oxlintSyntaxBlocking) {
    issues.push('replace-by-oxlint requires blocking lint:ts-modern:syntax with --fail-on-diagnostics');
  }

  if (target === 'replace-by-custom-contract') {
    if (!CUSTOM_CONTRACT_RULES.has(row.rule)) {
      issues.push('replace-by-custom-contract is only wired for the known architecture rules today');
    }
    if (!context.lintContractsWired) {
      issues.push('replace-by-custom-contract requires lint:contracts to include architecture contracts');
    }
    if (context.architectureBaselineCount !== 0) {
      issues.push(
        `architecture baseline is ${context.architectureBaselineCount}; parser removal readiness requires 0`
      );
    }
  }

  if (target === 'replace-by-tsc' && !context.typecheckWired) {
    issues.push('replace-by-tsc requires typecheck:runtime and typecheck:dist scripts');
  }

  if (target === 'keep-eslint') {
    if (row.rule === 'no-undef') {
      if (!context.lintJsSeparated)
        issues.push(
          'no-undef requires lint:js to use the parser-removal dry-run ESLint gate for JS/tools/config'
        );
      if (!context.lintJsStrictSeparated)
        issues.push(
          'no-undef requires lint:js:strict to use parser-removal dry-run with --strict for zero-warning JS/tools coverage'
        );
      if (!context.parserRemovalDryRunWired)
        issues.push('no-undef requires lint:parser-removal-dry-run to be wired');
      if (!context.typecheckWired) issues.push('no-undef TS/TSX replacement requires typecheck gates');
    } else if (hasTsOrTsxScope(row)) {
      issues.push('keep-eslint rule still applies to TS/TSX and blocks parser removal');
    }
  }

  return {
    rule: row.rule,
    futureTarget: target,
    futureOwner: futureOwnerForRow(row),
    blockingCommand: blockingCommandForRow(row),
    ready: issues.length === 0,
    notes: issues.length ? issues.join('; ') : readinessNotesForRow(row),
  };
}

export async function collectLintParserRemovalReadiness(options = {}) {
  const root = options.root || ROOT;
  const pkg = options.packageJson || readPackageJson(root);
  const rows = options.rows || (await collectLintRuleMatrix());
  const context = {
    architectureBaselineCount:
      typeof options.architectureBaselineCount === 'number'
        ? options.architectureBaselineCount
        : getLintArchitectureBaselineCount(),
    lintContractsWired: isLintContractsScriptWired(pkg),
    lintJsSeparated: isLintJsSeparated(pkg),
    lintJsStrictSeparated: isLintJsStrictSeparated(pkg),
    parserRemovalDryRunWired: isParserRemovalDryRunWired(pkg),
    oxlintSyntaxBlocking: isBlockingOxlintSyntaxScript(pkg),
    typecheckWired: isTypecheckGateWired(pkg),
  };

  const readinessRows = rows.map(row => evaluateRow(row, context));
  const failures = readinessRows.filter(row => !row.ready);
  return {
    context,
    failures,
    ready: failures.length === 0,
    rows: readinessRows,
  };
}

export async function collectLintParserRemovalReadinessRows(options = {}) {
  return (await collectLintParserRemovalReadiness(options)).rows;
}

function parseArgs(argv) {
  const args = { json: false };
  for (const arg of argv) {
    if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/wp_lint_parser_removal_readiness.mjs [--json]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await collectLintParserRemovalReadiness();
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (report.ready) {
    console.log(
      `[Lint Parser Removal Readiness] OK (${report.rows.length} rule(s)); architecture baseline = ${report.context.architectureBaselineCount}`
    );
    return;
  }

  console.error(`[Lint Parser Removal Readiness] FAILED (${report.failures.length} blocker(s))`);
  for (const failure of report.failures) {
    console.error(`- ${failure.rule}: ${failure.notes}`);
  }
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
