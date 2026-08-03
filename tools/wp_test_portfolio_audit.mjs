#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TEST_GROUP_CATALOG } from './wp_test_group_catalog.mjs';
import { buildTestGroupCatalogReport } from './wp_test_group_catalog_report.mjs';
import {
  isCanonicalTestFile,
  isPlaywrightE2ETestFile,
  listCanonicalTestFiles,
} from './wp_test_file_classifier.js';

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
const PACKAGE_TEST_REF_RE =
  /tests\/[^\s"']+?(?:\.test\.(?:js|tsx|ts|mjs|cjs)|\.spec\.(?:js|tsx|ts|mjs|cjs))/g;
const REPOSITORY_LAYER_GRAPH_CALL = 'collectLayerContractGraph(';
const REPOSITORY_LAYER_GRAPH_OWNER = 'tests/helpers/repository_layer_contract_fixture.mjs';
const HISTORICAL_MIGRATION_PREFIX_ACCESS = 'migrationBudgets.slice';

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

function collectCatalogTestRefs() {
  const refs = [];
  for (const [group, definition] of Object.entries(TEST_GROUP_CATALOG)) {
    for (const file of Array.isArray(definition?.files) ? definition.files : []) {
      refs.push({ group, file });
    }
  }
  return refs;
}

export function collectDirectRepositoryLayerScanTests(projectRoot = ROOT, testFiles = null) {
  const files =
    testFiles ??
    walk(path.join(projectRoot, 'tests'))
      .filter(file => /\.(?:js|cjs|mjs|ts|tsx)$/u.test(file))
      .map(file => path.relative(projectRoot, file).split(path.sep).join('/'));
  return files.filter(
    file =>
      file !== REPOSITORY_LAYER_GRAPH_OWNER &&
      fs.readFileSync(path.join(projectRoot, file), 'utf8').includes(REPOSITORY_LAYER_GRAPH_CALL)
  );
}

export function collectHistoricalMigrationPrefixTests(projectRoot = ROOT, testFiles = null) {
  const files =
    testFiles ??
    listCanonicalTestFiles(projectRoot).map(file =>
      path.relative(projectRoot, file).split(path.sep).join('/')
    );
  return files.filter(file =>
    fs.readFileSync(path.join(projectRoot, file), 'utf8').includes(HISTORICAL_MIGRATION_PREFIX_ACCESS)
  );
}

export function buildReport() {
  const groupCatalogReport = buildTestGroupCatalogReport(ROOT);
  const tests = listCanonicalTestFiles(ROOT).map(normalize);
  const nonTestRuntimeFiles = (fs.existsSync(TEST_ROOT) ? walk(TEST_ROOT) : [])
    .map(normalize)
    .filter(rel => /\.(?:js|cjs|mjs|ts|tsx)$/u.test(rel) && !isCanonicalTestFile(rel))
    .sort();
  const unitRunnerFiles = tests.filter(file => !isPlaywrightE2ETestFile(path.join(ROOT, file), ROOT));
  const e2eFiles = tests.filter(file => isPlaywrightE2ETestFile(path.join(ROOT, file), ROOT));
  const packageRefs = collectPackageTestRefs();
  const catalogRefs = collectCatalogTestRefs();
  const refs = [
    ...packageRefs.map(ref => ({ source: 'package', owner: ref.script, ...ref })),
    ...catalogRefs.map(ref => ({ source: 'catalog', owner: ref.group, ...ref })),
  ];
  const testRefSet = new Set(refs.map(({ file }) => file));
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
  const missingTestRefs = refs.filter(({ file }) => !fs.existsSync(path.join(ROOT, file)));
  const duplicateCatalogRefs = Object.entries(TEST_GROUP_CATALOG).flatMap(([group, definition]) => {
    const seen = new Set();
    const duplicates = [];
    for (const file of Array.isArray(definition?.files) ? definition.files : []) {
      if (seen.has(file)) duplicates.push({ group, file });
      seen.add(file);
    }
    return duplicates;
  });
  const unreferencedStageGuards = tests.filter(
    file => /tests\/refactor_stage\d+_.*\.test\.js$/.test(file) && !testRefSet.has(file)
  );
  const unitRunnerFileSet = new Set(unitRunnerFiles);
  const duplicateRunnerFiles = unitRunnerFiles.filter(
    (file, index) => unitRunnerFiles.indexOf(file) !== index
  );
  const e2eIncludedInUnitRunner = unitRunnerFiles.filter(file => e2eFiles.includes(file));
  const helpersIncludedInUnitRunner = unitRunnerFiles.filter(file => nonTestRuntimeFiles.includes(file));
  const directRepositoryLayerScanTests = collectDirectRepositoryLayerScanTests(ROOT, tests);
  const historicalMigrationPrefixTests = collectHistoricalMigrationPrefixTests(ROOT, tests);
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      tests: tests.length,
      unitRunnerTests: unitRunnerFiles.length,
      e2eTests: e2eFiles.length,
      nonTestRuntimeFiles: nonTestRuntimeFiles.length,
      packageTestReferences: packageRefs.length,
      catalogTestReferences: catalogRefs.length,
      totalTestReferences: refs.length,
      catalogGroups: groupCatalogReport.summary.groups,
      catalogScriptBindings: groupCatalogReport.summary.scriptBindings,
      primaryCatalogGroups: groupCatalogReport.summary.portfolioRoles.primary || 0,
      directRepositoryLayerScanTests: directRepositoryLayerScanTests.length,
      historicalMigrationPrefixTests: historicalMigrationPrefixTests.length,
    },
    categories,
    failures: {
      missingTestRefs,
      duplicateCatalogRefs,
      invalidCatalogDefinitions: groupCatalogReport.failures.catalogIssues,
      staleCatalogScriptBindings: groupCatalogReport.failures.bindingIssues,
      legacyRuntimeNames,
      unreferencedStageGuards,
      duplicateRunnerFiles,
      e2eIncludedInUnitRunner,
      helpersIncludedInUnitRunner,
      directRepositoryLayerScanTests,
      historicalMigrationPrefixTests,
      missingFromUnitRunner: tests.filter(file => !e2eFiles.includes(file) && !unitRunnerFileSet.has(file)),
    },
    records,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Test portfolio audit', '', `Generated: ${report.generatedAt}`, '', '## Summary', '');
  lines.push(`- Test files classified: ${report.totals.tests}`);
  lines.push(`- Canonical unit/runtime runner files: ${report.totals.unitRunnerTests}`);
  lines.push(`- Playwright E2E files excluded from unit runner: ${report.totals.e2eTests}`);
  lines.push(`- Helpers/fixtures excluded by filename contract: ${report.totals.nonTestRuntimeFiles}`);
  lines.push(
    `- Package script test references: ${report.totals.packageTestReferences}`,
    `- Catalog test references: ${report.totals.catalogTestReferences}`,
    `- Total explicit test references: ${report.totals.totalTestReferences}`,
    `- Catalog groups: ${report.totals.catalogGroups}`,
    `- Catalog-backed package scripts: ${report.totals.catalogScriptBindings}`,
    `- Primary non-overlapping portfolio groups: ${report.totals.primaryCatalogGroups}`,
    `- Tests directly invoking the repository layer graph: ${report.totals.directRepositoryLayerScanTests}`,
    `- Tests copying historical migration-ledger prefixes: ${report.totals.historicalMigrationPrefixTests}`,
    ''
  );
  lines.push('| Category | Count |', '|---|---:|');
  for (const [category, count] of Object.entries(report.categories)) lines.push(`| ${category} | ${count} |`);
  lines.push('', '## Guard results', '', '| Check | Failures |', '|---|---:|');
  lines.push(`| No stale package/catalog test references | ${report.failures.missingTestRefs.length} |`);
  lines.push(
    `| Test groups contain no duplicate file membership | ${report.failures.duplicateCatalogRefs.length} |`
  );
  lines.push(
    `| Test-group catalog definitions are valid | ${report.failures.invalidCatalogDefinitions.length} |`
  );
  lines.push(
    `| Catalog script bindings match package.json facades | ${report.failures.staleCatalogScriptBindings.length} |`
  );
  lines.push(
    `| Legacy tests are explicitly migration/compat/cleanup/root/guard/audit/contract scoped | ${report.failures.legacyRuntimeNames.length} |`
  );
  lines.push(
    `| Refactor stage guard tests have package/catalog ownership | ${report.failures.unreferencedStageGuards.length} |`
  );
  lines.push(`| Unit runner has no duplicate files | ${report.failures.duplicateRunnerFiles.length} |`);
  lines.push(`| Unit runner excludes Playwright E2E | ${report.failures.e2eIncludedInUnitRunner.length} |`);
  lines.push(
    `| Unit runner excludes helpers/fixtures | ${report.failures.helpersIncludedInUnitRunner.length} |`
  );
  lines.push(
    `| Repository layer graph is owned only by the cached central fixture | ${report.failures.directRepositoryLayerScanTests.length} |`
  );
  lines.push(
    `| Historical migration prefixes are owned only by the final closeout fingerprint | ${report.failures.historicalMigrationPrefixTests.length} |`
  );
  lines.push(
    `| Every non-E2E test reaches the unit runner | ${report.failures.missingFromUnitRunner.length} |`,
    ''
  );
  if (Object.values(report.failures).some(items => items.length)) {
    lines.push('## Failure details', '');
    for (const [key, items] of Object.entries(report.failures)) {
      if (!items.length) continue;
      lines.push(`### ${key}`, '');
      for (const item of items.slice(0, 100))
        lines.push(
          `- ${typeof item === 'string' ? item : `${item.owner || item.script || item.group}: ${item.file}`}`
        );
      if (items.length > 100) lines.push(`- ... ${items.length - 100} more`);
      lines.push('');
    }
  }
  lines.push(
    '## Policy',
    '',
    'This audit is intentionally a portfolio map, not a brittle snapshot of every assertion. It protects against stale package/catalog references and unnamed legacy runtime coverage while allowing the test suite to keep evolving.',
    ''
  );
  return lines.join('\n');
}

function main() {
  const report = buildReport();
  const failures = Object.values(report.failures).reduce((sum, items) => sum + items.length, 0);
  if (jsonOut) fs.writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  if (mdOut) fs.writeFileSync(mdOut, renderMarkdown(report));
  if (shouldPrint) {
    console.log(
      `[test-portfolio-audit] tests=${report.totals.tests} refs=${report.totals.totalTestReferences} (package=${report.totals.packageTestReferences}, catalog=${report.totals.catalogTestReferences})`
    );
    for (const [category, count] of Object.entries(report.categories)) console.log(`- ${category}: ${count}`);
  }
  if (failures) {
    console.error(`[test-portfolio-audit] FAILED with ${failures} issue(s)`);
    for (const [key, items] of Object.entries(report.failures))
      if (items.length) console.error(`- ${key}: ${items.length}`);
    process.exitCode = 1;
    return;
  }
  console.log('[test-portfolio-audit] ok');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
