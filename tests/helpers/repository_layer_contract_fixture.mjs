import fs from 'node:fs';
import path from 'node:path';

import {
  collectLayerContractGraph,
  evaluateLayerContractAndProposal,
} from '../../tools/wp_layer_contract_support.mjs';

export function createRepositoryLayerContractFixture({ root, currentDate }) {
  let cached = null;

  return function repositoryLayerContractFixture() {
    if (cached) return cached;
    const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_layer_baseline.json'), 'utf8'));
    const graph = collectLayerContractGraph({ root });
    const { proposal, report } = evaluateLayerContractAndProposal(graph, baseline, { currentDate });
    cached = { baseline, graph, proposal, report };
    return cached;
  };
}
