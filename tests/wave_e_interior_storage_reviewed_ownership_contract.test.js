import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertReviewedOwnershipFamily } from './helpers/dimension_reviewed_ownership_contract_helper.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryNumbers = Object.freeze([13, 62, 86, 87, 88, 89, 90, 91, 92, 93, 157, 158]);

test('Wave E interior fitting and storage consumers retain canonical direct ownership', () => {
  assertReviewedOwnershipFamily({
    root,
    label: 'Wave E interior fittings/storage',
    entryNumbers,
  });
});
