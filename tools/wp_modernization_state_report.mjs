#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runSilentCatchPolicyAudit } from './wp_silent_catch_policy_audit.mjs';
import { runLegacyFallbackAudit } from './wp_legacy_fallback_audit.mjs';
import { runPrivateOwnerImportBoundaryAudit } from './wp_private_owner_import_boundary_audit.mjs';
import { buildReport as buildTestPortfolioReport } from './wp_test_portfolio_audit.mjs';

const GUARDED_COMPATIBILITY_CATEGORIES = Object.freeze([
  'project-migration',
  'external-api-compat',
  'compat-boundary',
]);

function countGuardedCompatibilityFiles(summary) {
  return Object.values(summary.byFile || {}).filter(entry =>
    GUARDED_COMPATIBILITY_CATEGORIES.some(category => Number(entry?.categories?.[category] || 0) > 0)
  ).length;
}

function countFailures(failures) {
  return Object.values(failures || {}).reduce(
    (sum, items) => sum + (Array.isArray(items) ? items.length : 0),
    0
  );
}

export function buildModernizationStateReport(projectRoot = process.cwd()) {
  const silentCatch = runSilentCatchPolicyAudit(projectRoot);
  const legacy = runLegacyFallbackAudit({
    projectRoot,
    args: {
      sourceRoot: 'esm',
      jsonOutPath: null,
      mdOutPath: null,
      allowlistPath: 'tools/wp_legacy_fallback_allowlist.json',
      writeAllowlist: false,
      check: true,
      failOnUnknown: true,
      print: false,
    },
  });
  const ownership = runPrivateOwnerImportBoundaryAudit(projectRoot);
  const testPortfolio = buildTestPortfolioReport();
  const testPortfolioFailures = countFailures(testPortfolio.failures);
  const guardedOccurrences = GUARDED_COMPATIBILITY_CATEGORIES.reduce(
    (sum, category) => sum + Number(legacy.summary.byCategory?.[category] || 0),
    0
  );

  const report = {
    generatedAt: new Date().toISOString(),
    status: {
      allPassed:
        silentCatch.ok &&
        ownership.ok &&
        testPortfolioFailures === 0 &&
        Number(legacy.summary.byCategory?.['legacy-runtime-risk'] || 0) === 0 &&
        Number(legacy.summary.byCategory?.unknown || 0) === 0,
      silentCatchPolicy: silentCatch.ok,
      compatibilityAudit:
        Number(legacy.summary.byCategory?.['legacy-runtime-risk'] || 0) === 0 &&
        Number(legacy.summary.byCategory?.unknown || 0) === 0,
      privateOwnerBoundary: ownership.ok,
      testPortfolio: testPortfolioFailures === 0,
    },
    silentCatches: {
      statementFree: silentCatch.inventory.statementFreeTotal,
      bare: silentCatch.inventory.bareTotal,
      vagueComments: silentCatch.inventory.vagueTotal,
      files: silentCatch.inventory.entries.length,
    },
    compatibility: {
      totalCategorizedOccurrences: legacy.summary.totalOccurrences,
      filesWithOccurrences: legacy.summary.totalFiles,
      guardedOccurrences,
      guardedFiles: countGuardedCompatibilityFiles(legacy.summary),
      projectMigration: Number(legacy.summary.byCategory?.['project-migration'] || 0),
      externalApiCompat: Number(legacy.summary.byCategory?.['external-api-compat'] || 0),
      compatBoundary: Number(legacy.summary.byCategory?.['compat-boundary'] || 0),
      legacyRuntimeRisk: Number(legacy.summary.byCategory?.['legacy-runtime-risk'] || 0),
      unknown: Number(legacy.summary.byCategory?.unknown || 0),
    },
    ownership: {
      registeredFamilies: ownership.families.length,
      privateOwners: ownership.privateOwners,
      guardedImportSites: ownership.importSites.length,
      identityFacades: ownership.oneLineFacades.length,
      explicitlyInventoriedIdentityFacades: ownership.reviewedOneLineFacades.length,
    },
    tests: {
      classifiedFiles: testPortfolio.totals.tests,
      unitRuntimeFiles: testPortfolio.totals.unitRunnerTests,
      e2eFiles: testPortfolio.totals.e2eTests,
      canonicalContracts: testPortfolio.totals.canonicalContracts,
      historicalArchitectureProofs: testPortfolio.totals.historicalArchitectureProofs,
      failures: testPortfolioFailures,
    },
  };

  return report;
}

export function toModernizationStateMarkdown(report) {
  const status = report.status.allPassed ? 'PASS' : 'FAIL';
  const lines = [
    '# Modernization current state',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '> Generated source of truth for mutable modernization metrics. Living architecture documents should describe policy and ownership, not copy these counts.',
    '',
    '## Gate status',
    '',
    `- Overall: **${status}**`,
    `- Silent-catch policy: **${report.status.silentCatchPolicy ? 'PASS' : 'FAIL'}**`,
    `- Compatibility audit: **${report.status.compatibilityAudit ? 'PASS' : 'FAIL'}**`,
    `- Private-owner boundary: **${report.status.privateOwnerBoundary ? 'PASS' : 'FAIL'}**`,
    `- Test portfolio: **${report.status.testPortfolio ? 'PASS' : 'FAIL'}**`,
    '',
    '## Error observability',
    '',
    `- Statement-free catches: **${report.silentCatches.statementFree}**`,
    `- Bare catches: **${report.silentCatches.bare}**`,
    `- Vague catch comments: **${report.silentCatches.vagueComments}**`,
    `- Files containing statement-free catches: **${report.silentCatches.files}**`,
    '',
    '## Compatibility debt',
    '',
    `- Categorized occurrences: **${report.compatibility.totalCategorizedOccurrences}**`,
    `- Files with categorized occurrences: **${report.compatibility.filesWithOccurrences}**`,
    `- Growth-ratcheted compatibility occurrences: **${report.compatibility.guardedOccurrences}** across **${report.compatibility.guardedFiles}** files`,
    `- Project migration: **${report.compatibility.projectMigration}**`,
    `- External API compatibility: **${report.compatibility.externalApiCompat}**`,
    `- Explicit compatibility boundaries: **${report.compatibility.compatBoundary}**`,
    `- Legacy runtime risk: **${report.compatibility.legacyRuntimeRisk}**`,
    `- Unknown classifications: **${report.compatibility.unknown}**`,
    '',
    '## Ownership topology',
    '',
    `- Registered topology families: **${report.ownership.registeredFamilies}**`,
    `- Private owners: **${report.ownership.privateOwners}**`,
    `- Guarded private-owner import sites: **${report.ownership.guardedImportSites}**`,
    `- Identity facades: **${report.ownership.identityFacades}**`,
    `- Explicitly inventoried identity facades: **${report.ownership.explicitlyInventoriedIdentityFacades}**`,
    '',
    '## Test portfolio',
    '',
    `- Classified test files: **${report.tests.classifiedFiles}**`,
    `- Unit/runtime files: **${report.tests.unitRuntimeFiles}**`,
    `- Playwright E2E files: **${report.tests.e2eFiles}**`,
    `- Canonical contracts: **${report.tests.canonicalContracts}**`,
    `- Historical architecture proof files: **${report.tests.historicalArchitectureProofs}**`,
    `- Portfolio failures: **${report.tests.failures}**`,
    '',
    '## Policy',
    '',
    '- This report is generated from the canonical audits; do not edit its counts by hand.',
    '- Reductions in compatibility or statement-free catch debt must ratchet their owning policy in the same change so removed debt cannot return.',
    '- A new modernization lane is justified only by a measured regression, duplicated ownership, a live compatibility seam, or an actively changed family with proven source-shape friction.',
    '',
  ];
  return lines.join('\n');
}

function readArg(argv, name) {
  const prefix = `${name}=`;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === name && argv[index + 1]) return argv[index + 1];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return null;
}

function main() {
  const argv = process.argv.slice(2);
  const jsonOut = readArg(argv, '--json-out');
  const mdOut = readArg(argv, '--md-out');
  const report = buildModernizationStateReport(process.cwd());

  if (jsonOut) {
    fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
    fs.writeFileSync(path.resolve(jsonOut), `${JSON.stringify(report, null, 2)}\n`);
  }
  if (mdOut) {
    fs.mkdirSync(path.dirname(path.resolve(mdOut)), { recursive: true });
    fs.writeFileSync(path.resolve(mdOut), toModernizationStateMarkdown(report));
  }

  if (!jsonOut && !mdOut) console.log(JSON.stringify(report, null, 2));
  if (!report.status.allPassed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
