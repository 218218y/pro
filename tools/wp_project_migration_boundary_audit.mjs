#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_LOAD_FILE = 'esm/native/io/project_io_orchestrator_project_load.ts';
const UI_RAW_SELECTORS_FILE = 'esm/native/runtime/ui_raw_selectors.ts';
const RUNTIME_ROOT = 'esm/native/runtime';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function walkFiles(root) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        files.push(full.split(path.sep).join('/'));
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function findRuntimeImportsFromProjectMigrations(projectRoot) {
  const failures = [];
  for (const file of walkFiles(path.join(projectRoot, RUNTIME_ROOT))) {
    const rel = path.relative(projectRoot, file).split(path.sep).join('/');
    const text = read(file);
    if (
      /from\s+['\"][.\/]+io\/project_migrations\//.test(text) ||
      /from\s+['\"][.\/]+project_migrations\//.test(text)
    ) {
      failures.push(`${rel} imports the project migration boundary; runtime must stay below IO.`);
    }
  }
  return failures;
}

export function runProjectMigrationBoundaryAudit(projectRoot = process.cwd()) {
  const failures = [];
  const projectLoadPath = path.join(projectRoot, PROJECT_LOAD_FILE);
  const uiRawSelectorsPath = path.join(projectRoot, UI_RAW_SELECTORS_FILE);

  if (!fs.existsSync(projectLoadPath)) failures.push(`${PROJECT_LOAD_FILE} is missing.`);
  if (!fs.existsSync(uiRawSelectorsPath)) failures.push(`${UI_RAW_SELECTORS_FILE} is missing.`);

  if (fs.existsSync(projectLoadPath)) {
    const projectLoad = read(projectLoadPath);
    if (!projectLoad.includes("from './project_migrations/index.js'")) {
      failures.push(
        'project load must use the project_migrations owner for project-ingress UI raw canonicalization.'
      );
    }
    if (/ensureUiRawDimsFromSnapshot|hasEssentialUiDimsFromSnapshot/.test(projectLoad)) {
      failures.push('project load must not use runtime fail-soft ui.raw completion helpers directly.');
    }
    if (!/assertCanonicalUiRawDims\(/.test(projectLoad)) {
      failures.push('project load must assert canonical ui.raw dimensions after project migration.');
    }
  }

  if (fs.existsSync(uiRawSelectorsPath)) {
    const selectors = read(uiRawSelectorsPath);
    for (const symbol of [
      'readUiRawScalarFromCanonicalSnapshot',
      'hasCanonicalEssentialUiRawDimsFromSnapshot',
      'assertCanonicalUiRawDims',
      'readCanonicalUiRawNumberFromSnapshot',
      'readCanonicalUiRawIntFromSnapshot',
      'readCanonicalUiRawDimsCmFromSnapshot',
    ]) {
      if (!selectors.includes(`export function ${symbol}`)) {
        failures.push(`${UI_RAW_SELECTORS_FILE} must export ${symbol}.`);
      }
    }
    const canonicalDimsIndex = selectors.indexOf('export function readCanonicalUiRawDimsCmFromSnapshot');
    const legacyDimsIndex = selectors.indexOf('export function readUiRawDimsCmFromSnapshot');
    if (canonicalDimsIndex < 0 || legacyDimsIndex < 0 || canonicalDimsIndex > legacyDimsIndex) {
      failures.push(
        `${UI_RAW_SELECTORS_FILE} must keep canonical batch readers separate from legacy tolerant batch readers.`
      );
    }
  }

  failures.push(...findRuntimeImportsFromProjectMigrations(projectRoot));
  return { ok: failures.length === 0, failures };
}

function main() {
  const result = runProjectMigrationBoundaryAudit();
  if (!result.ok) {
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log('Project migration boundary audit passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
