import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatContractViolations,
  inspectIdentityCompositionContracts,
} from '../tools/wp_declarative_contract_engine.mjs';
import { DIMENSION_COMPOSITION_CONTRACT_LANES } from '../tools/wp_dimension_composition_contract_manifest.mjs';

export function registerDimensionCompositionContractTests(lane) {
  const contracts = DIMENSION_COMPOSITION_CONTRACT_LANES[lane];
  if (!contracts) throw new Error(`Unknown dimension-composition contract lane: ${lane}`);

  test(`Dimension composition ${lane} contracts preserve semantic ownership and identity-only owners`, () => {
    const violations = inspectIdentityCompositionContracts(contracts, { projectRoot: process.cwd() });
    assert.equal(violations.length, 0, formatContractViolations(violations));
  });
}
