#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ARCHITECTURE_CONTRACT_REGISTRY } from './wp_contract_registry.mjs';

const root = process.cwd();

export function runContractRegistryAudit(projectRoot = root) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const scripts = packageJson.scripts || {};
  const guardrail = String(scripts['check:refactor-guardrails'] || '');
  const failures = [];
  const ids = new Set();
  const packageScripts = new Set();
  const owners = new Set();

  for (const entry of ARCHITECTURE_CONTRACT_REGISTRY) {
    if (!entry.id || ids.has(entry.id)) failures.push(`duplicate or empty contract id: ${entry.id}`);
    if (!entry.packageScript || packageScripts.has(entry.packageScript)) {
      failures.push(`duplicate or empty package script owner: ${entry.packageScript}`);
    }
    if (!entry.owner || owners.has(entry.owner))
      failures.push(`duplicate or empty contract owner: ${entry.owner}`);
    ids.add(entry.id);
    packageScripts.add(entry.packageScript);
    owners.add(entry.owner);

    for (const file of [entry.owner, ...entry.supportingTests]) {
      if (!fs.existsSync(path.join(projectRoot, file))) failures.push(`${entry.id}: missing ${file}`);
    }
    if (!Array.isArray(entry.scopes) || entry.scopes.length === 0) {
      failures.push(`${entry.id}: scopes must be non-empty`);
    }

    const command = String(scripts[entry.packageScript] || '');
    if (!command) {
      failures.push(`${entry.id}: missing package script ${entry.packageScript}`);
    } else if (!command.includes(entry.owner)) {
      failures.push(`${entry.packageScript}: must execute canonical owner ${entry.owner}`);
    }
    const guardNeedle = `npm run ${entry.packageScript}`;
    const occurrences = guardrail.split(guardNeedle).length - 1;
    if (occurrences !== 1) {
      failures.push(
        `check:refactor-guardrails must contain ${guardNeedle} exactly once (found ${occurrences})`
      );
    }
  }

  return {
    ok: failures.length === 0,
    contracts: ARCHITECTURE_CONTRACT_REGISTRY.length,
    failures,
  };
}

function main() {
  const result = runContractRegistryAudit(root);
  if (!result.ok) {
    console.error(`[contract-registry] FAILED with ${result.failures.length} issue(s)`);
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[contract-registry] ok (${result.contracts} canonical contracts)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
