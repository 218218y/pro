#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LAYER_CONTRACT_VERSION,
  buildLayerContractProposal,
  collectLayerContractGraph,
  evaluateLayerContract,
  evaluatePendingLayerRatchetReductions,
} from './wp_layer_contract_support.mjs';

const args = process.argv.slice(2);
const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootOptionIndex = args.indexOf('--root');
const rootOption = rootOptionIndex >= 0 ? args[rootOptionIndex + 1] : '';
const root = rootOption ? path.resolve(process.cwd(), rootOption) : defaultRoot;
const baselineOptionIndex = args.indexOf('--baseline');
const baselineOption = baselineOptionIndex >= 0 ? args[baselineOptionIndex + 1] : '';
const baselinePath = baselineOption
  ? path.resolve(process.cwd(), baselineOption)
  : path.join(root, 'tools', 'wp_layer_baseline.json');
const consumedValueIndexes = new Set([
  ...(rootOptionIndex >= 0 ? [rootOptionIndex + 1] : []),
  ...(baselineOptionIndex >= 0 ? [baselineOptionIndex + 1] : []),
]);
const supportedArgs = new Set(['--json', '--propose', '--check-pending-reductions', '--root', '--baseline']);
const unknownArgs = args.filter((arg, index) => !consumedValueIndexes.has(index) && !supportedArgs.has(arg));
const jsonOutput = args.includes('--json');
const propose = args.includes('--propose');
const checkPendingReductions = args.includes('--check-pending-reductions');

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

try {
  if (unknownArgs.length > 0) {
    throw new Error(`wp_layer_contract: unsupported argument(s): ${unknownArgs.join(', ')}`);
  }
  if (baselineOptionIndex >= 0 && !baselineOption) {
    throw new Error('wp_layer_contract: --baseline requires a path');
  }
  if (rootOptionIndex >= 0 && !rootOption) {
    throw new Error('wp_layer_contract: --root requires a path');
  }
  if (propose && checkPendingReductions) {
    throw new Error('wp_layer_contract: --propose and --check-pending-reductions are mutually exclusive');
  }
  const graph = collectLayerContractGraph({ root });
  const contract = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  if (propose) {
    const proposal = buildLayerContractProposal(graph, contract);
    if (jsonOutput) {
      print(proposal);
    } else if (proposal.reviewRequired) {
      const changes = Object.entries(proposal.diff)
        .filter(([, value]) => Array.isArray(value) && value.length > 0)
        .map(([kind, value]) => `${kind}=${value.length}`)
        .join(', ');
      console.error(`Layer contract proposal requires review (${changes || 'contract drift'}).`);
      console.error('Run with --json for the complete proposal.');
    } else {
      console.log(
        'Layer contract proposal clean (no added edges, budget changes, ratchet violations, or migration budget failures).'
      );
    }
    process.exitCode = proposal.reviewRequired ? 1 : 0;
  } else if (checkPendingReductions) {
    const report = evaluatePendingLayerRatchetReductions(graph, contract);
    if (jsonOutput) print(report);
    else if (report.futureReview) {
      console.error(
        `Layer ratchet review date ${report.reviewedAt} is later than current date ${report.currentDate}.`
      );
    } else if (report.overdue) {
      console.error(
        `Layer ratchet has ${report.pendingBudgetChanges.length} pending budget reduction(s) and ${report.pendingRemovedEdges.length} removable edge(s) after ${report.reviewAgeDays} days; the configured grace is ${report.graceDays} days.`
      );
      for (const change of report.pendingBudgetChanges) {
        console.error(` - ${change.edge} ${change.field}: ${change.previous} -> ${change.current}`);
      }
      for (const edge of report.pendingRemovedEdges) console.error(` - remove edge ${edge}`);
      console.error('Run npm run contract:layers:propose and commit the reviewed lower baseline.');
    } else if (report.hasPendingReductions) {
      console.log(
        `Layer ratchet has pending reductions within the ${report.graceDays}-day grace window (${report.reviewAgeDays} days since review).`
      );
    } else if (!report.cleanProposal) {
      console.log('Layer ratchet freshness check skipped because the proposal requires review.');
    } else {
      console.log('Layer ratchet freshness OK (no unapplied clean reductions).');
    }
    process.exitCode = report.ok ? 0 : 1;
  } else {
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
    process.exitCode = report.ok ? 0 : 1;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (jsonOutput) print({ ok: false, error: message });
  else console.error(message);
  process.exitCode = 2;
}
