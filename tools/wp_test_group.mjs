#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { listTestGroupNames, readTestGroup } from './wp_test_group_catalog.mjs';

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

export function resolveTestGroupPlan({ projectRoot = process.cwd(), groupName }) {
  const group = readTestGroup(groupName);
  if (!group) throw new Error(`[WardrobePro] unknown test group: ${groupName || '<empty>'}`);
  if (group.runner !== 'node-test') {
    throw new Error(`[WardrobePro] unsupported runner for test group ${groupName}: ${group.runner}`);
  }

  const missingFiles = group.files.filter(file => !fs.existsSync(path.resolve(projectRoot, file)));
  if (missingFiles.length) {
    throw new Error(
      `[WardrobePro] test group ${groupName} references missing file(s): ${missingFiles.join(', ')}`
    );
  }

  return {
    groupName,
    description: group.description,
    command: process.execPath,
    args: ['--test', ...group.files],
    files: group.files,
  };
}

export function runTestGroupPlan(plan, { projectRoot = process.cwd(), childEnv = process.env } = {}) {
  const result = spawnSync(plan.command, plan.args, {
    cwd: projectRoot,
    env: childEnv,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  return result.status ?? 1;
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

function main() {
  const flags = parseTestGroupArgs();
  if (flags.list || !flags.groupName) {
    console.log(helpText());
    process.exitCode = flags.list ? 0 : 1;
    return;
  }

  const plan = resolveTestGroupPlan({ groupName: flags.groupName });
  if (flags.print || flags.dryRun) {
    console.log(`[WardrobePro] test group: ${plan.groupName}`);
    console.log(`- ${plan.description}`);
    for (const file of plan.files) console.log(`- ${file}`);
  }
  if (!flags.dryRun) runTestGroupPlan(plan);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) main();
