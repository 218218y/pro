#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { listTestGroupNames, readTestGroup, validateTestGroupCatalog } from './wp_test_group_catalog.mjs';
import { buildTsxTestRun } from './wp_test_runner_command.mjs';

export function parseTestGroupArgs(argv = process.argv.slice(2)) {
  const flags = { groupName: '', list: false, print: false, dryRun: false };
  for (const arg of argv) {
    if (arg === '--list') flags.list = true;
    else if (arg === '--print') flags.print = true;
    else if (arg === '--dry-run') flags.dryRun = true;
    else if (!arg.startsWith('-') && !flags.groupName) flags.groupName = arg.trim();
    else throw new Error(`[WardrobePro] unknown test-group argument: ${arg}`);
  }
  return flags;
}

function buildSerialArgs(policy, files) {
  const args = ['tools/wp_serial_tests.mjs'];
  for (const [flag, value] of [
    ['--batch-size', policy.batchSize],
    ['--heartbeat-ms', policy.heartbeatMs],
    ['--timeout-ms', policy.timeoutMs],
  ]) {
    args.push(flag, String(value));
  }
  if (policy.failedFilesPath) args.push('--failed-files-path', policy.failedFilesPath);
  if (policy.timingsPath) args.push('--timings-path', policy.timingsPath);
  return [...args, ...files];
}

export function resolveTestGroupPlan({ projectRoot = process.cwd(), groupName }) {
  const group = readTestGroup(groupName);
  if (!group) throw new Error(`[WardrobePro] unknown test group: ${groupName || '<empty>'}`);

  const catalogIssues = validateTestGroupCatalog().filter(issue => issue.group === groupName);
  if (catalogIssues.length) {
    throw new Error(
      `[WardrobePro] invalid test group ${groupName}: ${catalogIssues.map(issue => issue.message).join('; ')}`
    );
  }

  if (group.runner === 'group-sequence') {
    return {
      groupName,
      description: group.description,
      kind: group.kind,
      owners: group.owners,
      runner: group.runner,
      portfolioRole: group.portfolioRole,
      serialPolicy: undefined,
      command: null,
      args: [],
      spawnOptions: {},
      files: [],
      groups: group.groups,
    };
  }

  const missingFiles = group.files.filter(file => !fs.existsSync(path.resolve(projectRoot, file)));
  if (missingFiles.length) {
    throw new Error(
      `[WardrobePro] test group ${groupName} references missing file(s): ${missingFiles.join(', ')}`
    );
  }

  let command;
  let args;
  let spawnOptions = {};
  if (group.runner === 'node-test') {
    command = process.execPath;
    args = ['--test', ...group.files];
  } else if (group.runner === 'tsx-test') {
    const run = buildTsxTestRun(projectRoot, group.files);
    command = run.program;
    args = run.args;
    spawnOptions = run.spawnOptions ?? {};
  } else if (group.runner === 'serial-tsx') {
    command = process.execPath;
    args = buildSerialArgs(group.serialPolicy, group.files);
  } else {
    throw new Error(`[WardrobePro] unsupported runner for test group ${groupName}: ${group.runner}`);
  }

  return {
    groupName,
    description: group.description,
    kind: group.kind,
    owners: group.owners,
    runner: group.runner,
    portfolioRole: group.portfolioRole,
    serialPolicy: group.serialPolicy,
    command,
    args,
    spawnOptions,
    files: group.files,
    groups: [],
  };
}

function spawnPlan(plan, { projectRoot, childEnv }) {
  const result = spawnSync(plan.command, plan.args, {
    cwd: projectRoot,
    env: childEnv,
    stdio: 'inherit',
    ...(plan.spawnOptions ?? {}),
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

export function runTestGroupPlan(plan, { projectRoot = process.cwd(), childEnv = process.env } = {}) {
  if (plan.runner === 'group-sequence') {
    for (const childGroupName of plan.groups) {
      const childPlan = resolveTestGroupPlan({ projectRoot, groupName: childGroupName });
      const status = runTestGroupPlan(childPlan, { projectRoot, childEnv });
      if (status !== 0) {
        process.exitCode = status;
        return status;
      }
    }
    return 0;
  }

  const status = spawnPlan(plan, { projectRoot, childEnv });
  if (status !== 0) process.exitCode = status;
  return status;
}

function helpText() {
  return [
    'Usage: node tools/wp_test_group.mjs <group-name> [--print] [--dry-run]',
    '       node tools/wp_test_group.mjs --list',
    '',
    'Groups:',
    ...listTestGroupNames().map(name => `  - ${name}`),
  ].join('\n');
}

function printPlan(plan) {
  console.log(`[WardrobePro] test group: ${plan.groupName}`);
  console.log(`- ${plan.description}`);
  console.log(`- kind: ${plan.kind}`);
  console.log(`- portfolio role: ${plan.portfolioRole}`);
  console.log(`- runner: ${plan.runner}`);
  console.log(`- owners: ${plan.owners.join(', ')}`);
  if (plan.serialPolicy) {
    console.log(
      `- serial policy: batch=${plan.serialPolicy.batchSize}, heartbeat=${plan.serialPolicy.heartbeatMs}ms, timeout=${plan.serialPolicy.timeoutMs}ms`
    );
  }
  for (const groupName of plan.groups) console.log(`- group: ${groupName}`);
  for (const file of plan.files) console.log(`- ${file}`);
}

function main() {
  const flags = parseTestGroupArgs();
  if (flags.list || !flags.groupName) {
    console.log(helpText());
    process.exitCode = flags.list ? 0 : 1;
    return;
  }

  const plan = resolveTestGroupPlan({ groupName: flags.groupName });
  if (flags.print || flags.dryRun) printPlan(plan);
  if (!flags.dryRun) runTestGroupPlan(plan);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) main();
