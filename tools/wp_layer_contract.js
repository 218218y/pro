#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LAYER_CONTRACT_VERSION,
  buildLayerContractProposal,
  collectLayerContractGraph,
  evaluateLayerContract,
} from './wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'tools', 'wp_layer_baseline.json');
const args = process.argv.slice(2);
const supportedArgs = new Set(['--json', '--propose']);
const unknownArgs = args.filter(arg => !supportedArgs.has(arg));
const jsonOutput = args.includes('--json');
const propose = args.includes('--propose');

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

try {
  if (unknownArgs.length > 0) {
    throw new Error(`wp_layer_contract: unsupported argument(s): ${unknownArgs.join(', ')}`);
  }
  const graph = collectLayerContractGraph({ root });
  const contract = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  if (propose) {
    const proposal = buildLayerContractProposal(graph, contract);
    print(proposal);
    process.exit(proposal.diff.requiresFacadeDecision.length > 0 ? 1 : 0);
  }
  const report = evaluateLayerContract(graph, contract);
  if (jsonOutput) print(report);
  else if (report.ok) {
    console.log(
      `Layer contract v${LAYER_CONTRACT_VERSION} OK (${report.edges.length} allowed cross-layer edges)`
    );
  } else {
    console.error(`Layer contract v${LAYER_CONTRACT_VERSION} failed:`);
    for (const failure of report.failures) console.error(` - ${JSON.stringify(failure)}`);
  }
  process.exit(report.ok ? 0 : 1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (jsonOutput) print({ ok: false, error: message });
  else console.error(message);
  process.exit(2);
}
