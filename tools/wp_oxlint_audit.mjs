#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    mode: 'syntax',
    failOnDiagnostics: false,
    jsonOut: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode') args.mode = argv[++i] || args.mode;
    else if (arg.startsWith('--mode=')) args.mode = arg.slice('--mode='.length);
    else if (arg === '--fail-on-diagnostics') args.failOnDiagnostics = true;
    else if (arg === '--json-out') args.jsonOut = argv[++i] || null;
    else if (arg.startsWith('--json-out=')) args.jsonOut = arg.slice('--json-out='.length);
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node tools/wp_oxlint_audit.mjs --mode syntax|type-aware [--fail-on-diagnostics] [--json-out path]'
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!['syntax', 'type-aware'].includes(args.mode)) throw new Error(`Unsupported mode: ${args.mode}`);
  return args;
}

function resolveOxlintBin() {
  const bin = path.join(ROOT, 'node_modules', 'oxlint', 'bin', 'oxlint');
  if (!fs.existsSync(bin)) {
    throw new Error('[Oxlint Audit] oxlint not found. Run: npm ci --ignore-scripts');
  }
  return bin;
}

function parseOxlintJson(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return { diagnostics: [], number_of_files: 0, number_of_rules: 0 };
  try {
    return JSON.parse(text);
  } catch (err) {
    const wrapped = new Error(`[Oxlint Audit] Failed to parse oxlint JSON output: ${err.message}`);
    wrapped.cause = err;
    throw wrapped;
  }
}

function createSummary({ mode, status, report, failOnDiagnostics }) {
  const diagnostics = Array.isArray(report.diagnostics) ? report.diagnostics : [];
  const bySeverity = diagnostics.reduce((acc, item) => {
    const severity = item && item.severity ? String(item.severity) : 'unknown';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});
  const byRule = diagnostics.reduce((acc, item) => {
    const code = item && item.code ? String(item.code) : 'unknown';
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});
  const topRules = Object.entries(byRule)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([rule, count]) => ({ rule, count }));

  return {
    mode,
    auditOnly: !failOnDiagnostics,
    oxlintExitCode: status,
    files: report.number_of_files || 0,
    rules: report.number_of_rules || 0,
    diagnostics: diagnostics.length,
    bySeverity,
    topRules,
  };
}

function runOxlint({ mode }) {
  const args = [
    resolveOxlintBin(),
    '-c',
    'oxlint.config.mjs',
    '--no-error-on-unmatched-pattern',
    '--format',
    'json',
    'esm',
    'types',
  ];

  if (mode === 'type-aware') {
    args.splice(1, 0, '--type-aware');
  }

  return spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: process.env,
  });
}

function writeJsonOut(jsonOut, payload) {
  if (!jsonOut) return;
  const target = path.resolve(ROOT, jsonOut);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n');
}

function printSummary(summary) {
  console.log(`[Oxlint Audit] mode: ${summary.mode}`);
  console.log(`[Oxlint Audit] files: ${summary.files}`);
  console.log(`[Oxlint Audit] rules: ${summary.rules}`);
  console.log(`[Oxlint Audit] diagnostics: ${summary.diagnostics}`);
  if (summary.topRules.length) {
    console.log('[Oxlint Audit] top diagnostics:');
    for (const item of summary.topRules) console.log(`  - ${item.rule}: ${item.count}`);
  }
  if (summary.mode === 'type-aware') {
    console.log(
      '[Oxlint Audit] type-aware mode is intentionally non-blocking until TS7/tsgolint parity is closed.'
    );
  } else {
    if (summary.auditOnly) {
      console.log(
        '[Oxlint Audit] syntax mode is audit-only in Stage 5; legacy ESLint remains the blocker for diagnostics.'
      );
    } else {
      console.log('[Oxlint Audit] syntax mode is blocking; diagnostics fail this gate.');
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = runOxlint(args);
  const report = parseOxlintJson(result.stdout);
  const summary = createSummary({
    mode: args.mode,
    status: result.status,
    report,
    failOnDiagnostics: args.failOnDiagnostics,
  });
  const payload = { summary, report };
  writeJsonOut(args.jsonOut, payload);
  printSummary(summary);

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  // Oxlint uses a non-zero status when diagnostics are emitted. Stage 5 keeps
  // diagnostics audit-only unless the caller explicitly asks to fail on them.
  if (args.failOnDiagnostics && summary.diagnostics > 0) process.exit(1);
  if (typeof result.status === 'number' && result.status !== 0 && summary.diagnostics === 0) {
    console.error(result.stderr || '[Oxlint Audit] oxlint failed without diagnostics.');
    process.exit(result.status);
  }
}

main();
