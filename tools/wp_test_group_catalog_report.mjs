#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TEST_GROUP_CATALOG,
  listTestGroupScriptBindings,
  validateTestGroupCatalog,
} from './wp_test_group_catalog.mjs';

function getArgValue(argv, name) {
  const directIndex = argv.indexOf(name);
  if (directIndex !== -1) return argv[directIndex + 1] || '';
  const prefix = `${name}=`;
  return argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function expectedScriptCommand(groupName) {
  return `node tools/wp_test_group.mjs ${groupName}`;
}

export function buildTestGroupCatalogReport(projectRoot = process.cwd()) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const packageScripts = packageJson.scripts || {};
  const catalogIssues = validateTestGroupCatalog();
  const bindings = listTestGroupScriptBindings();
  const bindingIssues = [];
  const groups = Object.entries(TEST_GROUP_CATALOG)
    .map(([name, definition]) => {
      const expectedCommand = expectedScriptCommand(name);
      const actualCommand = packageScripts[definition.script] || '';
      if (actualCommand !== expectedCommand) {
        bindingIssues.push({
          code: 'stale-package-script-binding',
          group: name,
          script: definition.script,
          expectedCommand,
          actualCommand,
        });
      }
      return {
        name,
        script: definition.script,
        description: definition.description,
        kind: definition.kind,
        owners: Array.from(definition.owners),
        environment: definition.environment,
        runner: definition.runner,
        portfolioRole: definition.portfolioRole,
        serialPolicy: definition.serialPolicy ? { ...definition.serialPolicy } : null,
        fileCount: definition.files.length,
        files: Array.from(definition.files),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const directPackageTestReferences = Object.values(packageScripts).reduce((count, command) => {
    const matches = String(command).match(
      /tests\/[^\s"']+?(?:\.test\.(?:js|tsx|ts|mjs|cjs)|\.spec\.(?:js|tsx|ts|mjs|cjs))/g
    );
    return count + (matches?.length || 0);
  }, 0);
  const catalogFileReferences = groups.reduce((count, group) => count + group.fileCount, 0);
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
      scriptBindings: bindings.length,
      catalogFileReferences,
      directPackageTestReferences,
      catalogIssues: catalogIssues.length,
      bindingIssues: bindingIssues.length,
      portfolioRoles,
      runners,
    },
    failures: {
      catalogIssues,
      bindingIssues,
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
    `- Package script bindings owned by the catalog: ${report.summary.scriptBindings}`,
    `- Catalog test-file references: ${report.summary.catalogFileReferences}`,
    `- Direct package.json test-file references still remaining: ${report.summary.directPackageTestReferences}`,
    `- Catalog definition issues: ${report.summary.catalogIssues}`,
    `- Package binding issues: ${report.summary.bindingIssues}`,
    '',
    '## Groups',
    '',
    '| Group | Script | Role | Runner | Environment | Files | Owners |',
    '|---|---|---|---|---|---:|---|',
  ];
  for (const group of report.groups) {
    lines.push(
      `| \`${group.name}\` | \`${group.script}\` | ${group.portfolioRole} | ${group.runner} | ${group.environment} | ${group.fileCount} | ${group.owners.join(', ')} |`
    );
  }

  if (report.failures.catalogIssues.length || report.failures.bindingIssues.length) {
    lines.push('', '## Failures', '');
    for (const issue of report.failures.catalogIssues) {
      lines.push(`- ${issue.group}: ${issue.code} — ${issue.message}${issue.file ? ` (${issue.file})` : ''}`);
    }
    for (const issue of report.failures.bindingIssues) {
      lines.push(
        `- ${issue.group}: ${issue.code} — expected \`${issue.expectedCommand}\`, got \`${issue.actualCommand || '<missing>'}\``
      );
    }
  }

  lines.push(
    '',
    '## Policy',
    '',
    'Large or ownership-significant test lanes belong in this catalog rather than as repeated file lists in package.json. Primary portfolio groups must not overlap each other. Focused and architecture groups may intentionally reuse tests while preserving a clear owner, environment, runner, and serial execution policy.',
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

  const failureCount = report.failures.catalogIssues.length + report.failures.bindingIssues.length;
  if (failureCount) {
    console.error(`[test-group-catalog] FAILED with ${failureCount} issue(s)`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `[test-group-catalog] ok groups=${report.summary.groups} files=${report.summary.catalogFileReferences} direct-package-refs=${report.summary.directPackageTestReferences}`
  );
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) main();
