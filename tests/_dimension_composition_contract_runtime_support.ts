import test from 'node:test';
import assert from 'node:assert/strict';

import { DIMENSION_COMPOSITION_CONTRACT_LANES } from '../tools/wp_dimension_composition_contract_manifest.mjs';

type DimensionCompositionContract =
  (typeof DIMENSION_COMPOSITION_CONTRACT_LANES)[keyof typeof DIMENSION_COMPOSITION_CONTRACT_LANES][number];

async function assertRuntimeIdentity(contract: DimensionCompositionContract) {
  const owner = await import(`../${contract.owner}`);
  for (const sourceStatement of contract.sources) {
    const source = await import(`../${sourceStatement.file}`);
    for (const symbol of sourceStatement.symbols) {
      assert.equal(owner[symbol], source[symbol], `${contract.id}:${symbol}`);
    }
  }
}

export function registerDimensionCompositionRuntimeTests(
  lane: keyof typeof DIMENSION_COMPOSITION_CONTRACT_LANES
) {
  const contracts = DIMENSION_COMPOSITION_CONTRACT_LANES[lane];

  test(`Dimension composition ${lane} owners preserve canonical runtime binding identity`, async () => {
    for (const contract of contracts) await assertRuntimeIdentity(contract);
  });
}
