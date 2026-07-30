import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertReviewedOwnershipFamily } from './helpers/dimension_reviewed_ownership_contract_helper.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryNumbers = Object.freeze([1, 2, 8, 60, 132, 152, 153, 154, 166]);

test('Wave E remaining unit, default, cornice, and shell imports retain canonical ownership', () => {
  assertReviewedOwnershipFamily({
    root,
    label: 'Wave E remaining focused imports',
    entryNumbers,
  });
});
