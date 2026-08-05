#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TEST_GROUP_CATALOG } from './wp_test_group_catalog.mjs';
import { buildTestGroupCatalogReport } from './wp_test_group_catalog_report.mjs';
import { runContractRegistryAudit } from './wp_contract_registry_audit.mjs';
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
const MAX_DIRECT_TEST_REFS_PER_PACKAGE_SCRIPT = 4;
const REPOSITORY_LAYER_GRAPH_OWNER = 'tests/helpers/repository_layer_contract_fixture.mjs';
const RETIRED_LAYER_LEDGER_ACCESS_RE =
  /\.\s*(?:migrationBudgets|migrationRetirements|migrationConsolidations)\b/u;
const HISTORICAL_PROOF_NAME_RE =
  /^(?:(?:refactor_)?stage(?:\d+|[a-z]+)(?:[_-]|$)|wave(?:\d+|_[a-z]\d*)(?:[_-]|$))|(?:delete[-_]?pass|checkpoint|migration_(?:retirement|final_closeout))/iu;
const CONTRACT_SOURCE_REF_RE = /['"`]((?:\.\.\/)?esm\/[A-Za-z0-9_./-]+\.(?:ts|tsx|js))['"`]/gu;

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
    /(?:^|[_.-])e2e(?:[_.-]|$)/u.test(name) ||
    /\.spec\.(?:js|tsx|ts|mjs|cjs)$/u.test(name)
  ) {
    return 'e2e-smoke';
  }
  if (/perf|performance|browser_perf|budget|benchmark/u.test(name)) return 'perf-smoke';
  if (
    /contract|surface|guard|audit|policy|layer|ownership|public_api|type_hardening|closeout|control_plane/u.test(
      name
    )
  ) {
    return 'contract';
  }
  if (/migration|project_io|project_import|save_load|payload|canonicalization|legacy/u.test(name)) {
    return 'persistence-ingress';
  }
  if (
    /cloud_sync|order_pdf|notes|canvas|picking|builder|render|scheduler|project|export|door|drawer|sketch|service|controller|flow|integration/u.test(
      name
    )
  ) {
    return 'integration';
  }
  return 'runtime-unit';
}

function contractKind(rel) {
  const name = path.posix.basename(rel);
  if (/ownership/u.test(name)) return 'ownership';
  if (/source_(?:guard|contract)/u.test(name)) return 'source-guard';
  if (/contract|guard|audit/u.test(name)) return 'contract';
  return null;
}

export function isHistoricalArchitectureProofFile(rel) {
  return HISTORICAL_PROOF_NAME_RE.test(path.posix.basename(rel));
}

function resolveLiveContractTarget(projectRoot, rawTarget) {
  const normalized = rawTarget.replace(/^\.\.\//u, '');
  const candidates = normalized.endsWith('.js')
    ? [normalized.replace(/\.js$/u, '.ts'), normalized.replace(/\.js$/u, '.tsx'), normalized]
    : [normalized];
  return candidates.find(candidate => fs.existsSync(path.join(projectRoot, candidate))) ?? null;
}

export function collectContractOverlapTargets(projectRoot = ROOT, testFiles = null) {
  const files = testFiles ?? listCanonicalTestFiles(projectRoot).map(normalize);
  const targetOwners = new Map();
  for (const file of files) {
    const kind = contractKind(file);
    if (!kind) continue;
    const source = fs.readFileSync(path.join(projectRoot, file), 'utf8');
    const targets = new Set(
      [...source.matchAll(CONTRACT_SOURCE_REF_RE)]
        .map(match => resolveLiveContractTarget(projectRoot, match[1]))
        .filter(Boolean)
    );
    for (const target of targets) {
      if (!targetOwners.has(target)) targetOwners.set(target, []);
      targetOwners.get(target).push({ file, kind });
    }
  }
  return [...targetOwners]
    .map(([target, owners]) => ({
      target,
      kinds: [...new Set(owners.map(owner => owner.kind))].sort(),
      owners: owners.sort((left, right) => left.file.localeCompare(right.file)),
    }))
    .filter(entry => entry.kinds.length > 1)
    .sort((left, right) => left.target.localeCompare(right.target));
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

export function collectOversizedDirectPackageTestScripts(packageRefs = collectPackageTestRefs()) {
  const refsByScript = new Map();
  for (const ref of packageRefs) {
    if (!String(ref.script || '').startsWith('test:')) continue;
    if (!refsByScript.has(ref.script)) refsByScript.set(ref.script, []);
    refsByScript.get(ref.script).push(ref.file);
  }
  return [...refsByScript]
    .filter(([, files]) => files.length > MAX_DIRECT_TEST_REFS_PER_PACKAGE_SCRIPT)
    .map(([script, files]) => ({ script, files: [...files] }))
    .sort((left, right) => left.script.localeCompare(right.script));
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

export function collectRetiredLayerLedgerAccessTests(projectRoot = ROOT, testFiles = null) {
  const files =
    testFiles ??
    listCanonicalTestFiles(projectRoot).map(file =>
      path.relative(projectRoot, file).split(path.sep).join('/')
    );
  return files.filter(file =>
    RETIRED_LAYER_LEDGER_ACCESS_RE.test(fs.readFileSync(path.join(projectRoot, file), 'utf8'))
  );
}

export function buildReport() {
  const groupCatalogReport = buildTestGroupCatalogReport(ROOT);
  const contractRegistryReport = runContractRegistryAudit(ROOT);
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
  const oversizedDirectPackageTestScripts = collectOversizedDirectPackageTestScripts(packageRefs);
  const categories = {
    contract: 0,
    'runtime-unit': 0,
    integration: 0,
    'persistence-ingress': 0,
    'e2e-smoke': 0,
    'perf-smoke': 0,
  };
  const records = [];
  for (const file of tests) {
    const category = classify(file);
    categories[category] = (categories[category] || 0) + 1;
    records.push({ file, category });
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
  const historicalArchitectureProofs = tests.filter(isHistoricalArchitectureProofFile);
  const unitRunnerFileSet = new Set(unitRunnerFiles);
  const duplicateRunnerFiles = unitRunnerFiles.filter(
    (file, index) => unitRunnerFiles.indexOf(file) !== index
  );
  const e2eIncludedInUnitRunner = unitRunnerFiles.filter(file => e2eFiles.includes(file));
  const helpersIncludedInUnitRunner = unitRunnerFiles.filter(file => nonTestRuntimeFiles.includes(file));
  const directRepositoryLayerScanTests = collectDirectRepositoryLayerScanTests(ROOT, tests);
  const retiredLayerLedgerAccessTests = collectRetiredLayerLedgerAccessTests(ROOT, tests);
  const contractOverlapTargets = collectContractOverlapTargets(ROOT, tests);
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
      oversizedDirectPackageTestScripts: oversizedDirectPackageTestScripts.length,
      catalogGroups: groupCatalogReport.summary.groups,
      catalogScriptBindings: groupCatalogReport.summary.scriptBindings,
      primaryCatalogGroups: groupCatalogReport.summary.portfolioRoles.primary || 0,
      directRepositoryLayerScanTests: directRepositoryLayerScanTests.length,
      retiredLayerLedgerAccessTests: retiredLayerLedgerAccessTests.length,
      canonicalContracts: contractRegistryReport.contracts,
      historicalArchitectureProofs: historicalArchitectureProofs.length,
      contractOverlapTargets: contractOverlapTargets.length,
    },
    categories,
    failures: {
      missingTestRefs,
      duplicateCatalogRefs,
      invalidCatalogDefinitions: groupCatalogReport.failures.catalogIssues,
      staleCatalogScriptBindings: groupCatalogReport.failures.bindingIssues,
      oversizedDirectPackageTestScripts,
      contractRegistry: contractRegistryReport.failures,
      historicalArchitectureProofs,
      duplicateRunnerFiles,
      e2eIncludedInUnitRunner,
      helpersIncludedInUnitRunner,
      directRepositoryLayerScanTests,
      retiredLayerLedgerAccessTests,
      missingFromUnitRunner: tests.filter(file => !e2eFiles.includes(file) && !unitRunnerFileSet.has(file)),
    },
    contractOverlapTargets,
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
    `- Oversized direct package test lanes: ${report.totals.oversizedDirectPackageTestScripts}`,
    `- Catalog groups: ${report.totals.catalogGroups}`,
    `- Catalog-backed package scripts: ${report.totals.catalogScriptBindings}`,
    `- Primary non-overlapping portfolio groups: ${report.totals.primaryCatalogGroups}`,
    `- Tests directly invoking the repository layer graph: ${report.totals.directRepositoryLayerScanTests}`,
    `- Tests reading retired layer-ledger fields: ${report.totals.retiredLayerLedgerAccessTests}`,
    `- Canonical contracts in registry: ${report.totals.canonicalContracts}`,
    `- Historical stage/wave proof files: ${report.totals.historicalArchitectureProofs}`,
    `- Cross-kind contract overlap targets: ${report.totals.contractOverlapTargets}`,
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
    `| Direct package test lanes contain at most ${MAX_DIRECT_TEST_REFS_PER_PACKAGE_SCRIPT} files | ${report.failures.oversizedDirectPackageTestScripts.length} |`
  );
  lines.push(`| Contract registry is valid and wired once | ${report.failures.contractRegistry.length} |`);
  lines.push(
    `| Historical stage/wave/checkpoint proof files are retired | ${report.failures.historicalArchitectureProofs.length} |`
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
    `| Retired layer-ledger fields have no test consumers | ${report.failures.retiredLayerLedgerAccessTests.length} |`
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
      for (const item of items.slice(0, 100)) {
        lines.push(
          `- ${typeof item === 'string' ? item : `${item.owner || item.script || item.group}: ${item.file}`}`
        );
      }
      if (items.length > 100) lines.push(`- ... ${items.length - 100} more`);
      lines.push('');
    }
  }
  if (report.contractOverlapTargets.length) {
    lines.push('## Cross-kind overlap map', '');
    for (const entry of report.contractOverlapTargets) {
      lines.push(
        `- \`${entry.target}\` — ${entry.kinds.join(' / ')} — ${entry.owners.map(owner => `\`${owner.file}\``).join(', ')}`
      );
    }
    lines.push('');
  }
  lines.push(
    '## Policy',
    '',
    'This audit maps the current test portfolio. It blocks stale references, direct repository-wide layer scans, retired layer-ledger access, and reintroduction of stage/wave/checkpoint proof files. Large named test lanes must live in the catalog rather than package.json. Current behavior, persistence ingress, and architecture invariants remain first-class categories.',
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
    for (const [key, items] of Object.entries(report.failures)) {
      if (items.length) console.error(`- ${key}: ${items.length}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log('[test-portfolio-audit] ok');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
