#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TEST_ROOT = path.join(ROOT, 'tests');
const args = new Set(process.argv.slice(2));
const getArgValue = name => {
  const prefix = `${name}=`;
  for (const arg of args) if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  return null;
};
const jsonOut = getArgValue('--json-out');
const mdOut = getArgValue('--md-out');
const shouldPrint = !args.has('--no-print');
const TEST_FILE_RE = /(?:\.test\.(?:js|tsx|ts|mjs|cjs)|\.spec\.(?:js|tsx|ts|mjs|cjs))$/;
const PACKAGE_TEST_REF_RE =
  /tests\/[^\s"']+?(?:\.test\.(?:js|tsx|ts|mjs|cjs)|\.spec\.(?:js|tsx|ts|mjs|cjs))/g;

function walk(dir) {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      entries.push(...walk(full));
    } else if (entry.isFile()) {
      entries.push(full);
    }
  }
  return entries;
}

function normalize(file) {
  return file
    .split(path.sep)
    .join('/')
    .replace(`${ROOT.replaceAll('\\', '/')}/`, '');
}

function classify(rel) {
  const name = rel.toLowerCase();
  if (
    name.includes('/e2e/') ||
    /(?:^|[_.-])e2e(?:[_.-]|$)/.test(name) ||
    /\.spec\.(?:js|tsx|ts|mjs|cjs)$/.test(name)
  )
    return 'e2e-smoke';
  if (/perf|performance|browser_perf|budget|benchmark/.test(name)) return 'perf-smoke';
  if (/migration|project_io|import|save_load|payload|canonicalization|legacy/.test(name))
    return 'legacy-migration';
  if (
    /contract|surface|guard|audit|policy|layer|ownership|public_api|type_hardening|closeout|control_plane/.test(
      name
    )
  )
    return 'contract';
  if (
    /cloud_sync|order_pdf|notes|canvas|picking|builder|render|scheduler|project|export|door|drawer|sketch|service|controller|flow|integration/.test(
      name
    )
  )
    return 'integration';
  return 'runtime-unit';
}

function collectPackageTestRefs() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const refs = [];
  for (const [script, command] of Object.entries(pkg.scripts || {})) {
    const matches = String(command).match(PACKAGE_TEST_REF_RE) || [];
    for (const file of matches) refs.push({ script, file });
  }
  return refs;
}

function buildReport() {
  const tests = (fs.existsSync(TEST_ROOT) ? walk(TEST_ROOT) : [])
    .map(normalize)
    .filter(rel => TEST_FILE_RE.test(rel))
    .sort();
  const refs = collectPackageTestRefs();
  const packageRefSet = new Set(refs.map(({ file }) => file));
  const categories = {
    contract: 0,
    'runtime-unit': 0,
    integration: 0,
    'e2e-smoke': 0,
    'perf-smoke': 0,
    'legacy-migration': 0,
  };
  const records = [];
  const legacyRuntimeNames = [];
  for (const file of tests) {
    const category = classify(file);
    categories[category] = (categories[category] || 0) + 1;
    records.push({ file, category });
    if (/legacy/i.test(file) && !/(migration|compat|cleanup|guard|audit|contract|surface|root)/i.test(file))
      legacyRuntimeNames.push(file);
  }
  const missingPackageRefs = refs.filter(({ file }) => !fs.existsSync(path.join(ROOT, file)));
  const unreferencedStageGuards = tests.filter(
    file => /tests\/refactor_stage\d+_.*\.test\.js$/.test(file) && !packageRefSet.has(file)
  );
  return {
    generatedAt: new Date().toISOString(),
    totals: { tests: tests.length, packageTestReferences: refs.length },
    categories,
    failures: { missingPackageRefs, legacyRuntimeNames, unreferencedStageGuards },
    records,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Test portfolio audit', '', `Generated: ${report.generatedAt}`, '', '## Summary', '');
  lines.push(`- Test files classified: ${report.totals.tests}`);
  lines.push(`- Package script test references: ${report.totals.packageTestReferences}`, '');
  lines.push('| Category | Count |', '|---|---:|');
  for (const [category, count] of Object.entries(report.categories)) lines.push(`| ${category} | ${count} |`);
  lines.push('', '## Guard results', '', '| Check | Failures |', '|---|---:|');
  lines.push(`| No stale package test references | ${report.failures.missingPackageRefs.length} |`);
  lines.push(
    `| Legacy tests are explicitly migration/compat/cleanup/root/guard/audit/contract scoped | ${report.failures.legacyRuntimeNames.length} |`
  );
  lines.push(
    `| Refactor stage guard tests are referenced by package scripts | ${report.failures.unreferencedStageGuards.length} |`,
    ''
  );
  if (Object.values(report.failures).some(items => items.length)) {
    lines.push('## Failure details', '');
    for (const [key, items] of Object.entries(report.failures)) {
      if (!items.length) continue;
      lines.push(`### ${key}`, '');
      for (const item of items.slice(0, 100))
        lines.push(`- ${typeof item === 'string' ? item : `${item.script}: ${item.file}`}`);
      if (items.length > 100) lines.push(`- ... ${items.length - 100} more`);
      lines.push('');
    }
  }
  lines.push(
    '## Policy',
    '',
    'This audit is intentionally a portfolio map, not a brittle snapshot of every assertion. It protects against stale package references and unnamed legacy runtime coverage while allowing the test suite to keep evolving.',
    ''
  );
  return `${lines.join('\n')}\n`;
}

const report = buildReport();
const failures = Object.values(report.failures).reduce((sum, items) => sum + items.length, 0);
if (jsonOut) fs.writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
if (mdOut) fs.writeFileSync(mdOut, renderMarkdown(report));
if (shouldPrint) {
  console.log(
    `[test-portfolio-audit] tests=${report.totals.tests} refs=${report.totals.packageTestReferences}`
  );
  for (const [category, count] of Object.entries(report.categories)) console.log(`- ${category}: ${count}`);
}
if (failures) {
  console.error(`[test-portfolio-audit] FAILED with ${failures} issue(s)`);
  for (const [key, items] of Object.entries(report.failures))
    if (items.length) console.error(`- ${key}: ${items.length}`);
  process.exit(1);
}
console.log('[test-portfolio-audit] ok');
process.exit(0);
