#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const GENERATED_REPORT_CATALOG = Object.freeze([
  Object.freeze({
    id: 'verification-summary',
    lifecycle: 'release-evidence',
    json: 'docs/FINAL_VERIFICATION_SUMMARY.json',
    markdown: 'docs/FINAL_VERIFICATION_SUMMARY.md',
    command({ json, markdown }) {
      return ['tools/wp_verification_summary_contract.mjs', '--json-out', json, '--md-out', markdown];
    },
  }),
  Object.freeze({
    id: 'script-duplicates',
    lifecycle: 'source-derived',
    json: 'docs/script_duplicate_audit.json',
    markdown: 'docs/SCRIPT_DUPLICATE_AUDIT.md',
    command({ json, markdown }) {
      return ['tools/wp_script_duplicate_audit.mjs', '--json-out', json, '--md-out', markdown];
    },
  }),
  Object.freeze({
    id: 'css-style',
    lifecycle: 'source-derived',
    json: 'docs/css_style_audit.json',
    markdown: 'docs/CSS_STYLE_AUDIT.md',
    command({ json, markdown }) {
      return [
        'tools/wp_css_style_audit.mjs',
        '--budget=tools/wp_css_style_budget.json',
        '--json-out',
        json,
        '--md-out',
        markdown,
      ];
    },
  }),
  Object.freeze({
    id: 'features-public-api',
    lifecycle: 'source-derived',
    json: 'docs/features_public_api_audit.json',
    markdown: 'docs/FEATURES_PUBLIC_API_AUDIT.md',
    command({ json, markdown }) {
      return ['tools/wp_features_public_api_contract.mjs', '--json-out', json, '--md-out', markdown];
    },
  }),
  Object.freeze({
    id: 'legacy-fallbacks',
    lifecycle: 'source-derived',
    json: 'docs/legacy_fallback_audit.json',
    markdown: 'docs/LEGACY_FALLBACK_AUDIT.md',
    command({ json, markdown }) {
      return ['tools/wp_legacy_fallback_audit.mjs', '--json-out', json, '--md-out', markdown, '--no-print'];
    },
  }),
  Object.freeze({
    id: 'test-groups',
    lifecycle: 'source-derived',
    json: 'docs/test_group_catalog.json',
    markdown: 'docs/TEST_GROUP_CATALOG.md',
    command({ json, markdown }) {
      return ['tools/wp_test_group_catalog_report.mjs', `--json-out=${json}`, `--md-out=${markdown}`];
    },
  }),
  Object.freeze({
    id: 'test-portfolio',
    lifecycle: 'source-derived',
    json: 'docs/test_portfolio_audit.json',
    markdown: 'docs/TEST_PORTFOLIO_AUDIT.md',
    command({ json, markdown }) {
      return [
        'tools/wp_test_portfolio_audit.mjs',
        `--json-out=${json}`,
        `--md-out=${markdown}`,
        '--no-print',
      ];
    },
  }),
  Object.freeze({
    id: 'dimension-migration-retirement-inventory',
    lifecycle: 'source-derived',
    json: 'tools/wp_dimension_migration_retirement_inventory.json',
    markdown: 'docs/DIMENSION_MIGRATION_RETIREMENT_INVENTORY.md',
    command({ json, markdown }) {
      return [
        'tools/wp_dimension_migration_retirement_inventory.mjs',
        '--json-out',
        json,
        '--md-out',
        markdown,
      ];
    },
  }),
]);

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeJson(value) {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'generatedAt')
      .sort(([left], [right]) => compareCodePoints(left, right))
      .map(([key, entry]) => [key, normalizeJson(entry)])
  );
}

function normalizeMarkdown(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(line => !/^Generated(?: at)?:\s+/i.test(line.trim()))
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n+$/g, '');
}

function readJsonComparable(file) {
  return JSON.stringify(normalizeJson(JSON.parse(fs.readFileSync(file, 'utf8'))));
}

export function compareGeneratedArtifactPair({
  projectRoot,
  expectedJson,
  expectedMarkdown,
  actualJson,
  actualMarkdown,
}) {
  const drift = [];
  if (!fs.existsSync(actualJson))
    drift.push({ file: path.relative(projectRoot, actualJson), reason: 'missing' });
  if (!fs.existsSync(actualMarkdown)) {
    drift.push({ file: path.relative(projectRoot, actualMarkdown), reason: 'missing' });
  }
  if (drift.length) return drift;

  try {
    if (readJsonComparable(expectedJson) !== readJsonComparable(actualJson)) {
      drift.push({ file: path.relative(projectRoot, actualJson), reason: 'stale' });
    }
  } catch {
    drift.push({ file: path.relative(projectRoot, actualJson), reason: 'invalid-json' });
  }

  const expectedMarkdownText = fs.readFileSync(expectedMarkdown, 'utf8');
  const actualMarkdownText = fs.readFileSync(actualMarkdown, 'utf8');
  if (normalizeMarkdown(expectedMarkdownText) !== normalizeMarkdown(actualMarkdownText)) {
    drift.push({ file: path.relative(projectRoot, actualMarkdown), reason: 'stale' });
  }
  return drift;
}

function formatGeneratedArtifacts(projectRoot, files) {
  const args = [
    'node_modules/prettier/bin/prettier.cjs',
    ...files.map(file => path.relative(projectRoot, file).replace(/\\/g, '/')),
    '--write',
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(
      `[generated-reports] prettier failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }
}

export function selectGeneratedReports(ids = []) {
  const requested = new Set(Array.isArray(ids) ? ids.filter(Boolean) : []);
  if (!requested.size) {
    return GENERATED_REPORT_CATALOG.filter(report => report.lifecycle === 'source-derived');
  }
  const selected = GENERATED_REPORT_CATALOG.filter(report => requested.has(report.id));
  const missing = Array.from(requested).filter(
    id => !GENERATED_REPORT_CATALOG.some(report => report.id === id)
  );
  if (missing.length) throw new Error(`[generated-reports] unknown report id(s): ${missing.join(', ')}`);
  return selected;
}

function runReport({ projectRoot, report, jsonOut, markdownOut }) {
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOut), { recursive: true });
  const commandPaths = {
    json: path.relative(projectRoot, jsonOut).replace(/\\/g, '/'),
    markdown: path.relative(projectRoot, markdownOut).replace(/\\/g, '/'),
  };
  const result = spawnSync(process.execPath, report.command(commandPaths), {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(
      `[generated-reports] ${report.id} generation failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }
}

export function writeGeneratedReports(projectRoot = process.cwd(), reports = GENERATED_REPORT_CATALOG) {
  const files = [];
  for (const report of reports) {
    const jsonOut = path.resolve(projectRoot, report.json);
    const markdownOut = path.resolve(projectRoot, report.markdown);
    runReport({ projectRoot, report, jsonOut, markdownOut });
    files.push(jsonOut, markdownOut);
  }
  formatGeneratedArtifacts(projectRoot, files);
}

export function checkGeneratedReports(projectRoot = process.cwd(), reports = GENERATED_REPORT_CATALOG) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-generated-reports-'));
  const generated = [];
  try {
    for (const report of reports) {
      const jsonOut = path.join(tempRoot, `${report.id}.json`);
      const markdownOut = path.join(tempRoot, `${report.id}.md`);
      runReport({ projectRoot, report, jsonOut, markdownOut });
      generated.push({ report, jsonOut, markdownOut });
    }
    formatGeneratedArtifacts(
      projectRoot,
      generated.flatMap(item => [item.jsonOut, item.markdownOut])
    );
    return generated.flatMap(({ report, jsonOut, markdownOut }) =>
      compareGeneratedArtifactPair({
        projectRoot,
        expectedJson: jsonOut,
        expectedMarkdown: markdownOut,
        actualJson: path.resolve(projectRoot, report.json),
        actualMarkdown: path.resolve(projectRoot, report.markdown),
      })
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function parseOnlyIds(argv) {
  return argv
    .filter(arg => arg.startsWith('--only='))
    .flatMap(arg => arg.slice('--only='.length).split(','))
    .map(value => value.trim())
    .filter(Boolean);
}

function main() {
  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const write = args.has('--write');
  const check = args.has('--check') || !write;
  const reports = selectGeneratedReports(parseOnlyIds(argv));
  if (write) {
    writeGeneratedReports(process.cwd(), reports);
    console.log(`[generated-reports] wrote ${reports.length} report pair(s)`);
  }
  if (check) {
    const drift = checkGeneratedReports(process.cwd(), reports);
    if (drift.length) {
      console.error('[generated-reports] FAILED: generated report drift detected');
      for (const item of drift) console.error(`- ${item.file}: ${item.reason}`);
      process.exitCode = 1;
      return;
    }
    console.log(`[generated-reports] ok (${reports.length} report pair(s))`);
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) main();
