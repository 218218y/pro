#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TEST_GROUP_CATALOG,
  resolveTestGroupFiles,
  validateTestGroupCatalog,
} from './wp_test_group_catalog.mjs';

const GENERIC_TEST_GROUP_SCRIPT = 'test:group';
const GENERIC_TEST_GROUP_COMMAND = 'node tools/wp_test_group.mjs';
const LEGACY_GROUP_FACADE_RE = /^node tools\/wp_test_group\.mjs\s+\S+/u;

function getArgValue(argv, name) {
  const directIndex = argv.indexOf(name);
  if (directIndex !== -1) return argv[directIndex + 1] || '';
  const prefix = `${name}=`;
  return argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

export function buildTestGroupCatalogReport(projectRoot = process.cwd()) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const packageScripts = packageJson.scripts || {};
  const catalogIssues = validateTestGroupCatalog();
  const runnerIssues = [];
  const legacyFacadeIssues = [];

  const actualGenericRunner = packageScripts[GENERIC_TEST_GROUP_SCRIPT] || '';
  if (actualGenericRunner !== GENERIC_TEST_GROUP_COMMAND) {
    runnerIssues.push({
      code: 'invalid-generic-test-group-runner',
      script: GENERIC_TEST_GROUP_SCRIPT,
      expectedCommand: GENERIC_TEST_GROUP_COMMAND,
      actualCommand: actualGenericRunner,
    });
  }

  for (const [script, command] of Object.entries(packageScripts)) {
    if (script === GENERIC_TEST_GROUP_SCRIPT) continue;
    if (!LEGACY_GROUP_FACADE_RE.test(String(command).trim())) continue;
    legacyFacadeIssues.push({
      code: 'legacy-test-group-package-facade',
      script,
      command,
    });
  }

  const groups = Object.entries(TEST_GROUP_CATALOG)
    .map(([name, definition]) => ({
      name,
      description: definition.description,
      kind: definition.kind,
      owners: Array.from(definition.owners),
      runner: definition.runner,
      portfolioRole: definition.portfolioRole,
      serialPolicy: definition.serialPolicy ? { ...definition.serialPolicy } : null,
      childGroups: Array.from(definition.groups || []),
      directFileCount: definition.files.length,
      resolvedFileCount: resolveTestGroupFiles(name).length,
      files: Array.from(definition.files),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const directPackageTestReferences = Object.values(packageScripts).reduce((count, command) => {
    const matches = String(command).match(
      /tests\/[^\s"']+?(?:\.test\.(?:js|tsx|ts|mjs|cjs)|\.spec\.(?:js|tsx|ts|mjs|cjs))/g
    );
    return count + (matches?.length || 0);
  }, 0);
  const catalogFileReferences = groups.reduce((count, group) => count + group.directFileCount, 0);
  const sequenceResolvedFileReferences = groups
    .filter(group => group.runner === 'group-sequence')
    .reduce((count, group) => count + group.resolvedFileCount, 0);
  const portfolioRoles = groups.reduce((out, group) => {
    out[group.portfolioRole] = (out[group.portfolioRole] || 0) + 1;
    return out;
  }, {});
  const runners = groups.reduce((out, group) => {
    out[group.runner] = (out[group.runner] || 0) + 1;
    return out;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      groups: groups.length,
      genericRunnerScript: GENERIC_TEST_GROUP_SCRIPT,
      catalogFileReferences,
      sequenceResolvedFileReferences,
      directPackageTestReferences,
      catalogIssues: catalogIssues.length,
      runnerIssues: runnerIssues.length,
      legacyFacadeIssues: legacyFacadeIssues.length,
      portfolioRoles,
      runners,
    },
    failures: {
      catalogIssues,
      runnerIssues,
      legacyFacadeIssues,
    },
    groups,
  };
}

export function renderTestGroupCatalogMarkdown(report) {
  const lines = [
    '# Test group catalog',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Catalog groups: ${report.summary.groups}`,
    `- Generic package runner: \`${report.summary.genericRunnerScript}\``,
    `- Catalog-owned direct test-file references: ${report.summary.catalogFileReferences}`,
    `- Resolved file references across aggregate sequences: ${report.summary.sequenceResolvedFileReferences}`,
    `- Direct package.json test-file references still remaining: ${report.summary.directPackageTestReferences}`,
    `- Catalog definition issues: ${report.summary.catalogIssues}`,
    `- Generic runner issues: ${report.summary.runnerIssues}`,
    `- Legacy per-group package facades: ${report.summary.legacyFacadeIssues}`,
    '',
    '## Groups',
    '',
    '| Group | Role | Runner | Direct files | Resolved files | Child groups | Owners |',
    '|---|---|---|---:|---:|---:|---|',
  ];
  for (const group of report.groups) {
    lines.push(
      `| \`${group.name}\` | ${group.portfolioRole} | ${group.runner} | ${group.directFileCount} | ${group.resolvedFileCount} | ${group.childGroups.length} | ${group.owners.join(', ')} |`
    );
  }

  const failureCount = Object.values(report.failures).reduce((sum, issues) => sum + issues.length, 0);
  if (failureCount) {
    lines.push('', '## Failures', '');
    for (const issue of report.failures.catalogIssues) {
      lines.push(`- ${issue.group}: ${issue.code} — ${issue.message}${issue.file ? ` (${issue.file})` : ''}`);
    }
    for (const issue of report.failures.runnerIssues) {
      lines.push(
        `- ${issue.code} — expected \`${issue.expectedCommand}\`, got \`${issue.actualCommand || '<missing>'}\``
      );
    }
    for (const issue of report.failures.legacyFacadeIssues) {
      lines.push(`- ${issue.code} — \`${issue.script}\`: \`${issue.command}\``);
    }
  }

  lines.push(
    '',
    '## Policy',
    '',
    'Named test ownership lives only in this catalog. package.json exposes one generic `test:group` runner; it must not mirror every catalog entry as a package-script facade. Aggregate suites are `group-sequence` entries that compose canonical child groups without duplicating their file inventories. Primary portfolio groups must not overlap each other; focused and architecture groups may intentionally reuse tests.',
    ''
  );
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const jsonOut = getArgValue(argv, '--json-out');
  const markdownOut = getArgValue(argv, '--md-out');
  const report = buildTestGroupCatalogReport();
  if (jsonOut) fs.writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  if (markdownOut) fs.writeFileSync(markdownOut, renderTestGroupCatalogMarkdown(report));

  const failureCount = Object.values(report.failures).reduce((sum, issues) => sum + issues.length, 0);
  if (failureCount) {
    console.error(`[test-group-catalog] FAILED with ${failureCount} issue(s)`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `[test-group-catalog] ok groups=${report.summary.groups} files=${report.summary.catalogFileReferences} package-test-refs=${report.summary.directPackageTestReferences}`
  );
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) main();
