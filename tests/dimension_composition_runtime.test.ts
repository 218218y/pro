import test from 'node:test';
import assert from 'node:assert/strict';

import { DIMENSION_COMPOSITION_CONTRACTS } from '../tools/wp_dimension_composition_contract_manifest.mjs';

type DimensionCompositionContract = (typeof DIMENSION_COMPOSITION_CONTRACTS)[number];

async function assertRuntimeIdentity(contract: DimensionCompositionContract) {
  const owner = await import(`../${contract.owner}`);
  for (const sourceStatement of contract.sources) {
    const source = await import(`../${sourceStatement.file}`);
    for (const symbol of sourceStatement.symbols) {
      assert.equal(owner[symbol], source[symbol], `${contract.id}:${symbol}`);
    }
  }
}

test('Dimension composition owners preserve canonical runtime binding identity', async () => {
  for (const contract of DIMENSION_COMPOSITION_CONTRACTS) await assertRuntimeIdentity(contract);
});
