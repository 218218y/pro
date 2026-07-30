import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertReviewedOwnershipFamily } from './helpers/dimension_reviewed_ownership_contract_helper.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryNumbers = Object.freeze([
  11, 12, 23, 24, 26, 27, 31, 32, 33, 34, 36, 37, 94, 95, 96, 97, 104, 105, 106, 107,
]);

test('Wave D interior shelf and storage imports are canonical reviewed ownership', () => {
  assertReviewedOwnershipFamily({
    root,
    label: 'Wave D interior shelves/storage',
    entryNumbers,
  });
});
